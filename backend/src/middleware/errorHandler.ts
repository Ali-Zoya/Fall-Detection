import type { NextFunction, Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import { HttpError } from '../utils/errors'
import { isProduction } from '../config/env'

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: { message: `Route not found: ${req.method} ${req.path}`, code: 'NOT_FOUND' } })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // Input validation errors
  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of err.issues) {
      const key = issue.path.join('.') || '_'
      if (!fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return res.status(400).json({
      error: { message: 'Please check the highlighted fields', code: 'VALIDATION_ERROR', fieldErrors },
    })
  }

  // Errors we raised on purpose
  if (err instanceof HttpError) {
    return res
      .status(err.status)
      .json({ error: { message: err.message, code: err.code, details: err.details } })
  }

  // Malformed JSON body
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: { message: 'Request body is not valid JSON', code: 'BAD_JSON' } })
  }

  // Database problems
  if (err instanceof Prisma.PrismaClientInitializationError) {
    console.error('[db] cannot reach database:', err.message)
    return res
      .status(503)
      .json({ error: { message: 'The database is not reachable right now. Please try again shortly.', code: 'DB_UNAVAILABLE' } })
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: { message: 'That record already exists', code: 'CONFLICT' } })
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: { message: 'Record not found', code: 'NOT_FOUND' } })
    }
  }

  console.error('[error]', err)
  res.status(500).json({
    error: {
      message: isProduction ? 'Something went wrong on our side' : err instanceof Error ? err.message : 'Unknown error',
      code: 'INTERNAL',
    },
  })
}
