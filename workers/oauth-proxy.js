const APP_URL = 'https://hyclub.github.io/DustWorld-Multiverse';

export default {
  async fetch(request, env) {
    const CLIENT_ID = env.CLIENT_ID || '';
    const CLIENT_SECRET = env.CLIENT_SECRET || '';
    const callbackUrl = APP_URL + '/';
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '*';
    const corsHeaders = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === '/login') {
      const state = url.searchParams.get('state') || Math.random().toString(36).slice(2);
      const p = new URLSearchParams({
        client_id: CLIENT_ID, redirect_uri: callbackUrl,
        scope: 'repo,read:user', state: state,
      });
      return Response.redirect('https://github.com/login/oauth/authorize?' + p.toString(), 302);
    }

    if (url.pathname === '/exchange') {
      const body = await request.json();
      const resp = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
          code: body.code, redirect_uri: callbackUrl,
        }),
      });
      const data = await resp.json();
      if (data.access_token) {
        return new Response(JSON.stringify({ access_token: data.access_token }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      return new Response(JSON.stringify({ error: data.error_description || data.error || 'Exchange failed' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response('DustWorld OAuth Proxy', { status: 200, headers: corsHeaders });
  },
};
