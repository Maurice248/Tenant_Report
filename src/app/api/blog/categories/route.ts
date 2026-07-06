export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { fetchBlogCategoriesFromWorkflow } from '@/lib/blog-category-source';

export async function GET() {
  const result = await fetchBlogCategoriesFromWorkflow();

  return NextResponse.json({
    categories: result.categories,
    source: result.source,
    nodeName: result.nodeName,
    ...(result.error ? { warning: result.error } : {}),
  });
}
