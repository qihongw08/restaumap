import Image from "next/image";
import { SignInWithGoogle } from "@/components/auth/sign-in-with-google";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const nextPath =
    next?.startsWith("/") && !next.includes("//") ? next : undefined;

  return (
    <div className="flex min-h-screen flex-col bg-background p-6">
      <div className="flex-1 flex flex-col items-center justify-center space-y-12">
        {/* Illustration Section */}
        <div className="relative w-full max-w-[320px] aspect-square animate-in border-4 border-primary/20 rounded-[3rem] overflow-hidden bg-primary/5 shadow-2xl transition-all hover:border-primary/40">
          <Image
            src="/onboarding.png"
            alt="Welcome to RestauMap"
            fill
            className="object-cover transition-transform duration-1000 hover:scale-110"
            priority
          />
        </div>

        {/* Text Content */}
        <div className="space-y-4 text-center px-4">
          <h1 className="text-4xl font-black italic tracking-tighter text-foreground uppercase">
            Happy<span className="text-primary not-italic"> Food</span> Journey
          </h1>
        </div>
      </div>

      {/* Button Section */}
      <div className="w-full max-w-sm mx-auto pb-12 animate-in fade-in slide-in-from-bottom-2 duration-1000 delay-500">
        <div className="flex flex-col gap-4">
          <SignInWithGoogle next={nextPath} />
          <p className="px-8 text-center text-xs text-muted-foreground leading-relaxed">
            By continuing, you agree to RestauMap’s terms. All your data is kept
            secure in your private project.
          </p>
        </div>
      </div>
    </div>
  );
}
