export default {
  async scheduled(event, env, ctx) {
    const pat = env.GITHUB_PAT;
    if (!pat) {
      console.error('GITHUB_PAT not configured');
      return;
    }

    const res = await fetch(
      'https://api.github.com/repos/HYClub/DustWorld-Multiverse/actions/workflows/evolve.yml/dispatches',
      {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: 'Bearer ' + pat,
          'User-Agent': 'DustWorld-EvolveCron',
        },
        body: JSON.stringify({ ref: 'master' }),
      }
    );

    if (res.ok) {
      console.log('Workflow triggered at', new Date().toISOString());
    } else {
      console.error('Trigger failed:', res.status, await res.text());
    }
  },
};
