import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { hashPassword, createSessionToken } from '@/lib/auth';

const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.string().optional().default('Product Designer'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = RegisterSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { email, password, name, role } = validated.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password & create user with default settings
    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name.trim(),
        passwordHash,
        role: role || 'Product Designer',
        timezone: 'India Standard Time (IST) UTC+05:30',
        settings: {
          create: {
            timezone: 'India Standard Time (IST) UTC+05:30',
            focusDurationMins: 25,
            shortBreakMins: 5,
            longBreakMins: 15,
            dailySessionTarget: 4,
            ambientSound: 'Rain & Forest',
            aiModelPreference: 'openai/gpt-oss-120b',
            autoRecoveryThreshold: 3,
            emailNotifications: true,
            scheduleAlerts: true,
          },
        },
      },
      include: {
        settings: true,
      },
    });

    // Create session token & cookie
    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    response.cookies.set('taskit_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err: any) {
    console.error('Registration error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create account' },
      { status: 500 }
    );
  }
}
