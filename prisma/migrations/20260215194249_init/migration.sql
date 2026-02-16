-- CreateEnum
CREATE TYPE "RestaurantStatus" AS ENUM ('WANT_TO_GO', 'VISITED', 'FAVORITE', 'WARNING_ZONE');

-- CreateTable
CREATE TABLE "restaurants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "formatted_address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "source_url" TEXT,
    "source_platform" TEXT,
    "raw_caption" TEXT,
    "google_place_id" TEXT,
    "photo_references" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "opening_hours_weekday_text" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cuisine_types" TEXT[],
    "popular_dishes" TEXT[],
    "price_range" TEXT,
    "ambiance_tags" TEXT[],
    "status" "RestaurantStatus" NOT NULL DEFAULT 'WANT_TO_GO',
    "is_blacklisted" BOOLEAN NOT NULL DEFAULT false,
    "blacklist_reason" TEXT,
    "blacklisted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imports" (
    "id" TEXT NOT NULL,
    "source_url" TEXT,
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restaurant_id" TEXT NOT NULL,

    CONSTRAINT "imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visits" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "visit_date" TIMESTAMP(3) NOT NULL,
    "fullness_score" INTEGER NOT NULL,
    "taste_score" INTEGER NOT NULL,
    "price_paid" DOUBLE PRECISION NOT NULL,
    "pf_ratio" DOUBLE PRECISION NOT NULL,
    "service_rating" INTEGER,
    "ambiance_rating" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "restaurants_google_place_id_key" ON "restaurants"("google_place_id");

-- AddForeignKey
ALTER TABLE "imports" ADD CONSTRAINT "imports_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
