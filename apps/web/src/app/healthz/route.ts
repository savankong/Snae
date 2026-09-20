import { NextResponse } from 'next/server';

/**
 * Unauthenticated liveness probe.
 *
 * This exists separately from `/` because staging runs behind basic auth, and a
 * health check that got a 401 would mark a perfectly healthy container as down.
 * It deliberately reveals nothing about the deployment beyond that it is up.
 */
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ status: 'ok' }, {
    headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
  });
}
