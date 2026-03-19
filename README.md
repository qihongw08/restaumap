# RestauMap

A vibecoded app for big backs like me to stop losing that one restaurant from Instagram reels / Xiaohongshu post. Dump the link, let the AI pull out the info, and keep everything on a map so you actually go.

## Key Features

### Smart Link Import

- Paste links or captions from Instagram, RedNote, TikTok; AI extracts restaurant name, location, cuisine, and dishes
- Geocoding and save to your collection; optional Google Place match

### Map & Nearby

- Map of saved restaurants with pins; blue pin for current location
- Tap a pin to highlight that restaurant in the bottom sheet and scroll it into view
- Bottom sheet: nearby list with category and price filters, “Open now,” and place photos

### PF Ratio & Visits

- Log visits with fullness, taste, price, and notes; PF Ratio = (Fullness × Taste) / Price
- Visit history and photos per restaurant

### Blacklist

- Mark restaurants as blacklisted and hide them from the map and lists

### Groups

- Create groups and add restaurants from your list
- Invite by link; members join and see the shared collection

## 🚀 Tech Stack

- **Framework:** Next.js 14+ (App Router, Server Actions, TypeScript)
- **Database:** Supabase (PostgreSQL)
- **ORM:** Prisma
- **Validation & Actions:** zod, next-safe-action
- **AI:** Groq API (Free LLM)
- **Maps:** Google Maps JavaScript API
- **Styling:** Tailwind CSS
- **Deployment:** Vercel
- **PWA:** Service Worker + Web Manifest
- **Package manager:** Bun

## 📋 Prerequisites

- [Bun](https://bun.sh) (recommended) or Node.js 18.17+
- Supabase account (free tier)
- Groq API key (free tier)
- Google Maps API key (free tier)

## 🛠️ Installation

### 1. Clone Repository

```bash
git clone <your-repo-url> restaumap
cd restaumap
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Set Up Environment Variables

Copy the example env and fill in your values:

```bash
cp .env.example .env
```

### 4. Set Up Database

```bash
# Run migrations
bunx prisma migrate dev

# Generate Prisma Client (run after schema changes)
bunx prisma generate
```

### 5. Run Development Server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔐 Auth & Server Actions

This app uses **Next.js Server Actions** for all backend communication, providing end-to-end type safety and automated validation.

- **Authentication:** Supabase Auth with `@supabase/ssr` for cookie-heavy sessions.
- **Server Actions:** All mutations and data fetching (outside of Initial Page Loads) use actions defined in `app/actions/`.
- **Validation:** Every action is guarded by `zod` schemas and handled via `next-safe-action`.
- **Security:** The `authActionClient` centrally verifies user claims via `getClaims()` and `getCurrentUser()` before executing protected logic.

## 🗂️ Project Structure

```
restaumap/
├── app/
│   ├── actions/              # Server Actions (restaurants, groups, visits, upload, etc.)
│   ├── restaurants/          # Page: List, new, [id] detail
│   ├── map/                  # Page: Map + bottom sheet (pins, nearby list)
│   ├── groups/               # Page: List, new, [id] detail, join (invite link)
│   ├── import/               # Page: Paste link/caption → extract → save
│   ├── profile/              # Page: User profile, visit history
│   ├── login/
│   └── auth/                 # OAuth callback & error handlers
├── components/
│   ├── ui/                   # Shared UI primitives (Button, Card, Modal, etc.)
│   ├── shared/               # Global components (Header, Nav, Loading)
│   ├── map/                  # MapView, RestaurantMap, BottomSheets
│   ├── restaurants/          # Search, List, Detail, Forms
│   ├── visits/               # Visit logging and history
│   └── share/                # Share link components
├── lib/                      # Base clients (prisma, groq, safe-action) and utils
├── hooks/                    # use-location, use-restaurants, etc.
├── prisma/                   # Schema and migrations
└── public/                   # PWA icons and manifest
```

## 🧪 Available Scripts

```bash
# Development
bun run dev              # Start dev server
bun run build            # Build for production
bun run start            # Run production build

# Database
bunx prisma studio       # Open database GUI
bunx prisma migrate dev  # Create migration
bunx prisma generate     # Regenerate Prisma Client

# Code Quality
bun run lint             # Run ESLint
bun run type-check       # TypeScript check
```

## 📱 PWA Installation

- **iOS (Safari):** Share → Add to Home Screen
- **Android (Chrome):** Menu → Install app / Add to Home Screen
- Add `icon-192.png` and `icon-512.png` to `public/` for full PWA icons (manifest references them). A basic service worker is registered for caching.
