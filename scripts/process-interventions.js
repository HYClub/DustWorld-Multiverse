const fs = require('fs');
const path = require('path');
const https = require('https');

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO || 'owner/dust-world';
  const queuePath = path.join(__dirname, '..', 'data', 'interventions', 'queue.json');

  const dir = path.dirname(queuePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!token) {
    console.log('No GITHUB_TOKEN, checking local queue...');
    if (fs.existsSync(queuePath)) {
      const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
      console.log(`Found ${queue.length} pending interventions`);
    } else {
      console.log('No pending interventions');
      fs.writeFileSync(queuePath, JSON.stringify([]));
    }
    return;
  }

  const issues = await githubRequest(`/repos/${repo}/issues?labels=intervention&state=open`);

  const interventions = [];
  for (const issue of issues) {
    try {
      const body = JSON.parse(issue.body);
      interventions.push({
        id: issue.number,
        world_id: body.world_id || (issue.labels.find(l => l.name.startsWith('world_')) ? issue.labels.find(l => l.name.startsWith('world_')).name.replace('world_', '') : null),
        type: body.type,
        target: body.target,
        creator: issue.user.login,
        created_at: issue.created_at
      });
      console.log(`  Queued intervention #${issue.number}: ${body.type} on ${body.world_id}`);
    } catch (e) {
      console.warn(`  Skipping issue #${issue.number}: invalid format`);
    }
  }

  fs.writeFileSync(queuePath, JSON.stringify(interventions, null, 2));
  console.log(`Processed ${interventions.length} interventions`);
}

function githubRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: endpoint,
      headers: {
        'User-Agent': 'dust-world-bot',
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${process.env.GITHUB_TOKEN}`
      }
    };
    https.get(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`GitHub API ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
