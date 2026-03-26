import type {
  LoginCredentials,
  QRCode,
  QRStatusResponse,
} from '../types.js'
import type { CredentialsStore, LoginExecutor, QRCodeShower } from './interfaces.js'

const BASE_URL = 'https://ilinkai.weixin.qq.com'
const BOT_TYPE = '3'
const QR_POLL_TIMEOUT_MS = 35_000
const MAX_QR_REFRESH = 3

/**
 * 二维码登录执行器实现
 */
export class QRCodeLoginExecutor implements LoginExecutor {
  constructor(
    private credentialsStore: CredentialsStore,
    private qrCodeShower: QRCodeShower,
  ) {}

  private async fetchQRCode(): Promise<QRCode> {
    const url = `${BASE_URL}/ilink/bot/get_bot_qrcode?bot_type=${BOT_TYPE}`
    const res = await fetch(url)
    if (!res.ok)
      throw new Error(`获取二维码失败: ${res.status}`)
    return res.json() as Promise<QRCode>
  }

  private async pollQRStatus(qrcodeStr: string): Promise<QRStatusResponse> {
    const url = `${BASE_URL}/ilink/bot/get_qrcode_status?qrcode=${encodeURIComponent(qrcodeStr)}`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), QR_POLL_TIMEOUT_MS)
    try {
      const res = await fetch(url, {
        headers: { 'iLink-App-ClientVersion': '1' },
        signal: controller.signal,
      })
      clearTimeout(timer)
      if (!res.ok)
        throw new Error(`轮询二维码状态失败: ${res.status}`)
      return res.json() as Promise<QRStatusResponse>
    }
    catch (err) {
      clearTimeout(timer)
      if (err instanceof Error && err.name === 'AbortError') {
        return { status: 'wait' }
      }
      throw err
    }
  }

  async execute(): Promise<LoginCredentials> {
    const saved = await this.credentialsStore.load()
    if (saved) {
      console.log(`[auth] 使用已保存的凭证 (accountId=${saved.accountId})`)
      return saved
    }

    console.log('[auth] 正在获取登录二维码...')
    let qr = await this.fetchQRCode()
    this.qrCodeShower.show(qr)

    let refreshCount = 0
    const deadline = Date.now() + 8 * 60_000

    while (Date.now() < deadline) {
      const status = await this.pollQRStatus(qr.qrcode)

      switch (status.status) {
        case 'wait':
          break
        case 'scaned':
          console.log('[auth] 已扫码，请在手机上确认...')
          break
        case 'expired':
          refreshCount++
          if (refreshCount >= MAX_QR_REFRESH) {
            throw new Error('二维码多次过期，请重试')
          }
          console.log(
            `[auth] 二维码已过期，正在刷新... (${refreshCount}/${MAX_QR_REFRESH})`,
          )
          qr = await this.fetchQRCode()
          this.qrCodeShower.show(qr)
          break
        case 'confirmed': {
          if (!status.bot_token || !status.ilink_bot_id) {
            throw new Error('登录确认但未返回 token 或 bot_id')
          }
          const creds: LoginCredentials = {
            token: status.bot_token,
            baseUrl: status.baseurl || BASE_URL,
            accountId: status.ilink_bot_id,
            userId: status.ilink_user_id,
          }
          this.credentialsStore.save(creds)
          console.log(`[auth] ✅ 登录成功! accountId=${creds.accountId}`)
          return creds
        }
      }

      await new Promise(r => setTimeout(r, 1000))
    }

    throw new Error('登录超时')
  }
}
