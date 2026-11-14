import type { NextFunction, Request, Response } from 'express'
import { verifyToken } from '../utils/jwt'
import { unauthorized } from '../utils/errors'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by requireAuth / optionalAuth when a valid JWT was supplied. */
      userId?: string
    }
  }
}

function readBearer(req: Request): string | null {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) return null
  return header.slice(7).trim() || null
}

/** Rejects the request unless it carries a valid "Authorization: Bearer <jwt>" header. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = readBearer(req)
  const userId = token ? verifyToken(token) : null
  if (!userId) return next(unauthorized('Please sign in again'))
  req.userId = userId
  next()
}

/** Like requireAuth but anonymous requests are allowed (used by the public chatbot). */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = readBearer(req)
  const userId = token ? verifyToken(token) : null
  if (userId) req.userId = userId
  next()
}
