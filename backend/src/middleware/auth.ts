import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import type { AppRole } from '../lib/roles';
import { normalizeRole } from '../lib/roles';

interface JwtPayload {
  userId: string;
  email: string;
  role: AppRole | string;
}

export interface AuthenticatedRequestUser {
  id: string;
  email: string;
  role: AppRole;
  vendorId: string | null;
  activeCompanyId: string | null;
  employeeCompanyId: string | null;
  provinceCode: string | null;
  cityName: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedRequestUser;
    }
  }
}

const getBearerToken = (req: Request) => {
  const authHeader = req.headers['authorization'];
  return authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;
};

const sendUnauthorized = (res: Response, error = 'Authentication required') => {
  res.status(401).json({ error });
};

const sendForbidden = (res: Response, error = 'Forbidden') => {
  res.status(403).json({ error });
};

const hydrateRequestUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      vendorId: true,
      activeCompanyId: true,
      employeeCompanyId: true,
      provinceCode: true,
      cityName: true,
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    role: normalizeRole(user.role),
    vendorId: user.vendorId,
    activeCompanyId: user.activeCompanyId,
    employeeCompanyId: user.employeeCompanyId,
    provinceCode: user.provinceCode,
    cityName: user.cityName,
  };
};

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = getBearerToken(req);

  if (!token) {
    sendUnauthorized(res, 'Access token required');
    return;
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'secret'
    ) as JwtPayload;

    const user = await hydrateRequestUser(decoded.userId);

    if (!user) {
      sendUnauthorized(res, 'User not found');
      return;
    }

    req.user = user;

    next();
  } catch (error) {
    sendUnauthorized(res, 'Invalid or expired token');
  }
};

export const authenticateTokenOptional = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = getBearerToken(req);

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'secret'
    ) as JwtPayload;

    const user = await hydrateRequestUser(decoded.userId);

    if (user) {
      req.user = user;
    }
  } catch {
    // Optional auth should not block the request.
  }

  next();
};

export const requireAnyRole =
  (...roles: AppRole[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendForbidden(res, `${roles.join(' or ')} access required`);
      return;
    }

    next();
  };

export const requireRole = requireAnyRole;

export const requireAdmin = requireAnyRole('ADMIN');

export const requireAdminOrSales = requireAnyRole('ADMIN', 'SALES');

export const requireAdminOrFinance = requireAnyRole('ADMIN', 'FINANCE');

export const requireVendor = requireAnyRole('VENDOR', 'ADMIN');

export const requireVendorOnly = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    sendUnauthorized(res);
    return;
  }

  if (req.user.role === 'VENDOR') {
    next();
    return;
  }

  if (!req.user.vendorId) {
    sendForbidden(res, 'Approved vendor access required');
    return;
  }

  const vendor = await prisma.vendor.findUnique({
    where: { id: req.user.vendorId },
    select: {
      id: true,
      userId: true,
      status: true,
    },
  });

  if (!vendor || vendor.userId !== req.user.id || vendor.status !== 'APPROVED') {
    sendForbidden(res, 'Approved vendor access required');
    return;
  }

  next();
};

export const requireUser = requireAnyRole('USER');
