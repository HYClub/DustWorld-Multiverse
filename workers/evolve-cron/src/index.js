// 每 1 分钟触发，检查所有世界，到期的触发 workflow_dispatch
// 需要环境变量 GITHUB_PAT（scope: workflow + public_repo）

const OWNER = 'HYClub';
const REPO = 'DustWorld-Multiverse';
const API = 'https://api.github.com';
const SECONDS_PER_YEAR = 864;

async function gh(path, pat) {
  const res = await fetch(API + path, {
    headers: {
      Authorization: 'Bearer ' + pat,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'DustWorld-EvolveCron',
    },
  });
  if (!res.ok) return null;
  return res.json();
}

export default {
  async scheduled(_, env) {
    const pat = env.GITHUB_PAT;
    if (!pat) { console.error('GITHUB_PAT not set'); return; }

    const now = Date.now();
    const due = [];

    const list = await gh('/repos/' + OWNER + '/' + REPO + '/contents/data/worlds', pat);
    if (!list || !Array.isArray(list)) { console.log('No worlds found'); return; }

    for (const item of list) {
      if (item.type !== 'dir') continue;
      const worldId = item.name;

      const data = await gh('/repos/' + OWNER + '/' + REPO + '/contents/data/worlds/' + worldId + '/state.json', pat);
      if (!data || !data.content) continue;

      try {
        const json = JSON.parse(atob(data.content.replace(/\s/g, '')));
        const lastEvo = json.last_evolved_at
          ? new Date(json.last_evolved_at).getTime()
          : json.created_at ? new Date(json.created_at).getTime()
          : now;
        if (now - lastEvo >= SECONDS_PER_YEAR * 1000) {
          due.push(worldId);
        }
      } catch (e) {
        console.error('Parse error for', worldId, e.message);
      }
    }

    if (due.length === 0) { console.log('No due worlds'); return; }

    console.log('Due worlds:', due.join(', '));

    // Trigger workflow for due worlds
    const res = await fetch(API + '/repos/' + OWNER + '/' + REPO + '/actions/workflows/evolve.yml/dispatches', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + pat,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'DustWorld-EvolveCron',
      },
      body: JSON.stringify({
        ref: 'master',
        inputs: { worlds: due.join(',') },
      }),
    });

    if (res.ok) {
      console.log('Workflow triggered for', due.length, 'worlds');
    } else {
      console.error('Trigger failed:', res.status, await res.text());
    }
  },
};
