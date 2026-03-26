import type {
  EnumValues,
  FileItem,
  ImageItem,
  IMessageItem,
  RefMessage,
  TextItem,
  VideoItem,
  VoiceItem,
} from '../types'
import { MessageItemType } from '../types'

export class MessageItem<
  T extends EnumValues<typeof MessageItemType>,
> implements IMessageItem<T> {
  type?: T
  create_time_ms?: number
  update_time_ms?: number
  is_completed?: boolean
  msg_id?: string
  ref_msg?: RefMessage
  text_item?: T extends typeof MessageItemType.TEXT ? TextItem : never
  image_item?: T extends typeof MessageItemType.IMAGE ? ImageItem : never
  voice_item?: T extends typeof MessageItemType.VOICE ? VoiceItem : never
  file_item?: T extends typeof MessageItemType.FILE ? FileItem : never
  video_item?: T extends typeof MessageItemType.VIDEO ? VideoItem : never
}

export class MessageItemBuilder<T extends EnumValues<typeof MessageItemType>> {
  static create<E extends EnumValues<typeof MessageItemType>>(
    type: E,
  ): MessageItemBuilder<E> {
    const builder = new MessageItemBuilder<E>(type)
    return builder
  }

  private messageItem: MessageItem<T>
  constructor(type: T) {
    this.messageItem = new MessageItem<T>()
    this.messageItem.type = type
  }

  withCreateTimeMs(create_time_ms: number): this {
    this.messageItem.create_time_ms = create_time_ms
    return this
  }

  withUpdateTimeMs(update_time_ms: number): this {
    this.messageItem.update_time_ms = update_time_ms
    return this
  }

  withIsCompleted(is_completed: boolean): this {
    this.messageItem.is_completed = is_completed
    return this
  }

  withMsgId(msg_id: string): this {
    this.messageItem.msg_id = msg_id
    return this
  }

  withRefMsg(ref_msg: RefMessage): this {
    this.messageItem.ref_msg = ref_msg
    return this
  }

  withTextItem(text_item: TextItem): this {
    if (this.messageItem.type !== MessageItemType.TEXT) {
      throw new Error(
        `Invalid message item type for text item: ${this.messageItem.type}`,
      )
    }
    this.messageItem.text_item = text_item as any
    return this
  }

  withImageItem(image_item: ImageItem): this {
    if (this.messageItem.type !== MessageItemType.IMAGE) {
      throw new Error(
        `Invalid message item type for image item: ${this.messageItem.type}`,
      )
    }
    this.messageItem.image_item = image_item as any
    return this
  }

  withVoiceItem(voice_item: VoiceItem): this {
    if (this.messageItem.type !== MessageItemType.VOICE) {
      throw new Error(
        `Invalid message item type for voice item: ${this.messageItem.type}`,
      )
    }
    this.messageItem.voice_item = voice_item as any
    return this
  }

  withFileItem(file_item: FileItem): this {
    if (this.messageItem.type !== MessageItemType.FILE) {
      throw new Error(
        `Invalid message item type for file item: ${this.messageItem.type}`,
      )
    }
    this.messageItem.file_item = file_item as any
    return this
  }

  withVideoItem(video_item: VideoItem): this {
    if (this.messageItem.type !== MessageItemType.VIDEO) {
      throw new Error(
        `Invalid message item type for video item: ${this.messageItem.type}`,
      )
    }
    this.messageItem.video_item = video_item as any
    return this
  }

  build(): MessageItem<T> {
    return this.messageItem
  }
}
