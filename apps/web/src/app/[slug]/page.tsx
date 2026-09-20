import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatUsd, formatUsdCompact } from '@snae/money';
import { presenceRecord } from '@snae/presence';
import { canShowFriendRecommendations } from '@snae/referrals';
import { CREATORS, DAY_LABELS, DEMO_BUYER, creatorBySlug } from '@/lib/fixtures';
import { AvatarMark, PresenceSeal, StatusPill, ShieldTick } from '@/components/presence';
import { Button, Card, LinkButton, Note, SectionHeading, cx } from '@/components/primitives';

export async function generateStaticParams() {
  return CREATORS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const creator = creatorBySlug(slug);
  if (!creator) return {};
  // Public creator profiles are server-rendered and indexable (§A.6).
  return {
    title: `${creator.displayName} — verified creator`,
    description: `${creator.tagline} Talk to ${creator.displayName} on Snae. Every session proven live, or your money back.`,
    alternates: { canonical: `/${creator.slug}` },
  };
}

export default async function CreatorProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const creator = creatorBySlug(slug);
  if (!creator) notFound();

  const now = Date.now();
  const lastPass = creator.sealAgeSeconds === null ? null : new Date(now - creator.sealAgeSeconds * 1000);
  const live = creator.status === 'live';
  const isFavorite = DEMO_BUYER.favoriteSlugs.includes(creator.slug);
  const isHome = DEMO_BUYER.homeCreatorSlug === creator.slug;

  const record = presenceRecord(
    Array.from({ length: 50 }, (_, i) => ({
      id: `p${i}`, sessionId: `s${i}`, creatorId: creator.id, type: 'live_hello' as const,
      providerRef: null, riskSignals: {}, createdAt: new Date(now),
      result: i < Math.round((creator.sessionsVerifiedPct / 100) * 50) ? ('pass' as const) : ('fail' as const),
    })),
  );

  /**
   * §14: no cross-creator recommendations during, or within 30 minutes after,
   * a session with the Home Creator. The gate is asked here rather than
   * assumed, so the Friends rail cannot reappear by accident on this surface.
   */
  const showFriends = canShowFriendRecommendations({
    attribution: isHome
      ? { buyerId: DEMO_BUYER.id, homeCreatorId: creator.id, source: 'creator',
          startedAt: new Date(now - 86_400_000), expiresAt: new Date(now + 86_400_000 * 90) }
      : null,
    viewingCreatorIsHome: isHome,
    inActiveSessionWithHome: false,
    lastHomeSessionEndedAt: null,
    now: new Date(now),
  });

  const friends = creator.friendSlugs.map(creatorBySlug).filter(Boolean) as typeof CREATORS;

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">
      {/* ── Identity ───────────────────────────────────────────────────── */}
      <header className="animate-rise flex flex-col gap-5 sm:flex-row sm:items-start">
        <AvatarMark name={creator.displayName} hue={creator.hue} size={104}
                    ring={live ? 'live' : creator.status === 'booking_only' ? 'scheduled' : 'offline'} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-[32px] font-bold leading-none tracking-tight">{creator.displayName}</h1>
            {creator.foundingCreator && (
              <span className="rounded-full border border-warn/30 bg-warn/10 px-2 py-0.5 text-[11px] font-semibold text-warn">
                Founding Creator
              </span>
            )}
          </div>

          <p className="mt-2 text-[15px] text-ink-2">{creator.tagline}</p>

          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <StatusPill status={creator.status} nextSlot={creator.nextSlot} queueLength={creator.queueLength} />
            <PresenceSeal lastPassAt={lastPass} now={new Date(now)} />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-2.5 py-1 text-[11.5px] text-ink-2">
              <ShieldTick className="h-3.5 w-3.5 text-verified-soft" /> ID &amp; age verified
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {creator.interests.map((tag) => (
              <span key={tag} className="rounded-full bg-raised px-2.5 py-1 text-[12px] text-ink-2">{tag}</span>
            ))}
          </div>
        </div>
      </header>

      {/* ── Primary actions ────────────────────────────────────────────── */}
      <section className="mt-7 grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="flex flex-wrap gap-2.5">
          {live ? (
            <>
              <LinkButton href={`/${creator.slug}/start?m=voice`} variant="live" size="lg">
                Talk now · {formatUsdCompact(creator.voicePerMinuteMinor)}/min
              </LinkButton>
              <LinkButton href={`/${creator.slug}/start?m=text`} variant="ghost" size="lg">
                Text · {formatUsdCompact(creator.textPerMessageMinor)}/msg
              </LinkButton>
            </>
          ) : creator.status === 'in_session' ? (
            <>
              <LinkButton href={`/${creator.slug}/queue`} variant="live" size="lg">
                Join queue · you&rsquo;d be #{creator.queueLength + 1}
              </LinkButton>
              <LinkButton href={`/${creator.slug}/message`} variant="ghost" size="lg">
                Leave a message · {formatUsd(creator.asyncMessageMinor)}
              </LinkButton>
            </>
          ) : (
            <>
              <LinkButton href={`/${creator.slug}/message`} variant="live" size="lg">
                Leave a message · {formatUsd(creator.asyncMessageMinor)}
              </LinkButton>
              <LinkButton href={`/${creator.slug}/book`} variant="ghost" size="lg">Book a time</LinkButton>
            </>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" aria-pressed={isFavorite} className={cx(isFavorite && 'border-live/40 text-live-soft')}>
            <HeartIcon filled={isFavorite} /> {isFavorite ? 'Favourited' : 'Favourite'}
          </Button>
        </div>
      </section>

      {!live && creator.status !== 'in_session' && (
        <Card className="mt-3 flex items-start gap-3 p-4">
          <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-money-dim text-money">
            <ShieldTick className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[13.5px] font-medium">She replies within 24 hours, or you are refunded.</p>
            <Note>Automatic. You do not have to ask, and it does not count against your standing.</Note>
          </div>
        </Card>
      )}

      {/* ── Presence Record (FR-006) ───────────────────────────────────── */}
      <section className="mt-9">
        <SectionHeading action={<Link href="/guarantee" className="text-[13px] text-ink-3 underline-offset-4 hover:text-ink hover:underline">How this works</Link>}>
          Presence record
        </SectionHeading>
        <Card className="grid grid-cols-2 gap-5 p-5 sm:grid-cols-4">
          <RecordStat label="Sessions verified" value={`${record.sessionsVerifiedPct}%`} tone="verified" />
          <RecordStat label="Sessions" value={String(record.totalSessions)} />
          <RecordStat
            label="Median reply"
            value={creator.medianResponseSeconds === null ? '—' : creator.medianResponseSeconds < 60
              ? `${creator.medianResponseSeconds}s` : `${Math.round(creator.medianResponseSeconds / 60)}m`}
          />
          <RecordStat label="Guarantee claims" value="0" tone="money" />
        </Card>
      </section>

      {/* ── Her usual nights ───────────────────────────────────────────── */}
      <section className="mt-9">
        <SectionHeading>Her usual nights</SectionHeading>
        <Card className="p-5">
          <div className="flex gap-2">
            {creator.usualNights.map((on, i) => (
              <div key={i} className="flex-1 text-center">
                <div className="mb-2 text-[11px] uppercase tracking-[0.08em] text-ink-3">{DAY_LABELS[i]}</div>
                <div className={cx(
                  'h-14 rounded-xl transition-colors',
                  on ? 'bg-gradient-to-b from-verified/35 to-verified/10 border border-verified/30' : 'bg-raised border border-transparent',
                )} />
              </div>
            ))}
          </div>
          <p className="mt-4 text-[13px] text-ink-2">
            {creator.nextSlot
              ? <>Next on <span className="font-medium text-ink">{creator.nextSlot}</span>. Want a nudge?</>
              : <>She is on right now.</>}
          </p>
          {creator.nextSlot && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="ghost" size="sm">Remind me an hour before</Button>
              <Button variant="outline" size="sm">Tell me the moment she is on</Button>
            </div>
          )}
        </Card>
      </section>

      {/* ── Bio ────────────────────────────────────────────────────────── */}
      <section className="mt-9">
        <SectionHeading>About</SectionHeading>
        <Card className="p-5">
          <p className="text-[14.5px] leading-relaxed text-ink-2">{creator.bio}</p>
        </Card>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────────── */}
      <section className="mt-9">
        <SectionHeading action={<Note>Dollars, never credits.</Note>}>What it costs</SectionHeading>
        <div className="grid gap-3 sm:grid-cols-3">
          <PriceCard title="Live voice" price={`${formatUsdCompact(creator.voicePerMinuteMinor)}/min`}
                     note="2 minute minimum. Billing starts only after her Live Hello plays." available={live} />
          <PriceCard title="Live text" price={`${formatUsdCompact(creator.textPerMessageMinor)}/message`}
                     note="You are charged for your messages only. Hers are free." available={live} />
          <PriceCard title="Leave a message" price={formatUsd(creator.asyncMessageMinor)}
                     note="She replies within 24 hours or you are refunded." available />
        </div>
      </section>

      {/* ── Friends list — creator-curated, never platform-driven (§8) ─── */}
      {showFriends && friends.length > 0 && (
        <section className="mt-9">
          <SectionHeading>
            {live ? `${creator.displayName} also recommends` : `She's offline — she recommends`}
          </SectionHeading>
          <ul className="stagger grid gap-3 sm:grid-cols-2">
            {friends.map((f) => (
              <li key={f.id}>
                <Link href={`/${f.slug}`}
                      className="press flex items-center gap-3.5 rounded-[18px] border border-hairline bg-surface p-4 transition-colors hover:border-verified/35">
                  <AvatarMark name={f.displayName} hue={f.hue} size={48}
                              ring={f.status === 'live' ? 'live' : f.status === 'booking_only' ? 'scheduled' : 'offline'} />
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-[15px] font-semibold tracking-tight">{f.displayName}</div>
                    <div className="truncate text-[13px] text-ink-2">{f.tagline}</div>
                  </div>
                  <StatusPill status={f.status} nextSlot={f.nextSlot} />
                </Link>
              </li>
            ))}
          </ul>
          <Note>
            These are {creator.displayName}&rsquo;s own picks, not ours. She earns a share when you talk to them.
          </Note>
        </section>
      )}

      {/* ── Safety ─────────────────────────────────────────────────────── */}
      <section className="mt-9 mb-6">
        <Card className="flex flex-wrap items-center gap-x-5 gap-y-3 p-5">
          <p className="flex-1 text-[13px] text-ink-3">
            Arranging to meet in person or pay off-platform is prohibited and will be moderated.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">Block</Button>
            <Button variant="danger" size="sm">Report</Button>
          </div>
        </Card>
      </section>
    </div>
  );
}

