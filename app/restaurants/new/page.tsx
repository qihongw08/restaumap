import Link from "next/link";
import { Header } from "@/components/shared/header";
import { Nav } from "@/components/shared/nav";
import { RestaurantForm } from "@/components/restaurants/restaurant-form";
import { Card, CardContent } from "@/components/ui/card";

export default function NewRestaurantPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header />
      <main className="mx-auto max-w-lg px-4 py-6">
        <Link
          href="/restaurants"
          className="mb-4 inline-block text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          ← Back to list
        </Link>
        <h1 className="mb-4 text-xl font-bold text-gray-900">Add restaurant</h1>
        <Card>
          <CardContent className="p-4">
            <RestaurantForm />
          </CardContent>
        </Card>
        <p className="mt-3 text-center text-sm text-gray-500">
          Or{" "}
          <Link href="/import" className="text-[#FF6B6B] underline">
            import from a link or caption
          </Link>
          .
        </p>
      </main>
      <Nav />
    </div>
  );
}
