import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { LanguageSwitcher } from './LanguageSwitcher';
import { motion } from 'framer-motion';
import { Briefcase, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function Header() {
  const { language } = useAppStore();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { to: '/', label: t('nav.home', language) },
    { to: '/jobs', label: t('nav.findJobs', language) },
    { to: '/post', label: t('nav.postJob', language) },
    { to: '/admin', label: t('nav.admin', language) },
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
          <span className="text-xl font-bold text-primary">ວຽກດ່ວນ</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map((link) => (
            <Link key={link.to} to={link.to}>
              <Button
                variant={location.pathname === link.to ? 'default' : 'ghost'}
                size="sm"
              >
                {link.label}
              </Button>
            </Link>
          ))}
          <LanguageSwitcher />
        </nav>

        {/* Mobile toggle */}
        <div className="flex md:hidden items-center gap-2">
          <LanguageSwitcher />
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <motion.nav
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden border-t bg-card p-4 flex flex-col gap-2"
        >
          {links.map((link) => (
            <Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)}>
              <Button
                variant={location.pathname === link.to ? 'default' : 'ghost'}
                className="w-full justify-start"
              >
                {link.label}
              </Button>
            </Link>
          ))}
        </motion.nav>
      )}
    </header>
  );
}
