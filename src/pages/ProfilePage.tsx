import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore, Job } from '@/lib/store';
import { t, districts } from '@/lib/i18n';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Coins, User, Save, Briefcase, ArrowUpRight, ArrowDownLeft, Camera, Clock, ShieldCheck, ShieldAlert, XCircle, Upload, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Link, Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CoinTransaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
}

const ProfilePage = () => {
  const { user, profile, refreshProfile, loading } = useAuth();
  const { language } = useAppStore();
  const [form, setForm] = useState({ display_name: '', phone: '', district: '', bio: '' });
  const [saving, setSaving] = useState(false);
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [uploading, setUploading] = useState(false);

  const l = (lo: string, th: string, en: string) => language === 'en' ? en : language === 'th' ? th : lo;

  useEffect(() => {
    if (profile) {
      setForm({
        display_name: profile.display_name || '',
        phone: profile.phone || '',
        district: profile.district || '',
        bio: profile.bio || '',
      });
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    loadMyJobs();
    loadTransactions();
  }, [user]);

  const loadMyJobs = async () => {
    const { data } = await supabase.from('jobs').select('*').eq('user_id', user!.id).order('created_at', { ascending: false });
    setMyJobs((data as Job[]) || []);
  };

  const loadTransactions = async () => {
    const { data } = await supabase.from('coin_transactions').select('*').eq('user_id', user!.id).order('created_at', { ascending: false });
    setTransactions((data as CoinTransaction[]) || []);
  };

  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('profiles').update(form).eq('user_id', user.id);
    if (error) toast.error(error.message);
    else {
      toast.success(l('ອັບເດດໂປຣໄຟລ໌ແລ້ວ!', 'อัปเดตโปรไฟล์แล้ว!', 'Profile updated!'));
      await refreshProfile();
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      await supabase.from('profiles').update({ avatar_url: data.publicUrl } as any).eq('user_id', user.id);
      toast.success(l('ອັບໂຫລດຮູບແລ້ວ!', 'อัปโหลดรูปแล้ว!', 'Avatar uploaded!'));
      await refreshProfile();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleCancelJob = async (jobId: string, title: string) => {
    const { error } = await supabase.from('jobs').update({ status: 'cancelled' } as any).eq('id', jobId).eq('user_id', user.id);
    if (error) toast.error(error.message);
    else {
      toast.success(l(`ຍົກເລີກວຽກ: ${title}`, `ยกเลิกงาน: ${title}`, `Cancelled: ${title}`));
      loadMyJobs();
    }
  };

  const kycBadge = () => {
    const status = profile?.kyc_status || 'pending';
    if (status === 'approved') return <Badge className="gap-1 bg-green-500"><ShieldCheck className="h-3 w-3" /> {l('ຢືນຢັນແລ້ວ', 'ยืนยันแล้ว', 'Verified')}</Badge>;
    if (status === 'rejected') return <Badge variant="destructive" className="gap-1"><ShieldAlert className="h-3 w-3" /> {l('ຖືກປະຕິເສດ', 'ถูกปฏิเสธ', 'Rejected')}</Badge>;
    return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> {l('ລໍຖ້າຢືນຢັນ', 'รอยืนยัน', 'Pending Verification')}</Badge>;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="container py-6 flex-1 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Avatar & Info */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback>{(profile?.display_name || '?')[0]}</AvatarFallback>
              </Avatar>
              <label className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1 cursor-pointer hover:bg-primary/90">
                <Camera className="h-3 w-3" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
              </label>
            </div>
            <div>
              <h1 className="text-xl font-bold">{profile?.display_name || '—'}</h1>
              <div className="flex items-center gap-2 mt-1">
                {kycBadge()}
                <Badge variant="secondary" className="gap-1">🪙 {profile?.coin_balance || 0}</Badge>
              </div>
            </div>
          </div>

          {/* KYC Alert */}
          {profile?.kyc_status !== 'approved' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">⚠️</div>
                <div>
                  <h3 className="font-semibold text-yellow-900">
                    {l('ສຳເລັດການ KYC', 'สำเร็จการ KYC', 'Complete KYC Verification')}
                  </h3>
                  <p className="text-sm text-yellow-800 mt-1">
                    {l(
                      'ທ່ານຕ້ອງສົ່ງເອກະສານຢືນຢັນຕົວຕົນ ເພື່ອໃຊ້ງາน ຫາວຽກ ຫຼື ຈ້າງວຽກໄດ້',
                      'คุณต้องยืนยันตัวตนเพื่อค้นหางานหรือโพสต์งาน',
                      'You need to verify your identity to post or search jobs'
                    )}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          <Tabs defaultValue={profile?.kyc_status !== 'approved' ? 'kyc' : 'profile'}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile">👤 {l('ຂໍ້ມູນ', 'ข้อมูล', 'Info')}</TabsTrigger>
              <TabsTrigger value="kyc">🛡️ KYC</TabsTrigger>
              <TabsTrigger value="jobs">📋 {l('ວຽກຂອງຂ້ອຍ', 'งานของฉัน', 'My Jobs')}</TabsTrigger>
              <TabsTrigger value="history">🪙 {l('ປະຫວັດ', 'ประวัติ', 'History')}</TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Card className="p-6 space-y-4">
                <div>
                  <Label>{l('ຊື່ສະແດງ', 'ชื่อที่แสดง', 'Display Name')}</Label>
                  <Input value={form.display_name} onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))} />
                </div>
                <div>
                  <Label>{t('post.phone', language)}</Label>
                  <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="020 XX XXX XXX" />
                </div>
                <div>
                  <Label>{t('search.district', language)}</Label>
                  <Select value={form.district} onValueChange={v => setForm(p => ({ ...p, district: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {districts.map(d => (<SelectItem key={d.id} value={d.id}>{d[language] || d.lo}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{l('ກ່ຽວກັບ', 'เกี่ยวกับ', 'Bio')}</Label>
                  <Textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} rows={3} />
                </div>
                <Button className="w-full gap-2" onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4" /> {l('ບັນທຶກ', 'บันทึก', 'Save')}
                </Button>
              </Card>
            </TabsContent>

            <TabsContent value="kyc">
              <Card className="p-6 text-center space-y-6">
                {profile?.kyc_status === 'approved' ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="flex justify-center mb-4">
                      <div className="bg-green-100 rounded-full p-4">
                        <CheckCircle className="h-12 w-12 text-green-600" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-green-600">
                      {l('ຢືນຢັນແລ້ວ!', 'ยืนยันแล้ว!', 'Verified!')}
                    </h3>
                    <p className="text-muted-foreground mt-3">
                      {l('ທ່ານໄດ້ຮັບອະນຸມັດ ສາມາດໃຊ້ງານຕ່າງໆໄດ້', 'คุณได้รับการอนุมัติ สามารถใช้งานได้', 'You are verified and can use all features')}
                    </p>
                  </motion.div>
                ) : profile?.kyc_status === 'rejected' ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <div className="flex justify-center mb-4">
                      <div className="bg-red-100 rounded-full p-4">
                        <ShieldAlert className="h-12 w-12 text-red-600" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-red-600">
                      {l('ປະຕິເສດ', 'ถูกปฏิเสธ', 'Rejected')}
                    </h3>
                    <p className="text-muted-foreground">
                      {l('ເອກະສານບໍ່ອາດຕໍ່ໆ. ກະລຸນາລອງອັບໂຫລດເຣື່ອ', 'เอกสารไม่ตรงตามเงื่อนไข', 'Document did not meet requirements')}
                    </p>
                    <Link to="/kyc">
                      <Button className="w-full gap-2">
                        <Upload className="h-4 w-4" />
                        {l('ອັບໂຫລດຄືນໃໝ່', 'อัปโหลดอีกครั้ง', 'Upload Again')}
                      </Button>
                    </Link>
                  </motion.div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <div className="flex justify-center mb-4">
                      <div className="bg-blue-100 rounded-full p-4">
                        <Clock className="h-12 w-12 text-blue-600" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold mb-2">
                        {l('ລໍຖ້າການກວດສອບ', 'รอการตรวจสอบ', 'Pending Verification')}
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        {l('ກະລຸນາສໍາເລັດຂັ້ນຕອນ KYC ເພື່ອໃຊ້ງານທຸກລາຍການ', 'โปรดสำเร็จยืนยันตัวตนเพื่อใช้งานได้', 'Complete KYC verification to use all features')}
                      </p>
                    </div>
                    <Link to="/kyc" className="block">
                      <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700">
                        <ShieldCheck className="h-4 w-4" />
                        {l('ສາທາລະຂໍ້ມູນກະຕົວຕົນ', 'ยืนยันตัวตน', 'Verify Identity')}
                      </Button>
                    </Link>
                  </motion.div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="jobs">
              <Card className="divide-y">
                {myJobs.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    {l('ຍັງບໍ່ມີວຽກທີ່ໂພສ', 'ยังไม่มีงานที่โพสต์', 'No jobs posted yet')}
                  </div>
                )}
                {myJobs.map(job => {
                  const district = districts.find(d => d.id === job.district);
                  return (
                    <div key={job.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <Link to={`/jobs/${job.id}`} className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Briefcase className="h-4 w-4 text-primary" />
                            <span className="font-medium">{job.title}</span>
                            <Badge variant={job.post_type === 'hiring' ? 'default' : 'secondary'} className="text-xs">
                              {t(job.post_type === 'hiring' ? 'job.type.employer' : 'job.type.worker', language)}
                            </Badge>
                            {job.status === 'cancelled' && <Badge variant="destructive" className="text-xs">{l('ຍົກເລີກ', 'ยกเลิก', 'Cancelled')}</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {district?.[language] || district?.lo} • {new Date(job.created_at).toLocaleDateString()}
                          </div>
                        </Link>
                        {job.status === 'active' && (
                          <Button variant="ghost" size="sm" className="text-destructive gap-1" onClick={() => handleCancelJob(job.id, job.title)}>
                            <XCircle className="h-4 w-4" />
                            {l('ຍົກເລີກ', 'ยกเลิก', 'Cancel')}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card className="divide-y">
                {transactions.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    {l('ຍັງບໍ່ມີທຸລະກຳ', 'ยังไม่มีธุรกรรม', 'No transactions yet')}
                  </div>
                )}
                {transactions.map(tx => (
                  <div key={tx.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${tx.amount > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {tx.amount > 0 ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="font-medium text-sm">
                          {tx.type === 'topup' ? l('ເຕີມຫຼຽນ', 'เติมเหรียญ', 'Top-up') : tx.description || tx.type}
                        </div>
                        <div className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                    <span className={`font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount} 🪙
                    </span>
                  </div>
                ))}
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default ProfilePage;
