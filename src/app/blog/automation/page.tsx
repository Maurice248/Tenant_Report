'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreatePostDialog } from '@/components/blog/CreatePostDialog';
import { BlogWorkflowEditor } from '@/components/blog/BlogWorkflowEditor';

export default function BlogAutomationPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div>
      <div className="flex items-start justify-between gap-6 px-8 pb-4 pt-8">
        <div>
          <h1 className="text-[28px] font-bold leading-tight text-gray-900">Automation</h1>
          <p className="mt-1 text-[15px] text-gray-500">
            Configure schedule, prompts, and run blog generation
          </p>
        </div>
      </div>

      <Tabs defaultValue="editor" className="px-8 pb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="editor">Settings</TabsTrigger>
          <TabsTrigger value="run">Run Automation</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="mt-0">
          <BlogWorkflowEditor />
        </TabsContent>

        <TabsContent value="run" className="mt-0 space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4">
            <div>
              <p className="font-medium text-gray-900">Trigger blog generation</p>
              <p className="text-sm text-gray-500">
                Pick a category and send it to the n8n blog-automation webhook
              </p>
            </div>
            <Button
              className="shrink-0 bg-[#0077b6] text-white hover:bg-[#005f8f]"
              onClick={() => setDialogOpen(true)}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Run Automation
            </Button>
          </div>

          <CreatePostDialog open={dialogOpen} onOpenChange={setDialogOpen} />

          {!dialogOpen && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-8 py-16 text-gray-400">
              <Sparkles className="mb-3 h-12 w-12 opacity-30" />
              <p className="text-lg font-medium">Ready to generate</p>
              <p className="text-sm">Click &quot;Run Automation&quot; to pick a category and start the workflow</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
