import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@14.21.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { title, description, amount, currency, recurring } = await req.json();
    
    // Create Stripe payment intent (temporary, not a permanent payment link)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency || 'gbp',
      description: description || title || 'Payment',
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Generate a temporary payment ID for the URL
    const paymentId = crypto.randomUUID();
    
    return new Response(
      JSON.stringify({ 
        paymentId: paymentId,
        clientSecret: paymentIntent.client_secret,
        amount: amount,
        currency: currency || 'gbp',
        title: title || 'Payment',
        description: description || ''
      }),
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        status: 400,
      }
    );
  }
});
