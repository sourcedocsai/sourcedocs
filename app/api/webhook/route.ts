import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  console.log('Webhook received');
  console.log('Signature present:', !!signature);

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
      console.log('Customer:', session.customer);
      console.log('Subscription:', session.subscription);

      if (userId) {
        const { error } = await supabaseAdmin
          .from('users')
          .update({
            is_pro: true,
	    upgraded_at: new Date().toISOString(),
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
          })
          .eq('id', userId);

        if (error) {
          console.error('Database update error:', error);
        } else {
          console.log(`User ${userId} upgraded to Pro successfully`);
        }
      } else {
        console.error('No user_id in session metadata');
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      console.log('Subscription deleted:', subscription.id);

      const { error } = await supabaseAdmin
        .from('users')
        .update({ is_pro: false,
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

      if (subscription.status === 'past_due' || subscription.status === 'canceled') {
        const { error } = await supabaseAdmin
          .from('users')
          .update({ is_pro: false })
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
