const https = require('https');
const path = require('path');

const OWNER = 'HYClub';
const REPO = 'DustWorld-Multiverse';
const BRANCH = 'master';
const SECONDS_PER_YEAR = 864;
const MAX_YEARS = 1;
const worldId = process.argv[2];

if (!worldId) { console.error('Usage: node evolve-one.js <worldId>'); process.exit(1); }

function api(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      method,
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': 'Bearer ' + (process.env.GITHUB_TOKEN || ''),
        'User-Agent': 'DustWorld-Evolver'
      }
    };
    if (body) {
      opts.headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }
    const req = https.request('https://api.github.com' + endpoint, opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          let msg = 'HTTP ' + res.statusCode;
          try { msg = JSON.parse(data).message || msg; } catch (e) {}
          return reject(new Error(msg));
        }
        try { resolve(data ? JSON.parse(data) : null); } catch (e) { resolve(data); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  const p = 'data/worlds/' + worldId + '/state.json';
  const data = await api('GET', '/repos/' + OWNER + '/' + REPO + '/contents/' + p);
  if (!data || !data.content) { console.log('SKIP: no data for ' + worldId); return; }

  const json = Buffer.from(data.content.replace(/\s/g, ''), 'base64').toString('utf-8');
  const state = JSON.parse(json);
  const sha = data.sha;

  const lastEvo = state.last_evolved_at ? new Date(state.last_evolved_at).getTime()
    : state.created_at ? new Date(state.created_at).getTime() : Date.now();
  const elapsed = (Date.now() - lastEvo) / 1000;
  const years = Math.min(MAX_YEARS, Math.floor(elapsed / SECONDS_PER_YEAR));

  if (years < 1) {
    const rem = Math.ceil(SECONDS_PER_YEAR - elapsed);
    console.log('SKIP ' + worldId + ': next in ' + rem + 's');
    return;
  }

  const WorldEngine = require(path.join(__dirname, '..', 'assets', 'js', 'engine', 'world.js'));
  const engine = new WorldEngine(state.config || {}, state);
  engine._initialized = true;
  for (let i = 0; i < years; i++) engine.evolve();

  const ns = engine.getState();
  ns.config = state.config;
  ns.last_evolved_at = new Date(lastEvo + years * SECONDS_PER_YEAR * 1000).toISOString();
  ns.updated_at = new Date().toISOString();

  const content = Buffer.from(JSON.stringify(ns, null, 2), 'utf-8').toString('base64');
  await api('PUT', '/repos/' + OWNER + '/' + REPO + '/contents/' + p, {
    message: '演化: ' + (state.name || worldId) + ' 第' + ns.year + '年',
    content, sha, branch: BRANCH
  });
  console.log('EVOLVED ' + worldId + ': +' + years + 'y -> year ' + ns.year + ' pop=' + (ns.stats ? ns.stats.total_population : 0));
}

main().catch(e => { console.error('FAILED ' + worldId + ': ' + e.message); process.exit(1); });
