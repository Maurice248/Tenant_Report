'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Plus, FileText, AlertCircle, ExternalLink, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { CreatePostDialog } from '@/components/blog/CreatePostDialog';

interface WordPressPost {
  id: number;
  date: string;
  status: string;
  link: string;
  title: { rendered: string };
  excerpt: { rendered: string };
}

interface PostsResponse {
  configured?: boolean;
  posts?: WordPressPost[];
  error?: string;
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === 'publish' ? 'success' :
    status === 'draft' ? 'secondary' :
    status === 'pending' ? 'warning' :
    'secondary';

  return (
    <Badge variant={variant as 'success' | 'secondary' | 'warning'}>
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}

export default function BlogManagementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [createPostOpen, setCreatePostOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['wordpress-posts'],
    queryFn: async () => {
      const res = await fetch('/api/blog/posts');
      const json = (await res.json()) as PostsResponse;
      if (!res.ok) throw new Error(json.error ?? 'Failed to load posts');
      return json;
    },
  });

  async function handleDelete(post: WordPressPost) {
    const title = stripHtml(post.title.rendered) || `Post #${post.id}`;
    if (!confirm(`Delete "${title}" from WordPress?`)) return;

    setDeletingId(post.id);
    try {
      const res = await fetch(`/api/blog/posts/${post.id}?force=true`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'Delete failed');
      queryClient.invalidateQueries({ queryKey: ['wordpress-posts'] });
      toast({ title: 'Post deleted', description: `"${title}" was removed from WordPress.` });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Could not delete post',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  }

  const posts = data?.posts ?? [];
  const notConfigured = data?.configured === false;

  return (
    <div>
      <div className="flex items-start justify-between gap-6 px-8 pb-6 pt-8">
        <div>
          <h1 className="text-[28px] font-bold leading-tight text-gray-900">Blog Posts Management</h1>
          <p className="mt-1 text-[15px] text-gray-500">
            Manage AI-generated blog posts with in-dashboard approval
          </p>
        </div>
        <Button
          className="shrink-0 bg-[#0077b6] text-white hover:bg-[#005f8f]"
          onClick={() => setCreatePostOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Post
        </Button>
      </div>

      <CreatePostDialog
        open={createPostOpen}
        onOpenChange={setCreatePostOpen}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ['wordpress-posts'] })}
      />

      <div className="space-y-6 px-8 pb-8">
        {notConfigured && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-medium">WordPress is not configured</p>
              <p className="mt-1 text-amber-800">
                Add WordPress credentials in{' '}
                <strong>Client Dashboard → API keys</strong>, or set{' '}
                <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs">WORDPRESS_*</code> in your{' '}
                <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs">.env</code> for server defaults.
              </p>
            </div>
          </div>
        )}

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Post History</h2>

          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          )}

          {error && !notConfigured && (
            <div className="flex items-center justify-center gap-2 py-8 text-red-600">
              <AlertCircle className="h-5 w-5" />
              {error instanceof Error ? error.message : 'Failed to load posts'}
            </div>
          )}

          {!isLoading && !error && posts.length === 0 && !notConfigured && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-gray-400">
              <FileText className="mb-3 h-12 w-12 opacity-30" />
              <p className="text-lg font-medium">No blog posts yet</p>
              <p className="text-sm">Create your first post to get started</p>
            </div>
          )}

          <div className="grid gap-3">
            {posts.map((post) => {
              const title = stripHtml(post.title.rendered) || `Post #${post.id}`;
              const excerpt = stripHtml(post.excerpt.rendered);

              return (
                <Card key={post.id} className="hover:shadow-sm transition-shadow">
                  <CardHeader className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-900">{title}</p>
                        {excerpt && (
                          <p className="mt-1 line-clamp-2 text-sm text-gray-500">{excerpt}</p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                          <span>{format(new Date(post.date), 'MMM dd, yyyy')}</span>
                          <span>·</span>
                          <span>ID {post.id}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusBadge status={post.status} />
                        <Button asChild variant="outline" size="sm">
                          <a href={post.link} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                            View
                          </a>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={deletingId === post.id}
                          onClick={() => handleDelete(post)}
                          className="gap-1.5 border-red-200 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="hidden" />
                </Card>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
