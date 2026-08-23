// lib/security/auth.js — JWT Authentication middleware & helpers

import jwt from 'jsonwebtoken';
import prisma from '../prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

// Verify JWT token và trả về user
export const verifyToken = async (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded?.userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        isVerified: true,
      },
    });

    if (!user || !user.isActive) return null;
    return user;
  } catch {
    return null;
  }
};

// Lấy token từ request header hoặc cookie (hỗ trợ cả Next.js Request & Express req)
export const getTokenFromRequest = (req) => {
  if (!req) return null;

  // 1. Next.js Headers / Authorization
  if (typeof req.headers?.get === 'function') {
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7).trim();
    }
  } else if (req.headers) {
    // 2. Express headers
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7).trim();
    }
  }

  // 3. Next.js Cookies
  if (typeof req.cookies?.get === 'function') {
    const cookie = req.cookies.get('auth-token');
    if (cookie?.value) return cookie.value;
  }

  // 4. Express cookies / parsed cookies
  if (req.cookies && typeof req.cookies['auth-token'] === 'string') {
    return req.cookies['auth-token'];
  }

  return null;
};

// Tạo JWT token
export const createToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
};

// Middleware/Guard: yêu cầu đăng nhập
export const requireAuth = async (req) => {
  const token = getTokenFromRequest(req);
  if (!token) {
    return { error: 'Vui lòng đăng nhập', status: 401 };
  }
  const user = await verifyToken(token);
  if (!user) {
    return { error: 'Phiên đăng nhập hết hạn hoặc không hợp lệ', status: 401 };
  }
  return { user };
};

// Middleware/Guard: yêu cầu quyền Admin hoặc Staff
export const requireAdmin = async (req) => {
  const authResult = await requireAuth(req);
  if (authResult.error || !authResult.user) return authResult;

  if (authResult.user.role !== 'ADMIN' && authResult.user.role !== 'STAFF') {
    return { error: 'Không có quyền truy cập', status: 403 };
  }

  return authResult;
};

// Express middleware adapters
export const expressRequireAuth = async (req, res, next) => {
  const result = await requireAuth(req);
  if (result.error) {
    return res.status(result.status || 401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: result.error },
    });
  }
  req.user = result.user;
  next();
};

export const expressRequireAdmin = async (req, res, next) => {
  const result = await requireAdmin(req);
  if (result.error) {
    return res.status(result.status || 403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: result.error },
    });
  }
  req.user = result.user;
  next();
};
