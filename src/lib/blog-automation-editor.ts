import type { EditableFieldType, N8nWorkflowNode } from '@/lib/n8n-workflows';
import {
  extractEditableFields,
  extractScheduleTriggerSettings,
  extractWorkflowTimezone,
  resolveScheduleDaysInterval,
} from '@/lib/n8n-workflows';

export const WORKFLOW_SETTINGS_NODE_ID = '__workflow_settings__';

export interface BlogAutomationEditorField {
  nodeId: string;
  key: string;
  label: string;
  description?: string;
  type: EditableFieldType;
  value: string;
}

export interface BlogAutomationEditorSection {
  id: string;
  title: string;
  description: string;
  fields: BlogAutomationEditorField[];
}

const TITLE_NODE = 'Title and Subheading Generator';
const ARTICLE_NODE = 'Article Writing Chain';
const IMAGE_NODE = 'AI Agent';
const SCHEDULE_NODE = 'Schedule Trigger';

function findNode(nodes: N8nWorkflowNode[], name: string): N8nWorkflowNode | undefined {
  return nodes.find((n) => n.name === name);
}

function pickPromptFields(
  node: N8nWorkflowNode,
  labels: { systemMessage: string; text: string }
): BlogAutomationEditorField[] {
  const editable = extractEditableFields(node);
  const fields: BlogAutomationEditorField[] = [];

  for (const field of editable) {
    if (field.key === 'systemMessage') {
      fields.push({
        nodeId: node.id,
        key: field.key,
        label: labels.systemMessage,
        description: 'Instructions that define tone, format, and rules for the AI.',
        type: field.type,
        value: field.value,
      });
    } else if (field.key === 'text') {
      fields.push({
        nodeId: node.id,
        key: field.key,
        label: labels.text,
        description: 'The main prompt sent to the AI, including variables from earlier workflow steps.',
        type: field.type,
        value: field.value,
      });
    }
  }

  return fields;
}

function extractScheduleFields(
  scheduleNode: N8nWorkflowNode,
  allNodes: N8nWorkflowNode[],
  workflowSettings?: Record<string, unknown>
): BlogAutomationEditorField[] {
  const { triggerAtHour } = extractScheduleTriggerSettings(scheduleNode);
  const daysInterval = resolveScheduleDaysInterval(allNodes);
  const timezone = extractWorkflowTimezone(workflowSettings);

  return [
    {
      nodeId: scheduleNode.id,
      key: 'triggerAtHour',
      label: 'Run at hour (24h)',
      description:
        'Hour of the day when n8n checks whether to run (0 = midnight, 7 = 7 AM). Interpreted in the workflow timezone below.',
      type: 'text',
      value: String(triggerAtHour),
    },
    {
      nodeId: WORKFLOW_SETTINGS_NODE_ID,
      key: 'timezone',
      label: 'Timezone',
      description: 'Workflow timezone from n8n settings — controls when the scheduled hour runs.',
      type: 'text',
      value: timezone ?? '',
    },
    {
      nodeId: scheduleNode.id,
      key: 'daysInterval',
      label: 'Days between runs',
      description:
        'Same as n8n Schedule Trigger → Days Between Triggers (e.g. 3 = every 3 days at the chosen hour).',
      type: 'text',
      value: String(daysInterval),
    },
  ];
}

/** Curated editor sections — only the 4 areas users should change. */
export function buildBlogAutomationEditorSections(
  nodes: N8nWorkflowNode[],
  workflowSettings?: Record<string, unknown>
): BlogAutomationEditorSection[] {
  const sections: BlogAutomationEditorSection[] = [];

  const scheduleNode = findNode(nodes, SCHEDULE_NODE);
  if (scheduleNode) {
    sections.push({
      id: 'schedule',
      title: 'Schedule',
      description: 'Control when blog automation runs on your n8n server.',
      fields: extractScheduleFields(scheduleNode, nodes, workflowSettings),
    });
  }

  const titleNode = findNode(nodes, TITLE_NODE);
  if (titleNode) {
    sections.push({
      id: 'title-prompts',
      title: 'Title & Outline Prompts',
      description: 'AI prompts that generate the blog title, meta fields, and article outline.',
      fields: pickPromptFields(titleNode, {
        systemMessage: 'Title AI instructions',
        text: 'Title prompt template',
      }),
    });
  }

  const articleNode = findNode(nodes, ARTICLE_NODE);
  if (articleNode) {
    sections.push({
      id: 'article-prompts',
      title: 'Article Writing Prompts',
      description: 'AI prompts that write the full blog article from the outline.',
      fields: pickPromptFields(articleNode, {
        systemMessage: 'Article AI instructions',
        text: 'Article prompt template',
      }),
    });
  }

  const imageNode = findNode(nodes, IMAGE_NODE);
  if (imageNode) {
    sections.push({
      id: 'image-prompts',
      title: 'Featured Image Prompts',
      description: 'AI prompts that create the photorealistic featured image for each post.',
      fields: pickPromptFields(imageNode, {
        systemMessage: 'Image AI instructions',
        text: 'Image prompt template',
      }),
    });
  }

  return sections;
}

export function getSectionFieldValue(
  field: BlogAutomationEditorField,
  draftFields: Record<string, Record<string, string>>
): string {
  return draftFields[field.nodeId]?.[field.key] ?? field.value;
}

export function isSectionDirty(
  section: BlogAutomationEditorSection,
  draftFields: Record<string, Record<string, string>>
): boolean {
  return section.fields.some((field) => {
    const draft = draftFields[field.nodeId]?.[field.key];
    return draft !== undefined && draft !== field.value;
  });
}

export function sectionNodeIds(section: BlogAutomationEditorSection): string[] {
  return [...new Set(section.fields.map((f) => f.nodeId).filter((id) => id !== WORKFLOW_SETTINGS_NODE_ID))];
}

export interface BlogSectionSavePayload {
  updates: Array<{ nodeId: string; fields: Record<string, string> }>;
  settings?: Record<string, string>;
}

/** Build save payload for one section (may span multiple n8n nodes and workflow settings). */
export function buildSectionSavePayload(
  section: BlogAutomationEditorSection,
  draftFields: Record<string, Record<string, string>>
): BlogSectionSavePayload {
  const byNode = new Map<string, Record<string, string>>();
  let settings: Record<string, string> | undefined;

  for (const field of section.fields) {
    const value = getSectionFieldValue(field, draftFields);
    if (field.nodeId === WORKFLOW_SETTINGS_NODE_ID) {
      settings = settings ?? {};
      settings[field.key] = value;
      continue;
    }

    const existing = byNode.get(field.nodeId) ?? {};
    existing[field.key] = value;
    byNode.set(field.nodeId, existing);
  }

  return {
    updates: [...byNode.entries()].map(([nodeId, fields]) => ({ nodeId, fields })),
    settings,
  };
}

/** @deprecated Use buildSectionSavePayload */
export function buildSectionUpdates(
  section: BlogAutomationEditorSection,
  draftFields: Record<string, Record<string, string>>
): Array<{ nodeId: string; fields: Record<string, string> }> {
  return buildSectionSavePayload(section, draftFields).updates;
}
