import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserByGithubId } from '@/lib/db';
import { stripe } from '@/lib/stripe';

const PLAN_PRICES: Record<string, string> = {
  web_pro: process.env.STRIPE_PRICE_WEB_PRO!,
  api_pro: process.env.STRIPE_PRICE_API_PRO!,
  bundle: process.env.STRIPE_PRICE_BUNDLE!,
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { plan } = await request.json();

    if (!plan || !PLAN_PRICES[plan]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
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
          price: PLAN_PRICES[plan],
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXTAUTH_URL}?checkout=complete`,
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
