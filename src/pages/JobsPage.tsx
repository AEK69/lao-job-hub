import { useAppStore, Job } from '@/lib/store';
import { t, districts, categories } from '@/lib/i18n';
import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Filter, Calendar, DollarSign, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { JobCard } from '@/components/JobCard';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { JobsListSkeleton } from '@/components/LoadingSkeleton';
import { debounce, DEBOUNCE_DELAY, PAGINATION } from '@/lib/constants';
import { motion, AnimatePresence } from 'framer-motion';

const JobsPage = () => {
  const { language } = useAppStore();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [district, setDistrict] = useState('all');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [postType, setPostType] = useState<'all' | 'hiring' | 'seeking'>('all');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Advanced filters
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'salary_high' | 'salary_low'>('newest');

  const l = (lo: string, th: string, en: string) => language === 'en' ? en : language === 'th' ? th : lo;

  const activeFilterCount = [dateFrom, dateTo, salaryMin, salaryMax].filter(Boolean).length + (sortBy !== 'newest' ? 1 : 0);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => setSearchQuery(search), DEBOUNCE_DELAY.SEARCH);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [search]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('jobs')
          .select('*')
          .eq('status', 'active')
          .order('is_urgent', { ascending: false })
          .order('is_featured', { ascending: false })
          .order('created_at', { ascending: false });

        if (district !== 'all') query = query.eq('district', district);
        if (category !== 'all') query = query.eq('category', category);
        if (postType !== 'all') query = query.eq('post_type', postType);
        if (searchQuery) query = query.ilike('title', `%${searchQuery}%`);
        if (dateFrom) query = query.gte('work_date', dateFrom);
        if (dateTo) query = query.lte('work_date', dateTo);

        const { data } = await query;
        let result = (data as Job[]) || [];

        // Client-side salary filter
        if (salaryMin) result = result.filter(j => Number(j.salary) >= Number(salaryMin));
        if (salaryMax) result = result.filter(j => Number(j.salary) <= Number(salaryMax));

        // Sort
        if (sortBy === 'salary_high') result.sort((a, b) => Number(b.salary) - Number(a.salary));
        if (sortBy === 'salary_low') result.sort((a, b) => Number(a.salary) - Number(b.salary));

        setJobs(result);
      } catch (error) {
        console.error('Error loading jobs:', error);
        setJobs([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [district, category, postType, searchQuery, dateFrom, dateTo, salaryMin, salaryMax, sortBy]);

  const clearFilters = () => {
    setDateFrom(''); setDateTo(''); setSalaryMin(''); setSalaryMax(''); setSortBy('newest');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="container py-6 flex-1">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{t('nav.findJobs', language)}</h1>
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="sm"
            className="gap-2"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {l('ຕົວກອງ', 'ตัวกรอง', 'Filters')}
            {activeFilterCount > 0 && (
              <span className="bg-primary-foreground text-primary text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {/* Basic filters */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t('search.placeholder', language)} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
          <Select value={district} onValueChange={setDistrict}>
            <SelectTrigger className="w-[160px]">
              <MapPin className="h-4 w-4 mr-1" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('search.allDistricts', language)}</SelectItem>
              {districts.map(d => (<SelectItem key={d.id} value={d.id}>{d[language] || d.lo}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-1" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('search.allCategories', language)}</SelectItem>
              {categories.map(cat => (<SelectItem key={cat.id} value={cat.id}>{cat.icon} {t(`cat.${cat.id}` as any, language)}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        {/* Advanced filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-4"
            >
              <div className="bg-muted/50 rounded-lg p-4 space-y-3 border">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    {l('ຕົວກອງຂັ້ນສູງ', 'ตัวกรองขั้นสูง', 'Advanced Filters')}
                  </h3>
                  {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-xs">
                      <X className="h-3 w-3" /> {l('ລ້າງ', 'ล้าง', 'Clear')}
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                      <Calendar className="h-3 w-3" /> {l('ວັນທີເລີ່ມ', 'วันที่เริ่ม', 'From Date')}
                    </label>
                    <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                      <Calendar className="h-3 w-3" /> {l('ວັນທີສຸດ', 'วันที่สุด', 'To Date')}
                    </label>
                    <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                      <DollarSign className="h-3 w-3" /> {l('ເງິນເດືອນຕ່ຳສຸດ', 'เงินเดือนต่ำสุด', 'Min Salary')}
                    </label>
                    <Input type="number" value={salaryMin} onChange={e => setSalaryMin(e.target.value)} placeholder="0" className="h-9 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                      <DollarSign className="h-3 w-3" /> {l('ເງິນເດືອນສູງສຸດ', 'เงินเดือนสูงสุด', 'Max Salary')}
                    </label>
                    <Input type="number" value={salaryMax} onChange={e => setSalaryMax(e.target.value)} placeholder="∞" className="h-9 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">{l('ຈັດລຽງ', 'เรียงลำดับ', 'Sort')}</label>
                    <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">{l('ໃໝ່ສຸດ', 'ใหม่สุด', 'Newest')}</SelectItem>
                        <SelectItem value="salary_high">{l('ເງິນເດືອນສູງ', 'เงินเดือนสูง', 'Highest Pay')}</SelectItem>
                        <SelectItem value="salary_low">{l('ເງິນເດືອນຕ່ຳ', 'เงินเดือนต่ำ', 'Lowest Pay')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Post type tabs */}
        <div className="flex gap-2 mb-4">
          {(['all', 'hiring', 'seeking'] as const).map(type => (
            <Button key={type} variant={postType === type ? 'default' : 'outline'} size="sm" onClick={() => setPostType(type)}>
              {type === 'all' ? l('ທັງໝົດ', 'ทั้งหมด', 'All') : t(type === 'hiring' ? 'job.type.employer' : 'job.type.worker', language)}
            </Button>
          ))}
          <span className="text-sm text-muted-foreground self-center ml-2">
            {jobs.length} {l('ວຽກ', 'งาน', 'jobs')}
          </span>
        </div>

        <div className="space-y-3">
          {loading ? (
            <JobsListSkeleton count={PAGINATION.JOBS_PER_PAGE} />
          ) : jobs.length > 0 ? (
            jobs.map((job, i) => (<JobCard key={job.id} job={job} index={i} />))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <span className="text-5xl block mb-3">🔍</span>
              <p className="text-lg mb-1">{l('ບໍ່ພົບວຽກ', 'ไม่พบงาน', 'No jobs found')}</p>
              <p className="text-sm">{l('ລອງປັ່ນການກັນກອງຂອງທ່ານ', 'ลองปรับตัวกรองของคุณใหม่', 'Try adjusting your filters')}</p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default JobsPage;
