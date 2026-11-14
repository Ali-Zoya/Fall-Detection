import type { NextFunction, Request, RequestHandler, Response } from 'express'

/** Lets async controllers throw – Express 4 does not catch rejected promises by itself. */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next)
  }
