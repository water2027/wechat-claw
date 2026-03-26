/**
 * WeChat module exports
 */

// Export API client
export { ApiClient } from './api.js'

// Export authentication module
export type {
  CredentialsStore,
  LoginExecutor,
  QRCodeShower,
} from './auth/index.js'

export {
  FileCredentialsStore,
  InMemoryCredentialsStore,
  QRCodeLoginExecutor,
  QRCodeShowerImpl,
} from './auth/index.js'

// Export message classes
export * from './message'

// Export types and constants
export type {
  EnumValues,
  GetUpdatesResp,
  IMessageItem,
  LoginCredentials,
  QRCode,
  QRStatusResponse,
  TextItem,
  WeixinMessage,
} from './types.js'

export {
  MessageItemType,
  MessageState,
  MessageType,
} from './types.js'
