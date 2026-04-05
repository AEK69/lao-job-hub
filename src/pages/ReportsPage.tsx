import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

interface ReportData {
  totalJobs: number; doneJobs: number; cancelJobs: number; totalRevenue: number;
  byType: { type: string; count: number; revenue: number }[];
  byStaff: { name: string; done: number; active: number; avgPrice: number }[];
  byMethod: { method: string; count: number; amount: number }[];
}

const ReportsPage = () => {
  const { language } = useAppStore();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const l = (lo: string, en: string) => language === 'en' ? en : lo;

  const generate = async () => {
    setLoading(true);
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0);
    const end = `${year}-${String(month).padStart(2, '0')}-${endDate.getDate()}`;

    const [jobsRes, paymentsRes, staffRes] = await Promise.all([
      supabase.from('jobs').select('*').gte('created_at', start).lte('created_at', end + 'T23:59:59'),
      supabase.from('payments').select('*').gte('created_at', start).lte('created_at', end + 'T23:59:59'),
      supabase.from('staff').select('id, name'),
    ]);

    const jobs = jobsRes.data || [];
    const payments = paymentsRes.data || [];
    const staffList = staffRes.data || [];

    // By type
    const typeMap = new Map<string, { count: number; revenue: number }>();
    jobs.forEach(j => {
      const t = typeMap.get(j.job_type) || { count: 0, revenue: 0 };
      t.count++; t.revenue += j.total_price || 0;
      typeMap.set(j.job_type, t);
    });

    // By staff
    const staffMap = new Map<string, { done: number; active: number; total: number; count: number }>();
    jobs.forEach(j => {
      if (!j.assigned_staff_id) return;
      const s = staffMap.get(j.assigned_staff_id) || { done: 0, active: 0, total: 0, count: 0 };
      if (j.job_status === 'done') s.done++;
      else if (j.job_status !== 'cancel') s.active++;
      s.total += j.total_price || 0; s.count++;
      staffMap.set(j.assigned_staff_id, s);
    });

    // By method
    const methodMap = new Map<string, { count: number; amount: number }>();
    payments.forEach(p => {
      const m = methodMap.get(p.method) || { count: 0, amount: 0 };
      m.count++; m.amount += p.amount || 0;
      methodMap.set(p.method, m);
    });

    setData({
      totalJobs: jobs.length,
      doneJobs: jobs.filter(j => j.job_status === 'done').length,
      cancelJobs: jobs.filter(j => j.job_status === 'cancel').length,
      totalRevenue: payments.reduce((s, p) => s + (p.amount || 0), 0),
      byType: Array.from(typeMap.entries()).map(([type, v]) => ({ type, ...v })),
      byStaff: Array.from(staffMap.entries()).map(([id, v]) => ({
        name: staffList.find(s => s.id === id)?.name || id.slice(0, 8),
        done: v.done, active: v.active, avgPrice: v.count ? Math.round(v.total / v.count) : 0,
      })),
      byMethod: Array.from(methodMap.entries()).map(([method, v]) => ({ method, ...v })),
    });
    setLoading(false);
  };

  const exportCSV = () => {
    if (!data) return;
    const lines = [
      `Report ${month}/${year}`,
      `Total Jobs,${data.totalJobs}`, `Done,${data.doneJobs}`, `Cancelled,${data.cancelJobs}`, `Revenue,${data.totalRevenue}`,
      '', 'By Type', 'Type,Count,Revenue',
      ...data.byType.map(t => `${t.type},${t.count},${t.revenue}`),
      '', 'By Staff', 'Staff,Done,Active,Avg Price',
      ...data.byStaff.map(s => `${s.name},${s.done},${s.active},${s.avgPrice}`),
      '', 'By Method', 'Method,Count,Amount',
      ...data.byMethod.map(m => `${m.method},${m.count},${m.amount}`),
    ];
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' })); a.download = `workday-report-${year}-${String(month).padStart(2, '0')}.csv`; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
          <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
          <SelectContent>{Array.from({ length: 12 }, (_, i) => <SelectItem key={i + 1} value={String(i + 1)}>{l(`ເດືອນ ${i + 1}`, `Month ${i + 1}`)}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
          <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
          <SelectContent>{[2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={generate} disabled={loading}>{loading ? '...' : l('ສ້າງລາຍງານ', 'Generate')}</Button>
        {data && <Button variant="outline" onClick={exportCSV} className="gap-1"><Download className="h-4 w-4" /> Export CSV</Button>}
      </div>

      {data && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: l('ງານທັງໝົດ', 'Total Jobs'), value: data.totalJobs },
              { label: l('ສຳເລັດ', 'Done'), value: data.doneJobs },
              { label: l('ຍົກເລີກ', 'Cancelled'), value: data.cancelJobs },
              { label: l('ລາຍຮັບ', 'Revenue'), value: `${(data.totalRevenue / 1000).toFixed(0)}k₭` },
            ].map((s, i) => (
              <Card key={i} className="p-4 text-center">
                <div className="text-xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </Card>
            ))}
          </div>

          {/* By Type Chart */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" /> {l('ແຍກຕາມປະເພດ', 'By Service Type')}</CardTitle></CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.byType}>
                    <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => `${v.toLocaleString()}₭`} />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Staff Performance */}
          <Card>
            <CardHeader><CardTitle className="text-base">{l('ຜົນງານພະນັກງານ', 'Staff Performance')}</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b"><th className="text-left py-2">{l('ພະນັກງານ', 'Staff')}</th><th className="text-center">{l('ສຳເລັດ', 'Done')}</th><th className="text-center">{l('ດຳເນີນ', 'Active')}</th><th className="text-right">{l('ສະເລ່ຍ/ງານ', 'Avg/Job')}</th></tr></thead>
                  <tbody>{data.byStaff.map((s, i) => (
                    <tr key={i} className="border-b"><td className="py-2">{s.name}</td><td className="text-center">{s.done}</td><td className="text-center">{s.active}</td><td className="text-right">{s.avgPrice.toLocaleString()}₭</td></tr>
                  ))}</tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* By Payment Method */}
          <Card>
            <CardHeader><CardTitle className="text-base">{l('ແຍກຕາມວິທີຈ່າຍ', 'By Payment Method')}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {data.byMethod.map((m, i) => (
                  <div key={i} className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="font-bold">{m.amount.toLocaleString()}₭</div>
                    <div className="text-xs text-muted-foreground">{m.method} ({m.count})</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ReportsPage;
