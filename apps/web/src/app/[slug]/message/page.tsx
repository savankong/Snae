import { notFound } from 'next/navigation';
import { formatUsd } from '@snae/money';
import { creatorBySlug, DEMO_BUYER } from '@/lib/fixtures';
import { AsyncMessageComposer } from '@/components/async-message';

export const metadata = { title: 'Leave a message', robots: { index: false, follow: false } };

export default async function MessagePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const creator = creatorBySlug(slug);
  if (!creator) notFound();

  return (
    <AsyncMessageComposer
      creator={{ displayName: creator.displayName, hue: creator.hue, slug: creator.slug, nextSlot: creator.nextSlot }}
      priceMinor={creator.asyncMessageMinor}
      priceLabel={formatUsd(creator.asyncMessageMinor)}
      balanceMinor={DEMO_BUYER.walletBalanceMinor}
    />
  );
}
