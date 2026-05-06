import { useState, useEffect } from 'react';
import { useAppStore, Job } from '@/lib/store';
import { useAuth } from '@/hooks/useAuth';
import { t, districts, categories as categories_data } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Trash2, Briefcase, Users, Coins, Search, ShieldCheck, Eye, CheckCircle, XCircle,
  Minus, Plus, BarChart3, LogOut, Home, Settings, Bell,
  UserCheck, Download, Lock, Unlock, Edit, History, UserX, Star, EyeOff, ShieldPlus
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Navigate, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Swal from 'sweetalert2';
import { formatCoins } from '@/lib/constants';

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

interface CoinTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
  admin_id: string | null;
}

interface ReviewRow {
  id: string;
  reviewer_id: string;
  reviewed_id: string;
  job_id: string | null;
  rating: number;
  comment: string | null;
  status: string;
  created_at: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#14b8a6'];

const exportJobsToCSV = (jobs: Job[], filename = 'jobs-export.csv') => {
  const headers = ['ID', 'Title', 'Category', 'District', 'Salary', 'Poster', 'Type', 'Status', 'Created', 'Urgent', 'Featured'];
  const rows = jobs.map(job => [job.id, `"${job.title}"`, job.category, job.district, job.salary, `"${job.poster_name}"`, job.post_type, job.status, new Date(job.created_at).toLocaleDateString(), job.is_urgent ? 'Yes' : 'No', job.is_featured ? 'Yes' : 'No']);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = window.URL.createObjectURL(blob);
  a.download = filename;
  a.click();
};

const AdminPage = () => {
  const { language } = useAppStore();
  const { user, signOut } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [adminRoles, setAdminRoles] = useState<{ user_id: string; created_at: string | null }[]>([]);
  const [addAdminDialog, setAddAdminDialog] = useState(false);
  const [addAdminUserId, setAddAdminUserId] = useState('');
  const [addAdminSearch, setAddAdminSearch] = useState('');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [kycDialog, setKycDialog] = useState<UserProfile | null>(null);
  const [coinDialog, setCoinDialog] = useState<{ user: UserProfile; mode: 'add' | 'deduct' } | null>(null);
  const [coinAmount, setCoinAmount] = useState('');
  const [editJobDialog, setEditJobDialog] = useState<Job | null>(null);
  const [editJobForm, setEditJobForm] = useState<Partial<Job>>({});
  const [searchUser, setSearchUser] = useState('');
  const [searchJob, setSearchJob] = useState('');
  const [jobStatusFilter, setJobStatusFilter] = useState<string>('all');
  const [kycFilter, setKycFilter] = useState<string>('all');
  const [txTypeFilter, setTxTypeFilter] = useState<string>('all');
  const [txDateFilter, setTxDateFilter] = useState<string>('all'); // all|today|7d|30d

  const l = (lo: string, th: string, en: string) => language === 'en' ? en : language === 'th' ? th : lo;

  useEffect(() => { if (user) checkAdmin(); }, [user]);

  const checkAdmin = async () => {
    const { data } = await supabase.rpc('has_role', { _user_id: user!.id, _role: 'admin' });
    setIsAdmin(!!data);
    if (data) { loadJobs(); loadUsers(); loadTransactions(); loadReviews(); loadAdmins(); }
  };

  const loadJobs = async () => {
    const { data } = await supabase.from('jobs').select('*').order('created_at', { ascending: false }).limit(200);
    setJobs((data as Job[]) || []);
  };

  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers((data as UserProfile[]) || []);
  };

  const loadTransactions = async () => {
    const { data } = await supabase.from('coin_transactions').select('*').order('created_at', { ascending: false }).limit(100);
    setTransactions((data as CoinTransaction[]) || []);
  };

  const loadReviews = async () => {
    const { data } = await supabase.from('reviews').select('*').order('created_at', { ascending: false }).limit(100);
    setReviews((data as ReviewRow[]) || []);
  };

  const loadAdmins = async () => {
    const { data } = await supabase.from('user_roles').select('user_id, created_at').eq('role', 'admin');
    setAdminRoles((data as any) || []);
  };

