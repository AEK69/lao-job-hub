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
import { Coins, User, Save, Briefcase, ArrowUpRight, ArrowDownLeft, Camera, Clock, ShieldCheck, ShieldAlert, XCircle, CheckCircle, Star } from 'lucide-react';
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

interface Review {
  id: string;
  reviewer_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_name?: string;
  job_title?: string;
}

const ProfilePage = () => {
  const { user, profile, refreshProfile, loading } = useAuth();
  const { language } = useAppStore();
  const [form, setForm] = useState({ display_name: '', phone: '', district: '', bio: '' });
  const [saving, setSaving] = useState(false);
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [uploading, setUploading] = useState(false);
  const [avgRating, setAvgRating] = useState(0);

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
    loadReviews();
  }, [user]);

  const loadMyJobs = async () => {
    const { data } = await supabase.from('jobs').select('*').eq('user_id', user!.id).order('created_at', { ascending: false });
    setMyJobs((data as Job[]) || []);
  };

  const loadTransactions = async () => {
    const { data } = await supabase.from('coin_transactions').select('*').eq('user_id', user!.id).order('created_at', { ascending: false });
    setTransactions((data as CoinTransaction[]) || []);
  };

  const loadReviews = async () => {
    const { data } = await supabase.from('reviews').select('*').eq('reviewed_id', user!.id).order('created_at', { ascending: false });
    if (data && data.length > 0) {
      const avg = data.reduce((s, r) => s + r.rating, 0) / data.length;
      setAvgRating(Math.round(avg * 10) / 10);

      const enriched = await Promise.all(data.map(async (r) => {
        const { data: prof } = await supabase.from('profiles').select('display_name').eq('user_id', r.reviewer_id).single();
        let jobTitle = '';
        if (r.job_id) {
          const { data: job } = await supabase.from('jobs').select('title').eq('id', r.job_id).single();
          jobTitle = job?.title || '';
        }
        return { ...r, reviewer_name: prof?.display_name || '?', job_title: jobTitle };
      }));
      setReviews(enriched);
    }
  };

  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('profiles').update(form).eq('user_id', user.id);
    if (error) toast.error(error.message);
    else { toast.success(l('ບັນທຶກແລ້ວ!', 'บันทึกแล้ว!', 'Saved!')); await refreshProfile(); }
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
      toast.success(l('ອັບໂຫລດແລ້ວ!', 'อัปโหลดแล้ว!', 'Uploaded!'));
      await refreshProfile();
    } catch (err: any) { toast.error(err.message); }
    finally { setUploading(false); }
  };

  const handleCancelJob = async (jobId: string, title: string) => {
    const { error } = await supabase.from('jobs').update({ status: 'cancelled' } as any).eq('id', jobId).eq('user_id', user.id);
    if (error) toast.error(error.message);
    else { toast.success(l(`ຍົກເລີກ: ${title}`, `ยกเลิก: ${title}`, `Cancelled: ${title}`)); loadMyJobs(); }
  };

  const kycBadge = () => {
    const status = profile?.kyc_status || 'pending';
    if (status === 'approved') return <Badge className="gap-1 bg-green-500"><ShieldCheck className="h-3 w-3" /> {l('ຢືນຢັນແລ້ວ', 'ยืนยันแล้ว', 'Verified')}</Badge>;
    if (status === 'rejected') return <Badge variant="destructive" className="gap-1"><ShieldAlert className="h-3 w-3" /> {l('ປະຕິເສດ', 'ปฏิเสธ', 'Rejected')}</Badge>;
    return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> {l('ລໍຖ້າ', 'รอ', 'Pending')}</Badge>;
  };

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`h-4 w-4 ${i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="container py-6 flex-1 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Profile header */}
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile?.avatar_url || ''} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">{(profile?.display_name || '?')[0]}</AvatarFallback>
                </Avatar>
                <label className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1.5 cursor-pointer hover:bg-primary/90 transition-colors">
                  <Camera className="h-3 w-3" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
                </label>
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold">{profile?.display_name || '—'}</h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {kycBadge()}
                  <Badge variant="secondary" className="gap-1">🪙 {profile?.coin_balance || 0}</Badge>
                  {avgRating > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> {avgRating}
                    </Badge>
                  )}
                </div>
                {profile?.bio && <p className="text-sm text-muted-foreground mt-2">{profile.bio}</p>}
              </div>
            </div>
          </Card>

          {/* KYC Alert */}
          {profile?.kyc_status !== 'approved' && (
            <Card className="p-4 mb-6 border-l-4 border-l-orange-500 bg-orange-50/50">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">{l('ຢືນຢັນຕົວຕົນ', 'ยืนยันตัวตน', 'Verify Identity')}</h3>
                  <p className="text-xs text-muted-foreground">{l('ຕ້ອງຢືນຢັນເພື່ອໃຊ້ງານ', 'ต้องยืนยันเพื่อใช้งาน', 'Required to use all features')}</p>
                </div>
                <Link to="/kyc"><Button size="sm">{l('ຢືນຢັນ', 'ยืนยัน', 'Verify')}</Button></Link>
              </div>
            </Card>
          )}

          <Tabs defaultValue="profile">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile" className="text-xs">👤 {l('ຂໍ້ມູນ', 'ข้อมูล', 'Info')}</TabsTrigger>
              <TabsTrigger value="jobs" className="text-xs">📋 {l('ວຽກ', 'งาน', 'Jobs')}</TabsTrigger>
              <TabsTrigger value="history" className="text-xs">🪙 {l('ທຸລະກຳ', 'ธุรกรรม', 'Coins')}</TabsTrigger>
              <TabsTrigger value="reviews" className="text-xs">⭐ {l('ລີວິວ', 'รีวิว', 'Reviews')}</TabsTrigger>
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

            <TabsContent value="jobs">
              <Card className="divide-y">
                {myJobs.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Briefcase className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    {l('ຍັງບໍ່ມີວຽກ', 'ยังไม่มีงาน', 'No jobs yet')}
                  </div>
                ) : myJobs.map(job => {
                  const district = districts.find(d => d.id === job.district);
                  return (
                    <div key={job.id} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <Link to={`/jobs/${job.id}`} className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{job.title}</span>
                            <Badge variant={job.post_type === 'hiring' ? 'default' : 'secondary'} className="text-[10px]">
                              {t(job.post_type === 'hiring' ? 'job.type.employer' : 'job.type.worker', language)}
                            </Badge>
                            {job.status === 'cancelled' && <Badge variant="destructive" className="text-[10px]">{l('ຍົກເລີກ', 'ยกเลิก', 'Cancelled')}</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {district?.[language] || district?.lo} • {new Date(job.created_at).toLocaleDateString()}
                          </div>
                        </Link>
                        {job.status === 'active' && (
                          <Button variant="ghost" size="sm" className="text-destructive gap-1 text-xs" onClick={() => handleCancelJob(job.id, job.title)}>
                            <XCircle className="h-3 w-3" /> {l('ຍົກເລີກ', 'ยกเลิก', 'Cancel')}
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
                {transactions.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Coins className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    {l('ຍັງບໍ່ມີທຸລະກຳ', 'ยังไม่มีธุรกรรม', 'No transactions')}
                  </div>
                ) : transactions.map(tx => (
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

            <TabsContent value="reviews">
              <Card className="divide-y">
                {reviews.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Star className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    {l('ຍັງບໍ່ມີລີວິວ', 'ยังไม่มีรีวิว', 'No reviews yet')}
                  </div>
                ) : reviews.map(review => (
                  <div key={review.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{review.reviewer_name}</span>
                        {renderStars(review.rating)}
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString()}</span>
                    </div>
                    {review.job_title && <div className="text-xs text-primary mb-1">📋 {review.job_title}</div>}
                    {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
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
