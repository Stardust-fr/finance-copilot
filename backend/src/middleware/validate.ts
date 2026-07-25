import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodObject, ZodRawShape } from 'zod';

/**
 * Validates req.body / req.params / req.query against a zod schema.
 * Returns 400 with structured field errors on failure.
 */
export function validate(schema: ZodObject<ZodRawShape>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        params: req.params,
        query: req.query,
      });
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.issues.map((issue) => ({
          field: issue.path.slice(1).join('.'), // strip leading "body"/"params"/"query"
          message: issue.message,
        }));
        res.status(400).json({ success: false, message: 'Validation failed', errors });
        return;
      }
      next(err);
    }
  };
}
