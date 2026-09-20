# Snae — production image.
#
# Multi-stage so the runtime layer carries the standalone server output and
# nothing else: no package manager, no source, no dev dependencies.

FROM node:22-alpine AS deps
WORKDIR /app
# The whole context, rather than a hand-listed set of workspace manifests.
#
# An explicit list drifts: packages/media was added and its COPY line was not,
# so npm ci ran against an incomplete workspace set. It happened to survive,
# because @snae/* resolves through tsconfig paths rather than node_modules —
# but a package that declared a real external dependency would have failed in a
# confusing way. Copying everything costs the install-layer cache on a source
# change and cannot go stale.
COPY . .
RUN npm ci --no-audit --no-fund

# deps already holds the source and node_modules, so build straight from it
# rather than re-copying the context.
FROM deps AS builder
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0

# Never run the server as root.
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000

# Fails the container if the app stops serving, so orchestrators can restart it.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/web/server.js"]
