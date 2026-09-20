# Deploying to DigitalOcean

The app runs as a container from the repo's `Dockerfile`. App Platform is the
path of least resistance; a Droplet or DOKS works from the same image.

## Prerequisites

- A DigitalOcean account and an API token with write scope
  (**API → Tokens → Generate New Token**).
- `doctl` installed and authenticated: `doctl auth init`.
- The GitHub account linked to DigitalOcean, so App Platform can read the repo:
  https://cloud.digitalocean.com/apps/github/install

## App Platform

```bash
doctl apps create --spec .do/app.yaml
```

The spec pins `dockerfile_path: Dockerfile` rather than letting App Platform
autodetect. The Node buildpack does not understand npm workspaces and will fail
to resolve the `@snae/*` packages, so the Dockerfile is not optional here.

Watch the first build and get the URL:

```bash
doctl apps list                      # grab the app id
doctl apps logs <app-id> --type build --follow
doctl apps get <app-id> --format DefaultIngress
```

Subsequent pushes to the branch named in the spec redeploy automatically
(`deploy_on_push: true`). To change the spec later:

```bash
doctl apps update <app-id> --spec .do/app.yaml
```

## Container registry route

If you would rather push the image yourself than have App Platform build it:

```bash
doctl registry login
docker build -t registry.digitalocean.com/<your-registry>/snae:$(git rev-parse --short HEAD) .
docker push registry.digitalocean.com/<your-registry>/snae:$(git rev-parse --short HEAD)
```

Then swap the service's `github:` block for an `image:` block pointing at the
registry.

## Secrets

Nothing secret is committed. Once auth, payments and the presence provider are
wired up, set them as `SECRET`-scoped variables:

```bash
doctl apps update <app-id> --spec .do/app.yaml   # after uncommenting the keys
```

or through **Settings → App-Level Environment Variables** in the console.

## Database

The app renders from fixtures today and opens no database connection, so the
`databases:` block in the spec is commented out — provisioning Postgres now
would bill for something unused. Uncomment it when the schema in `packages/db`
gains migrations.

## Before this is public

This deploys a real adult-services marketplace UI. The spec's own launch gates
apply before it faces the public, not after:

- Written processor approval for the exact model (wallet, voice, text, content lane).
- Legal review: terms, creator agreement, biometric consent and retention
  policy, FOSTA-SESTA controls, and a state-by-state age-verification analysis.
- Age assurance on the buyer side, which is not built.

A private staging deployment for review is fine and is what this spec is scoped
for.

## The staging gate

Staging is protected by basic auth in `apps/web/src/middleware.ts`. It turns on
only when both `STAGING_AUTH_USER` and `STAGING_AUTH_PASSWORD` are set, so local
development and a future production deploy with its own access controls are
unaffected.

Set them as SECRET-scoped values before the first deploy:

```bash
doctl apps update <app-id> --spec .do/app.yaml   # after replacing CHANGE_ME
```

Two details worth knowing:

- `/healthz` is deliberately outside the gate. App Platform's health check would
  otherwise get a 401 and mark a healthy container as down.
- The gate fails *open* when unconfigured rather than closed. A misconfigured
  production deploy should be reachable and fixable, not bricked. That means
  omitting the variables on staging leaves it public — do not omit them.
