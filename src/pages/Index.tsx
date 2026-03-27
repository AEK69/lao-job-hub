import { useAppStore } from '@/lib/store';
import { t, districts, categories } from '@/lib/i18n';
import { motion } from 'framer-motion';
import { Search, MapPin, Briefcase, Users, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { JobCard } from '@/components/JobCard';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const Index = () => {
  const { language, jobs } = useAppStore();
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('all');

  const filtered = jobs.filter(job => {
    const matchSearch = !search || job.title.toLowerCase().includes(search.toLowerCase());
    const matchDistrict = district === 'all' || job.district === district;
    return matchSearch && matchDistrict;
  }).slice(0, 6);

  const stats = [
    { icon: <Briefcase className="h-6 w-6" />, value: jobs.length, label: t('stats.jobs', language) },
    { icon: <Users className="h-6 w-6" />, value: jobs.filter(j => j.postType === 'hiring').length, label: t('stats.employers', language) },
    { icon: <TrendingUp className="h-6 w-6" />, value: jobs.filter(j => j.postType === 'seeking').length, label: t('stats.seekers', language) },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/10 via-primary-light to-accent/10 py-16 md:py-24">
        <div className="container text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.span
              className="text-5xl mb-4 inline-block"
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              🎯
            </motion.span>
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              {t('hero.title', language)}
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              {t('hero.subtitle', language)}
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link to="/jobs">
                <Button size="lg" className="gap-2 text-base">
                  <Search className="h-5 w-5" />
                  {t('hero.findJob', language)}
                </Button>
              </Link>
              <Link to="/post">
                <Button size="lg" variant="outline" className="gap-2 text-base border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                  ✍️ {t('hero.postJob', language)}
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-8 border-b">
        <div className="container flex justify-center gap-8 md:gap-16 flex-wrap">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="text-center"
            >
              <div className="flex items-center justify-center text-primary mb-1">{stat.icon}</div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="py-8">
        <div className="container">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((cat) => (
              <Link key={cat.id} to={`/jobs?category=${cat.id}`}>
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl bg-card border min-w-[80px] hover:border-primary hover:shadow-md transition-all cursor-pointer"
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="text-xs font-medium whitespace-nowrap">
                    {t(`cat.${cat.id}` as any, language)}
                  </span>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Search + Jobs */}
      <section className="flex-1 pb-12">
        <div className="container">
          <div className="flex gap-3 mb-6 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('search.placeholder', language)}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={district} onValueChange={setDistrict}>
              <SelectTrigger className="w-[180px]">
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

          {jobs.length > 6 && (
            <div className="text-center mt-6">
              <Link to="/jobs">
                <Button variant="outline">{t('nav.findJobs', language)} →</Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
