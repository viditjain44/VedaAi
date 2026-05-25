import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Unhandled error:', err.message);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ success: false, error: 'Route not found' });
}
