'use client';

import { useEffect, useState } from 'react';

type N8nWebhooksState = Record<string, string>;

export function useN8nWebhooks() {
  const [webhooks, setWebhooks] = useState<N8nWebhooksState>({});

  useEffect(() => {
    let active = true;
    fetch('/api/n8n/webhooks')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.webhooks) setWebhooks(data.webhooks as N8nWebhooksState);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      active = false;
    };
  }, []);

  return webhooks;
}

export function n8nUrl(webhooks: N8nWebhooksState, key: string): string {
  return webhooks[key]?.trim() || '';
}
