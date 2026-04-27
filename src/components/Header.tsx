import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/hooks/useAuth';
import { t } from '@/lib/i18n';
import { LanguageSwitcher } from './LanguageSwitcher';
import { motion } from 'framer-motion';
import { Briefcase, MessageCircle, User, LogOut, Coins } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

export function Header() {
  const { language } = useAppStore();
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const loadUnread = async () => {
      const { count } = await supabase
        .from('messages')
        .select('*, conversations!inner(*)', { count: 'exact', head: true })
        .eq('is_read', false)
        .neq('sender_id', user.id)
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`, { referencedTable: 'conversations' });
      setUnreadCount(count || 0);
    };
    loadUnread();
    const interval = setInterval(loadUnread, 15000);
    // Real-time: refresh on new/updated messages
    const channel = supabase
      .channel(`hdr-msgs:${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, loadUnread)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, loadUnread)
      .subscribe();
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user]);

  const links = [
    { to: '/', label: t('nav.home', language) },
    { to: '/jobs', label: t('nav.findJobs', language) },
    { to: '/post', label: t('nav.postJob', language) },
  ];

  // Admin link removed from public nav - accessible via /admin URL only

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
              <Button variant={location.pathname === link.to ? 'default' : 'ghost'} size="sm">
                {link.label}
              </Button>
            </Link>
          ))}

          {user && (
            <>
              <Link to="/chat">
                <Button variant={location.pathname === '/chat' ? 'default' : 'ghost'} size="sm" className="relative gap-1">
                  <MessageCircle className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </Link>
              <NotificationBell />
              <Link to="/profile">
                <Button variant={location.pathname === '/profile' ? 'default' : 'ghost'} size="sm" className="gap-1">
                  <Coins className="h-4 w-4" />
                  <span className="text-xs">{(profile?.coin_balance || 0).toLocaleString()}₭</span>
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={signOut} className="gap-1">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}

          {!user && (
            <Link to="/auth">
              <Button size="sm" className="gap-1">
                <User className="h-4 w-4" />
                {language === 'en' ? 'Login' : language === 'th' ? 'เข้าสู่ระบบ' : 'ເຂົ້າສູ່ລະບົບ'}
              </Button>
            </Link>
          )}

          <LanguageSwitcher />
        </nav>

        {/* Mobile items (hidden on md) */}
        <div className="flex md:hidden items-center gap-2">
          {/* We only keep language switcher here for mobile since BottomNav has the rest */}
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
