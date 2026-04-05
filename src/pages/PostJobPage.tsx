import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Service { id: string; name: string; base_price: number; }

const PostJobPage = () => {
  const { language } = useAppStore();
  const { user } = useAuth();
  const navigate = useNavigate();
  const l = (lo: string, en: string) => language === 'en' ? en : lo;

  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState({
    customer_name: '', customer_phone: '', customer_address: '',
    job_type: '', description: '', base_price: 0, material_cost: 0, discount: 0,
    priority: 'normal', scheduled_date: '', scheduled_time: '',
    payment_method: 'cash',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.from('services').select('id, name, base_price').eq('active', true).order('name').then(({ data }) => {
      setServices((data || []) as Service[]);
    });
  }, []);

  if (!user) return <Navigate to="/auth" />;

  const update = (key: string, value: any) => setForm(p => ({ ...p, [key]: value }));
  const total = form.base_price + form.material_cost - form.discount;

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer_name || !form.customer_phone || !form.job_type) {
      toast.error(l('ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບ', 'Fill required fields'));
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.from('jobs').insert({
      customer_name: form.customer_name,
      customer_phone: form.customer_phone.replace(/-/g, ''),
      customer_address: form.customer_address || null,
      job_type: form.job_type,
      description: form.description || null,
      base_price: form.base_price,
      material_cost: form.material_cost,
      discount: form.discount,
      priority: form.priority,
      scheduled_date: form.scheduled_date || null,
      scheduled_time: form.scheduled_time || null,
      payment_method: form.payment_method,
      created_by: user.id,
    } as any).select().single();

    if (error) { toast.error(error.message); }
    else {
      const jobNumber = (data as any)?.job_number || '';
      await supabase.from('audit_logs').insert({ action: `ສ້າງໃບງານ ${jobNumber}`, target_table: 'jobs', target_id: (data as any)?.id, user_id: user.id } as any);
      toast.success(l(`ສ້າງງານ ${jobNumber} ສຳເລັດ!`, `Job ${jobNumber} created!`));
      navigate('/jobs');
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="container py-6 flex-1 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold mb-6">✍️ {l('ສ້າງງານໃໝ່', 'Create New Job')}</h1>
          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div><Label>{l('ຊື່ລູກຄ້າ', 'Customer Name')} *</Label><Input value={form.customer_name} onChange={e => update('customer_name', e.target.value)} /></div>
              <div><Label>{l('ເບີໂທ', 'Phone')} *</Label><Input value={form.customer_phone} onChange={e => update('customer_phone', formatPhone(e.target.value))} placeholder="020-XXXX-XXXX" /></div>
              <div><Label>{l('ທີ່ຢູ່', 'Address')}</Label><Input value={form.customer_address} onChange={e => update('customer_address', e.target.value)} /></div>
              <div>
                <Label>{l('ປະເພດງານ', 'Job Type')} *</Label>
                <Select value={form.job_type} onValueChange={v => {
                  const svc = services.find(s => s.name === v);
                  update('job_type', v);
                  if (svc) update('base_price', svc.base_price);
                }}>
                  <SelectTrigger><SelectValue placeholder={l('ເລືອກ...', 'Select...')} /></SelectTrigger>
                  <SelectContent>{services.map(s => <SelectItem key={s.id} value={s.name}>{s.name} ({s.base_price.toLocaleString()}₭)</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>{l('ລາຍລະອຽດ', 'Description')}</Label><Textarea value={form.description} onChange={e => update('description', e.target.value)} rows={3} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>{l('ລາຄາ', 'Base')} (₭)</Label><Input type="number" value={form.base_price} onChange={e => update('base_price', Number(e.target.value))} /></div>
                <div><Label>{l('ວັດສະດຸ', 'Material')} (₭)</Label><Input type="number" value={form.material_cost} onChange={e => update('material_cost', Number(e.target.value))} /></div>
                <div><Label>{l('ສ່ວນຫຼຸດ', 'Discount')} (₭)</Label><Input type="number" value={form.discount} onChange={e => update('discount', Number(e.target.value))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{l('ຄວາມສຳຄັນ', 'Priority')}</Label>
                  <Select value={form.priority} onValueChange={v => update('priority', v)}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="normal">{l('ທຳມະດາ', 'Normal')}</SelectItem><SelectItem value="urgent">{l('ດ່ວນ', 'Urgent')}</SelectItem><SelectItem value="critical">{l('ດ່ວນຫຼາຍ', 'Critical')}</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>{l('ການຈ່າຍ', 'Payment')}</Label>
                  <Select value={form.payment_method} onValueChange={v => update('payment_method', v)}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="cash">{l('ເງິນສົດ', 'Cash')}</SelectItem><SelectItem value="bcel">BCEL</SelectItem><SelectItem value="transfer">{l('ໂອນ', 'Transfer')}</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{l('ວັນນັດ', 'Date')}</Label><Input type="date" value={form.scheduled_date} onChange={e => update('scheduled_date', e.target.value)} /></div>
                <div><Label>{l('ເວລາ', 'Time')}</Label><Input type="time" value={form.scheduled_time} onChange={e => update('scheduled_time', e.target.value)} /></div>
              </div>
              <div className="bg-primary/5 rounded-xl p-4 text-center">
                <span className="text-sm text-muted-foreground">{l('ຍອດລວມ', 'Total')}</span>
                <div className="text-2xl font-bold text-primary">{total.toLocaleString()}₭</div>
              </div>
              <Button type="submit" size="lg" className="w-full min-h-[48px]" disabled={submitting}>
                {submitting ? '...' : l('ສ້າງງານ', 'Create Job')}
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
