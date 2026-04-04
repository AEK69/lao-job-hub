import { useState } from 'react';
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

const PostJobPage = () => {
  const { language } = useAppStore();
  const { user } = useAuth();
  const navigate = useNavigate();
  const l = (lo: string, th: string, en: string) => language === 'en' ? en : language === 'th' ? th : lo;

  const [form, setForm] = useState({
    customer_name: '', customer_phone: '', customer_address: '',
    job_type: '', description: '', base_price: 0, material_cost: 0,
    priority: 'normal', scheduled_date: '', scheduled_time: '',
    payment_method: 'cash',
  });
  const [submitting, setSubmitting] = useState(false);

  if (!user) return <Navigate to="/auth" />;

  const update = (key: string, value: any) => setForm(p => ({ ...p, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer_name || !form.customer_phone || !form.job_type) {
      toast.error(l('ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບ', 'กรุณากรอกข้อมูลให้ครบ', 'Fill required fields'));
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('jobs').insert({
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      customer_address: form.customer_address || null,
      job_type: form.job_type,
      description: form.description || null,
      base_price: form.base_price,
      material_cost: form.material_cost,
      priority: form.priority,
      scheduled_date: form.scheduled_date || null,
      scheduled_time: form.scheduled_time || null,
      payment_method: form.payment_method,
      created_by: user.id,
    } as any);
    if (error) toast.error(error.message);
    else { toast.success(l('ສ້າງງານສຳເລັດ!', 'สร้างงานสำเร็จ!', 'Job created!')); navigate('/jobs'); }
    setSubmitting(false);
  };

  const services = [
    { id: 'repair', name: 'ສ້ອມແປງທົ່ວໄປ', price: 200000 },
    { id: 'install', name: 'ຕິດຕັ້ງ', price: 350000 },
    { id: 'design', name: 'ອອກແບບ', price: 500000 },
    { id: 'cleaning', name: 'ທຳຄວາມສະອາດ', price: 150000 },
    { id: 'it', name: 'ຂໍ້ມູນ IT', price: 300000 },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="container py-6 flex-1 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold mb-6">✍️ {l('ສ້າງງານໃໝ່', 'สร้างงานใหม่', 'Create New Job')}</h1>
          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div><Label>{l('ຊື່ລູກຄ້າ', 'ชื่อลูกค้า', 'Customer Name')} *</Label><Input value={form.customer_name} onChange={e => update('customer_name', e.target.value)} /></div>
              <div><Label>{l('ເບີໂທ', 'เบอร์โทร', 'Phone')} *</Label><Input value={form.customer_phone} onChange={e => update('customer_phone', e.target.value)} /></div>
              <div><Label>{l('ທີ່ຢູ່', 'ที่อยู่', 'Address')}</Label><Input value={form.customer_address} onChange={e => update('customer_address', e.target.value)} /></div>
              <div>
                <Label>{l('ປະເພດງານ', 'ประเภทงาน', 'Job Type')} *</Label>
                <Select value={form.job_type} onValueChange={v => {
                  update('job_type', v);
                  const svc = services.find(s => s.id === v);
                  if (svc) update('base_price', svc.price);
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{services.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.price.toLocaleString()}₭)</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>{l('ລາຍລະອຽດ', 'รายละเอียด', 'Description')}</Label><Textarea value={form.description} onChange={e => update('description', e.target.value)} rows={3} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{l('ລາຄາພື້ນຖານ', 'ราคาพื้นฐาน', 'Base Price')} (₭)</Label><Input type="number" value={form.base_price} onChange={e => update('base_price', Number(e.target.value))} /></div>
                <div><Label>{l('ຄ່າອຸປະກອນ', 'ค่าอุปกรณ์', 'Material Cost')} (₭)</Label><Input type="number" value={form.material_cost} onChange={e => update('material_cost', Number(e.target.value))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{l('ຄວາມສຳຄັນ', 'ความสำคัญ', 'Priority')}</Label>
                  <Select value={form.priority} onValueChange={v => update('priority', v)}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="urgent">Urgent</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>{l('ການຈ່າຍ', 'การจ่าย', 'Payment')}</Label>
                  <Select value={form.payment_method} onValueChange={v => update('payment_method', v)}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="bcel">BCEL</SelectItem><SelectItem value="transfer">Transfer</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{l('ວັນນັດ', 'วันนัด', 'Date')}</Label><Input type="date" value={form.scheduled_date} onChange={e => update('scheduled_date', e.target.value)} /></div>
                <div><Label>{l('ເວລາ', 'เวลา', 'Time')}</Label><Input type="time" value={form.scheduled_time} onChange={e => update('scheduled_time', e.target.value)} /></div>
              </div>
              <div className="bg-muted/50 p-3 rounded text-sm">
                {l('ລວມ', 'รวม', 'Total')}: <strong>{(form.base_price + form.material_cost).toLocaleString()}₭</strong>
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting ? '...' : l('ສ້າງງານ', 'สร้างงาน', 'Create Job')}
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
