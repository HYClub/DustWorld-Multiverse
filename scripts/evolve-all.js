const https = require('https');
const path = require('path');

const OWNER = 'HYClub';
const REPO = 'DustWorld-Multiverse';
const BRANCH = 'master';
const TOKEN = process.env.GITHUB_TOKEN || '';
const API = 'https://api.github.com';
const SECONDS_PER_YEAR = 864;
const MAX_YEARS = 1;

function api(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const url = API + endpoint;
    const opts = {
      method,
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': 'Bearer ' + TOKEN,
        'User-Agent': 'DustWorld-Evolver'
      }
    };
    if (body) opts.headers['Content-Type'] = 'application/json';
    const req = https.request(url, opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          let msg = 'HTTP ' + res.statusCode;
          try { msg = JSON.parse(data).message || msg; } catch (e) {}
          return reject(new Error(msg));
        }
        try { resolve(data ? JSON.parse(data) : null); }
        catch (e) { resolve(data); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getWorldIds() {
  const data = await api('GET', '/repos/' + OWNER + '/' + REPO + '/contents/data/worlds');
  if (!Array.isArray(data)) return [];
  return data.filter(d => d.type === 'dir').map(d => d.name);
}

async function loadState(worldId) {
  const p = 'data/worlds/' + worldId + '/state.json';
  const data = await api('GET', '/repos/' + OWNER + '/' + REPO + '/contents/' + p);
  if (!data || !data.content) return null;
  const json = Buffer.from(data.content.replace(/\s/g, ''), 'base64').toString('utf-8');
  return { state: JSON.parse(json), sha: data.sha };
}

function putState(worldId, state, sha) {
  const p = 'data/worlds/' + worldId + '/state.json';
  const content = Buffer.from(JSON.stringify(state, null, 2), 'utf-8').toString('base64');
  return api('PUT', '/repos/' + OWNER + '/' + REPO + '/contents/' + p, {
    message: '演化: ' + (state.name || worldId) + ' 第' + state.year + '年',
    content,
    sha,
    branch: BRANCH
  });
}

async function evolve(worldId) {
  const loaded = await loadState(worldId);
  if (!loaded) { console.log('  SKIP: no data'); return; }
  const state = loaded.state;

  const lastEvo = state.last_evolved_at ? new Date(state.last_evolved_at).getTime()
    : state.created_at ? new Date(state.created_at).getTime() : Date.now();
  const elapsed = (Date.now() - lastEvo) / 1000;
  const years = Math.min(MAX_YEARS, Math.floor(elapsed / SECONDS_PER_YEAR));
  if (years < 1) {
    console.log('  SKIP: next in ' + Math.ceil(SECONDS_PER_YEAR - elapsed) + 's');
    return;
  }

  const WorldEngine = require(path.join(__dirname, '..', 'assets', 'js', 'engine', 'world.js'));
  const engine = new WorldEngine(state.config || {}, state);
  engine._initialized = true;
  for (let i = 0; i < years; i++) engine.evolve();

  const ns = engine.getState();
  ns.config = state.config;
  ns.last_evolved_at = new Date(lastEvo + years * SECONDS_PER_YEAR * 1000).toISOString();
  await putState(worldId, ns, loaded.sha);
  console.log('  EVOLVED: +' + years + 'y -> year ' + ns.year);
}

async function main() {
  console.log('=== DustWorld Evolution ===');
  console.log('Time: ' + new Date().toISOString());
  if (!TOKEN) { console.error('No GITHUB_TOKEN'); process.exit(1); }
  const ids = await getWorldIds();
  console.log('Worlds: ' + ids.length);
  for (const id of ids) {
    process.stdout.write(id + '...');
    try { await evolve(id); } catch (e) { console.log('  ERROR: ' + e.message); }
  }
  console.log('=== Done ===');
}

main().catch(e => { console.error(e); process.exit(1); });
