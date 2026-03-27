import { describe, expect, it } from 'vitest'
import { Message, MessageBuilder, MessageItemType, MessageState, MessageType } from '../wechat/index.js'

describe('message', () => {
  describe('constructor', () => {
    it('should create empty message with default constructor', () => {
      const msg = new Message()
      expect(msg.from_user_id).toBeUndefined()
      expect(msg.to_user_id).toBeUndefined()
      expect(msg.message_type).toBeUndefined()
    })

    it('should create message from partial data', () => {
      const msg = new Message({
        from_user_id: 'user123',
        to_user_id: 'user456',
        message_type: MessageType.USER,
      })
      expect(msg.from_user_id).toBe('user123')
      expect(msg.to_user_id).toBe('user456')
      expect(msg.message_type).toBe(MessageType.USER)
    })

    it('should create message with all fields', () => {
      const msg = new Message({
        seq: 1,
        message_id: 100,
        from_user_id: 'user123',
        to_user_id: 'user456',
        client_id: 'client-123',
        create_time_ms: Date.now(),
        session_id: 'session-1',
        message_type: MessageType.BOT,
        message_state: MessageState.FINISH,
        context_token: 'token-abc',
        item_list: [{ type: MessageItemType.TEXT, text_item: { text: 'hello' } }],
      })
      expect(msg.seq).toBe(1)
      expect(msg.message_id).toBe(100)
      expect(msg.context_token).toBe('token-abc')
    })
  })

  describe('content getter', () => {
    it('should return empty string when no item_list', () => {
      const msg = new Message()
      expect(msg.content).toBe('')
    })

    it('should return empty string when item_list is empty', () => {
      const msg = new Message({ item_list: [] })
      expect(msg.content).toBe('')
    })

    it('should extract text from text_item', () => {
      const msg = new Message({
        item_list: [{ type: MessageItemType.TEXT, text_item: { text: 'Hello World' } }],
      })
      expect(msg.content).toBe('Hello World')
    })

    it('should return empty string when text_item has no text', () => {
      const msg = new Message({
        item_list: [{ type: MessageItemType.TEXT, text_item: {} }],
      })
      expect(msg.content).toBe('')
    })

    it('should handle message with reference', () => {
      const msg = new Message({
        item_list: [
          {
            type: MessageItemType.TEXT,
            text_item: { text: 'Reply text' },
            ref_msg: { title: 'Original message' },
          },
        ],
      })
      expect(msg.content).toBe('[引用: Original message]\nReply text')
    })

    it('should handle text without reference title', () => {
      const msg = new Message({
        item_list: [
          {
            type: MessageItemType.TEXT,
            text_item: { text: 'Reply text' },
            ref_msg: {},
          },
        ],
      })
      expect(msg.content).toBe('Reply text')
    })

    it('should skip non-text items', () => {
      const msg = new Message({
        item_list: [
          { type: MessageItemType.IMAGE },
          { type: MessageItemType.TEXT, text_item: { text: 'Found text' } },
        ],
      })
      expect(msg.content).toBe('Found text')
    })
  })
})

describe('messageBuilder', () => {
  it('should build message with content', () => {
    const msg = new MessageBuilder().addItem({ text_item: { text: 'Hello' }, type: MessageItemType.TEXT }).build()
    expect(msg.item_list).toHaveLength(1)
    expect(msg.item_list?.[0].type).toBe(MessageItemType.TEXT)
    expect(msg.item_list?.[0].text_item?.text).toBe('Hello')
  })

  it('should not add item_list when content is empty', () => {
    const msg = new MessageBuilder().addItem({ text_item: { text: '' }, type: MessageItemType.TEXT }).build()
    expect(msg.item_list).toBeUndefined()
  })

  it('should build message with client_id', () => {
    const msg = new MessageBuilder().withClientId('client-123').build()
    expect(msg.client_id).toBe('client-123')
  })

  it('should build message with to_user_id', () => {
    const msg = new MessageBuilder().withToUserId('user-456').build()
    expect(msg.to_user_id).toBe('user-456')
  })

  it('should build message with from_user_id', () => {
    const msg = new MessageBuilder().withFromUserId('user-123').build()
    expect(msg.from_user_id).toBe('user-123')
  })

  it('should build message with message_type', () => {
    const msg = new MessageBuilder().withMessageType(MessageType.BOT).build()
    expect(msg.message_type).toBe(MessageType.BOT)
  })

  it('should build message with session_id', () => {
    const msg = new MessageBuilder().withSessionId('session-1').build()
    expect(msg.session_id).toBe('session-1')
  })

  it('should build message with create_time_ms', () => {
    const timestamp = Date.now()
    const msg = new MessageBuilder().withCreateTimeMs(timestamp).build()
    expect(msg.create_time_ms).toBe(timestamp)
  })

  it('should build message with context_token', () => {
    const msg = new MessageBuilder().withContextToken('token-abc').build()
    expect(msg.context_token).toBe('token-abc')
  })

  it('should build message with message_state', () => {
    const msg = new MessageBuilder().withMessageState(MessageState.FINISH).build()
    expect(msg.message_state).toBe(MessageState.FINISH)
  })

  it('should build message with custom item_list', () => {
    const msg = new MessageBuilder().addItem({ text_item: { text: 'Hello' }, type: MessageItemType.TEXT }).addItem({ type: MessageItemType.IMAGE }).build()
    expect(msg.item_list).toEqual([
      { text_item: { text: 'Hello' }, type: MessageItemType.TEXT },
      { type: MessageItemType.IMAGE },
    ])
  })

  it('should allow chaining all methods', () => {
    const timestamp = Date.now()
    const msg = new MessageBuilder()
      .addItem({ text_item: { text: 'Hello' }, type: MessageItemType.TEXT })
      .withClientId('client-123')
      .withToUserId('user-456')
      .withFromUserId('user-123')
      .withMessageType(MessageType.USER)
      .withSessionId('session-1')
      .withCreateTimeMs(timestamp)
      .withContextToken('token-abc')
      .withMessageState(MessageState.FINISH)
      .build()

    expect(msg.client_id).toBe('client-123')
    expect(msg.to_user_id).toBe('user-456')
    expect(msg.from_user_id).toBe('user-123')
    expect(msg.message_type).toBe(MessageType.USER)
    expect(msg.session_id).toBe('session-1')
    expect(msg.create_time_ms).toBe(timestamp)
    expect(msg.context_token).toBe('token-abc')
    expect(msg.message_state).toBe(MessageState.FINISH)
    expect(msg.item_list).toHaveLength(1)
    expect(msg.item_list?.[0].text_item?.text).toBe('Hello')
  })
})
