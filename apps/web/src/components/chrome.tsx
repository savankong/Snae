import Link from 'next/link';
import { formatUsd } from '@snae/money';
import { DEMO_BUYER } from '@/lib/fixtures';
import { ShieldTick } from './presence';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-ground/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="press flex items-center gap-2 font-display text-[19px] font-bold tracking-tight">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-live text-white">
            <ShieldTick className="h-4 w-4" />
          </span>
          Snae
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Main">
          <NavLink href="/">Browse</NavLink>
          <NavLink href="/discover">Discover</NavLink>
          <NavLink href="/favorites">Favourites</NavLink>
          <NavLink href="/guarantee">The guarantee</NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/wallet"
            className="press hidden items-center gap-2 rounded-full border border-hairline px-3 py-1.5 text-[13px] font-medium tabular-nums hover:border-money/40 sm:inline-flex"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-money" />
            {formatUsd(DEMO_BUYER.walletBalanceMinor)}
          </Link>
          <Link
            href="/account"
            className="press grid h-9 w-9 place-items-center rounded-full bg-raised-2 text-[13px] font-semibold"
            aria-label="Your account"
          >
            {DEMO_BUYER.displayName.slice(0, 1)}
          </Link>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="press rounded-full px-3 py-1.5 text-[13.5px] text-ink-2 hover:text-ink">
      {children}
    </Link>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-hairline bg-surface/50">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-hairline px-2.5 py-1 text-[11px] font-semibold tracking-wide text-ink-2">18+</span>
          <span className="text-[12.5px] text-ink-3">
            Adults only. All creators are identity- and age-verified before they can be listed.
          </span>
        </div>

        <div className="grid gap-8 text-[13px] sm:grid-cols-2 lg:grid-cols-4">
          <FooterCol title="Marketplace" links={[
            ['Browse creators', '/'], ['Discover', '/discover'], ['The guarantee', '/guarantee'],
            ['Your wallet', '/wallet'], ['Your standing', '/account/standing'],
          ]} />
          <FooterCol title="Creators" links={[
            ['Apply to create', '/creator/onboarding'], ['Creator studio', '/creator/studio'], ['Safety centre', '/creator/studio/safety'],
          ]} />
          <FooterCol title="Legal" links={[
            ['Terms', '/legal/terms'], ['Privacy', '/legal/privacy'], ['Creator agreement', '/legal/creator-agreement'],
            ['Biometric consent & retention', '/legal/biometric'], ['18 U.S.C. 2257 statement', '/legal/2257'], ['Content removal', '/legal/removal'],
          ]} />
          <FooterCol title="Support" links={[
            ['Contact', '/support'], ['Report a problem', '/support/report'], ['Complaint process', '/legal/complaints'],
          ]} />
        </div>

        <p className="mt-10 max-w-2xl text-[12px] leading-relaxed text-ink-3">
          Ranking on Snae cannot be bought. Creators are ordered by availability, presence record and your own
          favourites — never by payment. Prices are shown in dollars, never credits or tokens.
        </p>
        <p className="mt-4 text-[12px] text-ink-3">© {new Date().getFullYear()} Snae. All rights reserved.</p>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: Array<[string, string]> }) {
  return (
    <div>
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-3">{title}</h3>
      <ul className="space-y-2">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="text-ink-2 transition-colors hover:text-ink">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
