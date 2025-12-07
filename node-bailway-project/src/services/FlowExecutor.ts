import { FlowExecution } from '../models/FlowExecution'
import { Flow } from '../models/Flow'
import { Contact } from '../models/Contact'
import { WhatsAppManager } from '../WhatsAppManager'
import { flowQueue } from '../queues/flowQueue'
import axios from 'axios'
import nodemailer from 'nodemailer'
import { MessageContent } from '../types/MessageContent'

export class FlowExecutor {
  private whatsappManager: WhatsAppManager
  private emailTransporter: nodemailer.Transporter | null = null

  constructor(manager: WhatsAppManager) {
    this.whatsappManager = manager
    this.initializeEmailTransporter()
  }

  private initializeEmailTransporter() {
    // Initialize email transporter with environment variables
    const smtpHost = process.env.SMTP_HOST
    const smtpPort = process.env.SMTP_PORT
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS

    if (smtpHost && smtpUser && smtpPass) {
      this.emailTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort || '587'),
        secure: false, // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      })
      console.log('Email transporter initialized')
    } else {
      console.warn('Email credentials not configured. EmailNode will not work.')
    }
  }

  async handleIncomingMessage(
    sessionId: string,
    from: string,
    text: string,
    fromMe: boolean = false,
  ) {
    const phoneNumber = from.replace('@s.whatsapp.net', '').replace('@lid', '')
    console.log(
      `[FlowExecutor] Received message from ${phoneNumber}: "${text}" on session "${sessionId}" (fromMe: ${fromMe})`,
    )

    // Determine the WhatsApp ID (keep the full JID for LID accounts)
    const whatsappId = from // Store the full JID (e.g., 123@lid or 123@s.whatsapp.net)

    // Use findOneAndUpdate with upsert to avoid race conditions
    const contact = await Contact.findOneAndUpdate(
      { phoneNumber },
      {
        $set: { whatsappId },
        $setOnInsert: { name: 'Unknown', phoneNumber },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )

    if (!contact || !contact._id) {
      console.error('[FlowExecutor] Failed to create/find contact')
      return
    }

    // FIRST: Check for paused executions waiting for a reply from this contact
    const pausedExecution = await FlowExecution.findOne({
      contactId: contact._id.toString(),
      status: 'paused',
    })

    if (pausedExecution) {
      console.log(
        `[FlowExecutor] Found paused execution ${pausedExecution._id}, resuming with message: "${text}"`,
      )
      const resumed = await this.resumeFlow(pausedExecution._id.toString(), text, sessionId)
      if (resumed) {
        return // Successfully resumed, don't check for new flows
      }
      // If not resumed (orphaned), continue to check for new flows below
      console.log(`[FlowExecutor] Paused execution cleaned up, checking for new flows...`)
    }

    // Find all active flows for this session (or flows without a specific session)
    const flows = await Flow.find({
      isActive: true,
      triggerType: { $in: ['keyword', 'message'] },
      $or: [{ sessionId: sessionId }, { sessionId: null }],
    })
    console.log(`[FlowExecutor] Found ${flows.length} active flows for session "${sessionId}"`)

    for (const flow of flows) {
      console.log(
        `[FlowExecutor] Checking flow "${flow.name}" (type: ${flow.triggerType}, keywords: ${flow.keywords?.join(', ') || 'none'})`,
      )

      // For 'message' type: trigger on ANY message
      // BUT: Don't trigger on bot's own messages (prevents infinite loop)
      if (flow.triggerType === 'message') {
        if (fromMe) {
          console.log(
            `[FlowExecutor] ⏸️ Skipping flow "${flow.name}" - message is from bot (avoiding loop)`,
          )
          continue
        }

        console.log(
          `[FlowExecutor] ✓ Triggering flow "${flow.name}\" (message trigger) for session "${sessionId}" (${phoneNumber})`,
        )
        await this.startFlow(flow._id.toString(), contact._id.toString(), {
          sessionId,
          message: text,
        })
        return
      }

      // For 'keyword' type: check if message contains any keyword
      if (
        flow.triggerType === 'keyword' &&
        flow.keywords &&
        flow.keywords.some((k) => text.toLowerCase().includes(k.toLowerCase()))
      ) {
        console.log(
          `[FlowExecutor] ✓ Triggering flow "${flow.name}" (keyword match) for session "${sessionId}" (${phoneNumber})`,
        )
        await this.startFlow(flow._id.toString(), contact._id.toString(), {
          sessionId,
          message: text,
        })
        return
      }
    }
    console.log(`[FlowExecutor] No matching flow found for message: "${text}"`)
  }

  async startFlow(flowId: string, contactId: string, triggerData: any = {}) {
    console.log(`[FlowExecutor] Starting flow ${flowId} for contact ${contactId}`)
    const flow = await Flow.findById(flowId)
    const contact = await Contact.findById(contactId)

    if (!flow || !contact || !flow.isActive) {
      console.log(
        `[FlowExecutor] Cannot start flow: flow=${!!flow}, contact=${!!contact}, isActive=${flow?.isActive}`,
      )
      return
    }

    const startNode = flow.nodes.find((n: any) => n.type === 'start')
    if (!startNode) {
      console.log(`[FlowExecutor] No start node found in flow`)
      return
    }

    console.log(
      `[FlowExecutor] Found start node: ${startNode.id}, flow has ${flow.nodes.length} nodes and ${flow.edges.length} edges`,
    )

    const execution = new FlowExecution({
      flowId: flow.id,
      contactId: contact.id,
      currentNodeId: startNode.id,
      variables: { ...triggerData },
      status: 'running',
    })

    await execution.save()
    console.log(`[FlowExecutor] Created execution ${execution.id}, moving to next node from start`)
    await this.executeNode(execution.id, startNode.id)
  }

  async executeNode(executionId: string, nodeId: string) {
    const execution = await FlowExecution.findById(executionId)
      .populate('flowId')
      .populate('contactId')

    if (!execution || execution.status !== 'running') return

    const flow = await Flow.findById(execution.flowId)
    const contact = await Contact.findById(execution.contactId)

    if (!flow || !contact) return

    const node = flow.nodes.find((n: any) => n.id === nodeId)
    if (!node) {
      await this.completeExecution(executionId)
      return
    }

    try {
      switch (node.type) {
        case 'message':
          await this.handleMessageNode(node, execution, flow, contact)
          break
        case 'buttons':
          // Handle button messages (same as message but with interactive buttons)
          await this.handleMessageNode(node, execution, flow, contact)
          break
        case 'list':
          // Handle list messages (same as message but with interactive list)
          await this.handleMessageNode(node, execution, flow, contact)
          break
        case 'condition':
          await this.handleConditionNode(node, execution, flow)
          return
        case 'delay':
          await this.handleDelayNode(node, execution, flow)
          return
        case 'http':
          await this.handleHttpRequestNode(node, execution)
          break
        case 'email':
          await this.handleEmailNode(node, execution)
          break
        case 'menuResponse':
          await this.handleMenuResponseNode(node, execution, flow)
          return
      }

      // Message, buttons, and list nodes pause and wait for reply - don't auto-continue
      if (
        node.type !== 'condition' &&
        node.type !== 'delay' &&
        node.type !== 'message' &&
        node.type !== 'buttons' &&
        node.type !== 'list'
      ) {
        const nextNodeId = this.getNextNodeId(flow, nodeId)
        if (nextNodeId) {
          execution.currentNodeId = nextNodeId
          await execution.save()
          await this.executeNode(executionId, nextNodeId)
        } else {
          await this.completeExecution(executionId)
        }
      }
    } catch (error) {
      console.error(`Error executing node ${nodeId}:`, error)
      execution.status = 'failed'
      await execution.save()
    }
  }

  private async handleMessageNode(
    node: any,
    execution: any,
    flow: any,
    contact: any,
  ): Promise<void> {
    const sessionId = execution.variables.sessionId

    // Get message type from node.type (for buttons/list) or node.data.type (for regular messages)
    const messageType =
      node.type === 'buttons' || node.type === 'list' ? node.type : node.data.messageType || 'text'

    console.log(
      `[FlowExecutor] MessageNode: nodeId=${node.id}, type=${messageType}, sessionId=${sessionId}`,
    )

    if (!sessionId) {
      console.warn('[FlowExecutor] No session ID found for execution', execution.id)
      return
    }

    // Build message content based on type
    let messageContent: MessageContent

    switch (messageType) {
      case 'text':
        const text = this.parseVariables(node.data.text || '', execution, contact)
        messageContent = { type: 'text', text }
        console.log(`[FlowExecutor] Sending text message: "${text}"`)
        break

      case 'image':
        const imageUrl = this.parseVariables(node.data.url || '', execution, contact)
        const imageCaption = node.data.caption
          ? this.parseVariables(node.data.caption, execution, contact)
          : undefined
        messageContent = { type: 'image', url: imageUrl, caption: imageCaption }
        console.log(`[FlowExecutor] Sending image: ${imageUrl}`)
        break

      case 'video':
        const videoUrl = this.parseVariables(node.data.url || '', execution, contact)
        const videoCaption = node.data.caption
          ? this.parseVariables(node.data.caption, execution, contact)
          : undefined
        messageContent = { type: 'video', url: videoUrl, caption: videoCaption }
        console.log(`[FlowExecutor] Sending video: ${videoUrl}`)
        break

      case 'audio':
        const audioUrl = this.parseVariables(node.data.url || '', execution, contact)
        const ptt = node.data.ptt ?? false
        messageContent = { type: 'audio', url: audioUrl, ptt }
        console.log(`[FlowExecutor] Sending audio: ${audioUrl} (PTT: ${ptt})`)
        break

      case 'document':
        const docUrl = this.parseVariables(node.data.url || '', execution, contact)
        const fileName = this.parseVariables(
          node.data.fileName || 'document.pdf',
          execution,
          contact,
        )
        const mimetype = node.data.mimetype || 'application/pdf'
        messageContent = { type: 'document', url: docUrl, fileName, mimetype }
        console.log(`[FlowExecutor] Sending document: ${fileName}`)
        break

      case 'location':
        const latitude = parseFloat(node.data.latitude || '0')
        const longitude = parseFloat(node.data.longitude || '0')
        const locationName = node.data.name
          ? this.parseVariables(node.data.name, execution, contact)
          : undefined
        const address = node.data.address
          ? this.parseVariables(node.data.address, execution, contact)
          : undefined
        messageContent = {
          type: 'location',
          latitude,
          longitude,
          name: locationName,
          address,
        }
        console.log(`[FlowExecutor] Sending location: ${latitude}, ${longitude}`)
        break

      case 'contact':
        const vcard = this.parseVariables(node.data.vcard || '', execution, contact)
        messageContent = { type: 'contact', vcard }
        console.log(`[FlowExecutor] Sending contact card`)
        break

      case 'poll':
        const pollName = this.parseVariables(node.data.name || '', execution, contact)
        const options = (node.data.options || []).map((opt: string) =>
          this.parseVariables(opt, execution, contact),
        )
        const selectableCount = node.data.selectableCount || 1
        messageContent = { type: 'poll', name: pollName, options, selectableCount }
        console.log(`[FlowExecutor] Sending poll: "${pollName}" with ${options.length} options`)
        break

      case 'buttons':
        const buttonsText = this.parseVariables(node.data.text || '', execution, contact)
        const buttons = (node.data.buttons || []).map((btn: any) => ({
          id: btn.id,
          text: this.parseVariables(btn.text, execution, contact),
        }))
        const buttonsFooter = node.data.footer
          ? this.parseVariables(node.data.footer, execution, contact)
          : undefined
        messageContent = { type: 'buttons', text: buttonsText, buttons, footer: buttonsFooter }
        console.log(`[FlowExecutor] Sending buttons message with ${buttons.length} buttons`)
        break

      case 'list':
        const listText = this.parseVariables(node.data.text || '', execution, contact)
        const buttonText = this.parseVariables(node.data.buttonText || 'Menu', execution, contact)
        const sections = (node.data.sections || []).map((section: any) => ({
          title: this.parseVariables(section.title, execution, contact),
          rows: section.rows.map((row: any) => ({
            id: row.id,
            title: this.parseVariables(row.title, execution, contact),
            description: row.description
              ? this.parseVariables(row.description, execution, contact)
              : undefined,
          })),
        }))
        const listFooter = node.data.footer
          ? this.parseVariables(node.data.footer, execution, contact)
          : undefined
        messageContent = { type: 'list', text: listText, buttonText, sections, footer: listFooter }
        console.log(`[FlowExecutor] Sending list message with ${sections.length} sections`)
        break

      default:
        console.warn(`[FlowExecutor] Unknown message type: ${messageType}, defaulting to text`)
        const defaultText = this.parseVariables(node.data.text || '', execution, contact)
        messageContent = { type: 'text', text: defaultText }
        break
    }

    // Send the message with fallback support for interactive messages
    try {
      // Use whatsappId if available (includes @lid or @s.whatsapp.net), otherwise fallback to phoneNumber
      const recipient = contact.whatsappId || contact.phoneNumber
      const isLidAccount = recipient.includes('@lid')

      // Helper function to convert interactive messages to text-based menu
      const convertToTextMenu = (content: MessageContent): string => {
        if (content.type === 'list') {
          let textMenu = content.text + '\n\n'
          content.sections.forEach((section: any, sectionIdx: number) => {
            if (section.title) {
              textMenu += `*${section.title}*\n`
            }
            section.rows.forEach((row: any, rowIdx: number) => {
              const number = sectionIdx * 100 + rowIdx + 1
              textMenu += `${number}. ${row.title}`
              if (row.description) {
                textMenu += ` - ${row.description}`
              }
              textMenu += '\n'
            })
            textMenu += '\n'
          })
          if (content.footer) {
            textMenu += `_${content.footer}_`
          }
          return textMenu
        } else if (content.type === 'buttons') {
          let textMenu = content.text + '\n\n'
          content.buttons.forEach((btn: any, idx: number) => {
            textMenu += `${idx + 1}. ${btn.text}\n`
          })
          if (content.footer) {
            textMenu += `\n_${content.footer}_`
          }
          return textMenu
        }
        return content.type === 'text' ? content.text : ''
      }

      // For LID accounts, always use text fallback for interactive messages
      if (isLidAccount) {
        if (messageContent.type === 'text') {
          console.log(
            `[FlowExecutor] Sending text to LID account ${recipient} using legacy string method`,
          )
          await this.whatsappManager.sendMessage(sessionId, recipient, messageContent.text)
          console.log(`[FlowExecutor] Text message sent successfully to ${recipient}`)
        } else if (messageContent.type === 'list' || messageContent.type === 'buttons') {
          console.log(
            `[FlowExecutor] 🔄 Converting ${messageContent.type} to text menu for LID account ${recipient}`,
          )
          const textMenu = convertToTextMenu(messageContent)
          await this.whatsappManager.sendMessage(sessionId, recipient, textMenu)
          console.log(`[FlowExecutor] ✓ Text menu sent successfully to LID account ${recipient}`)
        } else {
          console.warn(
            `[FlowExecutor] ⚠️  Cannot send ${messageContent.type} message to LID account ${recipient}`,
          )
          console.warn(
            `[FlowExecutor] LID accounts only support text messages. Rich media requires regular WhatsApp accounts.`,
          )
          return // Skip this message for unsupported types
        }
      } else {
        // Regular accounts - try interactive message first, fallback to text if it fails
        try {
          await this.whatsappManager.sendMessage(sessionId, recipient, messageContent)
          console.log(`[FlowExecutor] Message sent successfully to ${recipient}`)
        } catch (interactiveError: any) {
          // If interactive message fails and it's a list/button, try text fallback
          if (messageContent.type === 'list' || messageContent.type === 'buttons') {
            console.warn(
              `[FlowExecutor] ⚠️  Interactive ${messageContent.type} failed, falling back to text menu`,
            )
            console.warn(`[FlowExecutor] Error: ${interactiveError.message}`)
            const textMenu = convertToTextMenu(messageContent)
            await this.whatsappManager.sendMessage(sessionId, recipient, textMenu)
            console.log(`[FlowExecutor] ✓ Text menu fallback sent successfully to ${recipient}`)
          } else {
            // For other message types, re-throw the error
            throw interactiveError
          }
        }
      }
    } catch (error: any) {
      console.error(`[FlowExecutor] Error sending message:`, error)
      throw error
    }

    // Check if there's a next node
    const nextNodeId = this.getNextNodeId(flow, execution.currentNodeId)
    if (nextNodeId) {
      // Check if autoContinue is enabled - if so, don't wait for reply
      if (node.data.autoContinue) {
        console.log(`[FlowExecutor] autoContinue enabled, proceeding to next node without waiting`)
        execution.currentNodeId = nextNodeId
        await execution.save()
        await this.executeNode(execution.id, nextNodeId)
      } else {
        execution.status = 'paused'
        await execution.save()
        console.log(`[FlowExecutor] Flow paused after message, waiting for user reply`)
      }
    } else {
      // No next node, complete the execution
      await this.completeExecution(execution.id)
    }
  }

  /**
   * Resume a paused flow execution when the user sends a reply
   */
  async resumeFlow(executionId: string, userMessage: string, sessionId: string) {
    // Use findByIdAndUpdate with { new: true } to ensure atomic update and return updated document
    const execution = await FlowExecution.findByIdAndUpdate(
      executionId,
      {
        $set: {
          'variables.message': userMessage,
          'variables.sessionId': sessionId,
          status: 'running',
        },
      },
      { new: true }, // Return the updated document
    )

    if (!execution) {
      console.log(`[FlowExecutor] Execution ${executionId} not found`)
      return false // Allow checking for new flows
    }

    const flow = await Flow.findById(execution.flowId)
    if (!flow) {
      console.log(
        `[FlowExecutor] ⚠️  Flow for execution ${executionId} not found (orphaned execution) - marking as failed`,
      )
      // Clean up orphaned execution - the flow was deleted
      execution.status = 'failed'
      await execution.save()
      return false // Allow checking for new flows
    }

    console.log(
      `[FlowExecutor] Resuming flow execution ${executionId} with message: "${userMessage}"`,
    )

    // Continue to the next node
    const nextNodeId = this.getNextNodeId(flow, execution.currentNodeId)

    if (nextNodeId) {
      execution.currentNodeId = nextNodeId
      await execution.save()
      await this.executeNode(executionId, nextNodeId)
    } else {
      await this.completeExecution(executionId)
    }
    return true // Execution resumed successfully
  }

  private async handleConditionNode(node: any, execution: any, flow: any) {
    const conditionKeyword = node.data.condition?.toLowerCase() || ''
    const incomingMessage = execution.variables.message?.toLowerCase() || ''

    const isTrue = incomingMessage.includes(conditionKeyword)
    console.log(
      `Condition Node ${node.id}: "${incomingMessage}" includes "${conditionKeyword}"? ${isTrue}`,
    )

    const edges = flow.edges
    const nextEdge = edges.find(
      (edge: any) => edge.source === node.id && edge.sourceHandle === (isTrue ? 'true' : 'false'),
    )

    if (nextEdge) {
      const nextNodeId = nextEdge.target
      execution.currentNodeId = nextNodeId
      await execution.save()
      await this.executeNode(execution.id, nextNodeId)
    } else {
      console.log(`No edge found for condition result ${isTrue} from node ${node.id}`)
      await this.completeExecution(execution.id)
    }
  }

  /**
   * Handle menu response node - routes based on user's reply matching configured options
   */
  private async handleMenuResponseNode(node: any, execution: any, flow: any) {
    const userMessage = (execution.variables.message || '').trim()
    const options = node.data.options || []
    const matchType = node.data.matchType || 'exact'

    console.log(
      `[FlowExecutor] MenuResponse Node ${node.id}: checking "${userMessage}" against ${options.length} options (matchType: ${matchType})`,
    )

    // Debug: Log all options
    console.log('[FlowExecutor] Available options:')
    options.forEach((opt: any, idx: number) => {
      console.log(`  [${idx}] id="${opt.id}" value="${opt.value}" label="${opt.label}"`)
    })

    // Debug: Log all edges from this node
    const nodeEdges = flow.edges.filter((e: any) => e.source === node.id)
    console.log('[FlowExecutor] Edges from this node:')
    nodeEdges.forEach((e: any) => {
      console.log(`  sourceHandle="${e.sourceHandle}" -> target="${e.target}"`)
    })

    // Find matching option
    let matchedOption = null
    for (const opt of options) {
      const optValue = (opt.value || '').trim()
      let isMatch = false

      switch (matchType) {
        case 'exact':
          isMatch = userMessage.toLowerCase() === optValue.toLowerCase()
          break
        case 'contains':
          isMatch = userMessage.toLowerCase().includes(optValue.toLowerCase())
          break
        case 'number':
          // For number matching, we check if user typed the number or the exact value
          isMatch = userMessage === optValue || userMessage.toLowerCase() === optValue.toLowerCase()
          break
        default:
          isMatch = userMessage.toLowerCase() === optValue.toLowerCase()
      }

      console.log(
        `[FlowExecutor]   Checking "${optValue}" (${opt.label}): ${isMatch ? '✓ MATCH' : '✗ no match'}`,
      )

      if (isMatch) {
        matchedOption = opt
        console.log(
          `[FlowExecutor] ✓ Matched option: "${opt.value}" (${opt.label}) with handle "${opt.id}"`,
        )
        break
      }
    }

    // Determine which handle to use
    const handleId = matchedOption ? matchedOption.id : 'default'
    console.log(`[FlowExecutor] Using output handle: ${handleId}`)

    // Find the edge connected to this handle
    const nextEdge = flow.edges.find(
      (edge: any) => edge.source === node.id && edge.sourceHandle === handleId,
    )

    if (nextEdge) {
      console.log(`[FlowExecutor] Routing to node: ${nextEdge.target}`)
      execution.currentNodeId = nextEdge.target
      await execution.save()
      await this.executeNode(execution.id, nextEdge.target)
    } else {
      // If no edge for matched handle, try default
      if (handleId !== 'default') {
        const defaultEdge = flow.edges.find(
          (edge: any) => edge.source === node.id && edge.sourceHandle === 'default',
        )
        if (defaultEdge) {
          console.log(
            `[FlowExecutor] No edge for ${handleId}, falling back to default: ${defaultEdge.target}`,
          )
          execution.currentNodeId = defaultEdge.target
          await execution.save()
          await this.executeNode(execution.id, defaultEdge.target)
          return
        }
      }
      console.log(`[FlowExecutor] No edge found for handle "${handleId}" from node ${node.id}`)
      await this.completeExecution(execution.id)
    }
  }

  private async handleDelayNode(node: any, execution: any, flow: any) {
    const delaySeconds = parseInt(node.data.delay || '5')
    console.log(`Delay Node ${node.id}: Scheduling next execution in ${delaySeconds} seconds`)

    const nextNodeId = this.getNextNodeId(flow, node.id)
    if (nextNodeId) {
      if (flowQueue) {
        await flowQueue.add(
          'execute-node',
          { executionId: execution.id, nodeId: nextNodeId },
          { delay: delaySeconds * 1000 },
        )
      } else {
        console.log('Queue disabled, skipping delayed node scheduling.')
      }

      execution.currentNodeId = nextNodeId
      await execution.save()
    } else {
      await this.completeExecution(execution.id)
    }
  }

  private async handleHttpRequestNode(node: any, execution: any) {
    const method = (node.data.method || 'GET').toUpperCase()
    const url = this.parseVariables(node.data.url || '', execution, null)
    const headers = node.data.headers || {}
    const body = node.data.body
      ? JSON.parse(this.parseVariables(node.data.body, execution, null))
      : undefined

    console.log(`HTTP Request Node ${node.id}: ${method} ${url}`)

    try {
      const response = await axios({
        method,
        url,
        headers,
        data: body,
        timeout: 30000,
      })

      execution.variables.httpResponse = response.data
      execution.variables.httpStatus = response.status
      await execution.save()

      console.log(`HTTP Request successful: ${response.status}`)
    } catch (error: any) {
      console.error(`HTTP Request failed:`, error.message)
      execution.variables.httpError = error.message
      execution.variables.httpStatus = error.response?.status || 0
      await execution.save()
    }
  }

  private async handleEmailNode(node: any, execution: any) {
    if (!this.emailTransporter) {
      console.error('Email transporter not configured')
      execution.variables.emailError = 'Email not configured'
      await execution.save()
      return
    }

    const to = this.parseVariables(node.data.to || '', execution, null)
    const subject = this.parseVariables(node.data.subject || 'No Subject', execution, null)
    const body = this.parseVariables(node.data.body || '', execution, null)
    const from = process.env.SMTP_USER || 'noreply@example.com'

    console.log(`Email Node ${node.id}: Sending to ${to}`)

    try {
      const info = await this.emailTransporter.sendMail({
        from,
        to,
        subject,
        text: body,
        html: body.replace(/\n/g, '<br>'),
      })

      execution.variables.emailMessageId = info.messageId
      execution.variables.emailSent = true
      await execution.save()

      console.log(`Email sent successfully: ${info.messageId}`)
    } catch (error: any) {
      console.error(`Email failed:`, error.message)
      execution.variables.emailError = error.message
      execution.variables.emailSent = false
      await execution.save()
    }
  }

  private getNextNodeId(flow: any, currentNodeId: string): string | null {
    const edge = flow.edges.find((e: any) => e.source === currentNodeId)
    return edge ? edge.target : null
  }

  private async completeExecution(executionId: string) {
    await FlowExecution.findByIdAndUpdate(executionId, { status: 'completed' })
  }

  private parseVariables(text: string, execution: any, contact: any): string {
    return text.replace(/\{\{(.*?)\}\}/g, (_, key) => {
      return this.getVariableValue(key.trim(), execution, contact)
    })
  }

  private getVariableValue(key: string, execution: any, contact: any): any {
    const [scope, field] = key.split('.')
    if (scope === 'contact' && contact) return (contact as any)[field]
    if (scope === 'flow') return execution.variables[field]
    return ''
  }
}
