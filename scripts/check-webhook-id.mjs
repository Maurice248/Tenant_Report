import fs from 'fs';

const envText = fs.readFileSync(new URL('../.env', import.meta.url), 'utf8');
const env = {};
for (const line of envText.split(/\r?\n/)) {
  if (!line || line.startsWith('#') || !line.includes('=')) continue;
  const i = line.indexOf('=');
  env[line.slice(0, i)] = line.slice(i + 1).replace(/^"|"$/g, '');
}

const base = 'https://n8n.srv1374096.hstgr.cloud';
const key = env.N8N_API_KEY;
const targetId = '4d9ca4f2-ad33-4f87-a27d-6b5690fddca7';

const listRes = await fetch(`${base}/api/v1/workflows?limit=250`, {
  headers: { Accept: 'application/json', 'X-N8N-API-KEY': key },
});
const list = await listRes.json();

for (const summary of list.data ?? []) {
  const res = await fetch(`${base}/api/v1/workflows/${summary.id}`, {
    headers: { Accept: 'application/json', 'X-N8N-API-KEY': key },
  });
  const wf = await res.json();
  for (const node of wf.nodes ?? []) {
    if (node.type !== 'n8n-nodes-base.webhook') continue;
    if (node.webhookId === targetId || node.parameters?.path === 'blog-automation') {
      console.log(JSON.stringify({
        wfId: wf.id,
        name: wf.name,
        active: wf.active,
        path: node.parameters?.path,
        webhookId: node.webhookId,
      }));
    }
  }
}
