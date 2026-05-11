import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

const PREFIX = "enc:v1:"

function getFieldEncryptionKey() {
  const raw = process.env.FIELD_ENCRYPTION_KEY
  if (!raw) return null

  const normalized = raw.trim()
  const key = /^[0-9a-f]{64}$/i.test(normalized)
    ? Buffer.from(normalized, "hex")
    : Buffer.from(normalized, "base64")

  if (key.length !== 32) {
    throw new Error("FIELD_ENCRYPTION_KEY must be 32 bytes as base64 or 64 hex characters")
  }

  return key
}

export function encryptSecret(value: string) {
  if (!value || value.startsWith(PREFIX)) return value

  const key = getFieldEncryptionKey()
  if (!key) {
    // Manual production config needed: set FIELD_ENCRYPTION_KEY before using
    // calendar sync with real users so OAuth tokens are encrypted at rest.
    return value
  }

  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()

  return `${PREFIX}${Buffer.concat([iv, tag, encrypted]).toString("base64")}`
}

export function decryptSecret(value: string) {
  if (!value || !value.startsWith(PREFIX)) return value

  const key = getFieldEncryptionKey()
  if (!key) {
    throw new Error("FIELD_ENCRYPTION_KEY is required to decrypt stored secrets")
  }

  const payload = Buffer.from(value.slice(PREFIX.length), "base64")
  const iv = payload.subarray(0, 12)
  const tag = payload.subarray(12, 28)
  const encrypted = payload.subarray(28)

  const decipher = createDecipheriv("aes-256-gcm", key, iv)
  decipher.setAuthTag(tag)

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")
}
