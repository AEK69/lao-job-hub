import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Download, Workflow } from 'lucide-react';

const FLOW_DIAGRAM = `flowchart TD
  classDef user fill:#fce7f3,stroke:#db2777,color:#831843
  classDef worker fill:#dbeafe,stroke:#2563eb,color:#1e3a8a
  classDef system fill:#fef3c7,stroke:#d97706,color:#78350f
  classDef store fill:#dcfce7,stroke:#16a34a,color:#14532d

  E((Employer)):::user
  W((Worker)):::worker
  A((Admin)):::user

  E -- "Post job + salary" --> J[Jobs Table]:::store
  W -- "Browse jobs" --> J
  W -- "Accept job" --> RPC1{{accept_job_escrow}}:::system
  RPC1 -- "Hold coins" --> P[Profiles<br/>coin_balance]:::store
  RPC1 -- "Insert hold tx" --> CT[coin_transactions]:::store
  RPC1 -- "Notify employer" --> N[Notifications]:::store

  E -- "Confirm done" --> RPC2{{confirm_job_completion}}:::system
  W -- "Confirm done" --> RPC2
  RPC2 -- "If both ok: payout" --> P
  RPC2 -- "Insert payout tx" --> CT
  RPC2 -- "Notify both" --> N

  E -- "Cancel" --> RPC3{{cancel_accepted_job}}:::system
  W -- "Cancel" --> RPC3
  RPC3 -- "Refund employer" --> P
  RPC3 -- "Insert refund tx" --> CT

  E <-- "Chat" --> M[Messages]:::store
  W <-- "Chat" --> M
  M -- "Realtime" --> N

  A -- "Top-up / Deduct" --> RPC4{{admin_topup_coins}}:::system
  RPC4 --> P
  RPC4 --> CT

  A -- "Approve / Reject" --> RPC5{{admin_update_kyc}}:::system
  RPC5 --> P

  P -. "Trigger" .-> AL[audit_logs]:::store
  J -. "Trigger" .-> AL
`;

const ER_DIAGRAM = `erDiagram
  profiles ||--o{ jobs : "posts"
  profiles ||--o{ jobs : "accepts"
  profiles ||--o{ coin_transactions : "from/to"
  profiles ||--o| user_roles : "has"
  jobs ||--o{ job_images : "has"
  jobs ||--o{ payments : "receives"
  jobs ||--o{ reviews : "rated by"
  jobs ||--o{ notifications : "triggers"
  conversations ||--o{ messages : "contains"
  profiles ||--o{ conversations : "participates"
  profiles ||--o{ reviews : "writes"
  profiles ||--o{ notifications : "receives"
`;

const ESCROW_SEQ = `sequenceDiagram
  autonumber
  participant E as Employer
  participant W as Worker
  participant DB as Supabase RPC
  participant C as Coins (profiles)
  participant N as Notifications

  E->>DB: Post job (salary X)
  W->>DB: accept_job_escrow(job)
  DB->>C: Deduct X from Employer (HOLD)
  DB->>N: Notify Employer

  par Both confirm
    E->>DB: confirm_job_completion
    W->>DB: confirm_job_completion
  end
  DB->>C: Credit X to Worker
  DB->>N: Notify both (completed)

  alt Cancellation
    E->>DB: cancel_accepted_job
    DB->>C: Refund X to Employer
    DB->>N: Notify Worker
  end
`;

const diagrams: Record<string, { title: string; code: string }> = {
  flow: { title: 'Data Flow', code: FLOW_DIAGRAM },
  er: { title: 'Entity Relationship', code: ER_DIAGRAM },
  escrow: { title: 'Escrow Sequence', code: ESCROW_SEQ },
};

export function ContextDiagram() {
  const [active, setActive] = useState<string>('flow');
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose', flowchart: { htmlLabels: true } });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      try {
        const id = 'mmd-' + active + '-' + Date.now();
        const { svg } = await mermaid.render(id, diagrams[active].code);
        if (!cancelled) setSvg(svg);
      } catch (e) {
        if (!cancelled) setSvg(`<pre style="color:red">${(e as Error).message}</pre>`);
      }
    };
    render();
    return () => { cancelled = true; };
  }, [active]);

  const download = () => {
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `workday33-${active}.svg`;
    a.click();
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Workflow className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Context Diagram — การไหลของข้อมูล</h3>
        </div>
        <Button size="sm" variant="outline" onClick={download} className="gap-1">
          <Download className="h-4 w-4" /> SVG
        </Button>
      </div>

      <Tabs value={active} onValueChange={setActive}>
        <TabsList>
          {Object.entries(diagrams).map(([k, v]) => (
            <TabsTrigger key={k} value={k}>{v.title}</TabsTrigger>
          ))}
        </TabsList>
        {Object.keys(diagrams).map((k) => (
          <TabsContent key={k} value={k}>
            <div ref={ref} className="overflow-auto rounded-lg border bg-white p-4 min-h-[400px]" dangerouslySetInnerHTML={{ __html: svg }} />
          </TabsContent>
        ))}
      </Tabs>

      <p className="text-xs text-muted-foreground">
        ใช้สำหรับนำเสนอ — สามารถดาวน์โหลดเป็น SVG เพื่อนำไปใส่สไลด์/เอกสารได้
      </p>
    </Card>
  );
}

export default ContextDiagram;