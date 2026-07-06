'use client';

import { clientTabEmbedSrc, clientTabLabel } from '@/lib/client-dashboard-nav';

export function ClientTabView({ tabId }: { tabId: string }) {
  const src = clientTabEmbedSrc(tabId);
  const title = clientTabLabel(tabId);

  if (!src) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <h2 className="text-lg font-semibold text-slate-900">Tab not found</h2>
        <p className="mt-2 text-sm text-slate-500">This section is not available.</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh)] min-h-[560px] w-full flex-1">
      <iframe
        key={src}
        src={src}
        title={title}
        className="block h-full w-full border-none bg-[var(--bg)]"
      />
    </div>
  );
}
