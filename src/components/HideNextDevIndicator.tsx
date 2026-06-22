'use client';

import { useEffect } from 'react';

/** Hide the Next.js dev "N" badge inside iframe embed views (avoids duplicate with parent page). */
export function HideNextDevIndicator() {
  useEffect(() => {
    const hide = () => {
      const selectors = [
        '[data-nextjs-dev-tools-button]',
        '[data-nextjs-toast]',
        'nextjs-portal',
      ];

      for (const selector of selectors) {
        document.querySelectorAll(selector).forEach((el) => {
          if (el instanceof HTMLElement) {
            el.style.setProperty('display', 'none', 'important');
          }
        });
      }

      document.querySelectorAll('body > *').forEach((el) => {
        if (!(el instanceof HTMLElement)) return;
        const style = getComputedStyle(el);
        if (style.position !== 'fixed') return;

        const rect = el.getBoundingClientRect();
        const isCornerBadge =
          rect.width > 0 &&
          rect.width <= 72 &&
          rect.height <= 72 &&
          rect.left <= 48 &&
          rect.bottom >= window.innerHeight - 48;

        if (!isCornerBadge) return;

        const label = el.textContent?.trim();
        if (label === 'N' || el.shadowRoot || el.querySelector('svg')) {
          el.style.setProperty('display', 'none', 'important');
          el.style.setProperty('visibility', 'hidden', 'important');
          el.style.setProperty('pointer-events', 'none', 'important');
        }
      });
    };

    hide();
    const observer = new MutationObserver(hide);
    observer.observe(document.body, { childList: true, subtree: true });
    const interval = window.setInterval(hide, 800);

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
