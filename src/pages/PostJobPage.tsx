import { useState } from 'react';
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
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Coins, Star } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const COST_URGENT = 5;
const COST_FEATURED = 10;

const PostJobPage = () => {
  const { language } = useAppStore();
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    district: '',
    salary: '',
    salary_type: 'day',
    phone: '',
    address: '',
    post_type: 'hiring',
    poster_name: '',
    is_urgent: false,
    is_featured: false,
    work_date: '',
    work_time: '',
  });
  const [submitting, setSubmitting] = useState(false);

  if (!user) return <Navigate to="/auth" />;

  const coinCost = (form.is_urgent ? COST_URGENT : 0) + (form.is_featured ? COST_FEATURED : 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.category || !form.district || !form.salary || !form.phone || !form.poster_name) {
      toast.error(language === 'en' ? 'Please fill all fields' : language === 'th' ? 'กรุณากรอกข้อมูลให้ครบ' : 'ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບ');
      return;
    }

    // Check coin balance for premium features
    if (coinCost > 0) {
      if ((profile?.coin_balance || 0) < coinCost) {
        toast.error(language === 'en' ? 'Not enough coins!' : language === 'th' ? 'เหรียญไม่พอ!' : 'ຫຼຽນບໍ່ພໍ!');
        return;
      }
    }

    setSubmitting(true);

    // Spend coins if needed
    if (coinCost > 0) {
      const spendType = form.is_featured ? 'spend_featured' : 'spend_urgent';
      const { data: success } = await supabase.rpc('spend_coins', {
        _amount: coinCost,
        _type: spendType,
        _description: `Post: ${form.title}`,
      });
      if (!success) {
        toast.error(language === 'en' ? 'Coin transaction failed' : 'ການໃຊ້ຫຼຽນລົ້ມເຫຼວ');
        setSubmitting(false);
        return;
      }
    }

    const { error } = await supabase.from('jobs').insert({
      user_id: user.id,
      title: form.title,
      description: form.description,
      category: form.category,
      district: form.district,
      salary: form.salary,
      salary_type: form.salary_type,
      phone: form.phone,
      address: form.address,
      post_type: form.post_type,
      poster_name: form.poster_name,
      is_urgent: form.is_urgent,
      is_featured: form.is_featured,
      work_date: form.work_date || null,
      work_time: form.work_time || null,
    } as any);

    if (error) {
      toast.error(error.message);
    } else {
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
                  <Label>{language === 'en' ? 'Work Date' : language === 'th' ? 'วันเริ่มงาน' : 'ວັນເລີ່ມວຽກ'}</Label>
                  <Input type="date" value={form.work_date} onChange={e => update('work_date', e.target.value)} />
                </div>
                <div>
                  <Label>{language === 'en' ? 'Start Time' : language === 'th' ? 'เวลาเริ่ม' : 'ເວລາເລີ່ມ'}</Label>
                  <Input type="time" value={form.work_time} onChange={e => update('work_time', e.target.value)} />
                </div>
              </div>

              <div>
                <Label>{t('post.phone', language)} *</Label>
                <Input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="020 XX XXX XXX" />
              </div>

              <div>
                <Label>{t('post.address', language)}</Label>
                <Input value={form.address} onChange={e => update('address', e.target.value)} />
              </div>

              {/* Premium options */}
              <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                <h3 className="font-semibold flex items-center gap-2">
                  <Coins className="h-4 w-4 text-primary" />
                  {language === 'en' ? 'Premium Options' : language === 'th' ? 'ตัวเลือกพรีเมียม' : 'ຕົວເລືອກພຣີມຽມ'}
                  <Badge variant="secondary" className="text-xs">🪙 {profile?.coin_balance || 0}</Badge>
                </h3>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch checked={form.is_urgent} onCheckedChange={v => update('is_urgent', v)} />
                    <Label className="flex items-center gap-1">🔥 {t('job.urgent', language)}</Label>
                  </div>
                  <Badge variant="outline">{COST_URGENT} 🪙</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch checked={form.is_featured} onCheckedChange={v => update('is_featured', v)} />
                    <Label className="flex items-center gap-1">
                      <Star className="h-4 w-4" />
                      {language === 'en' ? 'Featured' : language === 'th' ? 'แนะนำ' : 'ແນະນຳ'}
                    </Label>
                  </div>
                  <Badge variant="outline">{COST_FEATURED} 🪙</Badge>
                </div>

                {coinCost > 0 && (
                  <div className="text-sm text-primary font-medium text-right">
                    {language === 'en' ? 'Total cost' : language === 'th' ? 'ค่าใช้จ่าย' : 'ຄ່າໃຊ້ຈ່າຍ'}: {coinCost} 🪙
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
