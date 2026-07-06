import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_PAGES = ['/client-login', '/client-register'];

function isAuthPage(pathname: string) {
  return AUTH_PAGES.includes(pathname);
}

function isPublicPath(pathname: string): boolean {
  if (isAuthPage(pathname)) return true;
  if (pathname.startsWith('/invite/')) return true;
  if (pathname.startsWith('/api/auth/')) return true;
  if (pathname === '/api/companies/register') return true;
  if (/^\/api\/invites\/[^/]+$/.test(pathname)) return true;
  if (/^\/api\/invites\/[^/]+\/accept$/.test(pathname)) return true;
  return false;
}

function isProtectedPath(pathname: string): boolean {
  if (pathname.startsWith('/api/')) return true;
  if (pathname.startsWith('/client-dashboard')) return true;
  if (pathname === '/') return true;
  if (pathname.startsWith('/dashboard')) return true;
  if (pathname.startsWith('/outreach')) return true;
  if (pathname.startsWith('/newsletter')) return true;
  if (pathname.startsWith('/blog')) return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isEmbed = req.nextUrl.searchParams.get('embed') === '1';

  if (pathname === '/login') {
    return NextResponse.redirect(new URL('/client-login', req.url));
  }

  // Multi-tenant entry: bare / is not the legacy dashboard home
  if (pathname === '/' && !isEmbed) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token?.companyId) {
      return NextResponse.redirect(new URL('/client-dashboard', req.url));
    }
    return NextResponse.redirect(new URL('/client-login', req.url));
  }

  if (!isProtectedPath(pathname) || isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const needsCompany = pathname.startsWith('/client-dashboard');
  const authorized = needsCompany ? Boolean(token?.companyId) : Boolean(token?.id);

  if (isAuthPage(pathname) && token?.companyId) {
    return NextResponse.redirect(new URL('/client-dashboard', req.url));
  }

  if (!authorized) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const signIn = new URL('/client-login', req.url);
    signIn.searchParams.set('callbackUrl', pathname + req.nextUrl.search);
    return NextResponse.redirect(signIn);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
    '/client-dashboard',
    '/client-dashboard/:path*',
    '/client-login',
    '/client-register',
    '/login',
    '/',
    '/dashboard/:path*',
    '/outreach/:path*',
    '/newsletter/:path*',
    '/blog/:path*',
  ],
};
