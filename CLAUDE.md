# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Use **Bun** as the package manager for all operations.

```bash
bun run dev          # Start dev server (http://localhost:3000)
bun run dev:clean    # Wipe .next cache and start dev server
bun run build        # Production build
bun run lint         # ESLint
bun run type-check   # TypeScript check (no emit)

bunx prisma studio         # Open database GUI
bunx prisma migrate dev    # Create + apply a new migration
bunx prisma generate       # Regenerate Prisma Client after schema changes
bun run db:migrate         # Apply migrations in production (prisma migrate deploy)
```

> **Database migrations:** Always use `bunx prisma migrate dev` to generate migration files after editing `schema.prisma`. Never manually create or edit files in `prisma/migrations/`.

```bash
```

## Architecture Overview

**RestauMap** is a Next.js 16 App Router app (TypeScript) for saving and tracking restaurants from social media links.

### Tech Stack
- **Framework:** Next.js 16 App Router
- **Auth:** Supabase Auth (Google OAuth, cookie-based sessions via `@supabase/ssr`)
- **Database:** PostgreSQL via Supabase, accessed directly through Prisma with `PrismaPg` adapter
- **AI:** Groq API for extracting restaurant info from pasted links/captions
- **Maps:** Google Maps JavaScript API via `@vis.gl/react-google-maps`
- **Storage:** Cloudflare R2 for user photo uploads
- **Styling:** Tailwind CSS v4

### Database / Prisma
- Dev uses a separate Postgres schema (default: `restaumap-dev`, set via `POSTGRES_SCHEMA_DEV`).
- Prod uses the `public` schema. The connection URL switches between `DATABASE_URL` and `DATABASE_URL_PROD` based on `NODE_ENV`.
- Always import `prisma` from `@/lib/prisma`. Schema is at `prisma/schema.prisma`.

### Authentication
- **Always use `getCurrentUser()`** from `@/lib/auth` in Server Components and API routes. It calls `getClaims()` (not `getSession()`) to verify the JWT.
- Never call `getSession()` server-side — it does not validate the token.
- Server Supabase client: `createClient()` from `@/lib/supabase/server`.
- Client Supabase client: `createClient()` from `@/lib/supabase/client`.

### Key Data Models
- **Restaurant** — shared across users; enriched with Google Place ID, photo references, opening hours.
- **UserRestaurant** — per-user record linking a user to a restaurant, with status (`WANT_TO_GO`, `VISITED`, `FAVORITE`, `WARNING_ZONE`), blacklist flag, and source metadata.
- **Visit** — a logged visit with `fullnessScore`, `tasteScore`, `pricePaid`. PF Ratio = (Fullness × Taste) / Price.
- **Group / GroupMember / GroupRestaurant / GroupInvite** — shared restaurant collections with invite-link joining.
- **ShareLink** — tokens for sharing a user's map or a group map publicly.

### API Routes (`app/api/`)
`restaurants`, `groups` (CRUD + invites + join), `extract-link`, `extract-restaurant`, `geocode`, `visits`, `places` (photo, opening-status), `share`, `upload`, `user`, `photos`, `import`.

### Component Organization (`components/`)
Organized by domain: `ui/` (primitives), `shared/` (Header, Nav), `map/`, `restaurants/`, `visits/`, `auth/`, `pwa/`, `home/`, `share/`.

### Environment Variables
Required: `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GROQ_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
Optional: `DATABASE_URL_PROD`, `POSTGRES_SCHEMA_DEV`, `R2_PUBLIC_URL` / `NEXT_PUBLIC_R2_PUBLIC_URL`, R2 credentials.
