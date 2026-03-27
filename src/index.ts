/**
 * wechat-claw - A powerful WeChat utility library
 */

export const version = '1.0.0'

// 导出所有 WeChat 相关功能
export type {
  CredentialsStore,
  EnumValues,
  GetUpdatesResp,
  LoginCredentials,
  LoginExecutor,
  MessageItem,
  QRCode,
  QRCodeShower,
  QRStatusResponse,
  TextItem,
  WeixinMessage,
} from './wechat/index.js'

export {
  ApiClient,
  FileCredentialsStore,
  InMemoryCredentialsStore,
  Message,
  MessageBuilder,
  MessageItemType,
  MessageState,
  MessageType,
  QRCodeLoginExecutor,
  QRCodeShowerImpl,
} from './wechat/index.js'
