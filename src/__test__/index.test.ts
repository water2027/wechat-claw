import { describe, expect, it } from 'vitest'
import { MessageItemType, MessageState, MessageType, version } from '../index.js'

describe('package exports', () => {
  it('should export version', () => {
    expect(version).toBe('1.0.0')
  })

  it('should export MessageType constants', () => {
    expect(MessageType.USER).toBe(1)
    expect(MessageType.BOT).toBe(2)
  })

  it('should export MessageItemType constants', () => {
    expect(MessageItemType.TEXT).toBe(1)
    expect(MessageItemType.IMAGE).toBe(2)
    expect(MessageItemType.VOICE).toBe(3)
    expect(MessageItemType.FILE).toBe(4)
    expect(MessageItemType.VIDEO).toBe(5)
  })

  it('should export MessageState constants', () => {
    expect(MessageState.NEW).toBe(0)
    expect(MessageState.GENERATING).toBe(1)
    expect(MessageState.FINISH).toBe(2)
  })
})
