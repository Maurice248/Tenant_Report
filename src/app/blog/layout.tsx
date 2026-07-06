import { BlogShell } from './blog-shell';

export const metadata = { title: 'Blog Posts Management' };

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <BlogShell>{children}</BlogShell>;
}
