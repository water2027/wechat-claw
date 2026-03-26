import type { LoginCredentials, QRCode } from '../types.js'

/**
 * 登录执行器接口
 */
export interface LoginExecutor {
  execute: () => Promise<LoginCredentials>
}

/**
 * 二维码显示器接口
 */
export interface QRCodeShower {
  show: (code: QRCode) => void
}

/**
 * 凭证存储接口
 */
export interface CredentialsStore {
  save: (creds: LoginCredentials) => Promise<void>
  load: () => Promise<Required<LoginCredentials> | null>
  clear: () => Promise<void>
}
