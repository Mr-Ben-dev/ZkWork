import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'zkwork_dev_secret';

export interface AuthRequest extends Request {
  userAddress?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'Token missing' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { address: string };
    req.userAddress = decoded.address;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
