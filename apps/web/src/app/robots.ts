import type { MetadataRoute } from 'next';

/**
 * §A.6: never index private conversations, buyer profiles, account pages, or
 * sensitive creator and admin surfaces. Public creator profiles and the
 * guarantee explainer are the surfaces we do want indexed.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/account', '/wallet', '/favorites', '/session', '/creator/studio', '/admin', '/api'],
    },
    sitemap: 'https://snae.example/sitemap.xml',
  };
}