function RecordStat({ label, value, tone }: { label: string; value: string; tone?: 'verified' | 'money' }) {
  return (
    <div>
      <div className="mb-1 text-[11px] uppercase tracking-[0.08em] text-ink-3">{label}</div>
      <div className={cx(
        'font-display text-[26px] font-semibold tabular-nums tracking-tight',
        tone === 'verified' && 'text-verified-soft',
        tone === 'money' && 'text-money',
      )}>{value}</div>
    </div>
  );
}

function PriceCard({ title, price, note, available }: { title: string; price: string; note: string; available: boolean }) {
  return (
    <Card className={cx('p-5', !available && 'opacity-60')}>
      <div className="text-[13px] font-medium text-ink-2">{title}</div>
      <div className="mt-1.5 font-display text-[22px] font-semibold tabular-nums tracking-tight">{price}</div>
      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-3">{note}</p>
      {!available && <div className="mt-2.5 text-[11.5px] text-ink-3">Not available while she is offline</div>}
    </Card>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 20.3s-7.5-4.6-7.5-9.6a4.3 4.3 0 0 1 7.5-2.9 4.3 4.3 0 0 1 7.5 2.9c0 5-7.5 9.6-7.5 9.6Z" strokeLinejoin="round" />
    </svg>
  );
}
