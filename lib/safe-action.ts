import { createSafeActionClient } from "next-safe-action";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// Base client for public actions
export const actionClient = createSafeActionClient({
  handleServerError(e) {
    if (e instanceof Error) {
      return e.message;
    }
    return "Something went wrong!";
  },
});

// Authenticated client that enforces session checks
export const authActionClient = actionClient.use(async ({ next }) => {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return next({ ctx: { user } });
});

export const revalidateAll = () => {
  revalidatePath("/");
  revalidatePath("/map");
  revalidatePath("/profile");
};

// A client for mutations that automatically revalidates core paths
export const authMutationClient = authActionClient.use(async ({ next }) => {
  const result = await next();
  if (result.success) {
    revalidateAll();
  }
  return result;
});

