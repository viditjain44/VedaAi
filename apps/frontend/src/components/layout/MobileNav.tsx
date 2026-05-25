'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, FileText, Library, Sparkles } from 'lucide-react';

const mobileNav = [
  { label: 'Home',        href: '/',           icon: LayoutGrid },
  { label: 'Assignments', href: '/assignments', icon: FileText },
  { label: 'Library',     href: '/library',    icon: Library },
  { label: 'AI Toolkit',  href: '/toolkit',    icon: Sparkles },
];

export default function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[--border] z-30">
      <div className="flex items-center justify-around h-16">
        {mobileNav.map(({ label, href, icon: Icon }) => {
          const active = href === '/assignments'
            ? pathname.startsWith('/assignments')
            : pathname === href;
          return (
            <Link key={href} href={href}
              className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
                active ? 'text-[--text-primary]' : 'text-[--text-muted]'
              }`}>
              <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
              <span className={`text-[10px] ${active ? 'font-semibold' : 'font-normal'}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}