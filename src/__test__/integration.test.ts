import type { QRCodeShower } from '../wechat/auth/interfaces.js'
import type {
  GetUpdatesResp,
  LoginCredentials,
  QRCode,
  QRStatusResponse,
} from '../wechat/types.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClient } from '../wechat/api.js'
import {
  InMemoryCredentialsStore,
} from '../wechat/auth/credentials-store.js'
import { QRCodeLoginExecutor } from '../wechat/auth/login-executor.js'
import { MessageItemType, MessageType } from '../wechat/types.js'

describe('integration Tests - 完整微信机器人流程', () => {
  let credentialsStore: InMemoryCredentialsStore
  let apiClient: ApiClient
  let mockQRCodeShower: QRCodeShower

  beforeEach(() => {
    credentialsStore = new InMemoryCredentialsStore()
    apiClient = new ApiClient(credentialsStore)
    mockQRCodeShower = {
      show: vi.fn(),
    }
    vi.clearAllMocks()
  })

  it('should complete full bot lifecycle: login -> receive message -> send reply', async () => {
    const mockQRCode: QRCode = {
      qrcode: 'test-qrcode',
      qrcode_img_content: 'https://example.com/qr',
    }

    const mockLoginResponse: QRStatusResponse = {
      status: 'confirmed',
      bot_token: 'bot-token-123',
      ilink_bot_id: 'bot-456',
      baseurl: 'https://ilinkai.weixin.qq.com',
      ilink_user_id: 'user-789',
    }

    const mockIncomingMessage: GetUpdatesResp = {
      ret: 0,
      msgs: [
        {
          from_user_id: 'user-001',
          to_user_id: 'bot-456',
          message_type: MessageType.USER,
          message_state: 2,
          item_list: [
            {
              type: MessageItemType.TEXT,
              text_item: { text: '你好，机器人' },
            },
          ],
          context_token: 'context-abc',
        },
      ],
      get_updates_buf: 'next-buffer-123',
    }

    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockQRCode,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockLoginResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockIncomingMessage),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ ret: 0 }),
      })

    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const loginExecutor = new QRCodeLoginExecutor(
      credentialsStore,
      mockQRCodeShower,
    )
    const credentials = await loginExecutor.execute()

    expect(credentials.token).toBe('bot-token-123')
    expect(credentials.accountId).toBe('bot-456')
    expect(mockQRCodeShower.show).toHaveBeenCalledWith(mockQRCode)

    const updates = await apiClient.getUpdates('initial-buffer')

    expect(updates.msgs).toHaveLength(1)
    const incomingMsg = updates.msgs![0]
    expect(incomingMsg.from_user_id).toBe('user-001')
    expect(incomingMsg.item_list?.[0].text_item?.text).toBe('你好，机器人')

    await apiClient.sendTextMessage(
      incomingMsg.from_user_id!,
      '你好！我是机器人助手',
      incomingMsg.context_token,
    )

    expect(globalThis.fetch).toHaveBeenCalledTimes(4)

    const sendMessageCall = (globalThis.fetch as any).mock.calls[3]
    expect(sendMessageCall[0]).toContain('sendmessage')
    const sentBody = JSON.parse(sendMessageCall[1].body)
    expect(sentBody.msg.to_user_id).toBe('user-001')
    expect(sentBody.msg.item_list[0].text_item.text).toBe('你好！我是机器人助手')
    expect(sentBody.msg.context_token).toBe('context-abc')

    consoleLogSpy.mockRestore()
  })

  it('should reuse saved credentials on subsequent runs', async () => {
    const savedCredentials: LoginCredentials = {
      token: 'saved-token',
      baseUrl: 'https://ilinkai.weixin.qq.com',
      accountId: 'saved-bot-id',
      userId: 'saved-user-id',
    }

    await credentialsStore.save(savedCredentials)

    const loginExecutor = new QRCodeLoginExecutor(
      credentialsStore,
      mockQRCodeShower,
    )

    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const credentials = await loginExecutor.execute()

    expect(credentials).toEqual(savedCredentials)
    expect(mockQRCodeShower.show).not.toHaveBeenCalled()
    expect(globalThis.fetch).not.toHaveBeenCalled()
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('使用已保存的凭证'),
    )

    consoleLogSpy.mockRestore()
  })

  it('should handle long polling timeout gracefully', async () => {
    const credentials: LoginCredentials = {
      token: 'test-token',
      baseUrl: 'https://api.test.com',
      accountId: 'bot-123',
    }

    await credentialsStore.save(credentials)

    const abortError = new Error('The operation was aborted')
    abortError.name = 'AbortError'
    globalThis.fetch = vi.fn().mockRejectedValue(abortError)

    const result = await apiClient.getUpdates('test-buffer')

    expect(result).toEqual({
      ret: 0,
      msgs: [],
      get_updates_buf: 'test-buffer',
    })
  })

  it('should handle multiple messages in one update', async () => {
    const credentials: LoginCredentials = {
      token: 'test-token',
      baseUrl: 'https://api.test.com',
      accountId: 'bot-123',
    }

    await credentialsStore.save(credentials)

    const multipleMessages: GetUpdatesResp = {
      ret: 0,
      msgs: [
        {
          from_user_id: 'user-001',
          item_list: [{ type: MessageItemType.TEXT, text_item: { text: '消息1' } }],
        },
        {
          from_user_id: 'user-002',
          item_list: [{ type: MessageItemType.TEXT, text_item: { text: '消息2' } }],
        },
        {
          from_user_id: 'user-003',
          item_list: [{ type: MessageItemType.TEXT, text_item: { text: '消息3' } }],
        },
      ],
      get_updates_buf: 'next-buffer',
    }

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(multipleMessages),
    })

    const updates = await apiClient.getUpdates('buffer')

    expect(updates.msgs).toHaveLength(3)
    expect(updates.msgs![0].from_user_id).toBe('user-001')
    expect(updates.msgs![1].from_user_id).toBe('user-002')
    expect(updates.msgs![2].from_user_id).toBe('user-003')
  })

  it('should handle continuous polling loop', async () => {
    const credentials: LoginCredentials = {
      token: 'test-token',
      baseUrl: 'https://api.test.com',
      accountId: 'bot-123',
    }

    await credentialsStore.save(credentials)

    const emptyResponse: GetUpdatesResp = {
      ret: 0,
      msgs: [],
      get_updates_buf: 'buffer-1',
    }

    const messageResponse: GetUpdatesResp = {
      ret: 0,
      msgs: [
        {
          from_user_id: 'user-001',
          item_list: [{ type: MessageItemType.TEXT, text_item: { text: 'Hello' } }],
        },
      ],
      get_updates_buf: 'buffer-2',
    }

    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(emptyResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(messageResponse),
      })

    const updates1 = await apiClient.getUpdates('initial')
    expect(updates1.msgs).toHaveLength(0)
    expect(updates1.get_updates_buf).toBe('buffer-1')

    const updates2 = await apiClient.getUpdates(updates1.get_updates_buf!)
    expect(updates2.msgs).toHaveLength(1)
    expect(updates2.get_updates_buf).toBe('buffer-2')
  })
})
