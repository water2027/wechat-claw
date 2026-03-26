/**
 * wechat-claw - A powerful WeChat utility library
 */

export const version = '1.0.0'

// 导出所有 WeChat 相关功能
export type {
  EnumValues,
  TextItem,
  MessageItem,
  WeixinMessage,
  GetUpdatesResp,
  QRCode,
  QRStatusResponse,
  LoginCredentials,
  CredentialsStore,
  QRCodeShower,
  LoginExecutor,
} from "./wechat/index.js";

export {
  MessageType,
  MessageItemType,
  MessageState,
  Message,
  MessageBuilder,
  ApiClient,
  FileCredentialsStore,
  InMemoryCredentialsStore,
  QRCodeShowerImpl,
  QRCodeLoginExecutor,
} from "./wechat/index.js";
