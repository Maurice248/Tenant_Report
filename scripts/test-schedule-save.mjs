import fs from 'fs';

const envText = fs.readFileSync(new URL('../.env', import.meta.url), 'utf8');
for (const line of envText.split(/\r?\n/)) {
  if (!line || line.startsWith('#') || !line.includes('=')) continue;
  const i = line.indexOf('=');
  process.env[line.slice(0, i)] = line.slice(i + 1).replace(/^"|"$/g, '');
}

const { fetchBlogWorkflowById, updateBlogWorkflowNodes, loadBlogWorkflow } = await import('../src/lib/n8n-workflows.ts');
const { buildBlogAutomationEditorSections } = await import('../src/lib/blog-automation-editor.ts');

const { workflow } = await loadBlogWorkflow();
const schedule = buildBlogAutomationEditorSections(workflow.nodes).find((s) => s.id === 'schedule');
const nodeId = schedule.fields[0].nodeId;

console.log('Dashboard shows:', Object.fromEntries(schedule.fields.map((f) => [f.key, f.value])));

await updateBlogWorkflowNodes([
  { nodeId, fields: { triggerAtHour: '7', daysInterval: '3' } },
]);

const after = await fetchBlogWorkflowById(workflow.id);
const scheduleNode = after.nodes.find((n) => n.name === 'Schedule Trigger');
const if2 = after.nodes.find((n) => n.name === 'If2');

console.log('\nn8n Schedule Trigger after save:');
console.log(JSON.stringify(scheduleNode?.parameters, null, 2));
console.log('\nIf2 (should match daysInterval):', if2?.parameters?.conditions?.conditions?.[0]?.leftValue);

const reread = buildBlogAutomationEditorSections(after.nodes).find((s) => s.id === 'schedule');
console.log('\nDashboard would now show:', Object.fromEntries(reread.fields.map((f) => [f.key, f.value])));
