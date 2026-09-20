import { creatorBySlug, DEMO_BUYER, CREATORS } from '@/lib/fixtures';
import { VoiceSession } from '@/components/voice-session';
import { TextSession } from '@/components/text-session';

export const metadata = { title: 'Session', robots: { index: false, follow: false } };

export default async function SessionPage({ searchParams }: { searchParams: Promise<{ m?: string; c?: string }> }) {
  const { m, c } = await searchParams;
  const creator = (c ? creatorBySlug(c) : undefined) ?? CREATORS[0]!;
  const shape = { displayName: creator.displayName, hue: creator.hue, slug: creator.slug };

  return m === 'text' ? (
    <TextSession creator={shape} perMessageMinor={creator.textPerMessageMinor} walletBalanceMinor={DEMO_BUYER.walletBalanceMinor} />
  ) : (
    <VoiceSession creator={shape} perMinuteMinor={creator.voicePerMinuteMinor} walletBalanceMinor={DEMO_BUYER.walletBalanceMinor} />
  );
}
