'use client';
import { usePathname } from 'next/navigation';
import { Bell, LayoutGrid, ChevronDown, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const titleMap: [string, string][] = [
  ['/assignments/create', 'Create Assignment'],
  ['/assignments',        'Assignment'],
  ['/groups',             'My Groups'],
  ['/toolkit',            "AI Teacher's Toolkit"],
  ['/library',            'My Library'],
  ['/settings',           'Settings'],
];

export default function Header() {
  const pathname = usePathname();
  const title = titleMap.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? 'Dashboard';
  const isDetail = pathname.match(/\/assignments\/[^/]+$/) && !pathname.includes('create');

  return (
    <header className="h-14 bg-white border-b border-[--border] flex items-center justify-between px-5 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        {isDetail ? (
          <Link href="/assignments"
            className="p-1.5 rounded-lg text-[--text-secondary] hover:bg-zinc-50 transition-colors">
            <ArrowLeft size={16} />
          </Link>
        ) : (
          <button className="p-1.5 rounded-lg text-[--text-secondary] hover:bg-zinc-50 transition-colors">
            <LayoutGrid size={16} />
          </button>
        )}
        <span className="text-[13px] font-medium text-[--text-secondary]">{title}</span>
      </div>

      <div className="flex items-center gap-2">
        <button className="relative p-2 rounded-full hover:bg-zinc-50 transition-colors">
          <Bell size={18} className="text-[--text-secondary]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        </button>
        <button className="flex items-center gap-2 hover:bg-zinc-50 rounded-lg px-2 py-1.5 transition-colors">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
            <span className="text-white text-xs font-bold">J</span>
          </div>
          <span className="text-[13px] font-medium text-[--text-primary] hidden sm:block">John Doe</span>
          <ChevronDown size={13} className="text-[--text-secondary]" />
        </button>
      </div>
    </header>
  );
}