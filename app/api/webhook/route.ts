import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;

      if (userId) {
        await supabaseAdmin
          .from('users')
          .update({
            is_pro: true,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
          })
          .eq('id', userId);

        console.log(`User ${userId} upgraded to Pro`);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;

      await supabaseAdmin
        .from('users')
        .update({ is_pro: false })
        .eq('stripe_subscription_id', subscription.id);

      console.log(`Subscription ${subscription.id} canceled`);
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;

      if (subscription.status === 'past_due' || subscription.status === 'canceled') {
        await supabaseAdmin
          .from('users')
          .update({ is_pro: false })
          .eq('stripe_subscription_id', subscription.id);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
