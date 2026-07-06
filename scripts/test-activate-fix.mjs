import fs from 'fs';

const envText = fs.readFileSync(new URL('../.env', import.meta.url), 'utf8');
for (const line of envText.split(/\r?\n/)) {
  if (!line || line.startsWith('#') || !line.includes('=')) continue;
  const i = line.indexOf('=');
  process.env[line.slice(0, i)] = line.slice(i + 1).replace(/^"|"$/g, '');
}

const WORKFLOW_ID = 'Kgt5aL2eaVYIyNMo';
const { activateBlogWorkflow, fetchBlogWorkflowById } = await import('../src/lib/n8n-workflows.ts');

try {
  const before = await fetchBlogWorkflowById(WORKFLOW_ID);
  const webhook = before.nodes.find((n) => n.type === 'n8n-nodes-base.webhook');
  console.log('Before:', { active: before.active, path: webhook?.parameters?.path });

  const result = await activateBlogWorkflow(WORKFLOW_ID);
  const afterWebhook = result.workflow.nodes.find((n) => n.type === 'n8n-nodes-base.webhook');

  console.log('After:', {
    id: result.workflow.id,
    name: result.workflow.name,
    active: result.workflow.active,
    path: afterWebhook?.parameters?.path,
    deleted: result.deletedDuplicateWorkflows,
  });
} catch (error) {
  console.error('FAILED:', error instanceof Error ? error.message : error);
  process.exit(1);
}
