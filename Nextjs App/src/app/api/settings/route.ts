import { NextResponse } from 'next/server';
import { getUserSettings, updateUserSettings } from '@/lib/storage';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const settings = await getUserSettings(user.id);
    return NextResponse.json({
      ...settings,
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'Member',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();

    // If profile fields are included, update user record
    if (body.name || body.role || body.timezone) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          ...(body.name ? { name: body.name.trim() } : {}),
          ...(body.role ? { role: body.role.trim() } : {}),
          ...(body.timezone ? { timezone: body.timezone } : {}),
        },
      });
    }

    const updated = await updateUserSettings(body, user.id);
    return NextResponse.json({
      ...updated,
      name: body.name || user.name,
      email: user.email,
      role: body.role || user.role,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update settings' }, { status: 500 });
  }
}
