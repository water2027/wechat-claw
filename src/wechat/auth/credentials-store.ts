import type { LoginCredentials } from '../types.js'
import type { CredentialsStore } from './interfaces.js'
import fs from 'node:fs'
import path from 'node:path'

/**
 * 文件凭证存储实现
 */
export class FileCredentialsStore implements CredentialsStore {
  private path: string

  constructor(filePath: string) {
    this.path = filePath
  }

  save(creds: LoginCredentials): Promise<void> {
    const dir = path.dirname(this.path)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(this.path, JSON.stringify(creds, null, 2), 'utf-8')
    try {
      fs.chmodSync(this.path, 0o600)
    }
    catch {}
    return Promise.resolve()
  }

  load(): Promise<LoginCredentials | null> {
    try {
      if (!fs.existsSync(this.path))
        return Promise.resolve(null)
      const raw = fs.readFileSync(this.path, 'utf-8')
      const data = JSON.parse(raw) as LoginCredentials
      if (data.token && data.baseUrl && data.accountId)
        return Promise.resolve(data)
      return Promise.resolve(null)
    }
    catch {
      return Promise.resolve(null)
    }
  }

  clear(): Promise<void> {
    try {
      fs.unlinkSync(this.path)
    }
    catch {}
    return Promise.resolve()
  }
}

/**
 * 内存凭证存储实现
 */
export class InMemoryCredentialsStore implements CredentialsStore {
  private creds: LoginCredentials | null = null

  save(creds: LoginCredentials): Promise<void> {
    this.creds = creds
    return Promise.resolve()
  }

  load(): Promise<LoginCredentials | null> {
    return Promise.resolve(this.creds)
  }

  clear(): Promise<void> {
    this.creds = null
    return Promise.resolve()
  }
}
