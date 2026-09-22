import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

function code() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return response('ok')
  try {
    const authorization = request.headers.get('Authorization')
    if (!authorization) throw new Error('Authentication required')
    const userClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authorization } } })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) throw new Error('Authentication required')
    const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
    const body = await request.json() as { action?: string; lobbyCode?: string; lobbyId?: string }

    if (body.action === 'create') {
      let lobby
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const { data, error } = await admin.from('lobbies').insert({ lobby_code: code(), host_id: user.id }).select('id, lobby_code').single()
        if (!error) { lobby = data; break }
      }
      if (!lobby) throw new Error('Could not create a unique lobby')
      return response({ lobbyId: lobby.id, lobbyCode: lobby.lobby_code })
    }

    if (body.action === 'join') {
      const lobbyCode = String(body.lobbyCode ?? '').toUpperCase()
      const { data: existing, error: lookupError } = await admin.from('lobbies').select('id, host_id, status').eq('lobby_code', lobbyCode).eq('status', 'waiting').single()
      if (lookupError || !existing) throw new Error('Lobby not found or already started')
      if (existing.host_id === user.id) throw new Error('You cannot join your own lobby')
      const { data: joined, error: joinError } = await admin.from('lobbies').update({ guest_id: user.id, status: 'started' }).eq('id', existing.id).eq('status', 'waiting').is('guest_id', null).select('id, host_id, guest_id').single()
      if (joinError || !joined) throw new Error('Lobby was already joined')
      const { data: words, error: wordError } = await admin.from('allowed_words').select('word')
      if (wordError || !words?.length) throw new Error('No server word list configured')
      const answer = words[Math.floor(Math.random() * words.length)].word
      const { data: match, error: matchError } = await admin.from('matches').insert({ mode: 'private', player_one: joined.host_id, player_two: joined.guest_id, status: 'active', started_at: new Date().toISOString() }).select('id').single()
      if (matchError || !match) throw new Error('Could not create match')
      await admin.from('match_secrets').insert({ match_id: match.id, secret_word: answer })
      await admin.from('match_player_states').insert([{ match_id: match.id, player_id: joined.host_id }, { match_id: match.id, player_id: joined.guest_id }])
      return response({ matchId: match.id, lobbyId: joined.id })
    }

    if (body.action === 'leave') {
      const { data: lobby } = await admin.from('lobbies').select('host_id, guest_id').eq('id', body.lobbyId).single()
      if (!lobby || (lobby.host_id !== user.id && lobby.guest_id !== user.id)) throw new Error('Lobby not found')
      if (lobby.host_id === user.id) await admin.from('lobbies').update({ status: 'closed' }).eq('id', body.lobbyId)
      else await admin.from('lobbies').update({ guest_id: null, status: 'waiting' }).eq('id', body.lobbyId)
      return response({ success: true })
    }
    throw new Error('Unknown lobby action')
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : 'Lobby request failed' }, 400)
  }
})
