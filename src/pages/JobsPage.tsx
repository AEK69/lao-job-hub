import { useAppStore, Job } from '@/lib/store';
import { useState, useEffect, useRef } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { JobCard } from '@/components/JobCard';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { JobsListSkeleton } from '@/components/LoadingSkeleton';
import { DEBOUNCE_DELAY, PAGINATION } from '@/lib/constants';

const JobsPage = () => {
  const { language } = useAppStore();
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const l = (lo: string, th: string, en: string) => language === 'en' ? en : language === 'th' ? th : lo;

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => setSearchQuery(search), DEBOUNCE_DELAY.SEARCH);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [search]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      let query = supabase.from('jobs').select('*').order('created_at', { ascending: false });
      if (statusFilter !== 'all') query = query.eq('job_status', statusFilter);
      if (searchQuery) query = query.or(`customer_name.ilike.%${searchQuery}%,job_number.ilike.%${searchQuery}%`);
      const { data } = await query.limit(PAGINATION.JOBS_PER_PAGE);
      setJobs((data as Job[]) || []);
      setLoading(false);
    };
    load();
  }, [statusFilter, searchQuery]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="container py-6 flex-1">
        <h1 className="text-2xl font-bold mb-6">{l('ລາຍການງານ', 'รายการงาน', 'Job List')}</h1>
        <div className="flex gap-3 mb-4 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={l('ຄົ້ນຫາ...', 'ค้นหา...', 'Search...')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SlidersHorizontal className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
            <SelectContent>
              {['all', 'pending', 'active', 'quality_check', 'payment', 'done', 'cancel'].map(s => (
                <SelectItem key={s} value={s}>{s === 'all' ? l('ທັງໝົດ', 'ทั้งหมด', 'All') : s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground mb-3">{jobs.length} {l('ງານ', 'งาน', 'jobs')}</div>
        <div className="space-y-3">
          {loading ? <JobsListSkeleton count={6} /> : jobs.length > 0 ? jobs.map((job, i) => <JobCard key={job.id} job={job} index={i} />) : (
            <div className="text-center py-12 text-muted-foreground"><span className="text-5xl block mb-3">🔍</span><p>{l('ບໍ່ພົບງານ', 'ไม่พบงาน', 'No jobs found')}</p></div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default JobsPage;
