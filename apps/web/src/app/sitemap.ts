import type { MetadataRoute } from 'next';
import { CREATORS } from '@/lib/fixtures';

/**
 * Only substantive public pages are listed. §A.6: category routes belong here
 * "only when enough real inventory exists to make the page useful", so there
 * are deliberately none yet — thin pages would be worse than no pages.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://snae.example';
  return [
    { url: base, changeFrequency: 'hourly', priority: 1 },
    { url: `${base}/guarantee`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/creator/onboarding`, changeFrequency: 'monthly', priority: 0.6 },
    // Approved, published profiles only — drafts and hidden profiles never appear.
    ...CREATORS.map((c) => ({
      url: `${base}/${c.slug}`,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
  ];
}
