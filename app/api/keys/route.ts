import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserByGithubId, getApiKeys, createApiKey } from '@/lib/db';

// GET - List API keys
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const githubId = session.user.githubId;
    const user = await getUserByGithubId(githubId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has API access
    if (user.api_calls_limit === 0) {
      return NextResponse.json(
        { error: 'API access requires API Pro or Bundle plan' },
        { status: 403 }
      );
    }

    const keys = await getApiKeys(user.id);
    return NextResponse.json({ keys });
  } catch (error) {
    console.error('Get API keys error:', error);
    return NextResponse.json({ error: 'Failed to get API keys' }, { status: 500 });
  }
}

// POST - Create new API key
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const githubId = session.user.githubId;
    const user = await getUserByGithubId(githubId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has API access
    if (user.api_calls_limit === 0) {
      return NextResponse.json(
        { error: 'API access requires API Pro or Bundle plan' },
        { status: 403 }
      );
    }

    let name = 'Default';
    try {
      const body = await request.json();
      if (body.name) {
        if (typeof body.name !== 'string') {
          return NextResponse.json({ error: 'Name must be a string' }, { status: 400 });
        }
        if (body.name.length > 100) {
          return NextResponse.json({ error: 'Name must be 100 characters or less' }, { status: 400 });
        }
        name = body.name.trim();
      }
    } catch {
      // Empty body, use default name
    }

    const key = await createApiKey(user.id, name);

    return NextResponse.json({
      key,
      message: 'Save this key - it will only be shown once',
    });
  } catch (error) {
    console.error('Create API key error:', error);
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    );
  }
}
