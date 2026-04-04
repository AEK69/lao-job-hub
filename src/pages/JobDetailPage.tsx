import { useParams, Link } from 'react-router-dom';
import { useAppStore, Job } from '@/lib/store';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Phone, Clock, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { JobDetailSkeleton } from '@/components/LoadingSkeleton';

const JobDetailPage = () => {
  const { id } = useParams();
  const { language } = useAppStore();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const l = (lo: string, th: string, en: string) => language === 'en' ? en : language === 'th' ? th : lo;

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('jobs').select('*').eq('id', id).single();
      setJob(data as Job | null);
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return <div className="min-h-screen flex flex-col"><Header /><div className="container py-6 flex-1"><JobDetailSkeleton /></div><Footer /></div>;
  if (!job) return <div className="min-h-screen flex flex-col"><Header /><div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Not found</p></div><Footer /></div>;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="container py-6 flex-1 max-w-3xl">
        <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> {l('ກັບຄືນ', 'ย้อนกลับ', 'Back')}
        </Link>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6">
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <Badge variant="outline">{job.job_number}</Badge>
              <Badge variant={job.job_status === 'done' ? 'default' : 'secondary'}>{job.job_status}</Badge>
              {job.priority !== 'normal' && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> {job.priority}</Badge>}
              <Badge variant="outline">{job.payment_status}</Badge>
            </div>

            <h1 className="text-2xl font-bold mb-2">{job.job_type}</h1>
            <p className="text-muted-foreground mb-4">{job.description || l('ບໍ່ມີລາຍລະອຽດ', 'ไม่มีรายละเอียด', 'No description')}</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-muted/50 p-3 rounded"><div className="text-xs text-muted-foreground">{l('ລູກຄ້າ', 'ลูกค้า', 'Customer')}</div><div className="font-semibold">{job.customer_name}</div></div>
              <div className="bg-muted/50 p-3 rounded"><div className="text-xs text-muted-foreground">{l('ເບີໂທ', 'เบอร์โทร', 'Phone')}</div><div className="font-semibold">{job.customer_phone}</div></div>
              {job.customer_address && <div className="bg-muted/50 p-3 rounded col-span-2"><div className="text-xs text-muted-foreground">{l('ທີ່ຢູ່', 'ที่อยู่', 'Address')}</div><div className="font-semibold">{job.customer_address}</div></div>}
            </div>

            <div className="bg-primary/5 rounded-xl p-4 mb-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div><div className="text-xs text-muted-foreground">{l('ລາຄາ', 'ราคา', 'Base')}</div><div className="font-bold">{job.base_price.toLocaleString()}₭</div></div>
                <div><div className="text-xs text-muted-foreground">{l('ອຸປະກອນ', 'อุปกรณ์', 'Material')}</div><div className="font-bold">{job.material_cost.toLocaleString()}₭</div></div>
                <div><div className="text-xs text-muted-foreground">{l('ລວມ', 'รวม', 'Total')}</div><div className="font-bold text-primary">{(job.total_price || 0).toLocaleString()}₭</div></div>
              </div>
            </div>

            {(job.scheduled_date || job.scheduled_time) && (
              <div className="flex items-center gap-3 mb-4 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {job.scheduled_date} {job.scheduled_time}
              </div>
            )}

            <Button size="lg" className="w-full gap-2" asChild>
              <a href={`tel:${job.customer_phone}`}><Phone className="h-4 w-4" /> {l('ໂທຫາລູກຄ້າ', 'โทรหาลูกค้า', 'Call Customer')}</a>
            </Button>
          </Card>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default JobDetailPage;
