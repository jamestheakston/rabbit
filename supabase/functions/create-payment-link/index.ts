import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@14.21.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://kiirewgajdcagrkjznzd.supabase.co';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

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
    const { title, description, amount, currency, recurring, userId } = await req.json();
    
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
    
    // Save to Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: linkData, error: linkError } = await supabase
      .from('payment_links')
      .insert([{
        user_id: userId,
        title: title,
        description: description,
        amount: amount / 100, // Convert from cents to decimal
        currency: currency || 'gbp',
        recurring: recurring,
        client_secret: paymentIntent.client_secret,
        stripe_payment_intent_id: paymentIntent.id,
        active: true
      }])
      .select()
      .single();
    
    if (linkError) {
      console.error('Error saving to Supabase:', linkError);
      // Continue anyway, return the payment data
    }
    
    return new Response(
      JSON.stringify({ 
        paymentId: linkData?.id || paymentId,
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
