import type { LoginCredentials } from '../wechat/types.js'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  FileCredentialsStore,
  InMemoryCredentialsStore,
} from '../wechat/auth/credentials-store.js'

describe('inMemoryCredentialsStore', () => {
  let store: InMemoryCredentialsStore

  beforeEach(() => {
    store = new InMemoryCredentialsStore()
  })

  it('should return null when no credentials are stored', async () => {
    const result = await store.load()
    expect(result).toBeNull()
  })

  it('should save and load credentials', async () => {
    const creds: LoginCredentials = {
      token: 'test-token',
      baseUrl: 'https://api.test.com',
      accountId: 'account-123',
      userId: 'user-456',
    }

    await store.save(creds)
    const loaded = await store.load()

    expect(loaded).toEqual(creds)
  })

  it('should update credentials when saved again', async () => {
    const creds1: LoginCredentials = {
      token: 'token-1',
      baseUrl: 'https://api1.test.com',
      accountId: 'account-1',
    }

    const creds2: LoginCredentials = {
      token: 'token-2',
      baseUrl: 'https://api2.test.com',
      accountId: 'account-2',
    }

    await store.save(creds1)
    await store.save(creds2)
    const loaded = await store.load()

    expect(loaded).toEqual(creds2)
    expect(loaded).not.toEqual(creds1)
  })

  it('should clear credentials', async () => {
    const creds: LoginCredentials = {
      token: 'test-token',
      baseUrl: 'https://api.test.com',
      accountId: 'account-123',
    }

    await store.save(creds)
    await store.clear()
    const loaded = await store.load()

    expect(loaded).toBeNull()
  })

  it('should handle credentials without userId', async () => {
    const creds: LoginCredentials = {
      token: 'test-token',
      baseUrl: 'https://api.test.com',
      accountId: 'account-123',
    }

    await store.save(creds)
    const loaded = await store.load()

    expect(loaded).toEqual(creds)
    expect(loaded?.userId).toBeUndefined()
  })
})

describe('fileCredentialsStore', () => {
  let store: FileCredentialsStore
  let tempDir: string
  let tempFilePath: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'creds-test-'))
    tempFilePath = path.join(tempDir, 'test-credentials.json')
    store = new FileCredentialsStore(tempFilePath)
  })

  afterEach(() => {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath)
    }
    if (fs.existsSync(tempDir)) {
      fs.rmdirSync(tempDir)
    }
  })

  it('should return null when file does not exist', async () => {
    const result = await store.load()
    expect(result).toBeNull()
  })

  it('should save and load credentials to file', async () => {
    const creds: LoginCredentials = {
      token: 'test-token',
      baseUrl: 'https://api.test.com',
      accountId: 'account-123',
      userId: 'user-456',
    }

    await store.save(creds)
    expect(fs.existsSync(tempFilePath)).toBe(true)

    const loaded = await store.load()
    expect(loaded).toEqual(creds)
  })

  it('should create directories if they do not exist', async () => {
    const nestedPath = path.join(tempDir, 'nested', 'deep', 'credentials.json')
    const nestedStore = new FileCredentialsStore(nestedPath)

    const creds: LoginCredentials = {
      token: 'test-token',
      baseUrl: 'https://api.test.com',
      accountId: 'account-123',
    }

    await nestedStore.save(creds)
    expect(fs.existsSync(nestedPath)).toBe(true)

    fs.unlinkSync(nestedPath)
    fs.rmdirSync(path.join(tempDir, 'nested', 'deep'))
    fs.rmdirSync(path.join(tempDir, 'nested'))
  })

  it('should save credentials with proper JSON formatting', async () => {
    const creds: LoginCredentials = {
      token: 'test-token',
      baseUrl: 'https://api.test.com',
      accountId: 'account-123',
    }

    await store.save(creds)
    const fileContent = fs.readFileSync(tempFilePath, 'utf-8')
    const parsed = JSON.parse(fileContent)

    expect(parsed).toEqual(creds)
    expect(fileContent).toContain('\n')
  })

  it('should set file permissions to 0600', async () => {
    const creds: LoginCredentials = {
      token: 'test-token',
      baseUrl: 'https://api.test.com',
      accountId: 'account-123',
    }

    await store.save(creds)

    if (process.platform !== 'win32') {
      const stats = fs.statSync(tempFilePath)
      const mode = stats.mode & 0o777
      expect(mode).toBe(0o600)
    }
  })

  it('should update credentials when saved again', async () => {
    const creds1: LoginCredentials = {
      token: 'token-1',
      baseUrl: 'https://api1.test.com',
      accountId: 'account-1',
    }

    const creds2: LoginCredentials = {
      token: 'token-2',
      baseUrl: 'https://api2.test.com',
      accountId: 'account-2',
    }

    await store.save(creds1)
    await store.save(creds2)
    const loaded = await store.load()

    expect(loaded).toEqual(creds2)
  })

  it('should clear credentials by deleting file', async () => {
    const creds: LoginCredentials = {
      token: 'test-token',
      baseUrl: 'https://api.test.com',
      accountId: 'account-123',
    }

    await store.save(creds)
    expect(fs.existsSync(tempFilePath)).toBe(true)

    await store.clear()
    expect(fs.existsSync(tempFilePath)).toBe(false)

    const loaded = await store.load()
    expect(loaded).toBeNull()
  })

  it('should handle clear when file does not exist', async () => {
    expect(fs.existsSync(tempFilePath)).toBe(false)
    await expect(store.clear()).resolves.not.toThrow()
  })

  it('should return null when file contains invalid JSON', async () => {
    fs.writeFileSync(tempFilePath, 'invalid json content', 'utf-8')

    const loaded = await store.load()
    expect(loaded).toBeNull()
  })

  it('should return null when required fields are missing', async () => {
    const invalidCreds = {
      token: 'test-token',
      baseUrl: 'https://api.test.com',
    }
    fs.writeFileSync(tempFilePath, JSON.stringify(invalidCreds), 'utf-8')

    const loaded = await store.load()
    expect(loaded).toBeNull()
  })

  it('should load credentials when all required fields are present', async () => {
    const validCreds = {
      token: 'test-token',
      baseUrl: 'https://api.test.com',
      accountId: 'account-123',
    }
    fs.writeFileSync(tempFilePath, JSON.stringify(validCreds), 'utf-8')

    const loaded = await store.load()
    expect(loaded).toEqual(validCreds)
  })

  it('should handle credentials with userId', async () => {
    const creds: LoginCredentials = {
      token: 'test-token',
      baseUrl: 'https://api.test.com',
      accountId: 'account-123',
      userId: 'user-456',
    }

    await store.save(creds)
    const loaded = await store.load()

    expect(loaded).toEqual(creds)
    expect(loaded?.userId).toBe('user-456')
  })
})
