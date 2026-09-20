import { notFound } from 'next/navigation';
import { creatorBySlug, creatorById } from '@/lib/fixtures';
import { MEDIA, mediaForCreator, viewerFor } from '@/lib/media-fixtures';
import { canView } from '@snae/media';
import { MomentViewer } from '@/components/moment-viewer';

export const metadata = { title: 'Moment', robots: { index: false, follow: false } };

export default async function MomentPage({ params }: { params: Promise<{ slug: string; mediaId: string }> }) {
  const { slug, mediaId } = await params;
  const creator = creatorBySlug(slug);
  if (!creator) notFound();

  const media = MEDIA.find((m) => m.id === mediaId && m.creatorId === creator.id);
  if (!media) notFound();

  const viewer = viewerFor(creator.id);
  // Authorisation happens on the server. A locked item never reaches the client.
  if (!canView(media, viewer)) notFound();

  // Tap-through set: everything of hers this viewer may see.
  const reel = mediaForCreator(creator.id).filter((m) => canView(m, viewer));
  const startIndex = Math.max(0, reel.findIndex((m) => m.id === media.id));

  return (
    <MomentViewer
      reel={reel.map((m) => ({
        id: m.id,
        seed: m.seed,
        caption: m.caption,
        kind: m.kind,
        createdAtIso: m.createdAt.toISOString(),
        expiresAtIso: m.expiresAt?.toISOString() ?? null,
        captureSource: m.captureSource,
      }))}
      startIndex={startIndex}
      creator={{
        slug: creator.slug,
        displayName: creator.displayName,
        hue: creator.hue,
        status: creator.status,
        voicePerMinuteMinor: creator.voicePerMinuteMinor,
        asyncMessageMinor: creator.asyncMessageMinor,
        nextSlot: creator.nextSlot,
      }}
    />
  );
}
