import { useAppStore, Job } from '@/lib/store';
import { t } from '@/lib/i18n';
import { motion } from 'framer-motion';
import { Search, Briefcase, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JobCard } from '@/components/JobCard';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { JobsListSkeleton } from '@/components/LoadingSkeleton';
import { PAGINATION } from '@/lib/constants';

const Index = () => {
  const { language } = useAppStore();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const l = (lo: string, th: string, en: string) => language === 'en' ? en : language === 'th' ? th : lo;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.from('jobs').select('*').order('created_at', { ascending: false }).limit(PAGINATION.JOBS_HOME_PREVIEW);
      setJobs((data as Job[]) || []);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <section className="bg-gradient-to-br from-primary/10 via-primary-light to-accent/10 py-16 md:py-24">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <motion.span className="text-5xl mb-4 inline-block" animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }}>🎯</motion.span>
            <h1 className="text-3xl md:text-5xl font-bold mb-4">WorkDay</h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">{l('ລະບົບຈັດການງານບໍລິການ', 'ระบบจัดการงานบริการ', 'Job Management System')}</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link to="/jobs"><Button size="lg" className="gap-2"><Search className="h-5 w-5" /> {l('ເບິ່ງງານ', 'ดูงาน', 'View Jobs')}</Button></Link>
              <Link to="/post"><Button size="lg" variant="outline" className="gap-2">✍️ {l('ສ້າງງານ', 'สร้างงาน', 'Create Job')}</Button></Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-8 border-b">
        <div className="container flex justify-center gap-8 md:gap-16 flex-wrap">
          {[
            { icon: <Briefcase className="h-6 w-6" />, value: jobs.length, label: l('ງານ', 'งาน', 'Jobs') },
            { icon: <TrendingUp className="h-6 w-6" />, value: jobs.filter(j => j.job_status === 'active').length, label: l('ກຳລັງດຳເນີນ', 'กำลังดำเนิน', 'Active') },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 + i * 0.1 }} className="text-center">
              <div className="flex items-center justify-center text-primary mb-1">{stat.icon}</div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="flex-1 pb-12">
        <div className="container py-6">
          <div className="space-y-3">
            {loading ? <JobsListSkeleton count={PAGINATION.JOBS_HOME_PREVIEW} /> : jobs.length > 0 ? jobs.map((job, i) => <JobCard key={job.id} job={job} index={i} />) : (
              <div className="text-center py-12 text-muted-foreground"><span className="text-5xl block mb-3">📭</span><p>{l('ຍັງບໍ່ມີງານ', 'ยังไม่มีงาน', 'No jobs yet')}</p></div>
            )}
          </div>
          {jobs.length > 0 && <div className="text-center mt-6"><Link to="/jobs"><Button variant="outline">{l('ເບິ່ງທັງໝົດ', 'ดูทั้งหมด', 'View All')} →</Button></Link></div>}
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Index;
