import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const authorization = request.headers.get('Authorization')
    if (!authorization) throw new Error('Authentication required')

    const client = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authorization } } },
    )
    const { data: { user }, error: userError } = await client.auth.getUser()
    if (userError || !user) throw new Error('Authentication required')

    const body = await request.json() as { matchId?: unknown; guess?: unknown }
    const matchId = String(body.matchId ?? '')
    const guess = String(body.guess ?? '')
    if (!/^[0-9a-f-]{36}$/.test(matchId)) throw new Error('Invalid match id')

    // The database function authenticates through auth.uid(), locks the match,
    // reads the secret from a table without client policies, scores the guess,
    // and finalizes ELO in one transaction. The answer never crosses this API.
    const { data, error } = await client.rpc('submit_match_guess', {
      p_match_id: matchId,
      p_word: guess,
    })
    if (error) throw error

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unable to submit guess' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
