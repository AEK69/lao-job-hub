import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Database, RefreshCw, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';

type TableName =
  | 'profiles' | 'user_roles' | 'jobs' | 'job_images' | 'conversations'
  | 'messages' | 'payments' | 'coin_transactions' | 'notifications'
  | 'reviews' | 'services' | 'staff' | 'company_settings' | 'audit_logs';

const TABLES: { name: TableName; desc: string; cat: string }[] = [
  { name: 'profiles', desc: 'ข้อมูลผู้ใช้ + ยอดเหรียญ + KYC', cat: 'User' },
  { name: 'user_roles', desc: 'บทบาท admin/staff/cashier', cat: 'User' },
  { name: 'jobs', desc: 'งานโพสต์ + escrow + สถานะ', cat: 'Job' },
  { name: 'job_images', desc: 'รูปก่อน/หลังของแต่ละงาน', cat: 'Job' },
  { name: 'payments', desc: 'การชำระเงินจริง (cash/bcel)', cat: 'Money' },
  { name: 'coin_transactions', desc: 'การเคลื่อนไหวเหรียญทั้งหมด', cat: 'Money' },
  { name: 'conversations', desc: 'ห้องแชทระหว่างผู้ใช้', cat: 'Chat' },
  { name: 'messages', desc: 'ข้อความในห้องแชท', cat: 'Chat' },
  { name: 'notifications', desc: 'การแจ้งเตือนทั้งหมด', cat: 'Chat' },
  { name: 'reviews', desc: 'รีวิว + คะแนนหลังจบงาน', cat: 'Quality' },
  { name: 'services', desc: 'บริการ/หมวดงานที่ระบบรองรับ', cat: 'Config' },
  { name: 'staff', desc: 'รายชื่อพนักงาน (ของบริษัทเอง)', cat: 'Config' },
  { name: 'company_settings', desc: 'ข้อมูลบริษัทสำหรับใบเสร็จ', cat: 'Config' },
  { name: 'audit_logs', desc: 'บันทึกการเปลี่ยนแปลงทั้งหมด', cat: 'Audit' },
];

interface Row { name: TableName; count: number; loading: boolean; }

export function DatabaseExplorer() {
  const [rows, setRows] = useState<Row[]>(TABLES.map(t => ({ name: t.name, count: 0, loading: true })));
  const [active, setActive] = useState<TableName | null>(null);
  const [sample, setSample] = useState<any[]>([]);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [filter, setFilter] = useState('');

  const loadCounts = async () => {
    setRows(TABLES.map(t => ({ name: t.name, count: 0, loading: true })));
    const results = await Promise.all(
      TABLES.map(async t => {
        const { count } = await supabase.from(t.name as any).select('*', { count: 'exact', head: true });
        return { name: t.name, count: count || 0, loading: false };
      })
    );
    setRows(results);
  };

  useEffect(() => { loadCounts(); }, []);

  const loadSample = async (table: TableName) => {
    setActive(table);
    setSampleLoading(true);
    const { data, error } = await supabase.from(table as any).select('*').limit(5).order('created_at' as any, { ascending: false });
    if (error) toast.error(error.message);
    setSample(data || []);
    setSampleLoading(false);
  };

  const exportTable = async (table: TableName) => {
    const { data, error } = await supabase.from(table as any).select('*').limit(1000);
    if (error) return toast.error(error.message);
    if (!data?.length) return toast.info('ไม่มีข้อมูล');
    const headers = Object.keys(data[0]);
    const esc = (v: any) => v == null ? '' : `"${(typeof v === 'object' ? JSON.stringify(v) : String(v)).replace(/"/g, '""')}"`;
    const csv = [headers.join(','), ...data.map(r => headers.map(h => esc((r as any)[h])).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${table}.csv`;
    a.click();
    toast.success(`Exported ${table} (${data.length})`);
  };

  const filtered = TABLES.filter(t =>
    !filter || t.name.includes(filter.toLowerCase()) || t.desc.includes(filter) || t.cat.toLowerCase().includes(filter.toLowerCase())
  );

  const totalRows = rows.reduce((s, r) => s + r.count, 0);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Database Explorer</h3>
            <Badge variant="secondary">{TABLES.length} tables</Badge>
            <Badge className="bg-primary">{totalRows.toLocaleString()} rows</Badge>
          </div>
          <Button size="sm" variant="outline" onClick={loadCounts} className="gap-1">
            <RefreshCw className="h-4 w-4" /> รีเฟรช
          </Button>
        </div>
        <Input placeholder="ค้นหาตาราง..." value={filter} onChange={e => setFilter(e.target.value)} className="mb-3" />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(t => {
            const row = rows.find(r => r.name === t.name);
            return (
              <Card key={t.name} className={`p-3 cursor-pointer transition hover:shadow-md ${active === t.name ? 'ring-2 ring-primary' : ''}`} onClick={() => loadSample(t.name)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <code className="font-semibold text-sm">{t.name}</code>
                      <Badge variant="outline" className="text-[10px]">{t.cat}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.desc}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold text-primary">{row?.loading ? '…' : row?.count.toLocaleString()}</div>
                    <div className="text-[10px] text-muted-foreground">rows</div>
                  </div>
                </div>
                <div className="flex gap-1 mt-2">
                  <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs flex-1" onClick={(e) => { e.stopPropagation(); loadSample(t.name); }}>
                    <Eye className="h-3 w-3" /> ดู
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs flex-1" onClick={(e) => { e.stopPropagation(); exportTable(t.name); }}>
                    <Download className="h-3 w-3" /> CSV
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </Card>

      {active && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              ตัวอย่างข้อมูล: <code className="text-primary">{active}</code>
              <Badge variant="secondary">{sample.length} rows</Badge>
            </h4>
            <Button size="sm" variant="outline" onClick={() => exportTable(active)} className="gap-1">
              <Download className="h-3 w-3" /> Export 1000
            </Button>
          </div>
          {sampleLoading ? (
            <p className="text-sm text-muted-foreground text-center py-6">กำลังโหลด...</p>
          ) : sample.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">ไม่มีข้อมูลในตารางนี้</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    {Object.keys(sample[0]).map(k => (
                      <th key={k} className="px-2 py-1.5 text-left font-semibold whitespace-nowrap">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sample.map((row, i) => (
                    <tr key={i} className="border-t">
                      {Object.values(row).map((v, j) => {
                        const str = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
                        return (
                          <td key={j} className="px-2 py-1.5 max-w-[200px] truncate" title={str}>
                            {v == null ? <span className="text-muted-foreground">null</span> : typeof v === 'object' ? <code className="text-[10px]">{str.slice(0, 60)}</code> : str.slice(0, 80)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

export default DatabaseExplorer;