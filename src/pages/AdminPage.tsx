import { useState, useEffect } from 'react';
import { useAppStore, Job } from '@/lib/store';
import { useAuth } from '@/hooks/useAuth';
import { t, districts } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Trash2, Briefcase, Users, Coins, Search, ShieldCheck, Eye, CheckCircle, XCircle,
  Minus, Plus, BarChart3, LogOut, Home, Settings, Bell, ChevronDown, ChevronUp,
  UserCheck, UserX, AlertTriangle, TrendingUp, DollarSign, Clock, FileText, Download,
  Lock, Unlock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

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
  address: string | null;
  avatar_url: string | null;
  district: string | null;
  is_student: boolean | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  created_at: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#14b8a6'];

// Export jobs to CSV
const exportJobsToCSV = (jobs: Job[], filename: string = 'jobs-export.csv') => {
  const headers = ['ID', 'Title', 'Category', 'District', 'Salary', 'Poster', 'Type', 'Status', 'Created', 'Urgent', 'Featured'];
  const rows = jobs.map(job => [
    job.id,
    `"${job.title}"`,
    job.category,
    job.district,
    job.salary,
    `"${job.poster_name}"`,
    job.post_type,
    job.status,
    new Date(job.created_at).toLocaleDateString(),
    job.is_urgent ? 'Yes' : 'No',
    job.is_featured ? 'Yes' : 'No',
  ]);

  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};

