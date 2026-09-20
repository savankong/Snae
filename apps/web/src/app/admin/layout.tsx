import Link from 'next/link';
import { ShieldTick } from '@/components/presence';

export const metadata = { title: 'Admin', robots: { index: false, follow: false } };

/**
 * Admin console shell (§A.5).
 *
 * "Never build production operations that require direct database edits." Every
 * queue here is a real surface with an audited action, not a link to a SQL
 * client. MFA is mandatory for admins (§A.4) and all admin access to user,
 * payment, verification, moderation and payout data is audited (§A.4).
 */
const NAV: Array<[label: string, href: string]> = [
  ['Overview', '/admin'],
  ['Claims', '/admin/claims'],
  ['Verification', '/admin/verification'],
  ['Media', '/admin/media'],
  ['Disputes', '/admin/disputes'],
  ['Settings', '/admin/settings'],
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-7 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-warn/30 bg-warn/10 px-3 py-1.5 text-[12px] font-semibold text-warn">
          <ShieldTick className="h-3.5 w-3.5" /> Admin — all actions audited
        </span>
        <nav className="flex flex-wrap gap-1" aria-label="Admin sections">
          {NAV.map(([label, href]) => (
            <Link key={href} href={href}
                  className="press rounded-full px-3 py-1.5 text-[13px] text-ink-2 hover:bg-raised hover:text-ink">
              {label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
