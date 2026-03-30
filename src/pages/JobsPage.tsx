import { useAppStore, Job } from '@/lib/store';
import { t, districts, categories } from '@/lib/i18n';
import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Filter } from 'lucide-react';
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

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(search);
    }, DEBOUNCE_DELAY.SEARCH);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [search]);

  // Load jobs
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('jobs')
          .select('*')
          .eq('status', 'active')
          .order('is_featured', { ascending: false })
          .order('created_at', { ascending: false });

        if (district !== 'all') query = query.eq('district', district);
        if (category !== 'all') query = query.eq('category', category);
        if (postType !== 'all') query = query.eq('post_type', postType);
        if (searchQuery) query = query.ilike('title', `%${searchQuery}%`);

        const { data } = await query;
        setJobs((data as Job[]) || []);
      } catch (error) {
        console.error('Error loading jobs:', error);
        setJobs([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [district, category, postType, searchQuery]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="container py-6 flex-1">
        <h1 className="text-2xl font-bold mb-6">{t('nav.findJobs', language)}</h1>

        <div className="flex gap-3 mb-6 flex-wrap">
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

        <div className="flex gap-2 mb-4">
          {(['all', 'hiring', 'seeking'] as const).map(type => (
            <Button key={type} variant={postType === type ? 'default' : 'outline'} size="sm" onClick={() => setPostType(type)}>
              {type === 'all' ? (language === 'en' ? 'All' : language === 'th' ? 'ทั้งหมด' : 'ທັງໝົດ') : t(type === 'hiring' ? 'job.type.employer' : 'job.type.worker', language)}
            </Button>
          ))}
        </div>

        <div className="space-y-3">
          {loading ? (
            <JobsListSkeleton count={PAGINATION.JOBS_PER_PAGE} />
          ) : jobs.length > 0 ? (
            jobs.map((job, i) => (<JobCard key={job.id} job={job} index={i} />))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <span className="text-5xl block mb-3">🔍</span>
              <p className="text-lg mb-1">{language === 'en' ? 'No jobs found' : language === 'th' ? 'ไม่พบงาน' : 'ບໍ່ພົບວຽກ'}</p>
              <p className="text-sm">{language === 'en' ? 'Try adjusting your filters' : language === 'th' ? 'ลองปรับตัวกรองของคุณใหม่' : 'ລອງປັ່ນການກັນກອງຂອງທ່ານ'}</p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default JobsPage;
