import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserByGithubId } from '@/lib/db';
import { stripe } from '@/lib/stripe';

const PLAN_PRICES: Record<string, string | undefined> = {
  web_pro: process.env.STRIPE_PRICE_WEB_PRO,
  api_pro: process.env.STRIPE_PRICE_API_PRO,
  bundle: process.env.STRIPE_PRICE_BUNDLE,
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Handle empty body or missing plan
    let plan = 'web_pro'; // default
    try {
      const body = await request.json();
      if (body.plan && PLAN_PRICES[body.plan]) {
        plan = body.plan;
      }
    } catch {
      // Empty body, use default plan
    }

    const priceId = PLAN_PRICES[plan];
    if (!priceId) {
      return NextResponse.json({ error: 'Invalid plan or price not configured' }, { status: 400 });
    }

    const githubId = (session.user as any).githubId;
    const user = await getUserByGithubId(githubId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXTAUTH_URL}?upgraded=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}?canceled=true`,
      client_reference_id: user.id,
      customer_email: user.email || undefined,
      metadata: {
        user_id: user.id,
        github_id: githubId,
        plan,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
