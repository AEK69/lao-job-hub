import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/lib/store';
import { t, districts } from '@/lib/i18n';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Coins, User, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Link, Navigate } from 'react-router-dom';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const ProfilePage = () => {
  const { user, profile, refreshProfile, loading } = useAuth();
  const { language } = useAppStore();
  const [form, setForm] = useState({
    display_name: '',
    phone: '',
    district: '',
    bio: '',
  });
  const [saving, setSaving] = useState(false);

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

  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update(form)
      .eq('user_id', user.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(language === 'en' ? 'Profile updated!' : language === 'th' ? 'อัปเดตโปรไฟล์แล้ว!' : 'ອັບເດດໂປຣໄຟລ໌ແລ້ວ!');
      await refreshProfile();
    }
    setSaving(false);
  };

  const labels = {
    title: { lo: 'ໂປຣໄຟລ໌', th: 'โปรไฟล์', en: 'Profile' },
    coins: { lo: 'ຫຼຽນ', th: 'เหรียญ', en: 'Coins' },
    save: { lo: 'ບັນທຶກ', th: 'บันทึก', en: 'Save' },
    myJobs: { lo: 'ວຽກຂອງຂ້ອຍ', th: 'งานของฉัน', en: 'My Jobs' },
  };
  const l = (key: keyof typeof labels) => labels[key][language] || labels[key].lo;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="container py-6 flex-1 max-w-lg">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <User className="h-6 w-6" /> {l('title')}
          </h1>

          {/* Coin balance */}
          <Card className="p-4 mb-6 bg-gradient-to-r from-primary/10 to-accent/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="h-6 w-6 text-primary" />
                <span className="font-medium">{l('coins')}</span>
              </div>
              <Badge variant="secondary" className="text-lg px-3 py-1 gap-1">
                🪙 {profile?.coin_balance || 0}
              </Badge>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div>
              <Label>{language === 'en' ? 'Display Name' : language === 'th' ? 'ชื่อที่แสดง' : 'ຊື່ສະແດງ'}</Label>
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
                  {districts.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d[language] || d.lo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{language === 'en' ? 'Bio' : language === 'th' ? 'เกี่ยวกับ' : 'ກ່ຽວກັບ'}</Label>
              <Textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} rows={3} />
            </div>

            <Button className="w-full gap-2" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4" /> {l('save')}
            </Button>
          </Card>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default ProfilePage;
