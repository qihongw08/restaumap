# RestauMap 🗺️🍽️
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

- **Framework:** Next.js 14+ (App Router, TypeScript)
- **Database:** Supabase (PostgreSQL)
- **ORM:** Prisma
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

## 🔐 Auth (Google OAuth)

Sign-in uses Supabase Auth with the **publishable key** and **@supabase/ssr** for cookie-based sessions:

- **Server:** Use `createClient()` from `@/lib/supabase/server` and **`getClaims()`** (not `getSession()`) to verify the user. Use `getCurrentUser()` from `@/lib/auth` in Server Components or actions.
- **Client:** Use `createClient()` from `@/lib/supabase/client` for `signInWithOAuth`, etc.
- **Proxy:** Session refresh runs in `proxy.ts` and validates the JWT via `getClaims()` so cookies stay in sync.
- **Callback:** `/auth/callback` exchanges the OAuth code for a session and only redirects to **relative paths** (`/` or `/dashboard`) to avoid open redirects.

Add your app redirect URL (e.g. `http://localhost:3000/auth/callback`) in Supabase **Auth → URL Configuration → Redirect URLs**, and add the Supabase callback URL in Google Cloud Console **Credentials → Authorized redirect URIs**.

## 🗂️ Project Structure

```
restaumap/
├── app/
│   ├── api/                  # restaurants, groups (CRUD, invites, join), extract-link, geocode, visits, places (photo, opening-status), auth
│   ├── restaurants/          # List, new, [id] detail
│   ├── map/                  # Map + bottom sheet (pins, current location, nearby list)
│   ├── groups/               # List, new, [id] detail, join (invite link)
│   ├── import/               # Paste link/caption → extract → save
│   ├── login/
│   └── auth/                 # callback, auth-code-error
├── components/
│   ├── ui/                   # Button, Card, Modal, etc.
│   ├── shared/               # Header, Nav, Loading
│   ├── auth/                 # SignInWithGoogle
│   ├── map/                  # MapView, RestaurantMap, NearbyBottomSheet, LocationButton
│   ├── restaurants/          # RestaurantCard, RestaurantList, RestaurantDetail, RestaurantForm, BlacklistModal
│   ├── visits/               # VisitForm, VisitCard, PFRatioDisplay
│   └── pwa/                  # RegisterSW
├── lib/                      # prisma, groq, auth, supabase, utils, constants
├── types/
├── hooks/                    # use-restaurants, use-location, use-debounce
├── prisma/
└── public/
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



