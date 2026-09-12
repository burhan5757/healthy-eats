import type { NextFunction, Request, Response } from 'express'
import type { ZodType } from 'zod'

/**
 * Validates req.body against a shared Zod schema and replaces it with the parsed
 * result. The same schema validates the form on the client, so the two can never
 * disagree (CLAUDE.md §6 principle 1).
 */
export function validate<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      res.status(400).json({
        error: 'Please check the highlighted fields.',
        fields: result.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      })
      return
    }
    req.body = result.data
    next()
  }
}

/** Wraps an async handler so rejections reach the error middleware. */
export function asyncRoute(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next)
  }
}
