import fs from 'fs';

const envText = fs.readFileSync(new URL('../.env', import.meta.url), 'utf8');
for (const line of envText.split(/\r?\n/)) {
  if (!line || line.startsWith('#') || !line.includes('=')) continue;
  const i = line.indexOf('=');
  process.env[line.slice(0, i)] = line.slice(i + 1).replace(/^"|"$/g, '');
}

const { fetchBlogWorkflowById, extractScheduleDayModulo } = await import('../src/lib/n8n-workflows.ts');
const { buildBlogAutomationEditorSections } = await import('../src/lib/blog-automation-editor.ts');

const wf = await fetchBlogWorkflowById('Kgt5aL2eaVYIyNMo');
const schedule = wf.nodes.find((n) => n.name === 'Schedule Trigger');
const if2 = wf.nodes.find((n) => n.name === 'If2');

console.log('=== Schedule Trigger parameters ===');
console.log(JSON.stringify(schedule?.parameters, null, 2));

console.log('\n=== If2 parameters ===');
console.log(JSON.stringify(if2?.parameters, null, 2));

const condRoot = if2?.parameters?.conditions?.conditions ?? {};
console.log('\nParsed If2 modulo:', extractScheduleDayModulo(condRoot));

const sections = buildBlogAutomationEditorSections(wf.nodes);
const scheduleSection = sections.find((s) => s.id === 'schedule');
console.log('\n=== Dashboard would show ===');
for (const f of scheduleSection?.fields ?? []) {
  console.log(`${f.label}: ${f.value}`);
}
