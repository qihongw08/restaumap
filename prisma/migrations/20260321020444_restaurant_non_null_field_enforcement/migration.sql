/*
  Warnings:

  - Made the column `address` on table `restaurants` required. This step will fail if there are existing NULL values in that column.
  - Made the column `formatted_address` on table `restaurants` required. This step will fail if there are existing NULL values in that column.
  - Made the column `latitude` on table `restaurants` required. This step will fail if there are existing NULL values in that column.
  - Made the column `longitude` on table `restaurants` required. This step will fail if there are existing NULL values in that column.
  - Made the column `google_place_id` on table `restaurants` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "restaurants" ALTER COLUMN "address" SET NOT NULL,
ALTER COLUMN "formatted_address" SET NOT NULL,
ALTER COLUMN "latitude" SET NOT NULL,
ALTER COLUMN "longitude" SET NOT NULL,
ALTER COLUMN "google_place_id" SET NOT NULL;
