import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { t, districts, categories } from '@/lib/i18n';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PostJobPage = () => {
  const { language, addJob } = useAppStore();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    district: '',
    salary: '',
    salaryType: 'day' as 'day' | 'month',
    phone: '',
    address: '',
    postType: 'hiring' as 'hiring' | 'seeking',
    posterName: '',
    isUrgent: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.category || !form.district || !form.salary || !form.phone || !form.posterName) {
      toast.error(language === 'en' ? 'Please fill all fields' : language === 'th' ? 'กรุณากรอกข้อมูลให้ครบ' : 'ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບ');
      return;
    }
    addJob(form);
    toast.success(t('post.success', language));
    navigate('/jobs');
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
                <Button
                  type="button"
                  variant={form.postType === 'hiring' ? 'default' : 'outline'}
                  className="h-auto py-3 flex-col gap-1"
                  onClick={() => update('postType', 'hiring')}
                >
                  <span className="text-xl">🏢</span>
                  <span className="text-xs">{t('post.hiring', language)}</span>
                </Button>
                <Button
                  type="button"
                  variant={form.postType === 'seeking' ? 'default' : 'outline'}
                  className="h-auto py-3 flex-col gap-1"
                  onClick={() => update('postType', 'seeking')}
                >
                  <span className="text-xl">🙋</span>
                  <span className="text-xs">{t('post.seeking', language)}</span>
                </Button>
              </div>

              <div>
                <Label>{t('job.postedBy', language)} *</Label>
                <Input value={form.posterName} onChange={e => update('posterName', e.target.value)} />
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
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.icon} {t(`cat.${cat.id}` as any, language)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('search.district', language)} *</Label>
                  <Select value={form.district} onValueChange={v => update('district', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {districts.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d[language] || d.lo}</SelectItem>
                      ))}
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
                  <Select value={form.salaryType} onValueChange={v => update('salaryType', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">{t('job.perDay', language)}</SelectItem>
                      <SelectItem value="month">{t('job.perMonth', language)}</SelectItem>
                    </SelectContent>
                  </Select>
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

              <div className="flex items-center gap-3">
                <Switch checked={form.isUrgent} onCheckedChange={v => update('isUrgent', v)} />
                <Label>{t('job.urgent', language)} 🔥</Label>
              </div>

              <Button type="submit" size="lg" className="w-full">
                {t('post.submit', language)} 🚀
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
