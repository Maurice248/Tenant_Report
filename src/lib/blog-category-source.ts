import { BLOG_CATEGORIES, type BlogCategory } from '@/lib/blog-categories';
import { BLOG_CATEGORIES_NODE_NAME, parseCategoriesFromJsCode } from '@/lib/blog-category-parser';
import { loadBlogWorkflow } from '@/lib/n8n-workflows';

export interface BlogCategoriesResult {
  categories: BlogCategory[];
  source: 'n8n' | 'fallback';
  nodeName: string;
  error?: string;
}

export async function fetchBlogCategoriesFromWorkflow(): Promise<BlogCategoriesResult> {
  try {
    const { workflow } = await loadBlogWorkflow();
    const node = workflow.nodes.find((n) => n.name === BLOG_CATEGORIES_NODE_NAME);

    if (!node) {
      throw new Error(`Workflow node "${BLOG_CATEGORIES_NODE_NAME}" not found`);
    }

    const jsCode = node.parameters?.jsCode;
    if (typeof jsCode !== 'string' || !jsCode.trim()) {
      throw new Error(`Node "${BLOG_CATEGORIES_NODE_NAME}" has no JavaScript code`);
    }

    const categories = parseCategoriesFromJsCode(jsCode);
    if (categories.length === 0) {
      throw new Error(`Node "${BLOG_CATEGORIES_NODE_NAME}" contains no categories`);
    }

    return {
      categories,
      source: 'n8n',
      nodeName: BLOG_CATEGORIES_NODE_NAME,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load categories from n8n';
    console.warn('[blog categories]', message);

    return {
      categories: BLOG_CATEGORIES,
      source: 'fallback',
      nodeName: BLOG_CATEGORIES_NODE_NAME,
      error: message,
    };
  }
}
