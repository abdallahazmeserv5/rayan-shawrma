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

  async handleIncomingMessage(sessionId: string, from: string, text: string) {
    const phoneNumber = from.replace('@s.whatsapp.net', '').replace('@lid', '')
    console.log(
      `[FlowExecutor] Received message from ${phoneNumber}: "${text}" on session "${sessionId}"`,
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
      if (flow.triggerType === 'message') {
        console.log(
          `[FlowExecutor] ✓ Triggering flow "${flow.name}" (message trigger) for session "${sessionId}" (${phoneNumber})`,
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
      }

      // Message nodes pause and wait for reply - don't auto-continue
      if (node.type !== 'condition' && node.type !== 'delay' && node.type !== 'message') {
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

  private async handleMessageNode(node: any, execution: any, flow: any, contact: any) {
    const sessionId = execution.variables.sessionId
    const messageType = node.data.messageType || 'text' // Default to text for backwards compatibility

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

    // Send the message
    try {
      // Use whatsappId if available (includes @lid or @s.whatsapp.net), otherwise fallback to phoneNumber
      const recipient = contact.whatsappId || contact.phoneNumber

      // Check if this is a LID account (WhatsApp Channel)
      if (recipient.includes('@lid')) {
        // LID accounts have issues with MessageContent objects - use old text-only method
        if (messageContent.type === 'text') {
          console.log(
            `[FlowExecutor] Sending text to LID account ${recipient} using legacy string method`,
          )
          // Pass as string instead of MessageContent to avoid parsing issues
          await this.whatsappManager.sendMessage(sessionId, recipient, messageContent.text)
          console.log(`[FlowExecutor] Text message sent successfully to ${recipient}`)
        } else {
          console.warn(
            `[FlowExecutor] ⚠️  Cannot send ${messageContent.type} message to LID account ${recipient}`,
          )
          console.warn(
            `[FlowExecutor] LID accounts only support text messages. Rich media requires regular WhatsApp accounts.`,
          )
        }
      } else {
        // Regular accounts support full MessageContent
        await this.whatsappManager.sendMessage(sessionId, recipient, messageContent)
        console.log(`[FlowExecutor] Message sent successfully to ${recipient}`)
      }
    } catch (error: any) {
      console.error(`[FlowExecutor] Error sending message:`, error)
      throw error
    }

    // Check if there's a next node - if so, pause and wait for reply
    const nextNodeId = this.getNextNodeId(flow, execution.currentNodeId)
    if (nextNodeId) {
      execution.status = 'paused'
      await execution.save()
      console.log(`[FlowExecutor] Flow paused after message, waiting for user reply`)
    } else {
      // No next node, complete the execution
      await this.completeExecution(execution.id)
    }
  }

  /**
   * Resume a paused flow execution when the user sends a reply
   */
  async resumeFlow(executionId: string, userMessage: string, sessionId: string) {
    const execution = await FlowExecution.findById(executionId)
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

    console.log(`[FlowExecutor] Resuming flow execution ${executionId}`)

    // Store the user's reply in variables for condition nodes
    execution.variables.message = userMessage
    execution.variables.sessionId = sessionId // Ensure sessionId is up-to-date
    execution.status = 'running'
    await execution.save()

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
