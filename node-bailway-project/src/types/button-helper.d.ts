declare module '@ryuu-reinzz/button-helper' {
  import { WASocket } from '@whiskeysockets/baileys'

  export interface Button {
    type: number
    displayText: string
    id: string
  }

  export interface ButtonsOptions {
    text: string
    buttons: Button[]
    footer?: string
  }

  export interface ListSection {
    title: string
    rows: Array<{
      id: string
      title: string
      description?: string
    }>
  }

  export interface ListOptions {
    text: string
    buttonText: string
    sections: ListSection[]
    footer?: string
  }

  export function sendButtons(socket: WASocket, jid: string, options: ButtonsOptions): Promise<void>

  export function sendList(socket: WASocket, jid: string, options: ListOptions): Promise<void>
}
