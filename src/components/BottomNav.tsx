'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Bookmark, Settings } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


const navItems = [
  { label: 'Search', href: '/product-search-results', icon: Search },
  { label: 'Watchlist', href: '/watchlist-price-alerts', icon: Bookmark },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg">
      <div className="flex items-center justify-around h-16 max-w-screen-2xl mx-auto px-4">
        {navItems?.map((item) => {
          const Icon = item?.icon;
          const isActive = pathname === item?.href;
          return (
            <Link
              key={item?.href}
              href={item?.href}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all duration-150 ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-xs font-medium">{item?.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