  const handleAddAdmin = async () => {
    if (!addAdminUserId) return;
    const { error } = await supabase.from('user_roles').insert({ user_id: addAdminUserId, role: 'admin' });
    if (error) {
      const msg = error.code === '23505'
        ? l('ຜູ້ໃຊ້ນີ້ເປັນ Admin ແລ້ວ', 'ผู้ใช้นี้เป็น Admin อยู่แล้ว', 'Already an admin')
        : error.message;
      Swal.fire({ icon: 'error', title: l('ລົ້ມເຫລວ', 'ล้มเหลว', 'Failed'), text: msg });
      return;
    }
    await supabase.from('notifications').insert({
      user_id: addAdminUserId,
      type: 'admin_granted',
      title: l('ທ່ານໄດ້ຮັບສິດ Admin 🛡️', 'คุณได้รับสิทธิ์ Admin 🛡️', 'You are now an Admin 🛡️'),
      body: l('ເຂົ້າ /admin ເພື່ອຈັດການລະບົບ', 'เข้า /admin เพื่อจัดการระบบ', 'Visit /admin to manage the system'),
    } as any);
    Swal.fire({ icon: 'success', title: l('ເພີ່ມ Admin ສຳເລັດ', 'เพิ่ม Admin สำเร็จ', 'Admin added'), timer: 1500, showConfirmButton: false });
    setAddAdminDialog(false); setAddAdminUserId(''); setAddAdminSearch('');
    loadAdmins();
  };

  const handleRemoveAdmin = async (targetUserId: string) => {
    if (targetUserId === user!.id) {
      Swal.fire({ icon: 'warning', title: l('ຖອດສິດຕົນເອງບໍ່ໄດ້', 'ถอดสิทธิ์ตัวเองไม่ได้', 'Cannot revoke your own role') });
      return;
    }
    const r = await Swal.fire({
      icon: 'warning',
      title: l('ຖອດສິດ Admin?', 'ถอดสิทธิ์ Admin?', 'Revoke admin?'),
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: l('ຖອດສິດ', 'ถอดสิทธิ์', 'Revoke'),
    });
    if (!r.isConfirmed) return;
    const { error } = await supabase.from('user_roles').delete().eq('user_id', targetUserId).eq('role', 'admin');
    if (error) {
      Swal.fire({ icon: 'error', title: l('ລົ້ມເຫລວ', 'ล้มเหลว', 'Failed'), text: error.message });
      return;
    }
    toast.success(l('ຖອດສິດແລ້ວ', 'ถอดสิทธิ์แล้ว', 'Revoked'));
    loadAdmins();
  };

  const handleSetReviewStatus = async (id: string, status: 'approved' | 'hidden') => {
    const { error } = await supabase.from('reviews').update({ status } as any).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success(l('ອັບເດດແລ້ວ', 'อัปเดตแล้ว', 'Updated'));
    loadReviews();
  };

