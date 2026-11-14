import type { NextFunction, Request, Response } from 'express'
import type { ZodTypeAny, z } from 'zod'

/** Validates req.body with a Zod schema and replaces it with the parsed (typed, trimmed) value. */
export const validateBody =
  <S extends ZodTypeAny>(schema: S) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) return next(result.error) // handled in errorHandler → 400
    req.body = result.data as z.infer<S>
    next()
  }
