import { Link, useLocation } from 'react-router-dom';
import { Home, Search, PlusCircle, MessageCircle, User } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/hooks/useAuth';
import { t } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function BottomNavigation() {
  const location = useLocation();
  const { language } = useAppStore();
  const { user } = useAuth();
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
    return () => clearInterval(interval);
  }, [user]);

  // Hide bottom nav entirely on admin routes — admin area is fully isolated
  if (location.pathname.startsWith('/admin')) return null;

  const links = [
    { to: '/', icon: Home, label: t('nav.home', language) },
    { to: '/jobs', icon: Search, label: t('nav.findJobs', language) },
    { to: '/post', icon: PlusCircle, label: t('nav.postJob', language) },
    { 
      to: '/chat', 
      icon: MessageCircle, 
      label: language === 'lo' ? 'ແຊັດ' : language === 'th' ? 'แชท' : 'Chat',
      badge: unreadCount > 0 ? unreadCount : 0
    },
    { 
      to: user ? '/profile' : '/auth', 
      icon: User, 
      label: language === 'lo' ? 'ໂປຣໄຟລ໌' : language === 'th' ? 'โปรไฟล์' : 'Profile' 
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t shadow-[0_-2px_10px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-16 px-2">
        {links.map((link) => {
          const isActive = location.pathname === link.to || (link.to === '/profile' && location.pathname === '/auth');
          return (
            <Link 
              key={link.to} 
              to={link.to} 
              className={`relative flex flex-col items-center justify-center w-full h-full gap-1 ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary transition-colors'
              }`}
            >
              <div className="relative">
                <link.icon className={`h-6 w-6 ${isActive ? 'fill-primary/20 absolute-center' : ''}`} />
                {link.badge ? (
                  <span className="absolute -top-1 -right-2 bg-destructive text-destructive-foreground text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                    {link.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] font-medium leading-none">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
