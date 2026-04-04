import { Link, useLocation } from 'react-router-dom';
import { Home, Search, PlusCircle, User, Settings } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/hooks/useAuth';

export function BottomNavigation() {
  const location = useLocation();
  const { language } = useAppStore();
  const { user, role } = useAuth();

  const l = (lo: string, th: string, en: string) => language === 'en' ? en : language === 'th' ? th : lo;

  const links = [
    { to: '/', icon: Home, label: l('ໜ້າຫຼັກ', 'หน้าแรก', 'Home') },
    { to: '/jobs', icon: Search, label: l('ງານ', 'งาน', 'Jobs') },
    { to: '/post', icon: PlusCircle, label: l('ສ້າງງານ', 'สร้างงาน', 'New') },
    ...(role === 'admin' ? [{ to: '/admin', icon: Settings, label: 'Admin' }] : []),
    { to: user ? '/profile' : '/auth', icon: User, label: l('ບັນຊີ', 'บัญชี', 'Account') },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t shadow-[0_-2px_10px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-16 px-2">
        {links.map((link) => {
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`relative flex flex-col items-center justify-center w-full h-full gap-1 ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary transition-colors'
              }`}
            >
              <link.icon className={`h-6 w-6 ${isActive ? 'fill-primary/20' : ''}`} />
              <span className="text-[10px] font-medium leading-none">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
