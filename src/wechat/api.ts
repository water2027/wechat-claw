import type { CredentialsStore } from './auth/index.js'
import type { GetConfigResp, GetUpdatesResp, GetUploadUrlReq, GetUploadUrlResp, SendMessageReq, SendTypingReq } from './types.js'
import { Buffer } from 'node:buffer'
import crypto from 'node:crypto'
import { MessageBuilder, MessageItemBuilder } from './message'
import { MessageItemType, MessageState, MessageType } from './types.js'

const DEFAULT_API_TIMEOUT_MS = 15_000
const DEFAULT_LONG_POLL_TIMEOUT_MS = 35_000

export interface WeixinApiOptions {
  timeoutMs?: number
  /** Long-poll timeout for getUpdates (server may hold the request up to this). */
  longPollTimeoutMs?: number
}

export class ApiClient {
  constructor(private credentialsStore: CredentialsStore) {}

  private randomWechatUin(): string {
    const uint32 = crypto.randomBytes(4).readUInt32BE(0)
    return Buffer.from(String(uint32), 'utf-8').toString('base64')
  }

  private buildHeaders(token: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'AuthorizationType': 'ilink_bot_token',
      'X-WECHAT-UIN': this.randomWechatUin(),
    }
    headers.Authorization = `Bearer ${token}`
    return headers
  }

  private async apiFetch<T>(
    endpoint: string,
    body: Record<string, unknown>,
    timeoutMs = DEFAULT_API_TIMEOUT_MS,
  ): Promise<T> {
    const cred = await this.credentialsStore.load()
    if (!cred) {
      throw new Error('No credentials available')
    }

    const { token, baseUrl } = cred

    const url = new URL(
      endpoint,
      baseUrl?.endsWith('/') ? baseUrl : `${baseUrl}/`,
    )
    const bodyStr = JSON.stringify(body)
    const headers = this.buildHeaders(token)
    headers['Content-Length'] = String(Buffer.byteLength(bodyStr, 'utf-8'))

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers,
        body: bodyStr,
        signal: controller.signal,
      })
      clearTimeout(timer)
      const text = await res.text()
      if (!res.ok) {
        throw new Error(`API ${endpoint} responded ${res.status}: ${text}`)
      }
      return JSON.parse(text) as T
    }
    catch (err) {
      clearTimeout(timer)
      throw err
    }
  }

  async getUpdates(
    buf: string,
    timeoutMs = DEFAULT_LONG_POLL_TIMEOUT_MS,
  ): Promise<GetUpdatesResp> {
    try {
      return await this.apiFetch<GetUpdatesResp>(
        'ilink/bot/getupdates',
        { get_updates_buf: buf },
        timeoutMs,
      )
    }
    catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { ret: 0, msgs: [], get_updates_buf: buf }
      }
      throw err
    }
  }

  async sendTextMessage(
    to: string,
    text: string,
    contextToken?: string,
  ): Promise<void> {
    const clientId = `bot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    const msg = new MessageBuilder()
      .withFromUserId('')
      .withToUserId(to)
      .withClientId(clientId)
      .withMessageType(MessageType.BOT)
      .withMessageState(MessageState.FINISH)
      .addItem(MessageItemBuilder.create(MessageItemType.TEXT).withTextItem({ text }).build())
      .withContextToken(contextToken)
      .build()

    await this.apiFetch('ilink/bot/sendmessage', {
      msg,
    })
  }

  async sendMessage(
    params: WeixinApiOptions & { body: SendMessageReq },
  ): Promise<void> {
    await this.apiFetch(
      'ilink/bot/sendmessage',
      { ...params.body },
      params.timeoutMs ?? DEFAULT_API_TIMEOUT_MS,
    )
  }

  async getUploadUrl(
    params: GetUploadUrlReq & WeixinApiOptions,
  ): Promise<GetUploadUrlResp> {
    const resp = await this.apiFetch<GetUploadUrlResp>(
      'ilink/bot/getuploadurl',
      {
        filekey: params.filekey,
        media_type: params.media_type,
        to_user_id: params.to_user_id,
        rawsize: params.rawsize,
        rawfilemd5: params.rawfilemd5,
        filesize: params.filesize,
        thumb_rawsize: params.thumb_rawsize,
        thumb_rawfilemd5: params.thumb_rawfilemd5,
        thumb_filesize: params.thumb_filesize,
        no_need_thumb: params.no_need_thumb,
        aeskey: params.aeskey,
      },
      params.timeoutMs ?? DEFAULT_API_TIMEOUT_MS,
    )
    return resp
  }

  async getConfig(
    params: WeixinApiOptions & { ilinkUserId: string, contextToken?: string },
  ): Promise<GetConfigResp> {
    const resp = await this.apiFetch<GetConfigResp>(
      'ilink/bot/getconfig',
      {
        ilink_user_id: params.ilinkUserId,
        context_token: params.contextToken,
      },
      params.timeoutMs ?? DEFAULT_API_TIMEOUT_MS,
    )
    return resp
  }

  async sendTyping(
    params: WeixinApiOptions & { body: SendTypingReq },
  ): Promise<void> {
    await this.apiFetch(
      'ilink/bot/sendtyping',
      { ...params.body },
      params.timeoutMs ?? DEFAULT_API_TIMEOUT_MS,
    )
  }
}
