# WorkDay Quick Setup Guide

## 📋 Prerequisites

1. **Supabase Project** - Already set up
2. **Node.js/Bun** - For running the app
3. **Environment Variables** - `.env.local` with:
   ```
   VITE_SUPABASE_URL=your_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_key
   ```

---

## 🚀 Installation Steps

### Step 1: Install Dependencies

Add required packages for new features:

```bash
bun add @react-pdf/renderer xlsx
# or with npm:
npm install @react-pdf/renderer xlsx
```

### Step 2: Run Supabase Migrations

**OPTION A: Via Migration Files (Recommended)**

The migration files are already in:
- `supabase/migrations/20260404162000_setup_rls_policies.sql`
- `supabase/migrations/20260404163000_payment_system.sql`
- `supabase/migrations/20260404164000_overdue_system.sql`

Run with Supabase CLI:
```bash
supabase db push
```

**OPTION B: Via Supabase Dashboard**

Go to SQL Editor and run contents of each migration file in order.

### Step 3: Create Test Users

In Supabase Auth, create test accounts:

1. **Admin User**
   - Email: `admin@workday.com`
   - Password: `TestAdmin123!`
   - Then manually add to `user_roles` table with role='admin'

2. **Staff User**
   - Email: `staff@workday.com`
   - Password: `TestStaff123!`
   - Add to `user_roles` with role='staff'
   - Add to `staff` table with name and phone

3. **Cashier User**
   - Email: `cashier@workday.com`
   - Password: `TestCashier123!`
   - Add to `user_roles` with role='cashier'

### Step 4: Update App Routes

Update your `App.tsx` or routing file to include all new routes:

```tsx
import ProtectedRoute from '@/components/ProtectedRoute';
import LoginPage from '@/pages/LoginPage';
import Dashboard from '@/pages/Dashboard';
import PaymentPage from '@/pages/PaymentPage';
// ... other imports

// In your Routes:
<Routes>
  <Route path="/login" element={<LoginPage />} />
  
  <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/payments" element={<PaymentPage />} />
    <Route path="/jobs" element={<JobsPage />} />
    <Route path="/my-jobs" element={<MyJobsPage />} />
    <Route path="/staff" element={<StaffPage />} />
    <Route path="/reports" element={<ReportsPage />} />
    <Route path="/settings" element={<SettingsPage />} />
    <Route path="/profile" element={<ProfilePage />} />
  </Route>
</Routes>
```

### Step 5: Create AppLayout Component

Create `src/components/AppLayout.tsx`:

```tsx
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar, SidebarToggle } from '@/components/Sidebar';
import { Header } from '@/components/Header';

export const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 bg-white border-r">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="md:hidden absolute inset-0 z-40 bg-black/50">
          <div className="w-64 bg-white h-full">
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header items={<SidebarToggle onClick={() => setSidebarOpen(!sidebarOpen)} />} />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
```

### Step 6: Wrap App with AuthProvider

Update your main `App.tsx`:

```tsx
import { AuthProvider } from '@/hooks/useAuth';

function App() {
  return (
    <AuthProvider>
      {/* Your app routes */}
    </AuthProvider>
  );
}
```

---

## 📝 Create Test Data

### 1. Add Test Job

```sql
INSERT INTO public.jobs (
  job_number, customer_name, customer_phone, job_type,
  base_price, material_cost, discount, total_price,
  scheduled_date, job_status, created_by
) VALUES (
  'JOB-001', 'ສຸກຸນ ໂພ', '020123456', 'ວ່າງ',
  100000, 50000, 0, 150000,
  '2026-04-10', 'pending', 'YOUR_USER_ID'
);
```

### 2. Add Test Payment

```sql
INSERT INTO public.payments (
  job_id, amount, payment_method, reference_note
) VALUES (
  'JOB_UUID', 75000, 'cash', 'First deposit'
);
```

---

## 🧪 Testing Checklist

- [ ] Can login with test user
- [ ] Dashboard loads (no auth errors)
- [ ] Sidebar shows role-appropriate menu items
- [ ] Can navigate between pages
- [ ] PaymentForm validates input
- [ ] Recording payment updates job status
- [ ] OverdueBanner appears for overdue jobs
- [ ] Receipt PDF downloads correctly
- [ ] Excel export creates file with data
- [ ] Lao text displays properly

---

## 🔧 Troubleshooting

### RLS Policy Errors
If you get "row level security" errors:
1. Check that user has correct role in `user_roles` table
2. Verify RLS is enabled on the table
3. Check policy USING conditions match your user role

### PDF Font Issues (Lao script)
If Lao text doesn't show in PDF:
1. @react-pdf/renderer uses Google Fonts CDN
2. Ensure internet connection for font download
3. Alternative: Embed font as base64

### Payment Trigger Not Firing
1. Check that `payments` table has RLS enabled
2. Verify trigger is created: `SELECT * FROM information_schema.triggers`
3. Check Supabase logs for errors

### Missing Data in Exports
1. Ensure you have the right permissions (admin/cashier)
2. Check date range is correct
3. Verify payments exist for selected jobs

---

## 📚 Component Usage Examples

### Using PaymentForm
```tsx
<PaymentForm
  jobId={job.id}
  jobNumber={job.job_number}
  customerName={job.customer_name}
  totalPrice={job.total_price}
  amountPaid={job.amount_paid}
  onPaymentSuccess={() => refetchJob()}
/>
```

### Using OverdueBanner
```tsx
<OverdueBanner 
  onNavigateToPayments={() => navigate('/payments?filter=overdue')}
/>
```

### Using PaymentSummaryCards
```tsx
<PaymentSummaryCards />
```

### Using PaymentHistoryTable
```tsx
<PaymentHistoryTable 
  pageSize={20}
  filterOverdue={false}
  onRowClick={(payment) => console.log(payment)}
/>
```

### Using ExcelExportButton
```tsx
<ExcelExportButton 
  paymentRecords={payments}
  filename="payments-april.xlsx"
  variant="outline"
/>
```

---

## 🎯 Feature Overview

### Authentication
- ✅ Email/password login
- ✅ Role-based access (admin/staff/cashier)
- ✅ Protected routes
- ✅ Auto-redirect to dashboard on login
- ✅ Sign out functionality

### Payments
- ✅ Record payments with validation
- ✅ Auto-calculate payment status
- ✅ Payment history with real-time updates
- ✅ Multiple payment methods
- ✅ Receipt PDF generation

### Overdue Management
- ✅ Overdue job detection
- ✅ Severity-based color coding (1-3, 4-7, 8+ days)
- ✅ Dashboard banner alerts
- ✅ Overdue jobs view/table
- ✅ Action buttons (payment, call)

### Reporting & Export
- ✅ Payment summary cards
- ✅ Detailed payment history table
- ✅ Search and filter payments
- ✅ Excel export with formatting
- ✅ Monthly PDF reports
- ✅ Pagination support

---

## 🌐 Localization

All components automatically support **Lao** and **English** based on `useAppStore()` language setting.

To switch language:
```tsx
import { useAppStore } from '@/lib/store';

// In your component
const { language, setLanguage } = useAppStore();

// Change to English
setLanguage('en');
```

---

## 📞 Support

For issues or questions:
1. Check IMPLEMENTATION_GUIDE.md for detailed docs
2. Review component JSDoc comments
3. Check Supabase logs for database errors
4. Verify all migrations were applied

---

**Last Updated**: April 4, 2026
**WorkDay Version**: 1.0
