import type {
  EnumValues,
  IMessageItem,
  MessageState,
  MessageType,
  WeixinMessage,
} from '../types'
import {

  MessageItemType,

} from '../types'

export class Message implements WeixinMessage {
  seq?: number
  message_id?: number
  from_user_id?: string
  to_user_id?: string
  client_id?: string
  create_time_ms?: number
  session_id?: string
  message_type?: EnumValues<typeof MessageType>
  message_state?: EnumValues<typeof MessageState>
  item_list?: IMessageItem[]
  context_token?: string
  constructor(msg: WeixinMessage = {}) {
    Object.assign(this, msg)
  }

  get content(): string {
    const items = this.item_list
    if (!items?.length)
      return ''

    for (const item of items) {
      if (item.type === MessageItemType.TEXT && item.text_item?.text) {
        const ref = item.ref_msg
        const text = item.text_item.text
        if (!ref)
          return text
        const parts: string[] = []
        if (ref.title)
          parts.push(ref.title)
        return parts.length ? `[引用: ${parts.join(' | ')}]\n${text}` : text
      }
    }
    return ''
  }
}

export class MessageBuilder {
  private msg: Partial<Message> = {}

  withClientId(clientId: string): MessageBuilder {
    this.msg.client_id = clientId
    return this
  }

  withToUserId(toUserId: string): MessageBuilder {
    this.msg.to_user_id = toUserId
    return this
  }

  withMessageType(messageType: EnumValues<typeof MessageType>): MessageBuilder {
    this.msg.message_type = messageType
    return this
  }

  withFromUserId(fromUserId: string): MessageBuilder {
    this.msg.from_user_id = fromUserId
    return this
  }

  withSessionId(sessionId: string): MessageBuilder {
    this.msg.session_id = sessionId
    return this
  }

  withCreateTimeMs(createTimeMs: number): MessageBuilder {
    this.msg.create_time_ms = createTimeMs
    return this
  }

  withContextToken(token?: string): MessageBuilder {
    this.msg.context_token = token
    return this
  }

  withMessageState(
    messageState: EnumValues<typeof MessageState>,
  ): MessageBuilder {
    this.msg.message_state = messageState
    return this
  }

  addItem(item: IMessageItem): MessageBuilder {
    if (!this.msg.item_list)
      this.msg.item_list = []
    this.msg.item_list.push(item)
    return this
  }

  build(): Message {
    return new Message(this.msg)
  }
}
