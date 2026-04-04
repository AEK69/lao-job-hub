import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/hooks/useAuth';
import { t } from '@/lib/i18n';
import { LanguageSwitcher } from './LanguageSwitcher';
import { motion } from 'framer-motion';
import { Briefcase, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Header() {
  const { language } = useAppStore();
  const { user, role, signOut } = useAuth();
  const location = useLocation();

  const l = (lo: string, th: string, en: string) => language === 'en' ? en : language === 'th' ? th : lo;

  const links = [
    { to: '/', label: t('nav.home', language) },
    { to: '/jobs', label: l('ລາຍການງານ', 'รายการงาน', 'Jobs') },
    { to: '/post', label: l('ສ້າງງານ', 'สร้างงาน', 'New Job') },
  ];

  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          >
            <Briefcase className="h-7 w-7 text-primary" />
          </motion.div>
          <span className="text-xl font-bold text-primary">WorkDay</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((link) => (
            <Link key={link.to} to={link.to}>
              <Button variant={location.pathname === link.to ? 'default' : 'ghost'} size="sm">
                {link.label}
              </Button>
            </Link>
          ))}

          {user && role === 'admin' && (
            <Link to="/admin">
              <Button variant={location.pathname === '/admin' ? 'default' : 'ghost'} size="sm">
                Admin
              </Button>
            </Link>
          )}

          {user ? (
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-1">
              <LogOut className="h-4 w-4" />
            </Button>
          ) : (
            <Link to="/auth">
              <Button size="sm" className="gap-1">
                <User className="h-4 w-4" />
                {l('ເຂົ້າສູ່ລະບົບ', 'เข้าสู่ระบบ', 'Login')}
              </Button>
            </Link>
          )}

          <LanguageSwitcher />
        </nav>

        <div className="flex md:hidden items-center gap-2">
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
