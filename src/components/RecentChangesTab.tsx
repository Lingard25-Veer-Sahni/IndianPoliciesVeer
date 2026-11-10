'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import RecentChangesSidebar from '@/components/RecentChangesSidebar';

// A collapsible tab fixed to the left edge of the viewport, letting users
// pop open the "recent policy updates" panel on demand. Replaces the old
// always-fixed right-side panel (which was only ever visible at the `xl`
// breakpoint and up, so most visitors never saw it at all). The tab itself
// is visible from the `md` breakpoint up; below that, screen space is too
// tight for a persistent side element and the feature is skipped rather
// than fighting for room with the main content.
export default function RecentChangesTab() {
  const t = useTranslations('recentChanges');
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-none fixed inset-y-0 left-0 z-20 hidden md:block">
      <div className="pointer-events-auto flex h-full items-start">
        {open && (
          <div className="mt-24 w-64 rounded-r-lg border border-l-0 border-gray-200 bg-white p-4 shadow-md">
            <RecentChangesSidebar />
          </div>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={t('title')}
          className="mt-24 flex items-center gap-1 rounded-r-lg border border-l-0 border-gray-200 bg-white px-1.5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600 shadow-sm hover:bg-gray-50"
        >
          <span
            className="whitespace-nowrap"
            style={{ writingMode: 'vertical-rl' }}
          >
            {t('title')}
          </span>
          <span aria-hidden="true">{open ? '‹' : '›'}</span>
        </button>
      </div>
    </div>
  );
}
