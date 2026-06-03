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
  UserCheck, Download, Lock, Unlock, Edit, History, UserX, Star, EyeOff, ShieldPlus, FileText,
  Tag, Megaphone, Database, DollarSign, Workflow, Bot
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Navigate, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Swal from 'sweetalert2';
import { formatCoins } from '@/lib/constants';
import { ContextDiagram } from '@/components/admin/ContextDiagram';
import { DatabaseExplorer } from '@/components/admin/DatabaseExplorer';
import { AdminAIAssistant } from '@/components/admin/AdminAIAssistant';

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

interface AuditLogRow {
  id: string;
  action: string;
  target_table: string | null;
  target_id: string | null;
  old_value: any;
  new_value: any;
  user_id: string | null;
  created_at: string | null;
}

interface ServiceRow {
  id: string;
  name: string;
  base_price: number;
  active: boolean | null;
  created_at: string | null;
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

// Generic CSV exporter — handles any array of objects
const exportToCSV = (rows: any[], filename: string) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
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
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);
  const [auditTableFilter, setAuditTableFilter] = useState<string>('all');
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [serviceDialog, setServiceDialog] = useState<ServiceRow | 'new' | null>(null);
  const [serviceForm, setServiceForm] = useState<{ name: string; base_price: number; active: boolean }>({ name: '', base_price: 0, active: true });
  const [broadcastDialog, setBroadcastDialog] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState<{ title: string; body: string; target: 'all' | 'kyc_approved' | 'kyc_pending' }>({ title: '', body: '', target: 'all' });
  const [editUserDialog, setEditUserDialog] = useState<UserProfile | null>(null);
  const [editUserForm, setEditUserForm] = useState<Partial<UserProfile>>({});
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
    if (data) { loadJobs(); loadUsers(); loadTransactions(); loadReviews(); loadAdmins(); loadAuditLogs(); loadServices(); }
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

  const loadAuditLogs = async () => {
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    setAuditLogs((data as AuditLogRow[]) || []);
  };

  const loadServices = async () => {
    const { data } = await supabase.from('services').select('*').order('created_at', { ascending: false });
    setServices((data as ServiceRow[]) || []);
  };

  // === Service / Category management ===
  const openServiceDialog = (svc: ServiceRow | 'new') => {
    setServiceDialog(svc);
    if (svc === 'new') setServiceForm({ name: '', base_price: 0, active: true });
    else setServiceForm({ name: svc.name, base_price: svc.base_price, active: svc.active ?? true });
  };
  const handleSaveService = async () => {
    if (!serviceForm.name.trim()) { toast.error(l('ໃສ່ຊື່', 'กรอกชื่อ', 'Enter name')); return; }
    if (serviceDialog === 'new') {
      const { error } = await supabase.from('services').insert(serviceForm as any);
      if (error) { toast.error(error.message); return; }
    } else if (serviceDialog) {
      const { error } = await supabase.from('services').update(serviceForm as any).eq('id', serviceDialog.id);
      if (error) { toast.error(error.message); return; }
    }
    toast.success(l('ບັນທຶກແລ້ວ', 'บันทึกแล้ว', 'Saved'));
    setServiceDialog(null);
    loadServices();
  };
  const handleDeleteService = async (svc: ServiceRow) => {
    const r = await Swal.fire({ icon: 'warning', title: l('ລຶບ?', 'ลบ?', 'Delete?'), text: svc.name, showCancelButton: true, confirmButtonColor: '#ef4444' });
    if (!r.isConfirmed) return;
    const { error } = await supabase.from('services').delete().eq('id', svc.id);
    if (error) toast.error(error.message);
    else { toast.success(l('ລຶບແລ້ວ', 'ลบแล้ว', 'Deleted')); loadServices(); }
  };

  // === Broadcast notification ===
  const handleBroadcast = async () => {
    if (!broadcastForm.title.trim()) { toast.error(l('ໃສ່ຫົວຂໍ້', 'กรอกหัวข้อ', 'Enter title')); return; }
    let targets = users;
    if (broadcastForm.target === 'kyc_approved') targets = users.filter(u => u.kyc_status === 'approved');
    else if (broadcastForm.target === 'kyc_pending') targets = users.filter(u => u.kyc_status === 'pending');
    if (!targets.length) { toast.error(l('ບໍ່ມີຜູ້ຮັບ', 'ไม่มีผู้รับ', 'No recipients')); return; }
    const r = await Swal.fire({
      icon: 'question',
      title: l(`ສົ່ງຫາ ${targets.length} ຄົນ?`, `ส่งหา ${targets.length} คน?`, `Send to ${targets.length} users?`),
      showCancelButton: true, confirmButtonText: l('ສົ່ງ', 'ส่ง', 'Send'),
    });
    if (!r.isConfirmed) return;
    const rows = targets.map(u => ({ user_id: u.user_id, title: broadcastForm.title, body: broadcastForm.body, type: 'broadcast', sender_id: user!.id }));
    // chunk to avoid payload limits
    for (let i = 0; i < rows.length; i += 200) {
      const slice = rows.slice(i, i + 200);
      const { error } = await supabase.from('notifications').insert(slice as any);
      if (error) { toast.error(error.message); return; }
    }
    Swal.fire({ icon: 'success', title: l('ສົ່ງສຳເລັດ', 'ส่งสำเร็จ', 'Sent'), timer: 1800, showConfirmButton: false });
    setBroadcastDialog(false);
    setBroadcastForm({ title: '', body: '', target: 'all' });
  };

  // === Full user edit ===
  const openEditUser = (u: UserProfile) => {
    setEditUserDialog(u);
    setEditUserForm({
      display_name: u.display_name, phone: u.phone, full_name: u.full_name,
      district: u.district, address: u.address, kyc_status: u.kyc_status,
      is_student: u.is_student, guardian_name: u.guardian_name, guardian_phone: u.guardian_phone,
      date_of_birth: u.date_of_birth,
    });
  };
  const handleSaveUser = async () => {
    if (!editUserDialog) return;
    const { error } = await supabase.from('profiles').update(editUserForm as any).eq('user_id', editUserDialog.user_id);
    if (error) { toast.error(error.message); return; }
    toast.success(l('ບັນທຶກແລ້ວ', 'บันทึกแล้ว', 'Saved'));
    setEditUserDialog(null);
    loadUsers();
  };

  // Single-admin model: instead of adding, we TRANSFER the admin role to another user.
  const handleTransferAdmin = async () => {
    if (!addAdminUserId) return;
    const confirm = await Swal.fire({
      icon: 'warning',
      title: l('ໂອນສິດ Admin?', 'โอนสิทธิ์ Admin?', 'Transfer admin?'),
      text: l('ຫຼັງຈາກໂອນ ທ່ານຈະບໍ່ແມ່ນ Admin ອີກຕໍ່ໄປ', 'หลังโอนคุณจะไม่ใช่ Admin อีกต่อไป', 'After transfer you will no longer be admin'),
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: l('ໂອນສິດ', 'โอน', 'Transfer'),
    });
    if (!confirm.isConfirmed) return;
    const { data, error } = await supabase.rpc('transfer_admin' as any, { _to_user_id: addAdminUserId } as any);
    if (error) {
      Swal.fire({ icon: 'error', title: l('ລົ້ມເຫລວ', 'ล้มเหลว', 'Failed'), text: error.message });
      return;
    }
    const result = data as any;
    if (!result?.success) {
      Swal.fire({ icon: 'error', title: l('ລົ້ມເຫລວ', 'ล้มเหลว', 'Failed'), text: result?.error || 'Unknown' });
      return;
    }
    Swal.fire({
      icon: 'success',
      title: l('ໂອນສິດສຳເລັດ', 'โอนสำเร็จ', 'Transferred'),
      text: l('ກຳລັງອອກຈາກລະບົບ...', 'กำลังออกจากระบบ...', 'Signing out...'),
      timer: 1800, showConfirmButton: false,
    });
    setAddAdminDialog(false); setAddAdminUserId(''); setAddAdminSearch('');
    setTimeout(async () => { await signOut(); window.location.href = '/admin-login'; }, 1800);
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
  // Non-admin users are auto-redirected to the admin login screen — no admin UI is ever rendered for them
  if (!isAdmin) return <Navigate to="/admin-login" replace />;

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
  const completedJobs = jobs.filter(j => j.status === 'completed').length;
  const acceptedJobs = jobs.filter(j => j.status === 'accepted').length;
  const escrowHeld = jobs.filter(j => j.status === 'accepted').reduce((s, j: any) => s + (j.escrow_amount || 0), 0);
  const totalRevenue = jobs.filter(j => j.status === 'completed').reduce((s, j) => s + (parseInt(j.salary as any) || 0), 0);

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
          {/* Admin area is isolated from the public site — no link back to "/" */}
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
            <Button variant="outline" size="sm" onClick={signOut} className="gap-1">
              <LogOut className="h-4 w-4" /> {l('ອອກ', 'ออก', 'Sign out')}
            </Button>
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
              { icon: CheckCircle, label: l('ວຽກສຳເລັດ', 'งานเสร็จ', 'Completed'), value: completedJobs, color: 'text-emerald-600 bg-emerald-100' },
              { icon: History, label: l('ກຳລັງເຮັດ', 'กำลังทำ', 'In Progress'), value: acceptedJobs, color: 'text-blue-600 bg-blue-100' },
              { icon: Lock, label: l('ເງິນພັກ (Escrow)', 'เงินพัก (Escrow)', 'Escrow Held'), value: escrowHeld.toLocaleString() + '₭', color: 'text-orange-600 bg-orange-100' },
              { icon: DollarSign, label: l('ລາຍຮັບລວມ', 'รายได้รวม', 'Revenue'), value: totalRevenue.toLocaleString() + '₭', color: 'text-pink-600 bg-pink-100' },
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
            <TabsList className="grid w-full grid-cols-3 md:grid-cols-9">
              <TabsTrigger value="users" className="gap-2"><Users className="h-4 w-4" /> {l('ຜູ້ໃຊ້', 'ผู้ใช้', 'Users')} ({users.length})</TabsTrigger>
              <TabsTrigger value="kyc" className="gap-2 relative">
                <ShieldCheck className="h-4 w-4" /> KYC
                {pendingKyc.length > 0 && <span className="bg-orange-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center ml-1">{pendingKyc.length}</span>}
              </TabsTrigger>
              <TabsTrigger value="jobs" className="gap-2"><Briefcase className="h-4 w-4" /> {l('ວຽກ', 'งาน', 'Jobs')} ({jobs.length})</TabsTrigger>
              <TabsTrigger value="services" className="gap-2"><Tag className="h-4 w-4" /> {l('ບໍລິການ', 'บริการ', 'Services')}</TabsTrigger>
              <TabsTrigger value="broadcast" className="gap-2"><Megaphone className="h-4 w-4" /> {l('ສົ່ງຂ່າວ', 'ส่งข่าว', 'Broadcast')}</TabsTrigger>
              <TabsTrigger value="transactions" className="gap-2"><History className="h-4 w-4" /> {l('ປະຫວັດ', 'ประวัติ', 'History')}</TabsTrigger>
              <TabsTrigger value="reviews" className="gap-2"><Star className="h-4 w-4" /> {l('ລີວິວ', 'รีวิว', 'Reviews')} ({reviews.length})</TabsTrigger>
              <TabsTrigger value="admins" className="gap-2"><ShieldPlus className="h-4 w-4" /> Admin</TabsTrigger>
              <TabsTrigger value="audit" className="gap-2"><FileText className="h-4 w-4" /> {l('ບັນທຶກ', 'บันทึก', 'Audit')}</TabsTrigger>
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
                <Button size="sm" variant="outline" className="gap-2" onClick={() => exportToCSV(filteredUsers, 'users-export.csv')} disabled={!filteredUsers.length}>
                  <Download className="h-4 w-4" /> CSV
                </Button>
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
                          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => openEditUser(u)}>
                            <Edit className="h-3 w-3" />
                          </Button>
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
                <Button size="sm" variant="outline" className="gap-2" onClick={() => exportToCSV(transactions, 'transactions-export.csv')} disabled={!transactions.length}>
                  <Download className="h-4 w-4" /> CSV
                </Button>
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
              <div className="flex justify-end">
                <Button size="sm" variant="outline" className="gap-2" onClick={() => exportToCSV(reviews, 'reviews-export.csv')} disabled={!reviews.length}>
                  <Download className="h-4 w-4" /> CSV
                </Button>
              </div>
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

            {/* Admins Tab */}
            <TabsContent value="admins" className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {l('ມີ Admin ໄດ້ສູງສຸດ 1 ຄົນ — ໃຊ້ປຸ່ມ "ໂອນສິດ" ເພື່ອປ່ຽນເຈົ້າຂອງ', 'มี Admin ได้สูงสุด 1 คน — ใช้ปุ่ม "โอนสิทธิ์" เพื่อเปลี่ยนเจ้าของ', 'Only one admin allowed — use Transfer to hand over the role')}
                </p>
                <Button size="sm" onClick={() => setAddAdminDialog(true)} className="gap-2">
                  <ShieldPlus className="h-4 w-4" /> {l('ໂອນສິດ Admin', 'โอนสิทธิ์ Admin', 'Transfer Admin')}
                </Button>
              </div>
              {adminRoles.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">{l('ບໍ່ມີ Admin', 'ไม่มี Admin', 'No admins')}</Card>
              ) : adminRoles.map(role => {
                const u = users.find(x => x.user_id === role.user_id);
                const isMe = role.user_id === user!.id;
                return (
                  <Card key={role.user_id} className="p-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={u?.avatar_url || ''} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {(u?.display_name || '?')[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm flex items-center gap-2">
                            {u?.display_name || role.user_id.slice(0, 8)}
                            {isMe && <Badge variant="secondary" className="text-[10px]">{l('ທ່ານ', 'คุณ', 'You')}</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground">{u?.phone || '—'}</div>
                        </div>
                      </div>
                      <Badge className="bg-primary gap-1"><ShieldCheck className="h-3 w-3" /> Admin</Badge>
                    </div>
                  </Card>
                );
              })}
            </TabsContent>

            {/* Audit Log Tab */}
            <TabsContent value="audit" className="space-y-3">
              <div className="flex gap-2 flex-wrap items-center">
                <Select value={auditTableFilter} onValueChange={setAuditTableFilter}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{l('ທຸກຕາຕະລາງ', 'ทุกตาราง', 'All tables')}</SelectItem>
                    <SelectItem value="jobs">jobs</SelectItem>
                    <SelectItem value="profiles">profiles</SelectItem>
                    <SelectItem value="reviews">reviews</SelectItem>
                    <SelectItem value="user_roles">user_roles</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={loadAuditLogs} className="gap-1">
                  <History className="h-3 w-3" /> {l('ໂຫຼດໃໝ່', 'รีโหลด', 'Refresh')}
                </Button>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => exportToCSV(auditLogs, 'audit-export.csv')} disabled={!auditLogs.length}>
                  <Download className="h-3 w-3" /> CSV
                </Button>
                <span className="text-xs text-muted-foreground ml-auto">
                  {auditLogs.filter(a => auditTableFilter === 'all' || a.target_table === auditTableFilter).length} {l('ລາຍການ', 'รายการ', 'entries')}
                </span>
              </div>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {auditLogs.filter(a => auditTableFilter === 'all' || a.target_table === auditTableFilter).length === 0 ? (
                  <Card className="p-8 text-center text-muted-foreground">{l('ຍັງບໍ່ມີບັນທຶກ', 'ยังไม่มีบันทึก', 'No audit entries')}</Card>
                ) : auditLogs
                  .filter(a => auditTableFilter === 'all' || a.target_table === auditTableFilter)
                  .map(log => {
                    const actor = log.user_id ? (users.find(u => u.user_id === log.user_id)?.display_name || log.user_id.slice(0, 8)) : 'system';
                    const actionColor =
                      log.action === 'delete' ? 'bg-red-600' :
                      log.action === 'update' ? 'bg-blue-600' :
                      log.action === 'insert' ? 'bg-green-600' : 'bg-purple-600';
                    return (
                      <Card key={log.id} className="p-3 text-xs">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={`${actionColor} uppercase`}>{log.action}</Badge>
                            <span className="font-mono font-semibold">{log.target_table}</span>
                            <span className="text-muted-foreground font-mono">{log.target_id?.slice(0, 8) || '—'}</span>
                            <span className="text-muted-foreground">{l('ໂດຍ', 'โดย', 'by')} <strong className="text-foreground">{actor}</strong></span>
                          </div>
                          <span className="text-muted-foreground">{log.created_at ? new Date(log.created_at).toLocaleString() : '—'}</span>
                        </div>
                      </Card>
                    );
                  })}
              </div>
            </TabsContent>

            {/* Services / Categories Tab */}
            <TabsContent value="services" className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm text-muted-foreground">
                  {l('ຈັດການລາຍການບໍລິການ ແລະ ລາຄາພື້ນຖານ', 'จัดการรายการบริการและราคาเริ่มต้น', 'Manage service catalog & base prices')}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => exportToCSV(services, 'services-export.csv')} disabled={!services.length}>
                    <Download className="h-4 w-4" /> CSV
                  </Button>
                  <Button size="sm" className="gap-2" onClick={() => openServiceDialog('new')}>
                    <Plus className="h-4 w-4" /> {l('ເພີ່ມບໍລິການ', 'เพิ่มบริการ', 'New Service')}
                  </Button>
                </div>
              </div>
              {services.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">{l('ຍັງບໍ່ມີບໍລິການ', 'ยังไม่มีบริการ', 'No services yet')}</Card>
              ) : services.map(svc => (
                <Card key={svc.id} className="p-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary"><Tag className="h-4 w-4" /></div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm flex items-center gap-2">
                          {svc.name}
                          {svc.active === false && <Badge variant="outline" className="text-[10px]">{l('ປິດ', 'ปิด', 'Off')}</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">{svc.base_price.toLocaleString()}₭</div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => openServiceDialog(svc)}><Edit className="h-3 w-3" /></Button>
                      <Button size="sm" variant="destructive" className="h-8 gap-1" onClick={() => handleDeleteService(svc)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                </Card>
              ))}
            </TabsContent>

            {/* Broadcast Tab */}
            <TabsContent value="broadcast" className="space-y-3">
              <Card className="p-6 max-w-2xl">
                <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-primary" />
                  {l('ສົ່ງຂໍ້ຄວາມຫາຜູ້ໃຊ້', 'ส่งข้อความให้ผู้ใช้', 'Broadcast to Users')}
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  {l('ສົ່ງການແຈ້ງເຕືອນຫາຫຼາຍຄົນພ້ອມກັນ (ໂປຣໂມຊັນ, ປະກາດ, ແຈ້ງເຕືອນ)', 'ส่งการแจ้งเตือนถึงหลายคนพร้อมกัน', 'Send notifications to many users at once')}
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-semibold mb-1 block">{l('ກຸ່ມເປົ້າໝາຍ', 'กลุ่มเป้าหมาย', 'Target')}</label>
                    <Select value={broadcastForm.target} onValueChange={(v: any) => setBroadcastForm({ ...broadcastForm, target: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{l('ທຸກຄົນ', 'ทุกคน', 'Everyone')} ({users.length})</SelectItem>
                        <SelectItem value="kyc_approved">{l('ຜູ້ຢືນຢັນແລ້ວ', 'ผู้ยืนยันแล้ว', 'KYC Approved')} ({kycApproved})</SelectItem>
                        <SelectItem value="kyc_pending">{l('ລໍຖ້າຢືນຢັນ', 'รอยืนยัน', 'KYC Pending')} ({users.filter(u => u.kyc_status === 'pending').length})</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold mb-1 block">{l('ຫົວຂໍ້', 'หัวข้อ', 'Title')}</label>
                    <Input value={broadcastForm.title} onChange={e => setBroadcastForm({ ...broadcastForm, title: e.target.value })} placeholder={l('ຫົວຂໍ້ຂໍ້ຄວາມ...', 'หัวข้อข้อความ...', 'Message title...')} />
                  </div>
                  <div>
                    <label className="text-sm font-semibold mb-1 block">{l('ເນື້ອຫາ', 'เนื้อหา', 'Body')}</label>
                    <Textarea rows={4} value={broadcastForm.body} onChange={e => setBroadcastForm({ ...broadcastForm, body: e.target.value })} placeholder={l('ເນື້ອຫາຂໍ້ຄວາມ...', 'เนื้อหาข้อความ...', 'Message body...')} />
                  </div>
                  <Button onClick={handleBroadcast} className="gap-2 w-full" disabled={!broadcastForm.title.trim()}>
                    <Megaphone className="h-4 w-4" /> {l('ສົ່ງ', 'ส่ง', 'Send Broadcast')}
                  </Button>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Admins Tab content injected below via separate React subtree */}
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

      {/* Add Admin Dialog */}
      {addAdminDialog && (
        <Dialog open={addAdminDialog} onOpenChange={setAddAdminDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldPlus className="h-5 w-5" /> {l('ໂອນສິດ Admin', 'โอนสิทธิ์ Admin', 'Transfer Admin')}
              </DialogTitle>
              <DialogDescription>
                {l('ມີ Admin ໄດ້ສູງສຸດ 1 ຄົນ. ຫຼັງຈາກໂອນແລ້ວ ທ່ານຈະບໍ່ມີສິດ Admin ອີກ.',
                   'มี Admin ได้สูงสุด 1 คน หลังโอนแล้วคุณจะไม่มีสิทธิ์ Admin อีก',
                   'Only one admin allowed. After transfer you will lose admin access.')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={l('ຄົ້ນຫາຊື່ ຫຼື ເບີໂທ...', 'ค้นหาชื่อหรือเบอร์โทร...', 'Search name or phone...')}
                  value={addAdminSearch}
                  onChange={e => setAddAdminSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="max-h-72 overflow-y-auto space-y-1 border rounded p-2">
                {users
                  .filter(u => !adminRoles.some(r => r.user_id === u.user_id))
                  .filter(u => {
                    if (!addAdminSearch) return true;
                    const s = addAdminSearch.toLowerCase();
                    return (u.display_name || '').toLowerCase().includes(s) || (u.phone || '').includes(s);
                  })
                  .slice(0, 50)
                  .map(u => (
                    <button
                      key={u.user_id}
                      type="button"
                      onClick={() => setAddAdminUserId(u.user_id)}
                      className={`w-full text-left p-2 rounded flex items-center gap-2 hover:bg-muted transition-colors ${addAdminUserId === u.user_id ? 'bg-primary/10 ring-1 ring-primary' : ''}`}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={u.avatar_url || ''} />
                        <AvatarFallback>{(u.display_name || '?')[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{u.display_name || '—'}</div>
                        <div className="text-xs text-muted-foreground truncate">{u.phone || '—'}</div>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => { setAddAdminDialog(false); setAddAdminUserId(''); }}>
                {l('ຍົກເລີກ', 'ยกเลิก', 'Cancel')}
              </Button>
              <Button onClick={handleTransferAdmin} disabled={!addAdminUserId} className="gap-2">
                <ShieldPlus className="h-4 w-4" /> {l('ໂອນສິດ Admin', 'โอนสิทธิ์ Admin', 'Transfer Admin')}
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

      {/* Edit User Dialog */}
      {editUserDialog && (
        <Dialog open={!!editUserDialog} onOpenChange={() => setEditUserDialog(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Edit className="h-5 w-5" /> {l('ແກ້ໄຂຜູ້ໃຊ້', 'แก้ไขผู้ใช้', 'Edit User')}</DialogTitle>
              <DialogDescription>{editUserDialog.display_name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold mb-1 block">{l('ຊື່ສະແດງ', 'ชื่อแสดง', 'Display Name')}</label>
                  <Input value={editUserForm.display_name || ''} onChange={e => setEditUserForm({ ...editUserForm, display_name: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1 block">{l('ຊື່ເຕັມ', 'ชื่อเต็ม', 'Full Name')}</label>
                  <Input value={editUserForm.full_name || ''} onChange={e => setEditUserForm({ ...editUserForm, full_name: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1 block">{l('ເບີໂທ', 'เบอร์โทร', 'Phone')}</label>
                  <Input value={editUserForm.phone || ''} onChange={e => setEditUserForm({ ...editUserForm, phone: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1 block">{l('ວັນເກີດ', 'วันเกิด', 'Date of Birth')}</label>
                  <Input type="date" value={editUserForm.date_of_birth || ''} onChange={e => setEditUserForm({ ...editUserForm, date_of_birth: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1 block">{l('ເມືອງ', 'เมือง', 'District')}</label>
                  <Select value={editUserForm.district || ''} onValueChange={v => setEditUserForm({ ...editUserForm, district: v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {districts.map(d => (<SelectItem key={d.id} value={d.id}>{d[language] || d.lo}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1 block">KYC</label>
                  <Select value={editUserForm.kyc_status || ''} onValueChange={v => setEditUserForm({ ...editUserForm, kyc_status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">⏳ Pending</SelectItem>
                      <SelectItem value="approved">✅ Approved</SelectItem>
                      <SelectItem value="rejected">❌ Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">{l('ທີ່ຢູ່', 'ที่อยู่', 'Address')}</label>
                <Textarea rows={2} value={editUserForm.address || ''} onChange={e => setEditUserForm({ ...editUserForm, address: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editUserForm.is_student || false} onChange={e => setEditUserForm({ ...editUserForm, is_student: e.target.checked })} />
                📚 {l('ນັກສຶກສາ', 'นักศึกษา', 'Student')}
              </label>
              {editUserForm.is_student && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-semibold mb-1 block">{l('ຊື່ຜູ້ປົກຄອງ', 'ชื่อผู้ปกครอง', 'Guardian')}</label>
                    <Input value={editUserForm.guardian_name || ''} onChange={e => setEditUserForm({ ...editUserForm, guardian_name: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-semibold mb-1 block">{l('ເບີຜູ້ປົກຄອງ', 'เบอร์ผู้ปกครอง', 'Guardian Phone')}</label>
                    <Input value={editUserForm.guardian_phone || ''} onChange={e => setEditUserForm({ ...editUserForm, guardian_phone: e.target.value })} />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditUserDialog(null)}>{l('ຍົກເລີກ', 'ยกเลิก', 'Cancel')}</Button>
              <Button onClick={handleSaveUser}>{l('ບັນທຶກ', 'บันทึก', 'Save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Service / Category Dialog */}
      {serviceDialog && (
        <Dialog open={!!serviceDialog} onOpenChange={() => setServiceDialog(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                {serviceDialog === 'new' ? l('ເພີ່ມບໍລິການ', 'เพิ่มบริการ', 'New Service') : l('ແກ້ໄຂບໍລິການ', 'แก้ไขบริการ', 'Edit Service')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-semibold mb-1 block">{l('ຊື່ບໍລິການ', 'ชื่อบริการ', 'Name')}</label>
                <Input value={serviceForm.name} onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">{l('ລາຄາພື້ນຖານ (₭)', 'ราคาเริ่มต้น (₭)', 'Base Price (₭)')}</label>
                <Input type="number" min="0" value={serviceForm.base_price} onChange={e => setServiceForm({ ...serviceForm, base_price: parseInt(e.target.value) || 0 })} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={serviceForm.active} onChange={e => setServiceForm({ ...serviceForm, active: e.target.checked })} />
                {l('ເປີດໃຊ້ງານ', 'เปิดใช้งาน', 'Active')}
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setServiceDialog(null)}>{l('ຍົກເລີກ', 'ยกเลิก', 'Cancel')}</Button>
              <Button onClick={handleSaveService}>{l('ບັນທຶກ', 'บันทึก', 'Save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AdminPage;
