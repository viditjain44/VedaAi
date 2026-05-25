import Sidebar from './Sidebar';
import Header from './Header';
import MobileNav from './MobileNav';

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[--surface]">
      <Sidebar />
      <div className="md:ml-[220px] flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
