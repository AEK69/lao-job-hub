import { useState, useEffect } from 'react';
import { useAppStore, Job } from '@/lib/store';
import { useAuth } from '@/hooks/useAuth';
import { t, districts } from '@/lib/i18n';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Briefcase, Users, TrendingUp, Coins, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string;
  phone: string | null;
  coin_balance: number;
}

const AdminPage = () => {
  const { language } = useAppStore();
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [topupAmount, setTopupAmount] = useState<Record<string, string>>({});
  const [searchUser, setSearchUser] = useState('');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    checkAdmin();
  }, [user]);

  const checkAdmin = async () => {
    const { data } = await supabase.rpc('has_role', { _user_id: user!.id, _role: 'admin' });
    setIsAdmin(!!data);
    if (data) {
      loadJobs();
      loadUsers();
    }
  };

  const loadJobs = async () => {
    const { data } = await supabase.from('jobs').select('*').order('created_at', { ascending: false });
    setJobs((data as Job[]) || []);
  };

  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers((data as UserProfile[]) || []);
  };

  if (!user) return <Navigate to="/auth" />;
  if (isAdmin === null) return <div className="min-h-screen flex items-center justify-center"><span className="animate-pulse text-2xl">⏳</span></div>;
  if (!isAdmin) return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <span className="text-5xl block mb-4">🔒</span>
          <p className="text-muted-foreground">{language === 'en' ? 'Admin access required' : language === 'th' ? 'ต้องเป็นผู้ดูแลระบบ' : 'ຕ້ອງເປັນ Admin'}</p>
        </div>
      </div>
      <Footer />
    </div>
  );

  const handleDelete = async (id: string, title: string) => {
    await supabase.from('jobs').delete().eq('id', id);
    toast.success(`${t('admin.delete', language)}: ${title}`);
    loadJobs();
  };

  const handleTopup = async (targetUserId: string) => {
    const amount = parseInt(topupAmount[targetUserId] || '0');
    if (!amount || amount <= 0) return;
    const { error } = await supabase.rpc('admin_topup_coins', {
      _target_user_id: targetUserId,
      _amount: amount,
      _description: `Admin top-up: ${amount} coins`,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${language === 'en' ? 'Added' : 'ເພີ່ມ'} ${amount} 🪙`);
      setTopupAmount(prev => ({ ...prev, [targetUserId]: '' }));
      loadUsers();
    }
  };

  const filteredUsers = users.filter(u =>
    !searchUser || u.display_name.toLowerCase().includes(searchUser.toLowerCase()) || u.phone?.includes(searchUser)
  );

  const stats = [
    { icon: <Briefcase className="h-5 w-5" />, value: jobs.length, label: t('admin.total', language), color: 'text-primary' },
    { icon: <Users className="h-5 w-5" />, value: jobs.filter(j => j.post_type === 'hiring').length, label: t('stats.employers', language), color: 'text-accent' },
    { icon: <TrendingUp className="h-5 w-5" />, value: jobs.filter(j => j.post_type === 'seeking').length, label: t('stats.seekers', language), color: 'text-primary' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="container py-6 flex-1">
        <h1 className="text-2xl font-bold mb-6">⚙️ {t('admin.title', language)}</h1>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {stats.map((stat, i) => (
            <Card key={i} className="p-4 text-center">
              <div className={`flex justify-center mb-1 ${stat.color}`}>{stat.icon}</div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="jobs">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="jobs">📋 {t('admin.jobs', language)}</TabsTrigger>
            <TabsTrigger value="users">👥 {language === 'en' ? 'Users & Coins' : language === 'th' ? 'ผู้ใช้ & เหรียญ' : 'ຜູ້ໃຊ້ & ຫຼຽນ'}</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs">
            <Card className="divide-y">
              {jobs.map((job, i) => {
                const district = districts.find(d => d.id === job.district);
                return (
                  <motion.div key={job.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="p-4 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">{job.title}</span>
                        <Badge variant={job.post_type === 'hiring' ? 'default' : 'secondary'} className="text-xs shrink-0">
                          {t(job.post_type === 'hiring' ? 'job.type.employer' : 'job.type.worker', language)}
                        </Badge>
                        {job.is_urgent && <Badge variant="destructive" className="text-xs shrink-0">🔥</Badge>}
                        {job.is_featured && <Badge className="text-xs shrink-0 bg-accent text-accent-foreground">⭐</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {job.poster_name} • {district?.[language] || district?.lo} • {job.phone}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 shrink-0" onClick={() => handleDelete(job.id, job.title)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </motion.div>
                );
              })}
              {jobs.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  {language === 'en' ? 'No jobs yet' : language === 'th' ? 'ยังไม่มีงาน' : 'ຍັງບໍ່ມີວຽກ'}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={language === 'en' ? 'Search users...' : language === 'th' ? 'ค้นหาผู้ใช้...' : 'ຄົ້ນຫາຜູ້ໃຊ້...'}
                value={searchUser}
                onChange={e => setSearchUser(e.target.value)}
                className="pl-9"
              />
            </div>
            <Card className="divide-y">
              {filteredUsers.map(u => (
                <div key={u.id} className="p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{u.display_name || '—'}</div>
                    <div className="text-xs text-muted-foreground">{u.phone || '—'}</div>
                  </div>
                  <Badge variant="secondary" className="gap-1">🪙 {u.coin_balance}</Badge>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-20 h-8"
                      placeholder="0"
                      value={topupAmount[u.user_id] || ''}
                      onChange={e => setTopupAmount(prev => ({ ...prev, [u.user_id]: e.target.value }))}
                    />
                    <Button size="sm" onClick={() => handleTopup(u.user_id)} className="gap-1">
                      <Coins className="h-3 w-3" />
                      {language === 'en' ? 'Add' : language === 'th' ? 'เติม' : 'ເຕີມ'}
                    </Button>
                  </div>
                </div>
              ))}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default AdminPage;
