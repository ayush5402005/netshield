import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export async function ensureDefaultAdmin(prisma) {
  const existing = await prisma.adminUser.findUnique({ where: { email: env.adminEmail } });
  if (existing) return;
  const passwordHash = await bcrypt.hash(env.adminPassword, 12);
  await prisma.adminUser.create({ data: { email: env.adminEmail, passwordHash } });
  console.log(`[Auth] Created default admin: ${env.adminEmail}`);
}

export async function login(prisma, email, password) {
  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }
  return jwt.sign({ sub: user.id, email: user.email, role: 'admin' }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ success: false, error: 'Missing bearer token' });
  try {
    req.user = jwt.verify(token, env.jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

export function authorizeSocket(socket, next) {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Missing socket token'));
  try {
    socket.user = jwt.verify(token, env.jwtSecret);
    return next();
  } catch {
    return next(new Error('Invalid socket token'));
  }
}

