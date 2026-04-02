## ແຜນການປັບປຸງລະບົບ (4 ຟີເຈີ)

### 1. ລະບົບຮັບງານ + ຈ່າຍຫຼຽນ
- ເພີ່ມສະຖານະວຽກ: `active` → `accepted` → `completed`
- ຜູ້ຮັບງານກົດ "ຮັບງານ" → ຜູ້ຈ້າງຄອນເຟີມ → ງານຫາຍຈາກໜ້າຫຼັກ
- ເມື່ອເຮັດວຽກແລ້ວ → ຈ່າຍຫຼຽນຕາມລາຄາທີ່ຕົກລົງ
- ເພີ່ມ column `accepted_by`, `accepted_at` ໃນ table jobs

### 2. KYC ບັງຄັບ + Admin ປັບປຸງ  
- ຫ້າມໂພສ/ຮັບງານ/ແຊັດ ຖ້າ KYC ຍັງບໍ່ approved
- Admin: ແກ້ໄຂວຽກ, ລົບຜູ້ໃຊ້, export CSV
- Admin: ເຕີມຫຼຽນ 1,000 - 1,000,000 ກີບ (input ອິດສະຫຼະ)

### 3. Email ແຈ້ງເຕືອນ
- ສົ່ງ email ເມື່ອ KYC ຖືກ approve
- ສົ່ງ email ເມື່ອມີຂໍ້ຄວາມໃໝ່

### Database Migration
- ເພີ່ມ `accepted_by UUID`, `accepted_at TIMESTAMPTZ` ໃນ jobs table
