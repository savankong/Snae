import { Button, Card, Note, SectionHeading, cx } from '@/components/primitives';
import { ShieldTick } from '@/components/presence';

/**
 * Creator verification queue (FR-003, FR-018, §A.5).
 *
 * §14's three gates are shown as three gates, explicitly: verification
 * approved, biometric consent given, profile published. A reviewer should not
 * have to remember the rule — the row shows which gate is missing, and approval
 * stays disabled until all three are satisfied.
 */
export default function VerificationQueue() {
  return (
    <div>
      <h1 className="font-display text-[28px] font-bold tracking-tight">Creator verification</h1>
      <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-2">
        A creator cannot be listed or transact until all three gates pass. We review profiles by hand.
      </p>

      <section className="mt-7">
        <SectionHeading>Awaiting review</SectionHeading>
        <div className="space-y-3">
          {APPLICANTS.map((a) => {
            const ready = a.idVerified && a.consentGiven && a.profileComplete;
            return (
              <Card key={a.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="font-display text-[16px] font-semibold tracking-tight">{a.name}</div>
                    <div className="mt-0.5 text-[13px] text-ink-3">
                      /{a.slug} · applied {a.appliedAt} · {a.source}
                    </div>
                  </div>
                  {ready ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-money/30 bg-money-dim px-2.5 py-1 text-[11.5px] text-money">
                      <ShieldTick className="h-3.5 w-3.5" /> All gates passed
                    </span>
                  ) : (
                    <span className="rounded-full border border-warn/30 bg-warn/10 px-2.5 py-1 text-[11.5px] text-warn">
                      Blocked
                    </span>
                  )}
                </div>

                <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
                  <Gate label="ID and age verified" ok={a.idVerified} detail={a.idDetail} />
                  <Gate label="Biometric consent" ok={a.consentGiven} detail={a.consentDetail} />
                  <Gate label="Profile complete" ok={a.profileComplete} detail={a.profileDetail} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="money" size="sm" disabled={!ready}>Approve and publish</Button>
                  <Button variant="outline" size="sm">View full application</Button>
                  <Button variant="danger" size="sm">Reject</Button>
                </div>
              </Card>
            );
          })}
        </div>
        <Note>
          We never see the applicant&rsquo;s ID image — the provider holds it and returns a verdict and a
          reference. Approval is recorded as an audit event against your account.
        </Note>
      </section>
    </div>
  );
}

const APPLICANTS = [
  {
    id: 'a1', name: 'Tess', slug: 'tess', appliedAt: '3 hours ago', source: 'Referred by Maya',
    idVerified: true, idDetail: 'Passed · Persona ref ending 4c1a',
    consentGiven: true, consentDetail: 'v1.2 · retention to 2028-09',
    profileComplete: true, profileDetail: 'Rates and nights set',
  },
  {
    id: 'a2', name: 'Dana', slug: 'dana', appliedAt: '1 day ago', source: 'Direct application',
    idVerified: true, idDetail: 'Passed · Persona ref ending 91b7',
    consentGiven: false, consentDetail: 'Not yet given',
    profileComplete: true, profileDetail: 'Rates and nights set',
  },
  {
    id: 'a3', name: 'Kit', slug: 'kit', appliedAt: '2 days ago', source: 'Referred by Elle',
    idVerified: false, idDetail: 'Liveness retry requested',
    consentGiven: true, consentDetail: 'v1.2 · retention to 2028-09',
    profileComplete: false, profileDetail: 'No rates set',
  },
];

function Gate({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className={cx('rounded-xl border p-3', ok ? 'border-money/25 bg-money-dim/30' : 'border-warn/25 bg-warn/5')}>
      <div className="flex items-center gap-1.5">
        <span className={cx('grid h-4 w-4 place-items-center rounded-full text-[9px]', ok ? 'bg-money text-ground' : 'bg-warn text-ground')}>
          {ok ? '✓' : '!'}
        </span>
        <span className="text-[12.5px] font-medium">{label}</span>
      </div>
      <div className="mt-1 text-[11.5px] text-ink-3">{detail}</div>
    </div>
  );
}
