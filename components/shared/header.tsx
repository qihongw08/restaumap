import { APP_NAME } from '@/lib/constants';
import { AuthNav } from '@/components/auth/auth-nav';
import { Menu, Search } from 'lucide-react';

export function Header() {
  return (
    <header className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-3rem)] max-w-lg">
      <div className="flex h-16 items-center gap-2 rounded-full border-2 border-primary bg-background px-4 shadow-2xl backdrop-blur-xl transition-all">
        <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all hover:bg-primary hover:text-primary-foreground active:scale-95">
          <Menu className="h-6 w-6" />
        </button>
        
        <div className="flex flex-1 items-center gap-3 overflow-hidden px-2">
          <Search className="h-5 w-5 shrink-0 text-primary" />
          <span className="truncate text-lg font-black italic tracking-tighter text-foreground uppercase opacity-80">
            Search restaurants
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2 shrink-0 border-l-2 border-muted pl-4">
          <AuthNav />
        </div>
      </div>
    </header>
  );
}
