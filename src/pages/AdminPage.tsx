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
import { Trash2, Briefcase, Users, Coins, Search, ShieldCheck, Eye, CheckCircle, XCircle, Minus, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

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
  created_at: string;
}

const AdminPage = () => {
  const { language } = useAppStore();
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [kycDialog, setKycDialog] = useState<UserProfile | null>(null);
  const [coinDialog, setCoinDialog] = useState<{ user: UserProfile; mode: 'add' | 'deduct' } | null>(null);
  const [coinAmount, setCoinAmount] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [searchJob, setSearchJob] = useState('');

  const l = (lo: string, th: string, en: string) => language === 'en' ? en : language === 'th' ? th : lo;

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
    const { data } = await supabase.from('jobs').select('*').order('created_at', { ascending: false }).limit(50);
    setJobs((data as Job[]) || []);
  };

  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers((data as UserProfile[]) || []);
  };

  const handleDeleteJob = async (id: string, title: string) => {
    if (!window.confirm(`${l('ຕັ້ງໃຈລຶບ', 'ต้องการลบ', 'Delete')} "${title}"?`)) return;
    const { error } = await supabase.from('jobs').delete().eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success(l('ລຶບແລ້ວ', 'ลบแล้ว', 'Deleted'));
      loadJobs();
    }
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
    if (!amount || amount <= 0) {
      toast.error(l('ກະລຸນາໃສ່ຈຳນວນຕາມສົມດຸນ', 'กรุณากรอกจำนวนให้ถูกต้อง', 'Please enter valid amount'));
      return;
    }

    const finalAmount = coinDialog.mode === 'add' ? amount : -amount;
    const { error } = await supabase.rpc('admin_topup_coins', {
      _target_user_id: coinDialog.user.user_id,
      _amount: finalAmount,
      _description: `Admin ${coinDialog.mode === 'add' ? 'top-up' : 'deduction'}: ${amount} coins`,
    });

    if (error) toast.error(error.message);
    else {
      toast.success(
        coinDialog.mode === 'add'
          ? l(`ເພີ່ມ ${amount}`, `เพิ่ม ${amount}`, `Added ${amount}`)
          : l(`ຫັກ ${amount}`, `หัก ${amount}`, `Deducted ${amount}`)
      );
      setCoinDialog(null);
      setCoinAmount('');
      loadUsers();
    }
  };

  if (!user) return <Navigate to="/admin-login" />;
  if (isAdmin === null) return (
    <div className="min-h-screen flex items-center justify-center"><span className="animate-pulse text-2xl">⏳</span></div>
  );
  if (!isAdmin) return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center"><span className="text-5xl block mb-4">🔒</span>
          <p className="text-muted-foreground">{l('ຕ້ອງເປັນ Admin', 'ต้องเป็นผู้ดูแลระบบ', 'Admin access required')}</p>
        </div>
      </div>
      <Footer />
    </div>
  );

  const pendingKyc = users.filter(u => u.kyc_status === 'pending' && u.id_card_url);
  const filteredUsers = users.filter(u =>
    !searchUser || u.display_name?.toLowerCase().includes(searchUser.toLowerCase()) || u.phone?.includes(searchUser)
  );
  const filteredJobs = jobs.filter(j =>
    !searchJob || j.title.toLowerCase().includes(searchJob.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <div className="container py-6 flex-1 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{l('ສະ​ຕະຣະບົບ Admin', 'ระบบ Admin', 'Admin System')}</h1>
          <p className="text-muted-foreground text-sm">{l('ຈັດການຜູ້ໃຊ້ KYC ແລະວຽກ', 'จัดการผู้ใช้ KYC และงาน', 'Manage users, KYC and jobs')}</p>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 bg-slate-200">
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              {l('ຜູ້ໃຊ້', 'ผู้ใช้', 'Users')} ({users.length})
            </TabsTrigger>
            <TabsTrigger value="kyc" className="gap-2">
              <ShieldCheck className="h-4 w-4" />
              KYC ({pendingKyc.length})
            </TabsTrigger>
            <TabsTrigger value="jobs" className="gap-2">
              <Briefcase className="h-4 w-4" />
              {l('ວຽກ', 'งาน', 'Jobs')} ({jobs.length})
            </TabsTrigger>
          </TabsList>

          {/* Users Management */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={l('ຄົ້ນຫາ...', 'ค้นหา...', 'Search...')}
                  value={searchUser}
                  onChange={e => setSearchUser(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              {filteredUsers.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">{l('ບໍ່ມີຜູ້ໃຊ້', 'ไม่พบผู้ใช้', 'No users')}</Card>
              ) : (
                filteredUsers.map((user, idx) => (
                  <motion.div key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }}>
                    <Card className="p-4">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.avatar_url || ''} />
                            <AvatarFallback>{(user.display_name || '?')[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="font-semibold">{user.display_name || '—'}</div>
                            <div className="text-sm text-muted-foreground">{user.phone || '—'}</div>
                          </div>
                          <Badge className={user.kyc_status === 'approved' ? 'bg-green-600' : user.kyc_status === 'rejected' ? 'bg-red-600' : 'bg-yellow-600'}>
                            {user.kyc_status}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="gap-1 font-semibold">
                            <Coins className="h-4 w-4" /> {user.coin_balance}
                          </Badge>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-1" onClick={() => { setCoinDialog({ user, mode: 'add' }); setCoinAmount(''); }}>
                            <Plus className="h-4 w-4" /> {l('ເພີ່ມ', 'เพิ่ม', 'Add')}
                          </Button>
                          <Button size="sm" className="bg-red-600 hover:bg-red-700 gap-1" onClick={() => { setCoinDialog({ user, mode: 'deduct' }); setCoinAmount(''); }}>
                            <Minus className="h-4 w-4" /> {l('ຫັກ', 'หัก', 'Deduct')}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>
          </TabsContent>

          {/* KYC Management */}
          <TabsContent value="kyc" className="space-y-2">
            {pendingKyc.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">{l('ບໍ່ມີ KYC ລໍຖ້າ', 'ไม่มี KYC รอ', 'No pending KYC')}</Card>
            ) : (
              pendingKyc.map((user, idx) => (
                <motion.div key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }}>
                  <Card className="p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar_url || ''} />
                          <AvatarFallback>{(user.display_name || '?')[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-semibold">{user.full_name || user.display_name || '—'}</div>
                          <div className="text-sm text-muted-foreground">{user.phone || '—'}</div>
                        </div>
                        <Badge className="bg-orange-600">{l('ລໍຖ້າ', 'รอ', 'Pending')}</Badge>
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setKycDialog(user)} className="gap-1">
                          <Eye className="h-4 w-4" /> {l('ເບິ່ງ', 'ดู', 'View')}
                        </Button>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-1" onClick={() => handleKycAction(user.user_id, 'approved')}>
                          <CheckCircle className="h-4 w-4" /> {l('ຢືນຢັນ', 'ยืนยัน', 'Approve')}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleKycAction(user.user_id, 'rejected')} className="gap-1">
                          <XCircle className="h-4 w-4" /> {l('ປະຕິເສດ', 'ปฏิเสธ', 'Reject')}
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
          </TabsContent>

          {/* Jobs Management */}
          <TabsContent value="jobs" className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={l('ຄົ້ນຫາວຽກ...', 'ค้นหางาน...', 'Search jobs...')}
                  value={searchJob}
                  onChange={e => setSearchJob(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              {filteredJobs.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">{l('ບໍ່ມີວຽກ', 'ไม่มีงาน', 'No jobs')}</Card>
              ) : (
                filteredJobs.map((job, idx) => {
                  const district = districts.find(d => d.id === job.district);
                  return (
                    <motion.div key={job.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }}>
                      <Card className="p-4">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-semibold">{job.title}</span>
                              <Badge variant={job.post_type === 'hiring' ? 'default' : 'secondary'} className="text-xs">
                                {t(job.post_type === 'hiring' ? 'job.type.employer' : 'job.type.worker', language)}
                              </Badge>
                              {job.status === 'cancelled' && <Badge variant="destructive" className="text-xs">❌</Badge>}
                              {job.is_urgent && <Badge className="bg-red-600 text-xs">🔥</Badge>}
                              {job.is_featured && <Badge className="bg-purple-600 text-xs">⭐</Badge>}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {job.poster_name} • {district?.[language] || district?.lo} • {job.phone}
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant="destructive"
                            className="gap-1"
                            onClick={() => handleDeleteJob(job.id, job.title)}
                          >
                            <Trash2 className="h-4 w-4" /> {l('ລຶບ', 'ลบ', 'Delete')}
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />

      {/* KYC Detail Dialog */}
      {kycDialog && (
        <Dialog open={!!kycDialog} onOpenChange={() => setKycDialog(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                {l('ລາຍລະອຽດ KYC', 'รายละเอียด KYC', 'KYC Details')}
              </DialogTitle>
              <DialogDescription>{kycDialog.full_name || kycDialog.display_name}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-100 p-3 rounded">
                  <div className="text-xs text-muted-foreground">{l('ຊື່ເຕັມ', 'ชื่อเต็ม', 'Full Name')}</div>
                  <div className="font-semibold">{kycDialog.full_name || '—'}</div>
                </div>
                <div className="bg-slate-100 p-3 rounded">
                  <div className="text-xs text-muted-foreground">{l('ວັນເກີດ', 'วันเกิด', 'DOB')}</div>
                  <div className="font-semibold">{kycDialog.date_of_birth || '—'}</div>
                </div>
                <div className="bg-slate-100 p-3 rounded col-span-2">
                  <div className="text-xs text-muted-foreground">{l('ທີ່ຢູ່', 'ที่อยู่', 'Address')}</div>
                  <div className="font-semibold">{kycDialog.address || '—'}</div>
                </div>
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
                {coinDialog.mode === 'add' ? l('ເພີ່ມ', 'เพิ่ม', 'Add') : l('ຫັກ', 'หัก', 'Deduct')} {l('ເຣື່ອ', 'เหรียญ', 'Coins')}
              </DialogTitle>
              <DialogDescription>{coinDialog.user.display_name}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-slate-100 p-4 rounded text-center">
                <div className="text-sm text-muted-foreground mb-1">{l('ລະວາງປະຈຸບັນ', 'จำนวนปัจจุบัน', 'Current Balance')}</div>
                <div className="text-3xl font-bold">{coinDialog.user.coin_balance}</div>
              </div>
              <div>
                <label className="text-sm font-semibold mb-2 block">{l('ຈຳນວນ', 'จำนวน', 'Amount')}</label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={coinAmount}
                  onChange={e => setCoinAmount(e.target.value)}
                  className="text-lg h-10"
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setCoinDialog(null)}>{l('ຍົກເລີກ', 'ยกเลิก', 'Cancel')}</Button>
              <Button
                className={coinDialog.mode === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                onClick={handleCoinTransaction}
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

export default AdminPage;
