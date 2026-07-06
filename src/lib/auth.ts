import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

/** Session user id; null when unauthenticated. */
export async function getRequestUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

/** Session user email; null when unauthenticated. */
export async function getRequestUserEmail(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.email ?? null;
}

/** Session company id; null when unauthenticated or user has no company. */
export async function getRequestCompanyId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.companyId ?? null;
}

export type RequestUser = {
  id: string;
  companyId: string | null;
  role: string;
};

/** Session user context; null when unauthenticated. */
export async function getRequestUser(): Promise<RequestUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  return {
    id: session.user.id,
    companyId: session.user.companyId ?? null,
    role: session.user.role,
  };
}

export const COMPANY_ADMIN_ROLE = 'COMPANY_ADMIN';
export const CLIENT_ROLE = 'CLIENT';
/** Legacy platform seed role — treated as company admin for backward compatibility. */
export const LEGACY_ADMIN_ROLE = 'ADMIN';

export function isCompanyAdminRole(role: string | undefined | null): boolean {
  return role === COMPANY_ADMIN_ROLE || role === LEGACY_ADMIN_ROLE;
}

/** Returns the request user if they are a company admin, otherwise null. */
export async function requireCompanyAdmin(): Promise<RequestUser | null> {
  const user = await getRequestUser();
  if (!user?.companyId || !isCompanyAdminRole(user.role)) {
    return null;
  }
  return user;
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/client-login',
    error: '/client-login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          companyId: user.companyId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.companyId = (user as { companyId?: string | null }).companyId ?? null;
      } else if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, companyId: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.companyId = dbUser.companyId;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.companyId = (token.companyId as string | null | undefined) ?? null;
      }
      return session;
    },
  },
};

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: string;
      companyId?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: string;
    companyId?: string | null;
  }
}
