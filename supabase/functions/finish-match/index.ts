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
    const client = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authorization } } })
    const { data: { user }, error: authError } = await client.auth.getUser()
    if (authError || !user) throw new Error('Authentication required')
    const body = await request.json() as { matchId?: unknown }
    const matchId = String(body.matchId ?? '')
    if (!/^[0-9a-f-]{36}$/.test(matchId)) throw new Error('Invalid match id')

    // finish_match locks the row, refuses incomplete matches, and returns early
    // when another request has already finalized it. ELO/history changes are
    // therefore applied once, inside the database transaction.
    const { data, error } = await client.rpc('finish_match', { p_match_id: matchId })
    if (error) throw error
    return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unable to finish match' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
