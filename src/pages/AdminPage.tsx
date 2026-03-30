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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trash2, Briefcase, Users, TrendingUp, Coins, Search, ShieldCheck, ShieldAlert, Eye, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string;
  phone: string | null;
  coin_balance: number;
  kyc_status: string;
  id_card_url: string | null;
  full_name: string | null;
  date_of_birth: string | null;
  is_student: boolean;
  guardian_name: string | null;
  guardian_phone: string | null;
  address: string | null;
  avatar_url: string | null;
  district: string | null;
  created_at: string;
}

interface CoinTx {
  id: string;
  amount: number;
  type: string;
  created_at: string;
}

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

const AdminPage = () => {
  const { language } = useAppStore();
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [coinTxs, setCoinTxs] = useState<CoinTx[]>([]);
  const [topupAmount, setTopupAmount] = useState<Record<string, string>>({});
  const [searchUser, setSearchUser] = useState('');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [kycDialog, setKycDialog] = useState<UserProfile | null>(null);

  const l = (lo: string, th: string, en: string) => language === 'en' ? en : language === 'th' ? th : lo;

  useEffect(() => {
    if (!user) return;
    checkAdmin();
  }, [user]);

  const checkAdmin = async () => {
    const { data } = await supabase.rpc('has_role', { _user_id: user!.id, _role: 'admin' });
    setIsAdmin(!!data);
    if (data) { loadJobs(); loadUsers(); loadCoinTxs(); }
  };

  const loadJobs = async () => {
    const { data } = await supabase.from('jobs').select('*').order('created_at', { ascending: false });
    setJobs((data as Job[]) || []);
  };

  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers((data as UserProfile[]) || []);
  };

  const loadCoinTxs = async () => {
    const { data } = await supabase.from('coin_transactions').select('id, amount, type, created_at').order('created_at', { ascending: false });
    setCoinTxs((data as CoinTx[]) || []);
  };

  if (!user) return <Navigate to="/auth" />;
  if (isAdmin === null) return <div className="min-h-screen flex items-center justify-center"><span className="animate-pulse text-2xl">⏳</span></div>;
  if (!isAdmin) return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <span className="text-5xl block mb-4">🔒</span>
          <p className="text-muted-foreground">{l('ຕ້ອງເປັນ Admin', 'ต้องเป็นผู้ดูแลระบบ', 'Admin access required')}</p>
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
      _target_user_id: targetUserId, _amount: amount, _description: `Admin top-up: ${amount} coins`,
    });
    if (error) toast.error(error.message);
    else {
      toast.success(`${l('ເພີ່ມ', 'เพิ่ม', 'Added')} ${amount} 🪙`);
      setTopupAmount(prev => ({ ...prev, [targetUserId]: '' }));
      loadUsers();
    }
  };

  const handleKycAction = async (targetUserId: string, status: string) => {
    const { error } = await supabase.rpc('admin_update_kyc', { _target_user_id: targetUserId, _status: status } as any);
    if (error) toast.error(error.message);
    else {
      toast.success(status === 'approved' ? l('ຢືນຢັນແລ້ວ', 'ยืนยันแล้ว', 'Approved') : l('ປະຕິເສດແລ້ວ', 'ปฏิเสธแล้ว', 'Rejected'));
      setKycDialog(null);
      loadUsers();
    }
  };

  const filteredUsers = users.filter(u =>
    !searchUser || u.display_name.toLowerCase().includes(searchUser.toLowerCase()) || u.phone?.includes(searchUser)
  );
  const pendingKyc = users.filter(u => u.kyc_status === 'pending' && u.id_card_url);

  // Stats data
  const jobsByDay = (() => {
    const map: Record<string, number> = {};
    jobs.forEach(j => {
      const day = new Date(j.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' });
      map[day] = (map[day] || 0) + 1;
    });
    return Object.entries(map).slice(-7).map(([date, count]) => ({ date, count }));
  })();

  const jobTypeData = [
    { name: l('ຈ້າງງານ', 'จ้างงาน', 'Hiring'), value: jobs.filter(j => j.post_type === 'hiring').length },
    { name: l('ຫາວຽກ', 'หางาน', 'Seeking'), value: jobs.filter(j => j.post_type === 'seeking').length },
  ];

  const coinStats = (() => {
    const topups = coinTxs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const spent = coinTxs.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    return [
      { name: l('ເຕີມ', 'เติม', 'Top-up'), value: topups },
      { name: l('ໃຊ້', 'ใช้', 'Spent'), value: spent },
    ];
  })();

  const stats = [
    { icon: <Briefcase className="h-5 w-5" />, value: jobs.length, label: t('admin.total', language), color: 'text-primary' },
    { icon: <Users className="h-5 w-5" />, value: users.length, label: l('ຜູ້ໃຊ້ທັງໝົດ', 'ผู้ใช้ทั้งหมด', 'Total Users'), color: 'text-accent' },
    { icon: <ShieldAlert className="h-5 w-5" />, value: pendingKyc.length, label: l('ລໍຖ້າ KYC', 'รอ KYC', 'Pending KYC'), color: 'text-orange-500' },
    { icon: <Coins className="h-5 w-5" />, value: coinTxs.length, label: l('ທຸລະກຳ', 'ธุรกรรม', 'Transactions'), color: 'text-primary' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="container py-6 flex-1">
        <h1 className="text-2xl font-bold mb-6">⚙️ {t('admin.title', language)}</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {stats.map((stat, i) => (
            <Card key={i} className="p-4 text-center">
              <div className={`flex justify-center mb-1 ${stat.color}`}>{stat.icon}</div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="stats">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="stats">📊 {l('ສະຖິຕິ', 'สถิติ', 'Stats')}</TabsTrigger>
            <TabsTrigger value="kyc">🛡️ KYC {pendingKyc.length > 0 && <Badge variant="destructive" className="ml-1 text-[10px] h-4 px-1">{pendingKyc.length}</Badge>}</TabsTrigger>
            <TabsTrigger value="jobs">📋 {t('admin.jobs', language)}</TabsTrigger>
            <TabsTrigger value="users">👥 {l('ຜູ້ໃຊ້', 'ผู้ใช้', 'Users')}</TabsTrigger>
          </TabsList>

          {/* Stats Tab */}
          <TabsContent value="stats">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-4">
                <h3 className="font-semibold mb-3">{l('ວຽກຕາມວັນ', 'งานตามวัน', 'Jobs by Day')}</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={jobsByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-4">
                <h3 className="font-semibold mb-3">{l('ປະເພດວຽກ', 'ประเภทงาน', 'Job Types')}</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={jobTypeData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {jobTypeData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-4">
                <h3 className="font-semibold mb-3">{l('ຫຼຽນ', 'เหรียญ', 'Coins')}</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={coinStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {coinStats.map((_, i) => <Cell key={i} fill={CHART_COLORS[i + 2]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-4">
                <h3 className="font-semibold mb-3">{l('ຜູ້ໃຊ້ໃໝ່ (7 ມື້)', 'ผู้ใช้ใหม่ (7 วัน)', 'New Users (7 days)')}</h3>
                <div className="text-center py-8">
                  <div className="text-4xl font-bold text-primary">
                    {users.filter(u => new Date(u.created_at) > new Date(Date.now() - 7 * 86400000)).length}
                  </div>
                  <div className="text-muted-foreground text-sm mt-1">{l('ຜູ້ໃຊ້ໃໝ່', 'ผู้ใช้ใหม่', 'new users')}</div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* KYC Tab */}
          <TabsContent value="kyc">
            <Card className="divide-y">
              {pendingKyc.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  ✅ {l('ບໍ່ມີ KYC ລໍຖ້າ', 'ไม่มี KYC รอ', 'No pending KYC')}
                </div>
              )}
              {pendingKyc.map(u => (
                <div key={u.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={u.avatar_url || ''} />
                      <AvatarFallback>{(u.display_name || '?')[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{u.full_name || u.display_name}</div>
                      <div className="text-xs text-muted-foreground">{u.phone || '—'} • {u.date_of_birth || '—'}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setKycDialog(u)}>
                      <Eye className="h-4 w-4 mr-1" /> {l('ເບິ່ງ', 'ดู', 'View')}
                    </Button>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleKycAction(u.user_id, 'approved')}>
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleKycAction(u.user_id, 'rejected')}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </Card>
          </TabsContent>

          {/* Jobs Tab */}
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
                        {job.status === 'cancelled' && <Badge variant="destructive" className="text-xs">❌</Badge>}
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
                  {l('ຍັງບໍ່ມີວຽກ', 'ยังไม่มีงาน', 'No jobs yet')}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={l('ຄົ້ນຫາຜູ້ໃຊ້...', 'ค้นหาผู้ใช้...', 'Search users...')}
                value={searchUser} onChange={e => setSearchUser(e.target.value)} className="pl-9"
              />
            </div>
            <Card className="divide-y">
              {filteredUsers.map(u => (
                <div key={u.id} className="p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={u.avatar_url || ''} />
                      <AvatarFallback>{(u.display_name || '?')[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{u.display_name || '—'}</div>
                      <div className="text-xs text-muted-foreground">{u.phone || '—'}</div>
                    </div>
                    <Badge variant={u.kyc_status === 'approved' ? 'default' : u.kyc_status === 'rejected' ? 'destructive' : 'secondary'} className="text-xs">
                      {u.kyc_status === 'approved' ? '✅' : u.kyc_status === 'rejected' ? '❌' : '⏳'} {u.kyc_status}
                    </Badge>
                  </div>
                  <Badge variant="secondary" className="gap-1">🪙 {u.coin_balance}</Badge>
                  <div className="flex items-center gap-2">
                    <Input type="number" className="w-20 h-8" placeholder="0"
                      value={topupAmount[u.user_id] || ''}
                      onChange={e => setTopupAmount(prev => ({ ...prev, [u.user_id]: e.target.value }))}
                    />
                    <Button size="sm" onClick={() => handleTopup(u.user_id)} className="gap-1">
                      <Coins className="h-3 w-3" /> {l('ເຕີມ', 'เติม', 'Add')}
                    </Button>
                  </div>
                </div>
              ))}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />

      {/* KYC Detail Dialog */}
      <Dialog open={!!kycDialog} onOpenChange={() => setKycDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>🛡️ {l('ຂໍ້ມູນ KYC', 'ข้อมูล KYC', 'KYC Details')}</DialogTitle>
          </DialogHeader>
          {kycDialog && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">{l('ຊື່ເຕັມ', 'ชื่อเต็ม', 'Full Name')}:</span><br /><strong>{kycDialog.full_name || '—'}</strong></div>
                <div><span className="text-muted-foreground">{l('ວັນເກີດ', 'วันเกิด', 'DOB')}:</span><br /><strong>{kycDialog.date_of_birth || '—'}</strong></div>
                <div><span className="text-muted-foreground">{l('ເບີໂທ', 'เบอร์โทร', 'Phone')}:</span><br /><strong>{kycDialog.phone || '—'}</strong></div>
                <div><span className="text-muted-foreground">{l('ເມືອງ', 'เมือง', 'District')}:</span><br /><strong>{kycDialog.district || '—'}</strong></div>
                <div className="col-span-2"><span className="text-muted-foreground">{l('ທີ່ຢູ່', 'ที่อยู่', 'Address')}:</span><br /><strong>{kycDialog.address || '—'}</strong></div>
                {kycDialog.is_student && <div className="col-span-2"><Badge>🎓 {l('ນັກສຶກສາ', 'นักศึกษา', 'Student')}</Badge></div>}
                {kycDialog.guardian_name && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">{l('ຜູ້ປົກຄອງ', 'ผู้ปกครอง', 'Guardian')}:</span><br />
                    <strong>{kycDialog.guardian_name} ({kycDialog.guardian_phone})</strong>
                  </div>
                )}
              </div>
              {kycDialog.id_card_url && (
                <div>
                  <span className="text-sm text-muted-foreground">{l('ບັດປະຈຳຕົວ', 'บัตรประจำตัว', 'ID Card')}:</span>
                  <img
                    src={supabase.storage.from('id-cards').getPublicUrl(kycDialog.id_card_url).data.publicUrl}
                    alt="ID Card"
                    className="mt-1 rounded-lg max-h-60 w-full object-contain border"
                  />
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleKycAction(kycDialog.user_id, 'approved')}>
                  <CheckCircle className="h-4 w-4 mr-1" /> {l('ຢືນຢັນ', 'ยืนยัน', 'Approve')}
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => handleKycAction(kycDialog.user_id, 'rejected')}>
                  <XCircle className="h-4 w-4 mr-1" /> {l('ປະຕິເສດ', 'ปฏิเสธ', 'Reject')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPage;
