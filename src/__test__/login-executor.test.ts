import type { CredentialsStore, QRCodeShower } from '../wechat/auth/interfaces.js'
import type { LoginCredentials, QRCode, QRStatusResponse } from '../wechat/types.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QRCodeLoginExecutor } from '../wechat/auth/login-executor.js'

describe('qRCodeLoginExecutor', () => {
  let mockCredentialsStore: CredentialsStore
  let mockQRCodeShower: QRCodeShower
  let executor: QRCodeLoginExecutor

  const mockQRCode: QRCode = {
    qrcode: 'qr-code-123',
    qrcode_img_content: 'https://example.com/qr/123',
  }

  const mockCredentials: LoginCredentials = {
    token: 'test-token-456',
    baseUrl: 'https://ilinkai.weixin.qq.com',
    accountId: 'bot-789',
    userId: 'user-101',
  }

  beforeEach(() => {
    mockCredentialsStore = {
      load: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    }
    mockQRCodeShower = {
      show: vi.fn(),
    }
    executor = new QRCodeLoginExecutor(mockCredentialsStore, mockQRCodeShower)
    vi.clearAllMocks()
  })

  describe('execute', () => {
    it('should return saved credentials if available', async () => {
      mockCredentialsStore.load = vi.fn().mockResolvedValue(mockCredentials)
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const result = await executor.execute()

      expect(result).toEqual(mockCredentials)
      expect(mockCredentialsStore.load).toHaveBeenCalled()
      expect(mockQRCodeShower.show).not.toHaveBeenCalled()
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('使用已保存的凭证'),
      )

      consoleLogSpy.mockRestore()
    })

    it('should perform full login flow when no saved credentials', async () => {
      const confirmedResponse: QRStatusResponse = {
        status: 'confirmed',
        bot_token: 'new-token-123',
        ilink_bot_id: 'new-bot-456',
        baseurl: 'https://ilinkai.weixin.qq.com',
        ilink_user_id: 'new-user-789',
      }

      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockQRCode,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => confirmedResponse,
        })

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const result = await executor.execute()

      expect(mockQRCodeShower.show).toHaveBeenCalledWith(mockQRCode)
      expect(mockCredentialsStore.save).toHaveBeenCalledWith({
        token: 'new-token-123',
        baseUrl: 'https://ilinkai.weixin.qq.com',
        accountId: 'new-bot-456',
        userId: 'new-user-789',
      })
      expect(result.token).toBe('new-token-123')
      expect(result.accountId).toBe('new-bot-456')

      consoleLogSpy.mockRestore()
    })

    it('should handle \'wait\' status and continue polling', async () => {
      const waitResponse: QRStatusResponse = { status: 'wait' }
      const confirmedResponse: QRStatusResponse = {
        status: 'confirmed',
        bot_token: 'token-123',
        ilink_bot_id: 'bot-456',
      }

      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockQRCode,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => waitResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => confirmedResponse,
        })

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const result = await executor.execute()

      expect(result.token).toBe('token-123')
      expect(globalThis.fetch).toHaveBeenCalledTimes(3)

      consoleLogSpy.mockRestore()
    })

    it('should handle \'scaned\' status and show message', async () => {
      const scanedResponse: QRStatusResponse = { status: 'scaned' }
      const confirmedResponse: QRStatusResponse = {
        status: 'confirmed',
        bot_token: 'token-123',
        ilink_bot_id: 'bot-456',
      }

      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockQRCode,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => scanedResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => confirmedResponse,
        })

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const result = await executor.execute()

      expect(result.token).toBe('token-123')
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('已扫码，请在手机上确认'),
      )

      consoleLogSpy.mockRestore()
    })

    it('should refresh QR code when expired', async () => {
      const newQRCode: QRCode = {
        qrcode: 'new-qr-code-456',
        qrcode_img_content: 'https://example.com/qr/456',
      }
      const expiredResponse: QRStatusResponse = { status: 'expired' }
      const confirmedResponse: QRStatusResponse = {
        status: 'confirmed',
        bot_token: 'token-123',
        ilink_bot_id: 'bot-456',
      }

      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockQRCode,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => expiredResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => newQRCode,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => confirmedResponse,
        })

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const result = await executor.execute()

      expect(result.token).toBe('token-123')
      expect(mockQRCodeShower.show).toHaveBeenCalledTimes(2)
      expect(mockQRCodeShower.show).toHaveBeenCalledWith(mockQRCode)
      expect(mockQRCodeShower.show).toHaveBeenCalledWith(newQRCode)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('二维码已过期，正在刷新'),
      )

      consoleLogSpy.mockRestore()
    })

    it('should throw error after max QR refreshes', async () => {
      const expiredResponse: QRStatusResponse = { status: 'expired' }

      globalThis.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('get_bot_qrcode')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockQRCode,
          })
        }
        return Promise.resolve({
          ok: true,
          json: async () => expiredResponse,
        })
      })

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await expect(executor.execute()).rejects.toThrow('二维码多次过期，请重试')

      consoleLogSpy.mockRestore()
    })

    it('should throw error when confirmed but missing token', async () => {
      const invalidConfirmedResponse: QRStatusResponse = {
        status: 'confirmed',
      }

      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockQRCode,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => invalidConfirmedResponse,
        })

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await expect(executor.execute()).rejects.toThrow(
        '登录确认但未返回 token 或 bot_id',
      )

      consoleLogSpy.mockRestore()
    })

    it('should use default baseUrl when not provided', async () => {
      const confirmedResponse: QRStatusResponse = {
        status: 'confirmed',
        bot_token: 'token-123',
        ilink_bot_id: 'bot-456',
      }

      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockQRCode,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => confirmedResponse,
        })

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const result = await executor.execute()

      expect(result.baseUrl).toBe('https://ilinkai.weixin.qq.com')

      consoleLogSpy.mockRestore()
    })

    it('should handle AbortError during polling', async () => {
      const abortError = new Error('The operation was aborted')
      abortError.name = 'AbortError'

      const confirmedResponse: QRStatusResponse = {
        status: 'confirmed',
        bot_token: 'token-123',
        ilink_bot_id: 'bot-456',
      }

      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockQRCode,
        })
        .mockRejectedValueOnce(abortError)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => confirmedResponse,
        })

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const result = await executor.execute()

      expect(result.token).toBe('token-123')

      consoleLogSpy.mockRestore()
    })

    it('should throw error when fetching QR code fails', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      })

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await expect(executor.execute()).rejects.toThrow('获取二维码失败: 500')

      consoleLogSpy.mockRestore()
    })

    it('should throw error when polling QR status fails', async () => {
      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockQRCode,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        })

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await expect(executor.execute()).rejects.toThrow(
        '轮询二维码状态失败: 500',
      )

      consoleLogSpy.mockRestore()
    })
  })
})
