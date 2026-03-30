# Admin Panel Guide | ガイド Admin | ຄູ່ມືຜູ້ ຈັດການ

## Table of Contents
- [English](#english)
- [ไทย (Thai)](#thai)
- [ລາວ (Lao)](#lao)

---

## English

### 📋 Overview
The Admin Panel is a powerful management tool for administering jobs, users, and system monitoring. It provides real-time analytics, user management, KYC verification, coin transaction tracking, and more.

### 🔒 Prerequisites
- An active user account (email or phone authentication)
- Admin credentials (admin code)

---

### 📝 Step 1: Create an Admin Account

#### Method 1: Using Admin Login Page (Recommended)

1. **Navigate to Admin Login**
   - Go to `/admin-login` in your browser
   - Example: `http://localhost:5173/admin-login`

2. **Log in with Your Account**
   - If not logged in, click **"Go to Login"**
   - Sign up or log in using:
     - Email/Password
     - Phone number via OTP

3. **Enter Admin Code**
   - After successful login, you'll be prompted to enter the **Admin Code**
   - The admin code is stored in your `.env` file as `VITE_ADMIN_CODE`
   - Default value: `admin123` (change this in production!)

4. **Confirm**
   - Click the **Verify** button
   - You'll be redirected to `/admin`

#### Method 2: Direct Database Insertion (For Developers)

If you need to create an admin account directly in the database:

```sql
-- 1. Get the user ID of the account you want to make admin
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- 2. Insert an admin role record
INSERT INTO public.user_roles (user_id, role)
VALUES ('USER_ID_HERE', 'admin');

-- Example:
INSERT INTO public.user_roles (user_id, role)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'admin');
```

#### Method 3: Using Supabase CLI

```bash
# Login to Supabase
supabase link

# Access the database via psql
supabase db push

# Then run the SQL from Method 2
```

---

### 🚀 Using the Admin Panel

#### Dashboard Overview
Once logged in, you'll see tabs for different management sections:

1. **Dashboard Tab** (📊 Default)
   - Key Statistics:
     - Total Active Jobs
     - Total Users
     - Total Revenue
     - Coin Transactions
   - Interactive Charts:
     - Job Creation Trends (Bar Chart)
     - Job Status Distribution (Pie Chart)
     - Transaction Types (Pie Chart)

2. **Jobs Tab** (💼)
   - View all jobs posted on the platform
   - Search jobs by title or description
   - Features:
     - **Delete Jobs**: Remove inappropriate or duplicate listings
     - **Mark as Urgent**: Highlight important postings
     - **Mark as Featured**: Promote jobs to top listings
     - **Change Status**: Set jobs to active, closed, or expired
   - Display includes:
     - Job title, description, category
     - Salary information
     - Poster contact information
     - Job creation date

3. **Users Tab** 👥
   - View all user profiles
   - Search users by email
   - Manage user information:
     - Display name, phone, email
     - Coin balance management
     - KYC (Know Your Customer) verification status
   - Features:
     - **KYC Verification**:
       - View ID card photos
       - Check KYC status (pending, verified, rejected)
       - Approve or reject KYC submissions
     - **Top-up Coins**:
       - Add coins to user accounts
       - Track coin transaction history

4. **Transactions Tab** (💰)
   - View all coin transactions
   - Track transaction types:
     - Top-ups
     - Job postings
     - Job renewals
     - Refunds
   - Filter by date and amount

---

### 🔐 Security Best Practices

1. **Change Admin Code**
   ```bash
   # Update your .env file
   VITE_ADMIN_CODE=your-secure-code-here
   ```
   - Use a strong, unique code (minimum 8 characters)
   - Don't share or hardcode credentials
   - Change periodically

2. **Database Security**
   - Enable Row Level Security (RLS) on all tables
   - Only admins can modify other users' data
   - All sensitive operations are logged

3. **Secure Practices**
   - Never share admin credentials
   - Log out when finished
   - Monitor KYC submissions carefully
   - Review coin transactions regularly

---

### ⚙️ Configuration

#### Environment Variables
Create or update your `.env.local` file:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Admin Configuration
VITE_ADMIN_CODE=admin123
```

#### Database Setup
The admin system uses these tables:

- **user_roles**: Stores admin/moderator roles
- **profiles**: User profile information
- **jobs**: Job listings
- **coin_transactions**: Transaction history

---

### 🛠️ Troubleshooting

#### "Admin access required" Error
- Verify your user account is in the `user_roles` table with role='admin'
- Check that `VITE_ADMIN_CODE` matches what you entered
- Try logging out and back in

#### Admin Code Not Working
- Check `.env` file for `VITE_ADMIN_CODE` value
- Ensure no extra spaces or quotes
- Restart the development server

#### Cannot See User Data
- User might not have created a profile yet
- Check `profiles` table in Supabase
- Ensure RLS policies allow admin access

#### KYC Images Not Loading
- Verify images are uploaded to Supabase Storage
- Check the `id_card_url` field in the database
- Ensure storage bucket has proper permissions

---

### 📊 Admin Features Matrix

| Feature | Jobs | Users | Analytics | Security |
|---------|------|-------|-----------|----------|
| View All | ✅ | ✅ | ✅ | ✅ |
| Search | ✅ | ✅ | - | - |
| Delete | ✅ | - | - | ✅ |
| Edit Status | ✅ | - | - | - |
| Mark Urgent | ✅ | - | - | - |
| Feature Jobs | ✅ | - | - | - |
| Verify KYC | - | ✅ | - | ✅ |
| Top-up Coins | - | ✅ | - | - |
| View Analytics | - | - | ✅ | - |

---

## ไทย (Thai)

### 📋 ภาพรวม
แผงควบคุม Admin เป็นเครื่องมือการจัดการที่มีประสิทธิภาพสำหรับการบริหารงาน ผู้ใช้ และการตรวจสอบระบบ มีฟีเจอร์วิเคราะห์ข้อมูลแบบ Real-time การจัดการผู้ใช้ การยืนยัน KYC การติดตามธุรกรรมเหรียญ และอื่นๆ

### 🔒 ข้อกำหนดเบื้องต้น
- บัญชีผู้ใช้ที่ใช้งานอยู่ (การตรวจสอบสิทธิ์ทางอีเมลหรือโทรศัพท์)
- ข้อมูลประจำตัว Admin (รหัส Admin)

---

### 📝 ขั้นตอนที่ 1: สร้างบัญชี Admin

#### วิธีที่ 1: ใช้หน้า Admin Login (แนะนำ)

1. **นำเข้าสู่หน้า Admin Login**
   - ไปที่ `/admin-login` ในเบราว์เซอร์ของคุณ
   - ตัวอย่าง: `http://localhost:5173/admin-login`

2. **เข้าสู่ระบบด้วยบัญชีของคุณ**
   - หากยังไม่เข้าสู่ระบบ ให้คลิก **"ไปที่หน้าเข้าสู่ระบบ"**
   - ลงทะเบียนหรือเข้าสู่ระบบโดยใช้:
     - อีเมล/รหัสผ่าน
     - หมายเลขโทรศัพท์ผ่าน OTP

3. **ป้อนรหัส Admin**
   - หลังจากเข้าสู่ระบบสำเร็จ คุณจะได้รับพร้อมท์ให้ป้อนรหัส **Admin Code**
   - รหัส Admin เก็บไว้ในไฟล์ `.env` เป็น `VITE_ADMIN_CODE`
   - ค่าเริ่มต้น: `admin123` (เปลี่ยนในการใช้งานจริง!)

4. **ยืนยัน**
   - คลิกปุ่ม **ยืนยัน**
   - คุณจะถูกเปลี่ยนเส้นทางไปที่ `/admin`

#### วิธีที่ 2: การแทรกตรงในฐานข้อมูล (สำหรับนักพัฒนา)

หากคุณต้องการสร้างบัญชี Admin โดยตรงในฐานข้อมูล:

```sql
-- 1. รับ ID ผู้ใช้ของบัญชีที่คุณต้องการให้เป็น Admin
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- 2. แทรกบันทึกบทบาท Admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('USER_ID_HERE', 'admin');

-- ตัวอย่าง:
INSERT INTO public.user_roles (user_id, role)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'admin');
```

#### วิธีที่ 3: ใช้ Supabase CLI

```bash
# เข้าสู่ระบบ Supabase
supabase link

# เข้าถึงฐานข้อมูลผ่าน psql
supabase db push

# จากนั้นเรียกใช้ SQL จากวิธีที่ 2
```

---

### 🚀 การใช้แผงควบคุม Admin

#### ภาพรวมแดชบอร์ด
เมื่อเข้าสู่ระบบแล้ว คุณจะเห็นแท็บสำหรับส่วนการจัดการต่างๆ:

1. **แท็บแดชบอร์ด** (📊 ค่าเริ่มต้น)
   - สถิติที่สำคัญ:
     - งานทั้งหมดที่ใช้งานอยู่
     - ผู้ใช้ทั้งหมด
     - รายได้ทั้งหมด
     - ธุรกรรมเหรียญ
   - แผนภูมิโต้ตอบ:
     - แนวโน้มการสร้างงาน (แผนภูมิแท่ง)
     - การกระจายสถานะงาน (แผนภูมิวงกลม)
     - ประเภทธุรกรรม (แผนภูมิวงกลม)

2. **แท็บงาน** (💼)
   - ดูงานทั้งหมดที่โพสต์บนแพลตฟอร์ม
   - ค้นหางานตามชื่อหรือคำอธิบาย
   - ฟีเจอร์:
     - **ลบงาน**: ลบรายได้ที่ไม่เหมาะสมหรือซ้ำซ้อน
     - **ทำเครื่องหมายเป็นด่วน**: เน้นการโพสต์ที่สำคัญ
     - **ทำให้เด่น**: ส่งเสริมงานไปยังรายการสูงสุด
     - **เปลี่ยนสถานะ**: ตั้งงานเป็นใช้งานอยู่ ปิด หรือหมดอายุ
   - การแสดงผลรวม:
     - ชื่องาน คำอธิบาย หมวดหมู่
     - ข้อมูลเงินเดือน
     - ข้อมูลติดต่อของผู้โพส
     - วันที่สร้างงาน

3. **แท็บผู้ใช้** 👥
   - ดูโปรไฟล์ผู้ใช้ทั้งหมด
   - ค้นหาผู้ใช้ตามอีเมล
   - จัดการข้อมูลผู้ใช้:
     - ชื่อที่แสดง โทรศัพท์ อีเมล
     - การจัดการยอดคงเหลือเหรียญ
     - สถานะการยืนยัน KYC
   - ฟีเจอร์:
     - **การยืนยัน KYC**:
       - ดูรูปถ่ายบัตรประชาชน
       - ตรวจสอบสถานะ KYC (รอดำเนิน อนุมัติ ปฏิเสธ)
       - อนุมัติหรือปฏิเสธการส่งข้อมูล KYC
     - **เติมเหรียญ**:
       - เพิ่มเหรียญในบัญชีผู้ใช้
       - ติดตามประวัติธุรกรรมเหรียญ

4. **แท็บธุรกรรม** (💰)
   - ดูธุรกรรมเหรียญทั้งหมด
   - ติดตามประเภทธุรกรรม:
     - การเติมเงิน
     - การโพสต์โปรแกรม
     - การต่ออายุการโพสต์
     - เงินคืน
   - ตัวกรองตามวันที่และจำนวนเงิน

---

### 🔐 แนวปฏิบัติด้านความปลอดภัยที่ดีที่สุด

1. **เปลี่ยนรหัส Admin**
   ```bash
   # อัปเดตไฟล์ .env ของคุณ
   VITE_ADMIN_CODE=your-secure-code-here
   ```
   - ใช้รหัสที่ปลอดภัยและไม่ซ้ำกัน (อย่างน้อย 8 ตัวอักษร)
   - อย่าแชร์หรือฮาร์ดโค้ดข้อมูลประจำตัว
   - เปลี่ยนเป็นระยะ

2. **ความปลอดภัยของฐานข้อมูล**
   - เปิดใช้งาน Row Level Security (RLS) บนทุกตาราง
   - เฉพาะ Admin เท่านั้นที่สามารถแก้ไขข้อมูลของผู้ใช้อื่น
   - ทำการบันทึกการดำเนินการที่สำคัญทั้งหมด

3. **แนวปฏิบัติที่ปลอดภัย**
   - ไม่ปล่อยข้อมูลประจำตัว Admin
   - ออกจากระบบเมื่อเสร็จเรียบร้อย
   - ตรวจสอบการส่งข้อมูล KYC อย่างรอบคอบ
   - ตรวจสอบธุรกรรมเหรียญอย่างสม่ำเสมอ

---

### ⚙️ การกำหนดค่า

#### ตัวแปรสภาพแวดล้อม
สร้างหรืออัปเดตไฟล์ `.env.local` ของคุณ:

```env
# การกำหนดค่า Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# การกำหนดค่า Admin
VITE_ADMIN_CODE=admin123
```

#### การตั้งค่าฐานข้อมูล
ระบบ Admin ใช้ตารางเหล่านี้:

- **user_roles**: เก็บบทบาท admin/moderator
- **profiles**: ข้อมูลโปรไฟล์ผู้ใช้
- **jobs**: รายการงาน
- **coin_transactions**: ประวัติธุรกรรม

---

### 🛠️ การแก้ไขปัญหา

#### ข้อผิดพลาด "ต้องการสิทธิ์ Admin"
- ตรวจสอบว่าบัญชีผู้ใช้ของคุณอยู่ในตาราง `user_roles` พร้อม role='admin'
- ตรวจสอบว่า `VITE_ADMIN_CODE` ตรงกับสิ่งที่คุณป้อน
- ลองออกจากระบบและเข้าสู่ระบบอีกครั้ง

#### รหัส Admin ใช้งานไม่ได้
- ตรวจสอบไฟล์ `.env` สำหรับค่า `VITE_ADMIN_CODE`
- ตรวจสอบให้แน่ใจว่าไม่มีช่องว่างหรือเครื่องหมายอัญประลักษ์พิเศษ
- รีสตาร์ทเซิร์ฟเวอร์พัฒนา

#### ไม่สามารถดูข้อมูลผู้ใช้
- ผู้ใช้อาจยังไม่ได้สร้างโปรไฟล์
- ตรวจสอบตาราง `profiles` ใน Supabase
- ตรวจสอบให้แน่ใจว่านโยบาย RLS อนุญาตให้เข้าถึง Admin

#### บัตรประชาชน KYC โหลดไม่ได้
- ตรวจสอบว่ารูปภาพอัปโหลดไปยังที่เก็บข้อมูล Supabase
- ตรวจสอบฟิลด์ `id_card_url` ในฐานข้อมูล
- ตรวจสอบให้แน่ใจว่าที่เก็บข้อมูลมีสิทธิ์ที่เหมาะสม

---

## ລາວ (Lao)

### 📋 ພາບລວມ
ແຜນສະຕະເລດ Admin ແມ່ນເຄື່ອງມືການຈັດການທີ່ມີປະສິດທິພາບ ສໍາລັບການຈັດການວຽກ ຜູ້ໃຊ້ ແລະ ການວົກ検査ລະບົບ. ມັນສະຫນອງການວິເຄາະຂໍ້ມູນແບບ Real-time, ການຈັດການຜູ້ໃຊ້, ການຢືນຢັນ KYC, ການຕິດຕາມທຸລະກໍາເຫລັກ ແລະ ອື່ນໆ.

### 🔒 ຂໍ້ກຳນົດເບື້ອງຕົ້ນ
- ບັນຊີຜູ້ໃຊ້ທີ່ເປັນພາກຕົວຈິງ (ການຢືນຢັນທາງອີເມວ ຫຼື ໂທລະສັບ)
- ຂໍ້ມູນປະຈໍາຕົວ Admin (ລະຫັດ Admin)

---

### 📝 ຂັ້ນຕອນທີ 1: ສ້າງບັນຊີ Admin

#### ວິທີທີ 1: ໃຊ້ຫນ້າ Admin Login (ແນະນໍາ)

1. **ນໍາເຂົ້າສູ່ຫນ້າ Admin Login**
   - ໄປທີ່ `/admin-login` ໃນ ເບາະວເຊີ ຂອງທ່ານ
   - ຕົວຢ່າງ: `http://localhost:5173/admin-login`

2. **ເຂົ້າລົງທະບຽນດ້ວຍບັນຊີຂອງທ່ານ**
   - ຖ້າຍັງບໍ່ໄດ້ເຂົ້າລົງທະບຽນ ໃຫ້ຄລິກ **"ໄປຫາຫນ້າເຂົ້າລົງທະບຽນ"**
   - ລົງທະບຽນ ຫຼື ເຂົ້າລົງທະບຽນໂດຍໃຊ້:
     - ອີເມວ/ລະຫັດຜ່ານ
     - ໂທລະສັບຜ່ານ OTP

3. **ໃສ່ລະຫັດ Admin**
   - ຫຼັງຈາກເຂົ້າລົງທະບຽນສຳເລັດ ທ່ານຈະໄດ້ຮັບແຜນສະຕະເລດເພື່ອໃສ່ລະຫັດ **Admin Code**
   - ລະຫັດ Admin ເກັບໄວ້ໃນໄຟລ໌ `.env` ເປັນ `VITE_ADMIN_CODE`
   - ມູນຄ່າເລີ່ມຕົ້ນ: `admin123` (ປ່ຽນໃນການນໍາໃຊ້ຈິງ!)

4. **ຢືນຢັນ**
   - ຄລິກປຸ່ມ **ຢືນຢັນ**
   - ທ່ານຈະຖືກສົ່ງບໍ່ມາໄປຫາ `/admin`

#### ວິທີທີ 2: ການແທກໂດຍກົງໃນຖານຂໍ້ມູນ (ສໍາລັບນັກພັฒນາ)

ຖ້າທ່ານຕ້ອງການສ້າງບັນຊີ Admin ໂດຍກົງໃນຖານຂໍ້ມູນ:

```sql
-- 1. ຮັບ ID ຜູ້ໃຊ້ຂອງບັນຊີທີ່ທ່ານຕ້ອງການທີ່ຈະເປັນ Admin
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- 2. ແທກບັນທຶກບົດບາດ Admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('USER_ID_HERE', 'admin');

-- ຕົວຢ່າງ:
INSERT INTO public.user_roles (user_id, role)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'admin');
```

#### ວິທີທີ 3: ໃຊ້ Supabase CLI

```bash
# ເຂົ້າລົງທະບຽນ Supabase
supabase link

# ເຂົ້າເຖິງຖານຂໍ້ມູນຜ່ານ psql
supabase db push

# ຈາກນັ້ນໃຫ້ສະຫຼາຍ SQL ຈາກວິທີທີ 2
```

---

### 🚀 ການນໍາໃຊ້ແຜນສະຕະເລດ Admin

#### ພາບລວມແດັຊບອກ
ເມື່ອເຂົ້າລົງທະບຽນແລ້ວ ທ່ານຈະເຫັນແທັບສໍາລັບພາກສ່ວນການຈັດການທີ່ແຕກຕ່າງກັນ:

1. **ແທັບແດັຊບອກ** (📊 ມູນຄ່າເລີ່ມຕົ້ນ)
   - ສະຖິຕິທີ່ສໍາຄັນ:
     - ວຽກທັງໝົດທີ່ກໍາລັງດໍາເນີນການ
     - ຜູ້ໃຊ້ທັງໝົດ
     - ລາຍໄດ້ທັງໝົດ
     - ທຸລະກໍາເຫລັກ
   - ແຜນວາດ�ລະໂຄສາ:
     - ແນວໂນ້ມການສ້າງວຽກ (ແຜນ Bar)
     - ການແຈກຢາຍສະຖານະວຽກ (ແຜນ Pie)
     - ປະເພດທຸລະກໍາ (ແຜນ Pie)

2. **ແທັບວຽກ** (💼)
   - ເບິ່ງວຽກທັງໝົດທີ່ໂພສ໌ບົນເທະເພລະຕະຟອກ
   - ຊອກຫາວຽກໂດຍຊື່ຫຼືລາຍລະອຽດ
   - ລັກສະນະ:
     - **ລຶບວຽກ**: ລຶບລາຍລະອຽດທີ່ບໍ່ເຫມາະສົມ ຫຼື ຊ້ໍາている
     - **ໃຫ້ເຄື່ອງຫມາຍວ່າເປັນເຄື່ອງຫມາຍ**: ເນັ້ນລາຍລະອຽດທີ່ສໍາຄັນ
     - **ເຮັດໃຫ້두드곰**: ສົ່ງເສີມວຽກໄປຫາບັນຊີລາຍການႏ້ອຍ
     - **ປ່ຽນສະຖານະ**: ກໍານົດວຽກເປັນກໍາລັງດໍາເນີນການ ປິດ ຫຼື ໝົດອາຍຸ
   - ການສະແດງຜົນລວມ:
     - ຊື່ວຽກ ລາຍລະອຽດ ໝວດໝູ່
     - ຂໍ້ມູນເງິນເດືອນ
     - ຂໍ້ມູນຕິດຕໍ່ຂອງຜູ້ໂພສ໌
     - ວັນທີ່ສ້າງວຽກ

3. **ແທັບຜູ້ໃຊ້** 👥
   - ເບິ່ງໂຟໂຣກາຂອງຜູ້ໃຊ້ທັງໝົດ
   - ຊອກຫາຜູ້ໃຊ້ໂດຍອີເມວ
   - ຈັດການຂໍ້ມູນຜູ້ໃຊ້:
     - ຊື່ທີ່ສະແດງ ໂທລະສັບ ອີເມວ
     - ການຈັດການຍອດເທົ່າທາຣິ
     - ສະຖານະການຢືນຢັນ KYC
   - ລັກສະນະ:
     - **ການຢືນຢັນ KYC**:
       - ເບິ່ງຮູບຖ່າຍບັດປະຊາກາສ
       - ກວດສອບສະຖານະ KYC (ລໍາພັກ, ອະນຸມັດ, ປະຕິເສດ)
       - ອະນຸມັດ ຫຼື ປະຕິເສດການສົ່ງຂໍ້ມູນ KYC
     - **ເພີ່ມຫລັກເຫລັກ**:
       - ເພີ່ມເຫລັກໃສ່ບັນຊີຜູ້ໃຊ້
       - ຕິດຕາມປະວັດທຸລະກໍາເຫລັກ

4. **ແທັບທຸລະກໍາ** (💰)
   - ເບິ່ງທຸລະກໍາເຫລັກທັງໝົດ
   - ຕິດຕາມປະເພດທຸລະກໍາ:
     - ການເພີ່ມ
     - ການໂພສ໌ວຽກ
     - ການຕໍ່ອາຍຸການໂພສ໌
     - ການລົບລ້າງ
   - ຕົວກອງຕາມວັນທີ ແລະ ຈໍານວນ

---

### 🔐 ວິທີປະຕິບັດດ້ານຄວາມປອດໄພທີ່ດີ

1. **ປ່ຽນລະຫັດ Admin**
   ```bash
   # ອັບເດດໄຟລ໌ .env ຂອງທ່ານ
   VITE_ADMIN_CODE=your-secure-code-here
   ```
   - ໃຊ້ລະຫັດທີ່ປອດໄພ ແລະ ບໍ່ຊ້ໍາກັນ (ຫ່ວງຢ່າງໜ້ອຍ 8 ຕົວອັກສອນ)
   - ຢ່າແບ່ງປັນ ຫຼື hardcode ຂໍ້ມູນປະຈໍາຕົວ
   - ປ່ຽນເປັນສະໄໝະກາບ

2. **ຄວາມປອດໄພຂອງຖານຂໍ້ມູນ**
   - ເປີດໃຊ້ Row Level Security (RLS) ໃນທັງໝົດ ສາລະເລື່ອງ
   - ພຽງແຕ່ Admin ເທົ່ານັ້ນທີ່ສາມາດແກ້ໄຂຂໍ້ມູນຂອງຜູ້ໃຊ້ອື່ນໆ
   - ບັນທຶກການດໍາເນີນການທັງໝົດທີ່ສໍາຄັນ

3. **ວິທີປະຕິບັติທີ່ປອດໄພ**
   - ຢ່າແບ່ງປັນຂໍ້ມູນປະຈໍາຕົວ Admin
   - ອອກຈາກລະບົບເມື່ອສໍາເລັດ
   - ພິจາລະນາການສົ່ງຂໍ້ມູນ KYC ຢ່າງລະມັດລະວັງ
   - ກວດສອບທຸລະກໍາເຫລັກຢ່າງເປັນປົກະຕິ

---

### ⚙️ ການກຳນົດຄ่າ

#### ຕົວປ່ຽນສະвходе
ສ້າງ ຫຼື ອັບເດດ `.env.local` ຂອງທ່ານ:

```env
# ການກຳນົດຄ່າ Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# ການກຳນົດຄ່າ Admin
VITE_ADMIN_CODE=admin123
```

#### ການຕັ້ງຄ່າຖານຂໍ້ມູນ
ລະບົບ Admin ໃຊ້ສາລະເລື່ອງເຫຼົ່ານີ້:

- **user_roles**: ເກັບບົດບາດ admin/moderator
- **profiles**: ຂໍ້ມູນໂປຣໂຟໂລ້ຜູ້ໃຊ້
- **jobs**: ບັນຊີລາຍວຽກ
- **coin_transactions**: ປະວັດທຸລະກໍາ

---

### 🛠️ ການແກ້ໄຂບັນຫາ

#### ຄວາມຜິດພາດ "ຕ້ອງການສິດທາ Admin"
- ກວດສອບວ່າບັນຊີຜູ້ໃຊ້ຂອງທ່ານຢູ່ໃນສາລະເລື່ອງ `user_roles` ກັບ role='admin'
- ກວດສອບວ່າ `VITE_ADMIN_CODE` ກົງກັບສິ່ງທີ່ທ່ານປ້ອນ
- ព្យាយាមອອກຈາກລະບົບ ແລະ ເຂົ້າລົງທະບຽນອີກຄັ້ງ

#### ລະຫັດ Admin ບໍ່ມີຜົນ
- ກວດສອບໄຟລ໌ `.env` ສໍາລັບຄ່າ `VITE_ADMIN_CODE`
- ຕັ້ງໃຈໃຫ້ສະຖಿਰຂ່າວສານໄຕສາບ ຄືບໍ່ມີ
- ສຸ່ມເລີ່ມຕົ້ນເຄື່ອງ​ແມ່ບານ

#### ບໍ່ສາມາດເບິ່ງຂໍ້ມູນຜູ້ໃຊ້
- ຜູ້ໃຊ້ອາດຈະຍັງບໍ່ໄດ້ສ້າງໂປຣໂຟໂລ້
- ກວດສອບສາລະເລື່ອງ `profiles` ໃນ Supabase
- ກວດສອບວ່ານະໂຍບາຍ RLS ອະນຸມັດການເຂົ້າເຖິງ Admin

#### ບັດປະຊາກາສ KYC ບໍ່ໂຫລດ
- ກວດສອບວ່າຮູບຖ່າຍອັບໂຫລດໄປຫາບ່ອນເກັບຮັກສາ Supabase
- ກວດສອບບ່ອນ `id_card_url` ໃນຖານຂໍ້ມູນ
- ກວດສອບວ່າບ່ອນເກັບຮັກສາມີສິດທາທີ່ເໝາະສົມ

---

## License
This guide is part of the Lao Job Hub project.

---

**Last Updated**: March 30, 2026
**Version**: 1.0
