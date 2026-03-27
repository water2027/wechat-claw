/**
 * 手动集成测试 - 真实微信 API 交互
 *
 * 这个测试需要手动运行，会：
 * 1. 显示真实的二维码
 * 2. 等待你扫码登录
 * 3. 进行长轮询等待真实消息
 * 4. 接收到消息后自动回复
 *
 * 运行方式：
 * pnpm test src/__test__/manual-integration.test.ts
 *
 * 注意：这不是自动化测试，需要人工交互
 */

import { describe, expect, it } from 'vitest'
import { ApiClient } from '../wechat/api'
import { InMemoryCredentialsStore } from '../wechat/auth/credentials-store'
import { QRCodeLoginExecutor } from '../wechat/auth/login-executor'
import { QRCodeShowerImpl } from '../wechat/auth/qrcode-shower'
import { Message } from '../wechat/message'

describe('手动集成测试 - 真实微信交互', () => {
  it('完整流程：登录 -> 接收消息 -> 发送回复', async () => {
    // 1. 创建凭证存储（使用临时文件）
    const credentialsStore = new InMemoryCredentialsStore()

    // 2. 创建二维码显示器（会在终端显示真实二维码）
    const qrCodeShower = new QRCodeShowerImpl()

    // 3. 执行登录（会显示二维码，需要扫码）
    console.log('\n=== 步骤 1: 开始登录流程 ===')
    const loginExecutor = new QRCodeLoginExecutor(credentialsStore, qrCodeShower)
    const credentials = await loginExecutor.execute()

    console.log('\n✅ 登录成功!')
    console.log(`Token: ${credentials.token?.substring(0, 20)}...`)
    console.log(`AccountId: ${credentials.accountId}`)
    console.log(`BaseUrl: ${credentials.baseUrl}`)

    expect(credentials.token).toBeTruthy()
    expect(credentials.accountId).toBeTruthy()

    // 4. 创建 API 客户端
    const apiClient = new ApiClient(credentialsStore)

    // 5. 开始长轮询接收消息
    console.log('\n=== 步骤 2: 开始长轮询，等待消息 ===')
    console.log('请在微信中给机器人发送消息...')

    let buffer = ''
    let messageReceived = false
    const maxPolls = 5 // 最多轮询 5 次

    for (let i = 0; i < maxPolls && !messageReceived; i++) {
      console.log(`\n第 ${i + 1} 次轮询...`)

      const updates = await apiClient.getUpdates(buffer, 30000)

      if (updates.get_updates_buf) {
        buffer = updates.get_updates_buf
      }

      if (updates.msgs && updates.msgs.length > 0) {
        console.log(`\n✅ 收到 ${updates.msgs.length} 条消息!`)

        for (const msgData of updates.msgs) {
          const msg = new Message(msgData)
          console.log('\n--- 收到的消息 ---')
          console.log(`来自: ${msg.from_user_id}`)
          console.log(`内容: ${msg.content}`)
          console.log(`Context Token: ${msg.context_token}`)

          expect(msg.from_user_id).toBeTruthy()

          // 6. 发送回复
          if (msg.from_user_id) {
            console.log('\n=== 步骤 3: 发送回复 ===')
            const replyText = `我收到了你的消息: "${msg.content}"`

            await apiClient.sendTextMessage(
              msg.from_user_id,
              replyText,
              msg.context_token,
            )

            console.log(`✅ 已发送回复: ${replyText}`)
            messageReceived = true
          }
        }
      }
      else {
        console.log('暂无消息，继续轮询...')
      }
    }

    if (!messageReceived) {
      console.log('\n⚠️  未收到消息，测试结束')
      console.log('这可能是因为：')
      console.log('1. 没有在微信中发送消息')
      console.log('2. 长轮询超时次数已达上限')
    }

    // 清理凭证（可选）
    // await credentialsStore.clear();
    console.log('\n=== 测试完成 ===')
  }, 300000) // 5 分钟超时
})
