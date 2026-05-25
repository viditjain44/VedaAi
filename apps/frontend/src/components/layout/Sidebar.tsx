'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  Users,
  FileText,
  Wrench,
  Library,
  Settings,
  Plus,
} from 'lucide-react';

const navItems = [
  { label: 'Home',              href: '/',         icon: LayoutGrid },
  { label: 'My Groups',         href: '/groups',   icon: Users },
  { label: 'Assignments',       href: '/assignments', icon: FileText },
  { label: "AI Teacher's Toolkit", href: '/toolkit', icon: Wrench },
  { label: 'My Library',        href: '/library',  icon: Library },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-[220px] min-h-screen bg-white border-r border-[--border] fixed left-0 top-0 bottom-0 z-30">

      {/* Logo */}
      <div className="px-5 py-5 border-b border-[--border]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[--brand] flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm">V</span>
          </div>
          <span className="font-bold text-[15px] text-[--text-primary] tracking-tight">
            VedaAI
          </span>
        </div>
      </div>

      <div className="flex flex-col flex-1 px-3 py-4 gap-0.5 overflow-y-auto">

        {/* Create Assignment button */}
        <Link
          href="/assignments/create"
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[--text-primary] text-white text-[13px] font-medium mb-4 hover:bg-zinc-700 transition-colors"
        >
          <Plus size={14} />
          Create Assignment
        </Link>

        {/* Nav items */}
        {navItems.map(({ label, href, icon: Icon }) => {
          const active =
            href === '/assignments'
              ? pathname.startsWith('/assignments')
              : pathname === href;

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-colors ${
                active
                  ? 'bg-zinc-100 text-[--text-primary] font-medium'
                  : 'text-[--text-secondary] hover:bg-zinc-50 hover:text-[--text-primary]'
              }`}
            >
              <Icon size={15} />
              {label}
            </Link>
          );
        })}
      </div>

      {/* Bottom section */}
      <div className="px-3 py-4 border-t border-[--border]">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-[--text-secondary] hover:bg-zinc-50 hover:text-[--text-primary] transition-colors mb-3"
        >
          <Settings size={15} />
          Settings
        </Link>

        {/* School profile */}
        <div className="flex items-center gap-3 px-3 py-2.5 bg-zinc-50 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">D</span>
          </div>
          <div className="overflow-hidden">
            <p className="text-[12px] font-semibold text-[--text-primary] truncate">
              Delhi Public School
            </p>
            <p className="text-[11px] text-[--text-muted] truncate">
              Bokaro Steel City
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
