import { useAppStore, Job } from '@/lib/store';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, SlidersHorizontal, X, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { JobCard } from '@/components/JobCard';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { JobsListSkeleton } from '@/components/LoadingSkeleton';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { daysOverdue } from '@/lib/utils';

const PAGE_SIZE = 25;
const STATUSES = ['all', 'pending', 'active', 'quality_check', 'payment', 'done', 'cancel'];

const JobsPage = () => {
  const { language } = useAppStore();
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [staffFilter, setStaffFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<{ id: string; name: string }[]>([]);
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const l = (lo: string, en: string) => language === 'en' ? en : lo;
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    Promise.all([
      supabase.from('services').select('id, name').eq('active', true),
      supabase.from('staff').select('id, name'),
    ]).then(([svc, stf]) => {
      setServices((svc.data || []) as any);
      setStaffList((stf.data || []) as any);
    });
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [search]);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('jobs').select('*', { count: 'exact' }).order('created_at', { ascending: false });
    if (statusFilter !== 'all') query = query.eq('job_status', statusFilter);
    if (typeFilter !== 'all') query = query.eq('job_type', typeFilter);
    if (staffFilter !== 'all') query = query.eq('assigned_staff_id', staffFilter);
    if (dateFrom) query = query.gte('scheduled_date', dateFrom);
    if (dateTo) query = query.lte('scheduled_date', dateTo);
    if (debouncedSearch) query = query.or(`customer_name.ilike.%${debouncedSearch}%,job_number.ilike.%${debouncedSearch}%,customer_phone.ilike.%${debouncedSearch}%`);
    query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    const { data, count } = await query;
    setJobs((data as Job[]) || []);
    setTotalCount(count || 0);
    setLoading(false);
  }, [statusFilter, typeFilter, staffFilter, dateFrom, dateTo, debouncedSearch, page]);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const clearFilters = () => { setSearch(''); setStatusFilter('all'); setTypeFilter('all'); setStaffFilter('all'); setDateFrom(''); setDateTo(''); setPage(0); };

  const activeCount = jobs.filter(j => j.job_status === 'active').length;
  const doneCount = jobs.filter(j => j.job_status === 'done').length;
  const unpaidCount = jobs.filter(j => j.payment_status !== 'paid' && j.job_status !== 'cancel').length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const from = page * PAGE_SIZE + 1;
  const to = Math.min((page + 1) * PAGE_SIZE, totalCount);

  const toggleSelect = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const exportSelected = () => {
    const rows = jobs.filter(j => selected.has(j.id));
    const csv = [['Job#', 'Customer', 'Phone', 'Type', 'Date', 'Total', 'Paid', 'Status'].join(','),
      ...rows.map(j => [j.job_number, j.customer_name, j.customer_phone, j.job_type, j.scheduled_date, j.total_price, j.amount_paid, j.job_status].join(','))
    ].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'jobs-export.csv'; a.click();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="container py-6 flex-1">
        <h1 className="text-2xl font-bold mb-4">{l('ລາຍການງານ', 'Job List')}</h1>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: l('ທັງໝົດ', 'Total'), value: totalCount, color: 'text-foreground' },
            { label: l('ດຳເນີນ', 'Active'), value: activeCount, color: 'text-blue-600' },
            { label: l('ສຳເລັດ', 'Done'), value: doneCount, color: 'text-green-600' },
            { label: l('ຄ້າງຈ່າຍ', 'Unpaid'), value: unpaidCount, color: 'text-red-600' },
          ].map((s, i) => (
            <Card key={i} className="p-3 text-center">
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </Card>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={l('ຄົ້ນຫາ ຊື່, ເລກ ID, ເບີໂທ...', 'Search name, ID, phone...')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[140px]"><SlidersHorizontal className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s === 'all' ? l('ທຸກສະຖານະ', 'All Status') : s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder={l('ປະເພດ', 'Type')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{l('ທຸກປະເພດ', 'All Types')}</SelectItem>
              {services.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={staffFilter} onValueChange={v => { setStaffFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder={l('ພະນັກງານ', 'Staff')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{l('ທຸກຄົນ', 'All Staff')}</SelectItem>
              {staffList.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); }} className="w-[140px]" placeholder="From" />
          <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0); }} className="w-[140px]" placeholder="To" />
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1"><X className="h-4 w-4" /> {l('ລ້າງ', 'Clear')}</Button>
        </div>

        {/* Bulk Actions */}
        {isAdmin && selected.size > 0 && (
          <div className="flex items-center gap-3 bg-primary/10 p-3 rounded-lg mb-4">
            <span className="text-sm font-medium">{l(`ເລືອກ ${selected.size} ລາຍການ`, `${selected.size} selected`)}</span>
            <Button size="sm" variant="outline" onClick={exportSelected} className="gap-1"><Download className="h-4 w-4" /> Export</Button>
          </div>
        )}

        {/* Results */}
        <div className="text-sm text-muted-foreground mb-3">
          {totalCount > 0 ? `${from}-${to} ${l('ຈາກ', 'of')} ${totalCount}` : ''}
        </div>

        <div className="space-y-3">
          {loading ? <JobsListSkeleton count={6} /> : jobs.length > 0 ? jobs.map((job, i) => {
            const overdue = job.scheduled_date && job.job_status !== 'done' && job.job_status !== 'cancel' ? daysOverdue(job.scheduled_date) : 0;
            return (
              <div key={job.id} className={`flex items-start gap-2 ${overdue > 0 ? 'border-l-4 border-l-destructive rounded-lg' : ''}`}>
                {isAdmin && <Checkbox checked={selected.has(job.id)} onCheckedChange={() => toggleSelect(job.id)} className="mt-5 ml-1" />}
                <div className="flex-1 relative" onClick={() => navigate(`/jobs/${job.id}`)} role="button">
                  <JobCard job={job} index={i} />
                  {overdue > 0 && <Badge variant="destructive" className="absolute top-2 right-2 text-[10px]">{l(`ເກີນ ${overdue} ວັນ`, `${overdue}d overdue`)}</Badge>}
                </div>
              </div>
            );
          }) : (
            <div className="text-center py-12 text-muted-foreground">
              <span className="text-5xl block mb-3">🔍</span>
              <p className="mb-3">{l('ບໍ່ພົບລາຍການ', 'No results found')}</p>
              <Button variant="outline" onClick={clearFilters}>{l('ລ້າງການຄົ້ນຫາ', 'Clear filters')}</Button>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(0, Math.min(totalPages - 5, page - 2)) + i;
              return p < totalPages ? (
                <Button key={p} variant={p === page ? 'default' : 'outline'} size="sm" onClick={() => setPage(p)}>{p + 1}</Button>
              ) : null;
            })}
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default JobsPage;
