import { NextRequest } from 'next/server';
import { getUserByApiKey, canGenerateApi, incrementApiUsage } from './db';
import { User } from './supabase';

export interface ApiAuthResult {
  success: boolean;
  user?: User;
  error?: string;
  status?: number;
}

export async function authenticateApiRequest(request: NextRequest): Promise<ApiAuthResult> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      success: false,
      error: 'Missing or invalid Authorization header. Use: Bearer sk_live_xxx',
      status: 401,
    };
  }

  const apiKey = authHeader.replace('Bearer ', '');

  if (!apiKey.startsWith('sk_live_')) {
    return {
      success: false,
      error: 'Invalid API key format',
      status: 401,
    };
  }

  const user = await getUserByApiKey(apiKey);

  if (!user) {
    return {
      success: false,
      error: 'Invalid API key',
      status: 401,
    };
  }

  // Check API limits
  const { allowed, usage, limit } = await canGenerateApi(user.id);

  if (!allowed) {
    return {
      success: false,
      error: `API limit reached (${usage}/${limit}). Resets monthly.`,
      status: 429,
    };
  }

  return {
    success: true,
    user,
  };
}

export async function trackApiUsage(userId: string): Promise<void> {
  await incrementApiUsage(userId);
}
