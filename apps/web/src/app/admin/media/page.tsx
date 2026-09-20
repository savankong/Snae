import { MAX_CLIP_SECONDS } from '@snae/media';
import { MEDIA } from '@/lib/media-fixtures';
import { creatorById } from '@/lib/fixtures';
import { CoverArt, hueForSeed } from '@/components/cover-art';
import { Button, Card, Note, SectionHeading, Stat } from '@/components/primitives';
import { ShieldTick } from '@/components/presence';

/**
 * Media moderation queue (§A.5 "profile/media moderation queue").
 *
 * There is deliberately no auto-approve path: while the explicit tier is off,
 * @snae/media's publishState lands everything in `pending`, so this queue is
 * the only way content becomes discoverable. That is what stops an upload
 * surface quietly widening the launch content lane (§5), which is a decision
 * for legal review and the processor, not for code.
 */
export default function MediaQueue() {
  // The demo fixtures are pre-approved, so show the two newest as if pending.
  const pending = MEDIA.slice(0, 3);

  return (
    <div>
      <h1 className="font-display text-[28px] font-bold tracking-tight">Media review</h1>
      <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-2">
        Nothing is discoverable until it is approved here. Launch lane is conversation-first: no explicit
        images or video, and clips are capped at {MAX_CLIP_SECONDS} seconds.
      </p>

      <Card className="mt-6 grid grid-cols-2 gap-5 p-5 sm:grid-cols-4">
        <Stat label="Awaiting review" value={String(pending.length)} />
        <Stat label="Approved, 7d" value="41" tone="money" />
        <Stat label="Rejected, 7d" value="2" tone="muted" />
        <Stat label="Median time to review" value="18m" />
      </Card>

      <section className="mt-8">
        <SectionHeading>Queue</SectionHeading>
        <ul className="space-y-3">
          {pending.map((m) => {
            const creator = creatorById(m.creatorId);
            if (!creator) return null;
            return (
              <li key={m.id}>
                <Card className="flex flex-col gap-4 p-4 sm:flex-row">
                  <CoverArt
                    seed={m.seed}
                    hue={hueForSeed(creator.slug)}
                    className="h-40 w-full shrink-0 sm:w-40"
                    alt=""
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-[15.5px] font-semibold tracking-tight">
                        {creator.displayName}
                      </span>
                      <span className="rounded-full bg-raised px-2 py-0.5 text-[11px] text-ink-2">{m.kind}</span>
                      <span className="rounded-full bg-raised px-2 py-0.5 text-[11px] text-ink-2">{m.visibility}</span>
                      {m.captureSource === 'in_app' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-verified-dim px-2 py-0.5 text-[11px] text-verified-soft">
                          <ShieldTick className="h-3 w-3" /> in-app capture
                        </span>
                      )}
                    </div>

                    {m.caption && <p className="mt-2 text-[14px] text-ink-2">&ldquo;{m.caption}&rdquo;</p>}

                    <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
                      <Check ok={m.metadataStripped} label="Metadata stripped" />
                      <Check ok label="Within launch content lane" />
                      <Check ok label="No contact details in caption" />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="money" size="sm">Approve</Button>
                      <Button variant="outline" size="sm">Request a change</Button>
                      <Button variant="danger" size="sm">Reject</Button>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
        <Note>
          Rejections tell the creator which rule applied. Repeated rejections for off-platform contact details
          or solicitation are a trust-and-safety escalation, not just a content decision.
        </Note>
      </section>
    </div>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${
      ok ? 'border-money/25 bg-money-dim/30 text-money' : 'border-warn/30 bg-warn/10 text-warn'
    }`}>
      <span className="text-[9px]">{ok ? '✓' : '!'}</span> {label}
    </span>
  );
}
