import type { CredentialsStore } from '../wechat/auth/interfaces'
import type { GetUpdatesResp, LoginCredentials } from '../wechat/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClient } from '../wechat/api'
import { MessageItemType, MessageState, MessageType } from '../wechat/types'

describe('apiClient', () => {
  let mockCredentialsStore: CredentialsStore
  let apiClient: ApiClient

  const mockCredentials: LoginCredentials = {
    token: 'test-token-123',
    baseUrl: 'https://api.example.com',
    accountId: 'account-456',
    userId: 'user-789',
  }

  beforeEach(() => {
    mockCredentialsStore = {
      load: vi.fn().mockResolvedValue(mockCredentials),
      save: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    }
    apiClient = new ApiClient(mockCredentialsStore)
    vi.clearAllMocks()
  })

  describe('getUpdates', () => {
    it('should fetch updates successfully', async () => {
      const mockResponse: GetUpdatesResp = {
        ret: 0,
        msgs: [
          {
            from_user_id: 'user-1',
            to_user_id: 'bot-1',
            message_type: MessageType.USER,
            item_list: [{ type: MessageItemType.TEXT, text_item: { text: 'Hello' } }],
          },
        ],
        get_updates_buf: 'next-buf-123',
      }

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockResponse),
      })

      const result = await apiClient.getUpdates('initial-buf')

      expect(result).toEqual(mockResponse)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.example.com/ilink/bot/getupdates',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token-123',
            'AuthorizationType': 'ilink_bot_token',
          }),
          body: JSON.stringify({ get_updates_buf: 'initial-buf' }),
        }),
      )
    })

    it('should handle AbortError and return empty updates', async () => {
      const abortError = new Error('The operation was aborted')
      abortError.name = 'AbortError'
      globalThis.fetch = vi.fn().mockRejectedValue(abortError)

      const result = await apiClient.getUpdates('test-buf')

      expect(result).toEqual({
        ret: 0,
        msgs: [],
        get_updates_buf: 'test-buf',
      })
    })

    it('should throw error when API returns error status', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      })

      await expect(apiClient.getUpdates('test-buf')).rejects.toThrow(
        'API ilink/bot/getupdates responded 500: Internal Server Error',
      )
    })

    it('should throw error when no credentials available', async () => {
      mockCredentialsStore.load = vi.fn().mockResolvedValue(null)

      await expect(apiClient.getUpdates('test-buf')).rejects.toThrow(
        'No credentials available',
      )
    })

    it('should accept custom timeout parameter', async () => {
      const mockResponse: GetUpdatesResp = { ret: 0, msgs: [], get_updates_buf: 'buf' }
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockResponse),
      })

      await apiClient.getUpdates('test-buf', 60000)

      expect(globalThis.fetch).toHaveBeenCalled()
    })
  })

  describe('sendTextMessage', () => {
    it('should send text message successfully', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ ret: 0 }),
      })

      await apiClient.sendTextMessage('user-123', 'Hello World')

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.example.com/ilink/bot/sendmessage',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token-123',
          }),
        }),
      )

      const callArgs = (globalThis.fetch as any).mock.calls[0]
      const body = JSON.parse(callArgs[1].body)
      expect(body.msg.to_user_id).toBe('user-123')
      expect(body.msg.message_type).toBe(MessageType.BOT)
      expect(body.msg.message_state).toBe(MessageState.FINISH)
      expect(body.msg.item_list).toHaveLength(1)
      expect(body.msg.item_list[0].text_item.text).toBe('Hello World')
      expect(body.msg.client_id).toMatch(/^bot-\d+-[a-z0-9]+$/)
    })

    it('should send message with context token', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ ret: 0 }),
      })

      await apiClient.sendTextMessage('user-123', 'Reply', 'context-token-abc')

      const callArgs = (globalThis.fetch as any).mock.calls[0]
      const body = JSON.parse(callArgs[1].body)
      expect(body.msg.context_token).toBe('context-token-abc')
    })

    it('should send message with empty items when text is empty', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ ret: 0 }),
      })

      await apiClient.sendTextMessage('user-123', '')

      const callArgs = (globalThis.fetch as any).mock.calls[0]
      const body = JSON.parse(callArgs[1].body)
      expect(body.msg.item_list).toBeUndefined()
    })

    it('should throw error when send fails', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      })

      await expect(
        apiClient.sendTextMessage('user-123', 'Hello'),
      ).rejects.toThrow('API ilink/bot/sendmessage responded 400: Bad Request')
    })

    it('should include correct headers', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ ret: 0 }),
      })

      await apiClient.sendTextMessage('user-123', 'Test')

      const callArgs = (globalThis.fetch as any).mock.calls[0]
      const headers = callArgs[1].headers
      expect(headers['Content-Type']).toBe('application/json')
      expect(headers.Authorization).toBe('Bearer test-token-123')
      expect(headers.AuthorizationType).toBe('ilink_bot_token')
      expect(headers['X-WECHAT-UIN']).toBeDefined()
      expect(headers['Content-Length']).toBeDefined()
    })
  })

  describe('baseUrl handling', () => {
    it('should handle baseUrl with trailing slash', async () => {
      mockCredentialsStore.load = vi.fn().mockResolvedValue({
        ...mockCredentials,
        baseUrl: 'https://api.example.com/',
      })
      apiClient = new ApiClient(mockCredentialsStore)

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ ret: 0, msgs: [] }),
      })

      await apiClient.getUpdates('test-buf')

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.example.com/ilink/bot/getupdates',
        expect.any(Object),
      )
    })

    it('should handle baseUrl without trailing slash', async () => {
      mockCredentialsStore.load = vi.fn().mockResolvedValue({
        ...mockCredentials,
        baseUrl: 'https://api.example.com',
      })
      apiClient = new ApiClient(mockCredentialsStore)

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ ret: 0, msgs: [] }),
      })

      await apiClient.getUpdates('test-buf')

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.example.com/ilink/bot/getupdates',
        expect.any(Object),
      )
    })
  })
})
