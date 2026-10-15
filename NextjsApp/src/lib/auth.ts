// Real Authentication & Session Library for Taskit
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import prisma from './prisma';

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'taskit_production_secret_32chars_min_length_secure'
);

const COOKIE_NAME = 'taskit_session';
const TOKEN_EXPIRY = '7d';

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
}

// Password hashing (10 rounds is standard OWASP recommendation, 10x faster than 12)
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// JWT Token Creation
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

// JWT Token Verification
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

// Instant in-memory JWT session check (0ms, no database query)
export async function getAuthSession(): Promise<{ id: string; email: string; name: string } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload?.userId) return null;

    return {
      id: payload.userId,
      email: payload.email,
      name: payload.name,
    };
  } catch {
    return null;
  }
}

// High-speed short-lived user cache to avoid hammering Neon on repeat requests
interface CachedUser {
  user: any;
  cachedAt: number;
}
const userCache = new Map<string, CachedUser>();
const USER_CACHE_TTL_MS = 15000; // 15 seconds

export function invalidateUserCache(userId?: string) {
  if (userId) {
    userCache.delete(userId);
  } else {
    userCache.clear();
  }
}

// Get Current Authenticated User with in-memory caching
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload?.userId) return null;

    // Check memory cache first
    const cached = userCache.get(payload.userId);
    if (cached && Date.now() - cached.cachedAt < USER_CACHE_TTL_MS) {
      return cached.user;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { settings: true },
    });

    if (!user) return null;

    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      timezone: user.timezone,
      settings: user.settings,
    };

    userCache.set(payload.userId, { user: userData, cachedAt: Date.now() });
    return userData;
  } catch (err) {
    console.error('Error in getCurrentUser:', err);
    return null;
  }
}

