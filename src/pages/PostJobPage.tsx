import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/hooks/useAuth';
import { t, districts, categories } from '@/lib/i18n';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Coins, Star, Upload, ImageIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { JOB_POSTING_COSTS, calculateJobPostingCost } from '@/lib/constants';

const PostJobPage = () => {
  const { language } = useAppStore();
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const l = (lo: string, th: string, en: string) => language === 'en' ? en : language === 'th' ? th : lo;

  const [form, setForm] = useState({
    title: '', description: '', category: '', district: '',
    salary: '', salary_type: 'day', phone: '', address: '',
    post_type: 'hiring', poster_name: '',
    is_urgent: false, is_featured: false,
    work_date: '', work_time: '',
  });
  const [jobImage, setJobImage] = useState<File | null>(null);
  const [jobImagePreview, setJobImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Auto-fill from profile
  useEffect(() => {
    if (profile) {
      setForm(prev => ({
        ...prev,
        poster_name: prev.poster_name || profile.display_name || '',
        phone: prev.phone || profile.phone || '',
        address: prev.address || profile.address || '',
        district: prev.district || profile.district || '',
      }));
    }
  }, [profile]);

  if (!user) return <Navigate to="/auth" />;

  // Check KYC status
  if (profile?.kyc_status !== 'approved') {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Card className="p-8 text-center max-w-md">
            <span className="text-5xl block mb-4">⏳</span>
            <h2 className="text-xl font-bold mb-2">{l('ລໍຖ້າຢືນຢັນ', 'รอยืนยัน', 'Pending Verification')}</h2>
            <p className="text-muted-foreground">
              {l('ບັນຊີຂອງທ່ານຍັງບໍ່ໄດ້ຮັບການຢືນຢັນ ກະລຸນາລໍຖ້າ Admin ຢືນຢັນກ່ອນໂພສວຽກ',
                'บัญชีของคุณยังไม่ได้รับการยืนยัน กรุณารอ Admin ยืนยันก่อนโพสต์งาน',
                'Your account is not yet verified. Please wait for admin approval before posting.')}
            </p>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  const coinCost = calculateJobPostingCost({
    isUrgent: form.is_urgent,
    isFeatured: form.is_featured,
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setJobImage(file);
      setJobImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.category || !form.district || !form.salary || !form.phone || !form.poster_name) {
      toast.error(l('ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບ', 'กรุณากรอกข้อมูลให้ครบ', 'Please fill all fields'));
      return;
    }

    if (coinCost > 0 && (profile?.coin_balance || 0) < coinCost) {
      toast.error(l('ຫຼຽນບໍ່ພໍ!', 'เหรียญไม่พอ!', 'Not enough coins!'));
      return;
    }

    setSubmitting(true);

    if (coinCost > 0) {
      const spendType = form.is_featured ? 'spend_featured' : 'spend_urgent';
      const { data: success } = await supabase.rpc('spend_coins', {
        _amount: coinCost, _type: spendType, _description: `Post: ${form.title}`,
      });
      if (!success) {
        toast.error(l('ການໃຊ້ຫຼຽນລົ້ມເຫຼວ', 'การใช้เหรียญล้มเหลว', 'Coin transaction failed'));
        setSubmitting(false);
        return;
      }
    }

    let image_url: string | null = null;
    if (jobImage) {
      const ext = jobImage.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('job-images').upload(filePath, jobImage);
      if (!upErr) {
        const { data } = supabase.storage.from('job-images').getPublicUrl(filePath);
        image_url = data.publicUrl;
      }
    }

    const { error } = await supabase.from('jobs').insert({
      user_id: user.id, title: form.title, description: form.description,
      category: form.category, district: form.district, salary: form.salary,
      salary_type: form.salary_type, phone: form.phone, address: form.address,
      post_type: form.post_type, poster_name: form.poster_name,
      is_urgent: form.is_urgent, is_featured: form.is_featured,
      work_date: form.work_date || null, work_time: form.work_time || null,
      image_url,
    } as any);

    if (error) toast.error(error.message);
    else {
      toast.success(t('post.success', language));
      await refreshProfile();
      navigate('/jobs');
    }
    setSubmitting(false);
  };

  const update = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="container py-6 flex-1 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold mb-6">✍️ {t('nav.postJob', language)}</h1>
          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Post Type */}
              <div className="grid grid-cols-2 gap-3">
                <Button type="button" variant={form.post_type === 'hiring' ? 'default' : 'outline'} className="h-auto py-3 flex-col gap-1" onClick={() => update('post_type', 'hiring')}>
                  <span className="text-xl">🏢</span>
                  <span className="text-xs">{t('post.hiring', language)}</span>
                </Button>
                <Button type="button" variant={form.post_type === 'seeking' ? 'default' : 'outline'} className="h-auto py-3 flex-col gap-1" onClick={() => update('post_type', 'seeking')}>
                  <span className="text-xl">🙋</span>
                  <span className="text-xs">{t('post.seeking', language)}</span>
                </Button>
              </div>

              <div>
                <Label>{t('job.postedBy', language)} *</Label>
                <Input value={form.poster_name} onChange={e => update('poster_name', e.target.value)} />
              </div>
              <div>
                <Label>{t('post.title', language)} *</Label>
                <Input value={form.title} onChange={e => update('title', e.target.value)} />
              </div>
              <div>
                <Label>{t('post.description', language)} *</Label>
                <Textarea value={form.description} onChange={e => update('description', e.target.value)} rows={4} />
              </div>

              {/* Job Image */}
              <div>
                <Label className="flex items-center gap-1"><ImageIcon className="h-4 w-4" /> {l('ຮູບພາບວຽກ', 'รูปภาพงาน', 'Job Image')}</Label>
                <label className="flex items-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors mt-1">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {jobImage ? jobImage.name : l('ເລືອກຮູບ...', 'เลือกรูป...', 'Choose image...')}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                </label>
                {jobImagePreview && <img src={jobImagePreview} alt="Preview" className="mt-2 rounded-lg max-h-40 object-cover" />}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t('search.category', language)} *</Label>
                  <Select value={form.category} onValueChange={v => update('category', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (<SelectItem key={cat.id} value={cat.id}>{cat.icon} {t(`cat.${cat.id}` as any, language)}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('search.district', language)} *</Label>
                  <Select value={form.district} onValueChange={v => update('district', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {districts.map(d => (<SelectItem key={d.id} value={d.id}>{d[language] || d.lo}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t('post.salary', language)} (₭) *</Label>
                  <Input type="number" value={form.salary} onChange={e => update('salary', e.target.value)} />
                </div>
                <div>
                  <Label>&nbsp;</Label>
                  <Select value={form.salary_type} onValueChange={v => update('salary_type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">{t('job.perDay', language)}</SelectItem>
                      <SelectItem value="month">{t('job.perMonth', language)}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{l('ວັນເລີ່ມວຽກ', 'วันเริ่มงาน', 'Work Date')}</Label>
                  <Input type="date" value={form.work_date} onChange={e => update('work_date', e.target.value)} />
                </div>
                <div>
                  <Label>{l('ເວລາເລີ່ມ', 'เวลาเริ่ม', 'Start Time')}</Label>
                  <Input type="time" value={form.work_time} onChange={e => update('work_time', e.target.value)} />
                </div>
              </div>

              <div>
                <Label>{t('post.phone', language)} *</Label>
                <Input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="020 XX XXX XXX" />
              </div>
              <div>
                <Label>{t('post.address', language)} ({l('ໃສ່ລິ້ງ Google Map ໄດ້', 'ใส่ลิงก์ Google Map ได้', 'Google Map link accepted')})</Label>
                <Input value={form.address} onChange={e => update('address', e.target.value)} placeholder={l('ທີ່ຢູ່ ຫຼື ລິ້ງ Google Map', 'ที่อยู่ หรือ ลิงก์ Google Map', 'Address or Google Map link')} />
              </div>

              {/* Premium options */}
              <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                <h3 className="font-semibold flex items-center gap-2">
                  <Coins className="h-4 w-4 text-primary" />
                  {l('ຕົວເລືອກພຣີມຽມ', 'ตัวเลือกพรีเมียม', 'Premium Options')}
                  <Badge variant="secondary" className="text-xs">🪙 {profile?.coin_balance || 0}</Badge>
                </h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch checked={form.is_urgent} onCheckedChange={v => update('is_urgent', v)} />
                    <Label className="flex items-center gap-1">🔥 {t('job.urgent', language)}</Label>
                  </div>
                  <Badge variant="outline">{JOB_POSTING_COSTS.URGENT} 🪙</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch checked={form.is_featured} onCheckedChange={v => update('is_featured', v)} />
                    <Label className="flex items-center gap-1"><Star className="h-4 w-4" /> {l('ແນະນຳ', 'แนะนำ', 'Featured')}</Label>
                  </div>
                  <Badge variant="outline">{JOB_POSTING_COSTS.FEATURED} 🪙</Badge>
                </div>
                {coinCost > 0 && (
                  <div className="text-sm text-primary font-medium text-right">
                    {l('ຄ່າໃຊ້ຈ່າຍ', 'ค่าใช้จ่าย', 'Total cost')}: {coinCost} 🪙
                  </div>
                )}
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting ? '...' : `${t('post.submit', language)} 🚀`}
              </Button>
            </form>
          </Card>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default PostJobPage;
