import crypto from 'crypto'

const SALT = process.env.JWT_SECRET || 'masterkey-salt-2024'

export function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin + SALT).digest('hex')
}

export function comparePin(pin: string, stored: string): boolean {
  return hashPin(pin) === stored
}
