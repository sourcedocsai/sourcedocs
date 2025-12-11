import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';
import Stripe from 'stripe';

const PRICE_TO_PLAN: Record<string, { plan: string; is_pro: boolean; api_calls_limit: number }> = {
  [process.env.STRIPE_PRICE_WEB_PRO!]: { plan: 'web_pro', is_pro: true, api_calls_limit: 0 },
  [process.env.STRIPE_PRICE_API_PRO!]: { plan: 'api_pro', is_pro: false, api_calls_limit: 100 },
  [process.env.STRIPE_PRICE_BUNDLE!]: { plan: 'bundle', is_pro: true, api_calls_limit: 100 },
};

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  console.log('Webhook received');

  if (!signature) {
    console.error('No signature provided');
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    console.log('Webhook verified, event type:', event.type);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;

      console.log('Checkout completed for user:', userId);

      if (userId && session.subscription) {
        // Get subscription to find price ID
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        const priceId = subscription.items.data[0]?.price.id;

        console.log('Price ID:', priceId);

        const planConfig = PRICE_TO_PLAN[priceId];

        if (planConfig) {
          const { error } = await supabaseAdmin
            .from('users')
            .update({
              plan: planConfig.plan,
              is_pro: planConfig.is_pro,
              api_calls_limit: planConfig.api_calls_limit,
              api_calls_used: 0,
              api_calls_reset_at: new Date().toISOString(),
              upgraded_at: new Date().toISOString(),
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
            })
            .eq('id', userId);

          if (error) {
            console.error('Database update error:', error);
          } else {
            console.log(`User ${userId} upgraded to ${planConfig.plan}`);
          }
        }
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      console.log('Subscription deleted:', subscription.id);

      const { error } = await supabaseAdmin
        .from('users')
        .update({
          plan: 'free',
          is_pro: false,
          api_calls_limit: 0,
          canceled_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id);

      if (error) {
        console.error('Database update error:', error);
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      console.log('Subscription updated:', subscription.id, 'Status:', subscription.status);

      if (subscription.status === 'past_due' || subscription.status === 'canceled' || subscription.status === 'unpaid') {
        const { error } = await supabaseAdmin
          .from('users')
          .update({
            plan: 'free',
            is_pro: false,
            api_calls_limit: 0,
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          console.error('Database update error:', error);
        }
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
