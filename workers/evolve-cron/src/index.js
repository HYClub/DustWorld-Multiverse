// 每 1 分钟触发
// 检查所有 world → 到期 + 无锁 → 锁定 → 直接演化 → 释放锁
// 需要环境变量 GITHUB_PAT（scope: repo）

import WorldEngine from './engine.js';

function decodeB64(str) {
  const bytes = atob(str.replace(/\s/g, ''));
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new TextDecoder('utf-8').decode(arr);
}
function encodeB64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

const OWNER = 'HYClub';
const REPO = 'DustWorld-Multiverse';
const API = 'https://api.github.com';
const SECONDS_PER_YEAR = 864;
const MAX_YEARS = 10;
const LOCK_TTL = 5 * 60 * 1000;

async function gh(path, pat) {
  try {
    const res = await fetch(API + path, {
      headers: {
        Authorization: 'Bearer ' + pat,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'DustWorld-EvolveCron',
      },
    });
    if (!res.ok) { console.error('HTTP', res.status, 'for', path); return null; }
    return res.json();
  } catch (e) {
    console.error('FETCH failed for', path, e.message);
    return null;
  }
}

// 尝试锁定 world，返回 true 表示锁定成功
async function acquireLock(worldId, pat, existingSha) {
  try {
    const body = {
      message: '🔒 Lock ' + worldId + ' for evolution',
      content: btoa(String(Date.now())),
      branch: 'master',
    };
    if (existingSha) body.sha = existingSha;
    const res = await fetch(API + '/repos/' + OWNER + '/' + REPO + '/contents/data/locks/' + worldId, {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer ' + pat,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'DustWorld-EvolveCron',
      },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch (e) {
    console.error('LOCK failed for', worldId, e.message);
    return false;
  }
}

// 释放锁
async function releaseLock(worldId, pat) {
  try {
    const data = await gh('/repos/' + OWNER + '/' + REPO + '/contents/data/locks/' + worldId, pat);
    if (data && data.sha) {
      const res = await fetch(API + '/repos/' + OWNER + '/' + REPO + '/contents/data/locks/' + worldId, {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer ' + pat,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'DustWorld-EvolveCron',
        },
        body: JSON.stringify({ message: '🔓 Release lock ' + worldId, sha: data.sha, branch: 'master' }),
      });
      if (res.ok) console.log('LOCK released for', worldId);
      else console.warn('LOCK release failed for', worldId, res.status);
    } else {
      console.log('LOCK no file for', worldId);
    }
  } catch (e) {
    console.warn('LOCK release error for', worldId, e.message);
  }
}

// 演化单个 world（读 → 算 → 写 → catch-up）
async function evolveWorld(worldId, pat) {
  const p = 'data/worlds/' + worldId + '/state.json';
  for (let pass = 0; pass < 10; pass++) {
    const data = await gh('/repos/' + OWNER + '/' + REPO + '/contents/' + p, pat);
    if (!data || !data.content) { console.log('SKIP ' + worldId + ': no state.json'); return; }

    const jsonStr = decodeB64(data.content);
    const json = JSON.parse(jsonStr);
    const sha = data.sha;
    const lastEvo = json.last_evolved_at ? new Date(json.last_evolved_at).getTime()
      : json.created_at ? new Date(json.created_at).getTime() : Date.now();
    const elapsed = (Date.now() - lastEvo) / 1000;
    const years = Math.min(MAX_YEARS, Math.floor(elapsed / SECONDS_PER_YEAR));

    if (years < 1) { console.log('SKIP ' + worldId + ': caught up'); break; }

    const engine = new WorldEngine(json.config || {}, json);
    engine._initialized = true;
    for (let i = 0; i < years; i++) engine.evolve();
    const ns = engine.getState();
    ns.config = json.config;
    ns.last_evolved_at = new Date(lastEvo + years * SECONDS_PER_YEAR * 1000).toISOString();
    ns.updated_at = new Date().toISOString();

    const content = encodeB64(JSON.stringify(ns, null, 2));
    const putBody = { message: '演化: ' + (json.name || worldId) + ' 第' + ns.year + '年', content, sha, branch: 'master' };

    const putRes = await fetch(API + '/repos/' + OWNER + '/' + REPO + '/contents/' + p, {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer ' + pat,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'DustWorld-EvolveCron',
      },
      body: JSON.stringify(putBody),
    });

    if (putRes.ok) {
      console.log('EVOLVED ' + worldId + ': +' + years + 'y -> year ' + ns.year);
    } else if (putRes.status === 409 || putRes.status === 422) {
      console.log('RETRY ' + worldId + ': SHA conflict (HTTP ' + putRes.status + '), re-reading...');
      continue; // Re-read fresh state and try again
    } else {
      const errText = await putRes.text();
      console.error('FAILED ' + worldId + ': PUT', putRes.status, errText);
      break;
    }
  }
}

export default {
  async scheduled(_, env) {
    const pat = env.GITHUB_PAT;
    if (!pat) { console.error('GITHUB_PAT not set'); return; }

    const now = Date.now();
    const due = [];
    console.log('[CRON] run at', new Date(now).toISOString());

    const list = await gh('/repos/' + OWNER + '/' + REPO + '/contents/data/worlds', pat);
    if (!list || !Array.isArray(list)) { console.log('No worlds found'); return; }
    console.log('[CRON] checking', list.length, 'worlds');

    for (const item of list) {
      if (item.type !== 'dir') continue;
      const worldId = item.name;

      // 检查锁
      const lock = await gh('/repos/' + OWNER + '/' + REPO + '/contents/data/locks/' + worldId, pat);
      if (lock && lock.content) {
        try {
          const lockedAt = parseInt(decodeB64(lock.content), 10);
          if (now - lockedAt < LOCK_TTL) {
            console.log('SKIP ' + worldId + ': locked (' + Math.round((now - lockedAt) / 1000) + 's ago)');
            continue;
          }
          console.log('STALE ' + worldId + ': lock expired (' + Math.round((now - lockedAt) / 1000) + 's old)');
        } catch (e) {
          console.log('CORRUPT ' + worldId + ': lock corrupted (' + e.message + '), overwriting');
        }
      }

      // 读 state 检查是否到期
      const data = await gh('/repos/' + OWNER + '/' + REPO + '/contents/data/worlds/' + worldId + '/state.json', pat);
      if (!data || !data.content) { console.log('SKIP ' + worldId + ': no state.json'); continue; }

      try {
        const json = JSON.parse(decodeB64(data.content));
        const lastEvo = json.last_evolved_at
          ? new Date(json.last_evolved_at).getTime()
          : json.created_at ? new Date(json.created_at).getTime() : now;
        const remaining = Math.ceil((SECONDS_PER_YEAR * 1000 - (now - lastEvo)) / 1000);
        if (remaining > 0) { console.log('SKIP ' + worldId + ': not due (' + remaining + 's left)'); continue; }

        // 到期 → 获取锁 → 演化
        const acquired = await acquireLock(worldId, pat, lock ? lock.sha : null);
        if (!acquired) { console.log('FAIL ' + worldId + ': lock acquisition failed'); continue; }
        due.push(worldId);
      } catch (e) {
        console.error('ERROR for', worldId, ':', e.message);
      }
    }

    if (due.length === 0) { console.log('No due worlds'); return; }
    console.log('Due worlds:', due.join(', '));

    // 逐个演化（Worker 内直接跑）
    for (const id of due) {
      await evolveWorld(id, pat);
      await releaseLock(id, pat);
    }

    console.log('Done evolving', due.length, 'worlds');
  },
};