const AdminPage = () => {
  const { language } = useAppStore();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [kycDialog, setKycDialog] = useState<UserProfile | null>(null);
  const [coinDialog, setCoinDialog] = useState<{ user: UserProfile; mode: 'add' | 'deduct' } | null>(null);
  const [coinAmount, setCoinAmount] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [searchJob, setSearchJob] = useState('');
  const [jobStatusFilter, setJobStatusFilter] = useState<'all' | 'active' | 'cancelled'>('all');
  const [kycFilter, setKycFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const l = (lo: string, th: string, en: string) => language === 'en' ? en : language === 'th' ? th : lo;

  useEffect(() => {
    if (!user) return;
    checkAdmin();
  }, [user]);

  const checkAdmin = async () => {
    const { data } = await supabase.rpc('has_role', { _user_id: user!.id, _role: 'admin' });
    setIsAdmin(!!data);
    if (data) { loadJobs(); loadUsers(); }
  };

  const loadJobs = async () => {
    const { data } = await supabase.from('jobs').select('*').order('created_at', { ascending: false }).limit(200);
    setJobs((data as Job[]) || []);
  };

  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers((data as UserProfile[]) || []);
  };

  const handleDeleteJob = async (id: string, title: string) => {
    if (!window.confirm(`${l('ລຶບ', 'ลบ', 'Delete')} "${title}"?`)) return;
    const { error } = await supabase.from('jobs').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success(l('ລຶບແລ້ວ', 'ลบแล้ว', 'Deleted')); loadJobs(); }
  };

  const handleToggleJobStatus = async (job: Job) => {
    const newStatus = job.status === 'active' ? 'cancelled' : 'active';
    const { error } = await supabase.from('jobs').update({ status: newStatus } as any).eq('id', job.id);
    if (error) toast.error(error.message);
    else { toast.success(l('ອັບເດດແລ້ວ', 'อัปเดตแล้ว', 'Updated')); loadJobs(); }
  };

  const handleKycAction = async (targetUserId: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase.rpc('admin_update_kyc', { _target_user_id: targetUserId, _status: status } as any);
    if (error) toast.error(error.message);
    else {
      toast.success(status === 'approved' ? l('ຢືນຢັນແລ້ວ', 'ยืนยันแล้ว', 'Approved') : l('ປະຕິເສດແລ້ວ', 'ปฏิเสธแล้ว', 'Rejected'));
      setKycDialog(null);
      loadUsers();
    }
  };

  const handleCoinTransaction = async () => {
    if (!coinDialog || !coinAmount) return;
    const amount = parseInt(coinAmount);
    if (!amount || amount <= 0) { toast.error(l('ໃສ່ຈຳນວນ', 'กรอกจำนวน', 'Enter amount')); return; }

    const finalAmount = coinDialog.mode === 'add' ? amount : -amount;
    const { error } = await supabase.rpc('admin_topup_coins', {
      _target_user_id: coinDialog.user.user_id, _amount: finalAmount,
      _description: `Admin ${coinDialog.mode === 'add' ? 'top-up' : 'deduction'}: ${amount} coins`,
    });
    if (error) toast.error(error.message);
    else {
      toast.success(`${coinDialog.mode === 'add' ? '+' : '-'}${amount} 🪙`);
      setCoinDialog(null); setCoinAmount(''); loadUsers();
    }
  };

  if (!user) return <Navigate to="/admin-login" />;
  if (isAdmin === null) return <div className="min-h-screen flex items-center justify-center"><span className="animate-pulse text-2xl">⏳</span></div>;
  if (!isAdmin) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="p-8 text-center max-w-md">
        <span className="text-5xl block mb-4">🔒</span>
        <p className="text-muted-foreground mb-4">{l('ຕ້ອງເປັນ Admin', 'ต้องเป็นผู้ดูแลระบบ', 'Admin access required')}</p>
        <Link to="/"><Button>{l('ກັບໄປໜ້າຫຼັກ', 'กลับไปหน้าแรก', 'Go Home')}</Button></Link>
      </Card>
    </div>
  );

  const pendingKyc = users.filter(u => u.kyc_status === 'pending' && u.id_card_url);
  const filteredUsers = users.filter(u => {
    const matchSearch = !searchUser || u.display_name?.toLowerCase().includes(searchUser.toLowerCase()) || u.phone?.includes(searchUser);
    const matchKyc = kycFilter === 'all' || u.kyc_status === kycFilter;
    return matchSearch && matchKyc;
  });
  const filteredJobs = jobs.filter(j => {
    const matchSearch = !searchJob || j.title.toLowerCase().includes(searchJob.toLowerCase());
    const matchStatus = jobStatusFilter === 'all' || j.status === jobStatusFilter;
    return matchSearch && matchStatus;
  });

  // Stats
  const totalCoins = users.reduce((s, u) => s + u.coin_balance, 0);
  const activeJobs = jobs.filter(j => j.status === 'active').length;
  const kycApproved = users.filter(u => u.kyc_status === 'approved').length;

  // Chart data
  const jobsByCategory = categories_data.map(cat => ({
    name: t(`cat.${cat.id}` as any, language),
    count: jobs.filter(j => j.category === cat.id).length,
  })).filter(d => d.count > 0);

  const kycPieData = [
    { name: l('ຢືນຢັນແລ້ວ', 'ยืนยันแล้ว', 'Approved'), value: users.filter(u => u.kyc_status === 'approved').length },
    { name: l('ລໍຖ້າ', 'รอ', 'Pending'), value: users.filter(u => u.kyc_status === 'pending').length },
    { name: l('ປະຕິເສດ', 'ปฏิเสธ', 'Rejected'), value: users.filter(u => u.kyc_status === 'rejected').length },
  ].filter(d => d.value > 0);

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 bg-card border-r flex-col">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            <Settings className="h-5 w-5" /> Admin
          </h1>
          <p className="text-xs text-muted-foreground mt-1">{l('ລະບົບຫຼັງບ້ານ', 'ระบบหลังบ้าน', 'Admin Dashboard')}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link to="/">
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Home className="h-4 w-4" /> {l('ໜ້າຫຼັກ', 'หน้าแรก', 'Home')}
            </Button>
          </Link>
        </nav>
        <div className="p-4 border-t">
          <Button variant="ghost" className="w-full justify-start gap-2 text-destructive" onClick={signOut}>
            <LogOut className="h-4 w-4" /> {l('ອອກ', 'ออก', 'Logout')}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Top bar */}
        <header className="bg-card border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-bold">{l('ແຜງຄວບຄຸມ', 'แผงควบคุม', 'Dashboard')}</h2>
            <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString(language === 'th' ? 'th-TH' : language === 'en' ? 'en-US' : 'lo-LA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="flex items-center gap-3">
            {pendingKyc.length > 0 && (
              <Badge className="bg-orange-500 gap-1 animate-pulse">
                <Bell className="h-3 w-3" /> {pendingKyc.length} KYC
              </Badge>
            )}
            <Link to="/" className="lg:hidden">
              <Button variant="outline" size="sm"><Home className="h-4 w-4" /></Button>
            </Link>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Users, label: l('ຜູ້ໃຊ້ທັງໝົດ', 'ผู้ใช้ทั้งหมด', 'Total Users'), value: users.length, color: 'text-blue-600 bg-blue-100' },
              { icon: Briefcase, label: l('ວຽກ Active', 'งาน Active', 'Active Jobs'), value: activeJobs, color: 'text-green-600 bg-green-100' },
              { icon: UserCheck, label: l('KYC ຢືນຢັນ', 'KYC ยืนยัน', 'KYC Approved'), value: kycApproved, color: 'text-purple-600 bg-purple-100' },
              { icon: Coins, label: l('ຫຼຽນທັງໝົດ', 'เหรียญทั้งหมด', 'Total Coins'), value: totalCoins.toLocaleString() + '₭', color: 'text-amber-600 bg-amber-100' },
            ].map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stat.color}`}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                {l('ວຽກຕາມໝວດ', 'งานตามหมวด', 'Jobs by Category')}
              </h3>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={jobsByCategory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                {l('ສະຖານະ KYC', 'สถานะ KYC', 'KYC Status')}
              </h3>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={kycPieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {kycPieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue={pendingKyc.length > 0 ? 'kyc' : 'users'} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" /> {l('ຜູ້ໃຊ້', 'ผู้ใช้', 'Users')} ({users.length})
              </TabsTrigger>
              <TabsTrigger value="kyc" className="gap-2 relative">
                <ShieldCheck className="h-4 w-4" /> KYC
                {pendingKyc.length > 0 && (
                  <span className="bg-orange-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center ml-1">{pendingKyc.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="jobs" className="gap-2">
                <Briefcase className="h-4 w-4" /> {l('ວຽກ', 'งาน', 'Jobs')} ({jobs.length})
              </TabsTrigger>
            </TabsList>

            {/* Users */}
            <TabsContent value="users" className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder={l('ຄົ້ນຫາ...', 'ค้นหา...', 'Search...')} value={searchUser} onChange={e => setSearchUser(e.target.value)} className="pl-10" />
                </div>
                <Select value={kycFilter} onValueChange={(v: any) => setKycFilter(v)}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{l('ທັງໝົດ', 'ทั้งหมด', 'All')}</SelectItem>
                    <SelectItem value="approved">✅ {l('ຢືນຢັນ', 'ยืนยัน', 'Approved')}</SelectItem>
                    <SelectItem value="pending">⏳ {l('ລໍຖ້າ', 'รอ', 'Pending')}</SelectItem>
                    <SelectItem value="rejected">❌ {l('ປະຕິເສດ', 'ปฏิเสธ', 'Rejected')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                {filteredUsers.length === 0 ? (
                  <Card className="p-8 text-center text-muted-foreground">{l('ບໍ່ມີຜູ້ໃຊ້', 'ไม่พบผู้ใช้', 'No users')}</Card>
                ) : filteredUsers.map((u, idx) => (
                  <motion.div key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }}>
                    <Card className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={u.avatar_url || ''} />
                            <AvatarFallback className="bg-primary/10 text-primary">{(u.display_name || '?')[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="font-semibold text-sm">{u.display_name || '—'}</div>
                            <div className="text-xs text-muted-foreground">{u.phone || u.full_name || '—'}</div>
                          </div>
                          <Badge className={`text-xs ${u.kyc_status === 'approved' ? 'bg-green-600' : u.kyc_status === 'rejected' ? 'bg-red-600' : 'bg-yellow-600'}`}>
                            {u.kyc_status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="gap-1 font-semibold text-xs">{u.coin_balance.toLocaleString()}₭</Badge>
                          <Button size="sm" variant="outline" className="h-8 gap-1 text-green-600 border-green-300 hover:bg-green-50" onClick={() => { setCoinDialog({ user: u, mode: 'add' }); setCoinAmount(''); }}>
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 gap-1 text-red-600 border-red-300 hover:bg-red-50" onClick={() => { setCoinDialog({ user: u, mode: 'deduct' }); setCoinAmount(''); }}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          {u.kyc_status === 'pending' && u.id_card_url && (
                            <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setKycDialog(u)}>
                              <Eye className="h-3 w-3" /> KYC
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            {/* KYC */}
            <TabsContent value="kyc" className="space-y-2">
              {pendingKyc.length === 0 ? (
                <Card className="p-12 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="text-muted-foreground">{l('ບໍ່ມີ KYC ລໍຖ້າ', 'ไม่มี KYC รอ', 'No pending KYC requests')}</p>
                </Card>
              ) : (
                pendingKyc.map((u, idx) => (
                  <motion.div key={u.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}>
                    <Card className="p-4 border-l-4 border-l-orange-500">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={u.avatar_url || ''} />
                            <AvatarFallback>{(u.display_name || '?')[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="font-semibold text-sm">{u.full_name || u.display_name || '—'}</div>
                            <div className="text-xs text-muted-foreground">
                              {u.phone || '—'} • {u.date_of_birth || '—'}
                              {u.is_student && <Badge variant="secondary" className="ml-1 text-[10px]">📚 {l('ນັກສຶກສາ', 'นักศึกษา', 'Student')}</Badge>}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setKycDialog(u)} className="gap-1 h-8">
                            <Eye className="h-3 w-3" /> {l('ເບິ່ງ', 'ดู', 'View')}
                          </Button>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-1 h-8" onClick={() => handleKycAction(u.user_id, 'approved')}>
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleKycAction(u.user_id, 'rejected')} className="gap-1 h-8">
                            <XCircle className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))
              )}
            </TabsContent>

            {/* Jobs */}
            <TabsContent value="jobs" className="space-y-4">
              <div className="flex gap-2 flex-wrap items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder={l('ຄົ້ນຫາວຽກ...', 'ค้นหางาน...', 'Search jobs...')} value={searchJob} onChange={e => setSearchJob(e.target.value)} className="pl-10" />
                </div>
                <Select value={jobStatusFilter} onValueChange={(v: any) => setJobStatusFilter(v)}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{l('ທັງໝົດ', 'ทั้งหมด', 'All')}</SelectItem>
                    <SelectItem value="active">✅ Active</SelectItem>
                    <SelectItem value="cancelled">❌ Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="gap-2" 
                  onClick={() => exportJobsToCSV(filteredJobs, `jobs-${new Date().toISOString().split('T')[0]}.csv`)}
                  disabled={filteredJobs.length === 0}
                >
                  <Download className="h-4 w-4" /> {l('ສົ່ງອອກ', 'ส่งออก', 'Export')}
                </Button>
              </div>
              <div className="space-y-2">
                {filteredJobs.length === 0 ? (
                  <Card className="p-8 text-center text-muted-foreground">{l('ບໍ່ມີວຽກ', 'ไม่มีงาน', 'No jobs')}</Card>
                ) : filteredJobs.map((job, idx) => {
                  const district = districts.find(d => d.id === job.district);
                  return (
                    <motion.div key={job.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }}>
                      <Card className={`p-4 ${job.status === 'cancelled' ? 'opacity-60' : ''}`}>
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <Link to={`/jobs/${job.id}`} className="font-semibold text-sm hover:text-primary">{job.title}</Link>
                              <Badge variant={job.post_type === 'hiring' ? 'default' : 'secondary'} className="text-[10px]">
                                {t(job.post_type === 'hiring' ? 'job.type.employer' : 'job.type.worker', language)}
                              </Badge>
                              {job.status === 'cancelled' && <Badge variant="destructive" className="text-[10px]">❌</Badge>}
                              {job.is_urgent && <Badge className="bg-red-600 text-[10px]">🔥</Badge>}
                              {job.is_featured && <Badge className="bg-purple-600 text-[10px]">⭐</Badge>}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {job.poster_name} • {district?.[language] || district?.lo} • {new Date(job.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex gap-1 flex-wrap justify-end">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8 text-xs gap-1"
                              title={job.status === 'active' ? l('ບັນ', 'ปิด', 'Disable') : l('ເປີດ', 'เปิด', 'Enable')}
                              onClick={() => handleToggleJobStatus(job)}
                            >
                              {job.status === 'active' ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8 text-xs gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                              title={l('ສົ່ງອອກ', 'ส่งออก', 'Export')}
                              onClick={() => exportJobsToCSV([job], `job-${job.id}.csv`)}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              className="h-8 text-xs gap-1"
                              title={l('ລຶບ', 'ลบ', 'Delete')}
                              onClick={() => handleDeleteJob(job.id, job.title)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* KYC Dialog */}
      {kycDialog && (
        <Dialog open={!!kycDialog} onOpenChange={() => setKycDialog(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" /> {l('ລາຍລະອຽດ KYC', 'รายละเอียด KYC', 'KYC Details')}
              </DialogTitle>
              <DialogDescription>{kycDialog.full_name || kycDialog.display_name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: l('ຊື່ເຕັມ', 'ชื่อเต็ม', 'Full Name'), value: kycDialog.full_name },
                  { label: l('ວັນເກີດ', 'วันเกิด', 'DOB'), value: kycDialog.date_of_birth },
                  { label: l('ເບີໂທ', 'เบอร์โทร', 'Phone'), value: kycDialog.phone },
                  { label: l('ເມືອງ', 'เมือง', 'District'), value: kycDialog.district ? (districts.find(d => d.id === kycDialog.district)?.[language] || kycDialog.district) : '—' },
                ].map((item, i) => (
                  <div key={i} className="bg-muted p-3 rounded">
                    <div className="text-xs text-muted-foreground">{item.label}</div>
                    <div className="font-semibold text-sm">{item.value || '—'}</div>
                  </div>
                ))}
                <div className="bg-muted p-3 rounded col-span-2">
                  <div className="text-xs text-muted-foreground">{l('ທີ່ຢູ່', 'ที่อยู่', 'Address')}</div>
                  <div className="font-semibold text-sm">{kycDialog.address || '—'}</div>
                </div>
                {kycDialog.is_student && (
                  <div className="bg-blue-50 p-3 rounded col-span-2 border border-blue-200">
                    <div className="text-xs text-blue-600">📚 {l('ນັກສຶກສາ', 'นักศึกษา', 'Student')}</div>
                  </div>
                )}
                {kycDialog.guardian_name && (
                  <div className="bg-orange-50 p-3 rounded col-span-2 border border-orange-200">
                    <div className="text-xs text-orange-600">{l('ຜູ້ປົກຄອງ', 'ผู้ปกครอง', 'Guardian')}</div>
                    <div className="font-semibold text-sm">{kycDialog.guardian_name} • {kycDialog.guardian_phone}</div>
                  </div>
                )}
              </div>
              {kycDialog.id_card_url && (
                <div>
                  <div className="text-sm font-semibold mb-2">{l('ບັດປະຈຳຕົວ', 'บัตรประจำตัว', 'ID Card')}</div>
                  <img src={kycDialog.id_card_url} alt="ID" className="rounded border w-full max-h-80 object-contain" />
                </div>
              )}
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setKycDialog(null)}>{l('ປິດ', 'ปิด', 'Close')}</Button>
              <Button className="bg-green-600 hover:bg-green-700 gap-1" onClick={() => handleKycAction(kycDialog.user_id, 'approved')}>
                <CheckCircle className="h-4 w-4" /> {l('ຢືນຢັນ', 'ยืนยัน', 'Approve')}
              </Button>
              <Button variant="destructive" onClick={() => handleKycAction(kycDialog.user_id, 'rejected')} className="gap-1">
                <XCircle className="h-4 w-4" /> {l('ປະຕິເສດ', 'ปฏิเสธ', 'Reject')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Coin Dialog */}
      {coinDialog && (
        <Dialog open={!!coinDialog} onOpenChange={() => setCoinDialog(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                {coinDialog.mode === 'add' ? l('ເພີ່ມ', 'เพิ่ม', 'Add') : l('ຫັກ', 'หัก', 'Deduct')} {l('ຫຼຽນ', 'เหรียญ', 'Coins')}
              </DialogTitle>
              <DialogDescription>{coinDialog.user.display_name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded text-center">
                <div className="text-sm text-muted-foreground mb-1">{l('ຍອດປະຈຸບັນ', 'ยอดปัจจุบัน', 'Current Balance')}</div>
                <div className="text-3xl font-bold">{coinDialog.user.coin_balance.toLocaleString()}₭</div>
              </div>
              <div>
                <label className="text-sm font-semibold mb-2 block">{l('ຈຳນວນ', 'จำนวน', 'Amount')}</label>
                <Input type="number" min="0" placeholder="0" value={coinAmount} onChange={e => setCoinAmount(e.target.value)} className="text-lg h-12" />
              </div>
              <div className="flex gap-2 flex-wrap">
                {[1000, 5000, 10000, 50000, 100000, 500000, 1000000].map(amt => (
                  <Button key={amt} variant="outline" size="sm" className="text-xs" onClick={() => setCoinAmount(String(amt))}>{amt >= 1000 ? `${(amt/1000)}K` : amt}</Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{l('1 ຫຼຽນ = 1 ກີບ (1,000 - 1,000,000)', '1 เหรียญ = 1 กีบ (1,000 - 1,000,000)', '1 coin = 1 KIP (1,000 - 1,000,000)')}</p>
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setCoinDialog(null)}>{l('ຍົກເລີກ', 'ยกเลิก', 'Cancel')}</Button>
              <Button
                className={coinDialog.mode === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                onClick={handleCoinTransaction}
                disabled={!coinAmount}
              >
                {coinDialog.mode === 'add' ? l('ເພີ່ມ', 'เพิ่ม', 'Add') : l('ຫັກ', 'หัก', 'Deduct')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

// Need categories for charts
import { categories as categories_data } from '@/lib/i18n';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default AdminPage;
