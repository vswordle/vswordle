import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return json('ok')
  try {
    const authorization = request.headers.get('Authorization')
    if (!authorization) throw new Error('Authentication required')
    const client = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authorization } } })
    const { data: { user }, error: authError } = await client.auth.getUser()
    if (authError || !user) throw new Error('Authentication required')
    const body = await request.json() as { action?: string; lobbyCode?: string }

    if (body.action === 'create') {
      const { data, error } = await client.rpc('create_private_lobby')
      if (error) throw error
      return json(data)
    }
    if (body.action === 'join') {
      const { data, error } = await client.rpc('join_private_lobby', { p_lobby_code: body.lobbyCode })
      if (error) throw error
      return json(data)
    }
    throw new Error('Unknown lobby action')
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Lobby request failed' }, 400)
  }
})
