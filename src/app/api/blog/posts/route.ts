export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  createWordPressPost,
  formatWordPressError,
  listWordPressPosts,
  WordPressConfigError,
} from '@/lib/wordpress';
import {
  resolveWordPressConfigForRequest,
  WORDPRESS_NOT_CONFIGURED_MSG,
} from '@/lib/wordpress-request';

export async function GET(request: NextRequest) {
  const wpConfig = await resolveWordPressConfigForRequest();
  if (!wpConfig) {
    return NextResponse.json(
      {
        configured: false,
        posts: [],
        error: WORDPRESS_NOT_CONFIGURED_MSG,
      },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = request.nextUrl;
    const page = Number.parseInt(searchParams.get('page') ?? '1', 10);
    const perPage = Number.parseInt(searchParams.get('per_page') ?? '20', 10);
    const search = searchParams.get('search') ?? undefined;
    const status = (searchParams.get('status') as 'publish' | 'draft' | 'pending' | 'private' | 'any' | null) ?? 'any';

    const posts = await listWordPressPosts(
      {
        page: Number.isFinite(page) ? page : 1,
        perPage: Number.isFinite(perPage) ? perPage : 20,
        search,
        status,
      },
      wpConfig
    );

    return NextResponse.json({ configured: true, posts });
  } catch (error) {
    const status = error instanceof WordPressConfigError ? 503 : 502;
    console.error('[API blog/posts GET]', error);
    return NextResponse.json({ error: formatWordPressError(error) }, { status });
  }
}

export async function POST(request: NextRequest) {
  const wpConfig = await resolveWordPressConfigForRequest();
  if (!wpConfig) {
    return NextResponse.json({ error: WORDPRESS_NOT_CONFIGURED_MSG }, { status: 503 });
  }

  try {
    const body = await request.json();

    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!body.content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const post = await createWordPressPost(
      {
        title: body.title.trim(),
        content: body.content.trim(),
        status: body.status ?? 'draft',
        excerpt: body.excerpt?.trim(),
        slug: body.slug?.trim(),
      },
      wpConfig
    );

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    const status = error instanceof WordPressConfigError ? 503 : 502;
    console.error('[API blog/posts POST]', error);
    return NextResponse.json({ error: formatWordPressError(error) }, { status });
  }
}
