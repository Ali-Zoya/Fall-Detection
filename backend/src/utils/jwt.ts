import jwt from 'jsonwebtoken'
import { env } from '../config/env'

interface TokenPayload {
  sub: string
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId } satisfies TokenPayload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  })
}

/** Returns the user id or null if the token is invalid / expired. */
export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] })
    if (typeof payload === 'object' && typeof payload.sub === 'string') return payload.sub
    return null
  } catch {
    return null
  }
}
