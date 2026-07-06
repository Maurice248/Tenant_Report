export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  deleteWordPressPost,
  formatWordPressError,
  getWordPressPost,
  updateWordPressPost,
  WordPressConfigError,
} from '@/lib/wordpress';
import {
  resolveWordPressConfigForRequest,
  WORDPRESS_NOT_CONFIGURED_MSG,
} from '@/lib/wordpress-request';

type RouteContext = { params: Promise<{ id: string }> };

function parsePostId(id: string) {
  const postId = Number.parseInt(id, 10);
  if (!Number.isFinite(postId) || postId <= 0) return null;
  return postId;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const wpConfig = await resolveWordPressConfigForRequest();
  if (!wpConfig) {
    return NextResponse.json({ error: WORDPRESS_NOT_CONFIGURED_MSG }, { status: 503 });
  }

  try {
    const { id } = await params;
    const postId = parsePostId(id);
    if (!postId) return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });

    const post = await getWordPressPost(postId, wpConfig);
    return NextResponse.json({ post });
  } catch (error) {
    const status = error instanceof WordPressConfigError ? 503 : 502;
    console.error('[API blog/posts/[id] GET]', error);
    return NextResponse.json({ error: formatWordPressError(error) }, { status });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const wpConfig = await resolveWordPressConfigForRequest();
  if (!wpConfig) {
    return NextResponse.json({ error: WORDPRESS_NOT_CONFIGURED_MSG }, { status: 503 });
  }

  try {
    const { id } = await params;
    const postId = parsePostId(id);
    if (!postId) return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });

    const body = await request.json();
    const post = await updateWordPressPost(
      postId,
      {
        title: body.title,
        content: body.content,
        status: body.status,
        excerpt: body.excerpt,
        slug: body.slug,
      },
      wpConfig
    );

    return NextResponse.json({ post });
  } catch (error) {
    const status = error instanceof WordPressConfigError ? 503 : 502;
    console.error('[API blog/posts/[id] PATCH]', error);
    return NextResponse.json({ error: formatWordPressError(error) }, { status });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const wpConfig = await resolveWordPressConfigForRequest();
  if (!wpConfig) {
    return NextResponse.json({ error: WORDPRESS_NOT_CONFIGURED_MSG }, { status: 503 });
  }

  try {
    const { id } = await params;
    const postId = parsePostId(id);
    if (!postId) return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });

    const force = request.nextUrl.searchParams.get('force') === 'true';
    const post = await deleteWordPressPost(postId, force, wpConfig);
    return NextResponse.json({ post });
  } catch (error) {
    const status = error instanceof WordPressConfigError ? 503 : 502;
    console.error('[API blog/posts/[id] DELETE]', error);
    return NextResponse.json({ error: formatWordPressError(error) }, { status });
  }
}
