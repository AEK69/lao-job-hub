import { useAppStore } from '@/lib/store';
import { t, districts, categories } from '@/lib/i18n';
import { useState } from 'react';
import { Search, MapPin, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { JobCard } from '@/components/JobCard';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useSearchParams } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const JobsPage = () => {
  const { language, jobs } = useAppStore();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('all');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [postType, setPostType] = useState<'all' | 'hiring' | 'seeking'>('all');

  const filtered = jobs.filter(job => {
    const matchSearch = !search || job.title.toLowerCase().includes(search.toLowerCase());
    const matchDistrict = district === 'all' || job.district === district;
    const matchCategory = category === 'all' || job.category === category;
    const matchType = postType === 'all' || job.postType === postType;
    return matchSearch && matchDistrict && matchCategory && matchType;
  });

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
              <MapPin className="h-4 w-4 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('search.allDistricts', language)}</SelectItem>
              {districts.map(d => (
                <SelectItem key={d.id} value={d.id}>{d[language] || d.lo}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('search.allCategories', language)}</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.icon} {t(`cat.${cat.id}` as any, language)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 mb-4">
          {(['all', 'hiring', 'seeking'] as const).map(type => (
            <Button
              key={type}
              variant={postType === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPostType(type)}
            >
              {type === 'all'
                ? (language === 'en' ? 'All' : language === 'th' ? 'ทั้งหมด' : 'ທັງໝົດ')
                : t(type === 'hiring' ? 'job.type.employer' : 'job.type.worker', language)
              }
            </Button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.map((job, i) => (
            <JobCard key={job.id} job={job} index={i} />
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <span className="text-4xl block mb-2">🔍</span>
              {language === 'en' ? 'No jobs found' : language === 'th' ? 'ไม่พบงาน' : 'ບໍ່ພົບວຽກ'}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default JobsPage;
