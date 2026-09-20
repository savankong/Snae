import { notFound } from 'next/navigation';
import { DEMO_BUYER, creatorBySlug } from '@/lib/fixtures';
import { LiveHelloGate } from '@/components/live-hello';

export const metadata = { title: 'Verifying', robots: { index: false, follow: false } };

export default async function StartSession({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ m?: string }>;
}) {
  const { slug } = await params;
  const { m } = await searchParams;
  const creator = creatorBySlug(slug);
  if (!creator) notFound();

  const modality = m === 'text' ? 'text' : 'voice';
  const rate = modality === 'voice' ? creator.voicePerMinuteMinor : creator.textPerMessageMinor;

  return (
    <LiveHelloGate
      creator={{ displayName: creator.displayName, hue: creator.hue, slug: creator.slug }}
      buyerName={DEMO_BUYER.displayName}
      modality={modality}
      ratePerUnit={rate}
      unitLabel={modality === 'voice' ? 'per minute' : 'per message'}
      walletBalanceMinor={DEMO_BUYER.walletBalanceMinor}
    />
  );
}
