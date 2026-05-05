import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/lib/store';
import { Link } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  job_id: string | null;
  sender_id: string | null;
  created_at: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const { language } = useAppStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const l = (lo: string, th: string, en: string) => language === 'en' ? en : language === 'th' ? th : lo;

  useEffect(() => {
    if (!user) return;
    loadNotifications();

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const updated = payload.new as Notification;
        setNotifications(prev => prev.map(n => n.id === updated.id ? { ...n, ...updated } : n));
      })
      .subscribe();

    // Cross-tab sync via BroadcastChannel
    const bc = 'BroadcastChannel' in window ? new BroadcastChannel(`notif:${user.id}`) : null;
    if (bc) {
      bc.onmessage = (e) => {
        if (e.data?.type === 'mark_read') {
          const ids: string[] = e.data.ids || [];
          setNotifications(prev => prev.map(n => ids.includes(n.id) || ids.length === 0 ? { ...n, is_read: true } : n));
        } else if (e.data?.type === 'reload') {
          loadNotifications();
        }
      };
    }

    return () => { supabase.removeChannel(channel); bc?.close(); };
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setNotifications((data as Notification[]) || []);
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    if ('BroadcastChannel' in window) {
      const bc = new BroadcastChannel(`notif:${user.id}`);
      bc.postMessage({ type: 'mark_read', ids: [] });
      bc.close();
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'job_accepted': return '🤝';
      case 'job_completed': return '✅';
      case 'new_message': return '💬';
      case 'kyc_approved': return '🎉';
      case 'kyc_rejected': return '❌';
      case 'coins_received': return '💰';
      default: return '🔔';
    }
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return l('ດຽວນີ້', 'เดี๋ยวนี้', 'now');
    if (m < 60) return `${m}${l('ນ', 'น', 'm')}`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}${l('ຊ', 'ช', 'h')}`;
    return `${Math.floor(h / 24)}${l('ມ', 'ว', 'd')}`;
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b flex items-center justify-between">
          <h4 className="font-semibold text-sm">{l('ການແຈ້ງເຕືອນ', 'การแจ้งเตือน', 'Notifications')}</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>
              {l('ອ່ານທັງໝົດ', 'อ่านทั้งหมด', 'Mark all read')}
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {l('ບໍ່ມີການແຈ້ງເຕືອນ', 'ไม่มีการแจ้งเตือน', 'No notifications')}
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                className={`p-3 border-b last:border-0 hover:bg-accent/50 transition-colors cursor-pointer ${!n.is_read ? 'bg-primary/5' : ''}`}
                onClick={async () => {
                  if (!n.is_read) {
                    await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
                    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
                    if ('BroadcastChannel' in window && user) {
                      const bc = new BroadcastChannel(`notif:${user.id}`);
                      bc.postMessage({ type: 'mark_read', ids: [n.id] });
                      bc.close();
                    }
                  }
                  if (n.job_id) setOpen(false);
                }}
              >
                {n.job_id ? (
                  <Link to={`/jobs/${n.job_id}`} onClick={() => setOpen(false)}>
                    <div className="flex gap-2">
                      <span className="text-lg">{getIcon(n.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{n.title}</div>
                        {n.body && <div className="text-xs text-muted-foreground truncate">{n.body}</div>}
                        <div className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</div>
                      </div>
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />}
                    </div>
                  </Link>
                ) : (
                  <div className="flex gap-2">
                    <span className="text-lg">{getIcon(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{n.title}</div>
                      {n.body && <div className="text-xs text-muted-foreground truncate">{n.body}</div>}
                      <div className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</div>
                    </div>
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />}
                  </div>
                )}
              </div>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
