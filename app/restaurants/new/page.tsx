import { BackLink } from "@/components/shared/back-link";
import { Header } from "@/components/shared/header";
import { Nav } from "@/components/shared/nav";
import { NewRestaurantContent } from "@/app/restaurants/new/new-restaurant-content";

export default function NewRestaurantPage() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <main className="mx-auto max-w-lg px-6 pt-40 pb-6">
        <BackLink className="mb-6">Back to list</BackLink>
        <h1 className="mb-4 text-2xl font-black italic tracking-tighter text-foreground uppercase">
          Add restaurant
        </h1>
        <p className="mb-6 text-sm font-medium text-muted-foreground">
          Search a restaurant on Google, choose the right match, and save it to
          your list.
        </p>
        <NewRestaurantContent />
      </main>
      <Nav />
    </div>
  );
}
