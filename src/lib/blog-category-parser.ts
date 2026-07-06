import type { BlogCategory } from '@/lib/blog-categories';

export const BLOG_CATEGORIES_NODE_NAME = 'Code in JavaScript1';

interface RawCategory {
  category?: string;
  service?: string;
  type?: string;
  seed_keyword?: string;
  keywords?: string[];
}

/** Strip // line comments so n8n jsCode arrays with inline comments still parse. */
function stripJsonLineComments(jsonLike: string): string {
  return jsonLike.replace(/^\s*\/\/.*$/gm, '');
}

/** Extract the categories array from the n8n Code node jsCode. */
export function parseCategoriesFromJsCode(jsCode: string): BlogCategory[] {
  const markerMatch = jsCode.match(/(?:const|let|var)\s+categories\s*=\s*/);
  if (!markerMatch || markerMatch.index === undefined) {
    throw new Error('Could not find "categories" array in Code in JavaScript1');
  }

  let index = markerMatch.index + markerMatch[0].length;
  while (index < jsCode.length && /\s/.test(jsCode[index]!)) index++;

  if (jsCode[index] !== '[') {
    throw new Error('Could not find opening "[" for categories array');
  }

  let depth = 0;
  const start = index;

  for (; index < jsCode.length; index++) {
    const char = jsCode[index];
    if (char === '[') depth++;
    else if (char === ']') {
      depth--;
      if (depth === 0) {
        const arrayJson = stripJsonLineComments(jsCode.slice(start, index + 1));
        const parsed = JSON.parse(arrayJson) as RawCategory[];
        if (!Array.isArray(parsed) || parsed.length === 0) {
          throw new Error('Categories array is empty or invalid');
        }

        return parsed
          .map((item, i) => {
            const service = String(item.service ?? item.type ?? '').trim();
            return {
              id: i + 1,
              category: String(item.category ?? '').trim(),
              service,
              type: service,
              seed_keyword: String(item.seed_keyword ?? '').trim(),
              keywords: Array.isArray(item.keywords)
                ? item.keywords.map((k) => String(k).trim()).filter(Boolean)
                : [],
            };
          })
          .filter((item) => item.category.length > 0);
      }
    }
  }

  throw new Error('Unclosed categories array in Code in JavaScript1');
}