  const handleDeleteReview = async (id: string) => {
    const r = await Swal.fire({ icon: 'warning', title: l('ລຶບລີວິວ?', 'ลบรีวิว?', 'Delete review?'), showCancelButton: true, confirmButtonColor: '#ef4444' });
    if (!r.isConfirmed) return;
    const { error } = await supabase.from('reviews').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success(l('ລຶບແລ້ວ', 'ลบแล้ว', 'Deleted')); loadReviews(); }
  };

  const handleDeleteJob = async (id: string, title: string) => {
    const r = await Swal.fire({ icon: 'warning', title: l('ລຶບວຽກ?', 'ลบงาน?', 'Delete job?'), text: title, showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: l('ລຶບ', 'ลบ', 'Delete') });
    if (!r.isConfirmed) return;
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

  const handleEditJob = (job: Job) => {
    setEditJobDialog(job);
    setEditJobForm({ title: job.title, description: job.description, salary: job.salary, category: job.category, district: job.district, is_urgent: job.is_urgent, is_featured: job.is_featured });
  };

  const handleSaveEditJob = async () => {
    if (!editJobDialog) return;
    const { error } = await supabase.from('jobs').update(editJobForm as any).eq('id', editJobDialog.id);
    if (error) toast.error(error.message);
    else { toast.success(l('ບັນທຶກແລ້ວ', 'บันทึกแล้ว', 'Saved')); setEditJobDialog(null); loadJobs(); }
  };

  const handleDeleteUser = async (u: UserProfile) => {
    const r = await Swal.fire({
      icon: 'warning',
      title: l('ລຶບຜູ້ໃຊ້?', 'ลบผู้ใช้?', 'Delete user?'),
      text: `${u.display_name} (${u.phone || u.full_name || ''})`,
      html: l('ການລຶບຈະລົບໂປຣໄຟລ໌ ແລະ ຂໍ້ມູນທັງໝົດ', 'การลบจะลบโปรไฟล์และข้อมูลทั้งหมด', 'This will delete the profile and all related data'),
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: l('ລຶບ', 'ลบ', 'Delete'),
    });
    if (!r.isConfirmed) return;
    // Delete profile (cascading will handle related data)
    const { error } = await supabase.from('profiles').delete().eq('user_id', u.user_id);
    if (error) toast.error(error.message);
    else { toast.success(l('ລຶບແລ້ວ', 'ลบแล้ว', 'Deleted')); loadUsers(); }
  };

  const handleKycAction = async (targetUserId: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase.rpc('admin_update_kyc', { _target_user_id: targetUserId, _status: status } as any);
    if (error) toast.error(error.message);
    else {
      // Send notification
      await supabase.from('notifications').insert({
        user_id: targetUserId,
        type: status === 'approved' ? 'kyc_approved' : 'kyc_rejected',
        title: status === 'approved' ? l('ບັນຊີຢືນຢັນແລ້ວ! 🎉', 'ยืนยันตัวตนสำเร็จ! 🎉', 'Account Verified! 🎉') : l('ການຢືນຢັນຖືກປະຕິເສດ', 'การยืนยันถูกปฏิเสธ', 'Verification Rejected'),
        body: status === 'approved' ? l('ທ່ານສາມາດໃຊ້ງານທຸກຟີເຈີໄດ້ແລ້ວ', 'คุณสามารถใช้งานทุกฟีเจอร์ได้แล้ว', 'You can now use all features') : l('ກະລຸນາສົ່ງເອກະສານໃໝ່', 'กรุณาส่งเอกสารใหม่', 'Please resubmit your documents'),
      } as any);
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
    const { data, error } = await supabase.rpc('admin_topup_coins', {
      _to_user_id: coinDialog.user.user_id,
      _amount: finalAmount,
      _description: `Admin ${coinDialog.mode === 'add' ? 'top-up' : 'deduction'}: ${amount.toLocaleString()}₭`,
    });
    if (error) {
      Swal.fire({ icon: 'error', title: l('ລົ້ມເຫລວ', 'ล้มเหลว', 'Failed'), text: error.message });
      return;
    }
    const result = data as any;
    if (!result?.success) {
      const errMsg = result?.error === 'Insufficient balance'
        ? l(`ຫຼຽນບໍ່ພໍ (ຍອດ: ${result.balance?.toLocaleString()}₭)`, `เหรียญไม่พอ (ยอด: ${result.balance?.toLocaleString()}₭)`, `Insufficient balance (current: ${result.balance?.toLocaleString()}₭)`)
        : result?.error || 'Unknown error';
      Swal.fire({ icon: 'error', title: l('ລົ້ມເຫລວ', 'ล้มเหลว', 'Failed'), text: errMsg });
      return;
    }
    Swal.fire({
      icon: 'success',
      title: coinDialog.mode === 'add' ? l('ເຕີມສຳເລັດ ✅', 'เติมสำเร็จ ✅', 'Top-up successful ✅') : l('ຫັກສຳເລັດ ✅', 'หักสำเร็จ ✅', 'Deducted ✅'),
      html: `<div class="text-2xl font-bold ${coinDialog.mode === 'add' ? 'text-green-600' : 'text-red-600'}">${coinDialog.mode === 'add' ? '+' : '-'}${amount.toLocaleString()}₭</div><div class="text-sm text-muted-foreground mt-2">${l('ຍອດໃໝ່', 'ยอดใหม่', 'New balance')}: ${result.new_balance?.toLocaleString()}₭</div>`,
      timer: 2500,
      showConfirmButton: false,
    });
    setCoinDialog(null); setCoinAmount(''); loadUsers(); loadTransactions();
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

  const totalCoins = users.reduce((s, u) => s + u.coin_balance, 0);
  const activeJobs = jobs.filter(j => j.status === 'active').length;
  const kycApproved = users.filter(u => u.kyc_status === 'approved').length;

  const jobsByCategory = categories_data.map(cat => ({
    name: t(`cat.${cat.id}` as any, language),
    count: jobs.filter(j => j.category === cat.id).length,
  })).filter(d => d.count > 0);

  const kycPieData = [
    { name: l('ຢືນຢັນແລ້ວ', 'ยืนยันแล้ว', 'Approved'), value: users.filter(u => u.kyc_status === 'approved').length },
    { name: l('ລໍຖ້າ', 'รอ', 'Pending'), value: users.filter(u => u.kyc_status === 'pending').length },
    { name: l('ປະຕິເສດ', 'ปฏิเสธ', 'Rejected'), value: users.filter(u => u.kyc_status === 'rejected').length },
  ].filter(d => d.value > 0);

  const getUserName = (userId: string) => users.find(u => u.user_id === userId)?.display_name || userId.slice(0, 8);

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 bg-card border-r flex-col">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-primary flex items-center gap-2"><Settings className="h-5 w-5" /> Admin</h1>
          <p className="text-xs text-muted-foreground mt-1">{l('ລະບົບຫຼັງບ້ານ', 'ระบบหลังบ้าน', 'Admin Dashboard')}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link to="/"><Button variant="ghost" className="w-full justify-start gap-2"><Home className="h-4 w-4" /> {l('ໜ້າຫຼັກ', 'หน้าแรก', 'Home')}</Button></Link>
        </nav>
        <div className="p-4 border-t">
          <Button variant="ghost" className="w-full justify-start gap-2 text-destructive" onClick={signOut}><LogOut className="h-4 w-4" /> {l('ອອກ', 'ออก', 'Logout')}</Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="bg-card border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-bold">{l('ແຜງຄວບຄຸມ', 'แผงควบคุม', 'Dashboard')}</h2>
            <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString(language === 'th' ? 'th-TH' : language === 'en' ? 'en-US' : 'lo-LA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="flex items-center gap-3">
            {pendingKyc.length > 0 && <Badge className="bg-orange-500 gap-1 animate-pulse"><Bell className="h-3 w-3" /> {pendingKyc.length} KYC</Badge>}
            <Link to="/" className="lg:hidden"><Button variant="outline" size="sm"><Home className="h-4 w-4" /></Button></Link>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Stats */}
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
                    <div className={`p-2 rounded-lg ${stat.color}`}><stat.icon className="h-5 w-5" /></div>
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
              <h3 className="font-semibold mb-3 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> {l('ວຽກຕາມໝວດ', 'งานตามหมวด', 'Jobs by Category')}</h3>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={jobsByCategory}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis /><Tooltip /><Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /></BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> {l('ສະຖານະ KYC', 'สถานะ KYC', 'KYC Status')}</h3>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={kycPieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>{kycPieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}</Pie><Tooltip /></PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue={pendingKyc.length > 0 ? 'kyc' : 'users'} className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="users" className="gap-2"><Users className="h-4 w-4" /> {l('ຜູ້ໃຊ້', 'ผู้ใช้', 'Users')} ({users.length})</TabsTrigger>
              <TabsTrigger value="kyc" className="gap-2 relative">
                <ShieldCheck className="h-4 w-4" /> KYC
                {pendingKyc.length > 0 && <span className="bg-orange-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center ml-1">{pendingKyc.length}</span>}
              </TabsTrigger>
              <TabsTrigger value="jobs" className="gap-2"><Briefcase className="h-4 w-4" /> {l('ວຽກ', 'งาน', 'Jobs')} ({jobs.length})</TabsTrigger>
              <TabsTrigger value="transactions" className="gap-2"><History className="h-4 w-4" /> {l('ປະຫວັດ', 'ประวัติ', 'History')}</TabsTrigger>
              <TabsTrigger value="reviews" className="gap-2"><Star className="h-4 w-4" /> {l('ລີວິວ', 'รีวิว', 'Reviews')} ({reviews.length})</TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder={l('ຄົ້ນຫາ...', 'ค้นหา...', 'Search...')} value={searchUser} onChange={e => setSearchUser(e.target.value)} className="pl-10" />
                </div>
                <Select value={kycFilter} onValueChange={setKycFilter}>
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
                          <Badge className={`text-xs ${u.kyc_status === 'approved' ? 'bg-green-600' : u.kyc_status === 'rejected' ? 'bg-red-600' : 'bg-yellow-600'}`}>{u.kyc_status}</Badge>
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
                          <Button size="sm" variant="outline" className="h-8 gap-1 text-red-600 border-red-300 hover:bg-red-50" onClick={() => handleDeleteUser(u)}>
                            <UserX className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            {/* KYC Tab */}
            <TabsContent value="kyc" className="space-y-2">
              {pendingKyc.length === 0 ? (
                <Card className="p-12 text-center"><CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" /><p className="text-muted-foreground">{l('ບໍ່ມີ KYC ລໍຖ້າ', 'ไม่มี KYC รอ', 'No pending KYC')}</p></Card>
              ) : pendingKyc.map((u, idx) => (
                <motion.div key={u.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}>
                  <Card className="p-4 border-l-4 border-l-orange-500">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-10 w-10"><AvatarImage src={u.avatar_url || ''} /><AvatarFallback>{(u.display_name || '?')[0].toUpperCase()}</AvatarFallback></Avatar>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm">{u.full_name || u.display_name || '—'}</div>
                          <div className="text-xs text-muted-foreground">
                            {u.phone || '—'} • {u.date_of_birth || '—'}
                            {u.is_student && <Badge variant="secondary" className="ml-1 text-[10px]">📚 {l('ນັກສຶກສາ', 'นักศึกษา', 'Student')}</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setKycDialog(u)} className="gap-1 h-8"><Eye className="h-3 w-3" /> {l('ເບິ່ງ', 'ดู', 'View')}</Button>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-1 h-8" onClick={() => handleKycAction(u.user_id, 'approved')}><CheckCircle className="h-3 w-3" /></Button>
                        <Button size="sm" variant="destructive" onClick={() => handleKycAction(u.user_id, 'rejected')} className="gap-1 h-8"><XCircle className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </TabsContent>

            {/* Jobs Tab */}
            <TabsContent value="jobs" className="space-y-4">
              <div className="flex gap-2 flex-wrap items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder={l('ຄົ້ນຫາວຽກ...', 'ค้นหางาน...', 'Search jobs...')} value={searchJob} onChange={e => setSearchJob(e.target.value)} className="pl-10" />
                </div>
                <Select value={jobStatusFilter} onValueChange={setJobStatusFilter}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{l('ທັງໝົດ', 'ทั้งหมด', 'All')}</SelectItem>
                    <SelectItem value="active">✅ Active</SelectItem>
                    <SelectItem value="accepted">🤝 Accepted</SelectItem>
                    <SelectItem value="completed">✅ Completed</SelectItem>
                    <SelectItem value="cancelled">❌ Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" className="gap-2" onClick={() => exportJobsToCSV(filteredJobs)} disabled={filteredJobs.length === 0}>
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
                      <Card className={`p-4 ${job.status !== 'active' ? 'opacity-70' : ''}`}>
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <Link to={`/jobs/${job.id}`} className="font-semibold text-sm hover:text-primary">{job.title}</Link>
                              <Badge variant={job.post_type === 'hiring' ? 'default' : 'secondary'} className="text-[10px]">{t(job.post_type === 'hiring' ? 'job.type.employer' : 'job.type.worker', language)}</Badge>
                              <Badge variant="outline" className="text-[10px]">{job.status}</Badge>
                              {job.is_urgent && <Badge className="bg-red-600 text-[10px]">🔥</Badge>}
                              {job.is_featured && <Badge className="bg-purple-600 text-[10px]">⭐</Badge>}
                            </div>
                            <div className="text-xs text-muted-foreground">{job.poster_name} • {district?.[language] || district?.lo} • {Number(job.salary).toLocaleString()}₭</div>
                          </div>
                          <div className="flex gap-1 flex-wrap justify-end">
                            <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleEditJob(job)}><Edit className="h-3 w-3" /></Button>
                            <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleToggleJobStatus(job)}>
                              {job.status === 'active' ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                            </Button>
                            <Button size="sm" variant="destructive" className="h-8 text-xs gap-1" onClick={() => handleDeleteJob(job.id, job.title)}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </TabsContent>

            {/* Transactions Tab */}
            <TabsContent value="transactions" className="space-y-2">
              <div className="flex gap-2 flex-wrap">
                <Select value={txTypeFilter} onValueChange={setTxTypeFilter}>
                  <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{l('ທຸກປະເພດ', 'ทุกประเภท', 'All types')}</SelectItem>
                    <SelectItem value="admin_topup">📥 {l('ເຕີມໂດຍແອັດມິນ', 'แอดมินเติม', 'Admin top-up')}</SelectItem>
                    <SelectItem value="admin_deduct">📤 {l('ຫັກໂດຍແອັດມິນ', 'แอดมินหัก', 'Admin deduct')}</SelectItem>
                    <SelectItem value="job_payment">💼 {l('ຈ່າຍຄ່າງານ', 'จ่ายค่างาน', 'Job payment')}</SelectItem>
                    <SelectItem value="transfer">🔄 {l('ໂອນ', 'โอน', 'Transfer')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={txDateFilter} onValueChange={setTxDateFilter}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{l('ທຸກເວລາ', 'ทุกเวลา', 'All time')}</SelectItem>
                    <SelectItem value="today">{l('ມື້ນີ້', 'วันนี้', 'Today')}</SelectItem>
                    <SelectItem value="7d">{l('7 ມື້', '7 วัน', 'Last 7d')}</SelectItem>
                    <SelectItem value="30d">{l('30 ມື້', '30 วัน', 'Last 30d')}</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant="outline" className="ml-auto self-center">
                  {(() => {
                    const now = Date.now();
                    const filtered = transactions.filter(tx => {
                      if (txTypeFilter !== 'all' && tx.type !== txTypeFilter) return false;
                      if (txDateFilter !== 'all') {
                        const age = now - new Date(tx.created_at).getTime();
                        const limit = txDateFilter === 'today' ? 86400000 : txDateFilter === '7d' ? 7 * 86400000 : 30 * 86400000;
                        if (age > limit) return false;
                      }
                      return true;
                    });
                    return `${filtered.length} ${l('ລາຍການ', 'รายการ', 'items')}`;
                  })()}
                </Badge>
              </div>
              {(() => {
                const now = Date.now();
                const filteredTx = transactions.filter(tx => {
                  if (txTypeFilter !== 'all' && tx.type !== txTypeFilter) return false;
                  if (txDateFilter !== 'all') {
                    const age = now - new Date(tx.created_at).getTime();
                    const limit = txDateFilter === 'today' ? 86400000 : txDateFilter === '7d' ? 7 * 86400000 : 30 * 86400000;
                    if (age > limit) return false;
                  }
                  return true;
                });
                return filteredTx.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">{l('ບໍ່ມີປະຫວັດ', 'ไม่มีประวัติ', 'No transactions')}</Card>
              ) : <>{filteredTx.map((tx, idx) => (
                <motion.div key={tx.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }}>
                  <Card className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className={`text-lg ${tx.amount > 0 ? '' : ''}`}>{tx.amount > 0 ? '📥' : '📤'}</span>
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{getUserName(tx.user_id)}</div>
                          <div className="text-xs text-muted-foreground truncate">{tx.description || tx.type}</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`font-bold text-sm ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}₭
                        </div>
                        <div className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}</>;
              })()}
            </TabsContent>

            {/* Reviews moderation */}
            <TabsContent value="reviews" className="space-y-2">
              {reviews.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">{l('ບໍ່ມີລີວິວ', 'ไม่มีรีวิว', 'No reviews')}</Card>
              ) : reviews.map(r => (
                <Card key={r.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <div className="flex">
                          {[1,2,3,4,5].map(i => <Star key={i} className={`h-4 w-4 ${i <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />)}
                        </div>
                        <Badge variant={r.status === 'approved' ? 'default' : r.status === 'hidden' ? 'destructive' : 'secondary'} className="text-[10px]">{r.status}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mb-1">
                        {getUserName(r.reviewer_id)} → {getUserName(r.reviewed_id)} • {new Date(r.created_at).toLocaleString()}
                      </div>
                      {r.comment && <p className="text-sm">{r.comment}</p>}
                    </div>
                    <div className="flex gap-1">
                      {r.status !== 'approved' && (
                        <Button size="sm" variant="outline" className="h-8 gap-1 text-green-600" onClick={() => handleSetReviewStatus(r.id, 'approved')}>
                          <CheckCircle className="h-3 w-3" />
                        </Button>
                      )}
                      {r.status !== 'hidden' && (
                        <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => handleSetReviewStatus(r.id, 'hidden')}>
                          <EyeOff className="h-3 w-3" />
                        </Button>
                      )}
                      <Button size="sm" variant="destructive" className="h-8 gap-1" onClick={() => handleDeleteReview(r.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* KYC Dialog */}
      {kycDialog && (
        <Dialog open={!!kycDialog} onOpenChange={() => setKycDialog(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> {l('ລາຍລະອຽດ KYC', 'รายละเอียด KYC', 'KYC Details')}</DialogTitle>
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
              <Button className="bg-green-600 hover:bg-green-700 gap-1" onClick={() => handleKycAction(kycDialog.user_id, 'approved')}><CheckCircle className="h-4 w-4" /> {l('ຢືນຢັນ', 'ยืนยัน', 'Approve')}</Button>
              <Button variant="destructive" onClick={() => handleKycAction(kycDialog.user_id, 'rejected')} className="gap-1"><XCircle className="h-4 w-4" /> {l('ປະຕິເສດ', 'ปฏิเสธ', 'Reject')}</Button>
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
                  <Button key={amt} variant="outline" size="sm" className="text-xs" onClick={() => setCoinAmount(String(amt))}>{amt.toLocaleString()}₭</Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{l('1 ຫຼຽນ = 1 ກີບ (1,000 - 1,000,000)', '1 เหรียญ = 1 กีบ (1,000 - 1,000,000)', '1 coin = 1 KIP (1,000 - 1,000,000)')}</p>
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setCoinDialog(null)}>{l('ຍົກເລີກ', 'ยกเลิก', 'Cancel')}</Button>
              <Button className={coinDialog.mode === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} onClick={handleCoinTransaction} disabled={!coinAmount}>
                {coinDialog.mode === 'add' ? l('ເພີ່ມ', 'เพิ่ม', 'Add') : l('ຫັກ', 'หัก', 'Deduct')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Job Dialog */}
      {editJobDialog && (
        <Dialog open={!!editJobDialog} onOpenChange={() => setEditJobDialog(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Edit className="h-5 w-5" /> {l('ແກ້ໄຂວຽກ', 'แก้ไขงาน', 'Edit Job')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold mb-1 block">{l('ຫົວຂໍ້', 'หัวข้อ', 'Title')}</label>
                <Input value={editJobForm.title || ''} onChange={e => setEditJobForm({ ...editJobForm, title: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">{l('ລາຍລະອຽດ', 'รายละเอียด', 'Description')}</label>
                <Textarea value={editJobForm.description || ''} onChange={e => setEditJobForm({ ...editJobForm, description: e.target.value })} rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold mb-1 block">{l('ຄ່າຕອບແທນ', 'ค่าตอบแทน', 'Salary')}</label>
                  <Input type="number" value={editJobForm.salary || ''} onChange={e => setEditJobForm({ ...editJobForm, salary: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1 block">{l('ໝວດໝູ່', 'หมวดหมู่', 'Category')}</label>
                  <Select value={editJobForm.category || ''} onValueChange={v => setEditJobForm({ ...editJobForm, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories_data.map(cat => (<SelectItem key={cat.id} value={cat.id}>{cat.icon} {t(`cat.${cat.id}` as any, language)}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold mb-1 block">{l('ເມືອງ', 'เมือง', 'District')}</label>
                  <Select value={editJobForm.district || ''} onValueChange={v => setEditJobForm({ ...editJobForm, district: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {districts.map(d => (<SelectItem key={d.id} value={d.id}>{d[language] || d.lo}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 pt-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={editJobForm.is_urgent || false} onChange={e => setEditJobForm({ ...editJobForm, is_urgent: e.target.checked })} />
                    🔥 {l('ດ່ວນ', 'ด่วน', 'Urgent')}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={editJobForm.is_featured || false} onChange={e => setEditJobForm({ ...editJobForm, is_featured: e.target.checked })} />
                    ⭐ {l('ແນະນຳ', 'แนะนำ', 'Featured')}
                  </label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditJobDialog(null)}>{l('ຍົກເລີກ', 'ยกเลิก', 'Cancel')}</Button>
              <Button onClick={handleSaveEditJob}>{l('ບັນທຶກ', 'บันทึก', 'Save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AdminPage;
