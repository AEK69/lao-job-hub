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
import { Coins, User, Save, Briefcase, History, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Link, Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

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
  const [form, setForm] = useState({
    display_name: '',
    phone: '',
    district: '',
    bio: '',
  });
  const [saving, setSaving] = useState(false);
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);

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
    const { data } = await supabase
      .from('jobs')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    setMyJobs((data as Job[]) || []);
  };

  const loadTransactions = async () => {
    const { data } = await supabase
      .from('coin_transactions')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    setTransactions((data as CoinTransaction[]) || []);
  };

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
    history: { lo: 'ປະຫວັດທຸລະກຳ', th: 'ประวัติธุรกรรม', en: 'Transaction History' },
    profile: { lo: 'ຂໍ້ມູນ', th: 'ข้อมูล', en: 'Info' },
  };
  const l = (key: keyof typeof labels) => labels[key][language] || labels[key].lo;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="container py-6 flex-1 max-w-2xl">
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

          <Tabs defaultValue="profile">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile">👤 {l('profile')}</TabsTrigger>
              <TabsTrigger value="jobs">📋 {l('myJobs')}</TabsTrigger>
              <TabsTrigger value="history">🪙 {l('history')}</TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
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
            </TabsContent>

            <TabsContent value="jobs">
              <Card className="divide-y">
                {myJobs.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    {language === 'en' ? 'No jobs posted yet' : language === 'th' ? 'ยังไม่มีงานที่โพสต์' : 'ຍັງບໍ່ມີວຽກທີ່ໂພສ'}
                  </div>
                )}
                {myJobs.map(job => {
                  const district = districts.find(d => d.id === job.district);
                  return (
                    <Link key={job.id} to={`/jobs/${job.id}`} className="block p-4 hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <Briefcase className="h-4 w-4 text-primary" />
                        <span className="font-medium">{job.title}</span>
                        <Badge variant={job.post_type === 'hiring' ? 'default' : 'secondary'} className="text-xs">
                          {t(job.post_type === 'hiring' ? 'job.type.employer' : 'job.type.worker', language)}
                        </Badge>
                        {job.is_urgent && <Badge variant="destructive" className="text-xs">🔥</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {district?.[language] || district?.lo} • {new Date(job.created_at).toLocaleDateString()}
                      </div>
                    </Link>
                  );
                })}
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card className="divide-y">
                {transactions.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    {language === 'en' ? 'No transactions yet' : language === 'th' ? 'ยังไม่มีธุรกรรม' : 'ຍັງບໍ່ມີທຸລະກຳ'}
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
                          {tx.type === 'topup' ? (language === 'en' ? 'Top-up' : language === 'th' ? 'เติมเหรียญ' : 'ເຕີມຫຼຽນ') : tx.description || tx.type}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleString()}
                        </div>
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