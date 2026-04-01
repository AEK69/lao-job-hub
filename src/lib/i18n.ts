export type Language = 'lo' | 'th' | 'en';

export const translations = {
  // Navigation
  'nav.home': { lo: 'ໜ້າຫຼັກ', th: 'หน้าแรก', en: 'Home' },
  'nav.findJobs': { lo: 'ຫາວຽກ', th: 'หางาน', en: 'Find Jobs' },
  'nav.postJob': { lo: 'ໂພສວຽກ', th: 'โพสต์งาน', en: 'Post Job' },
  'nav.admin': { lo: 'ຫຼັງບ້ານ', th: 'หลังบ้าน', en: 'Admin' },

  // Hero
  'hero.title': { lo: 'ຫາວຽກ ຫາຄົນ ໄວ ໃນວຽງຈັນ', th: 'หางาน หาคน ไวในเวียงจัน', en: 'Find Jobs Fast in Vientiane' },
  'hero.subtitle': { lo: 'ແພລດຟອມຫາວຽກ ແລະ ຈ້າງງານ ສຳລັບນະຄອນຫຼວງວຽງຈັນ ຟຣີ!', th: 'แพลตฟอร์มหางานและจ้างงานสำหรับนครหลวงเวียงจัน ฟรี!', en: 'Free job platform for Vientiane Capital!' },
  'hero.findJob': { lo: 'ຫາວຽກ', th: 'หางาน', en: 'Find Jobs' },
  'hero.postJob': { lo: 'ໂພສວຽກ', th: 'โพสต์งาน', en: 'Post Job' },

  // Search
  'search.placeholder': { lo: 'ຄົ້ນຫາວຽກ...', th: 'ค้นหางาน...', en: 'Search jobs...' },
  'search.district': { lo: 'ເລືອກເມືອງ', th: 'เลือกเมือง', en: 'Select District' },
  'search.allDistricts': { lo: 'ທຸກເມືອງ', th: 'ทุกเมือง', en: 'All Districts' },
  'search.category': { lo: 'ໝວດໝູ່', th: 'หมวดหมู่', en: 'Category' },
  'search.allCategories': { lo: 'ທຸກໝວດ', th: 'ทุกหมวด', en: 'All Categories' },
  'search.btn': { lo: 'ຄົ້ນຫາ', th: 'ค้นหา', en: 'Search' },

  // Job card
  'job.salary': { lo: 'ຄ່າຕອບແທນ', th: 'ค่าตอบแทน', en: 'Compensation' },
  'job.location': { lo: 'ສະຖານທີ່', th: 'สถานที่', en: 'Location' },
  'job.urgent': { lo: 'ດ່ວນ', th: 'ด่วน', en: 'Urgent' },
  'job.new': { lo: 'ໃໝ່', th: 'ใหม่', en: 'New' },
  'job.detail': { lo: 'ລາຍລະອຽດ', th: 'รายละเอียด', en: 'Details' },
  'job.apply': { lo: 'ສະໝັກ', th: 'สมัคร', en: 'Apply' },
  'job.contact': { lo: 'ຕິດຕໍ່', th: 'ติดต่อ', en: 'Contact' },
  'job.perDay': { lo: 'ກີບ/ມື້', th: 'กีบ/วัน', en: 'KIP/day' },
  'job.perMonth': { lo: 'ກີບ/ເດືອນ', th: 'กีบ/เดือน', en: 'KIP/month' },
  'job.postedBy': { lo: 'ໂພສໂດຍ', th: 'โพสต์โดย', en: 'Posted by' },
  'job.type.employer': { lo: 'ຜູ້ຈ້າງງານ', th: 'ผู้จ้างงาน', en: 'Employer' },
  'job.type.worker': { lo: 'ຜູ້ຫາງານ', th: 'ผู้หางาน', en: 'Job Seeker' },

  // Post form
  'post.title': { lo: 'ຫົວຂໍ້ວຽກ', th: 'หัวข้องาน', en: 'Job Title' },
  'post.description': { lo: 'ລາຍລະອຽດ', th: 'รายละเอียด', en: 'Description' },
  'post.salary': { lo: 'ຄ່າຕອບແທນ', th: 'ค่าตอบแทน', en: 'Compensation' },
  'post.phone': { lo: 'ເບີໂທ', th: 'เบอร์โทร', en: 'Phone' },
  'post.address': { lo: 'ທີ່ຢູ່', th: 'ที่อยู่', en: 'Address' },
  'post.submit': { lo: 'ໂພສວຽກ', th: 'โพสต์งาน', en: 'Post Job' },
  'post.type': { lo: 'ປະເພດການໂພສ', th: 'ประเภทการโพสต์', en: 'Post Type' },
  'post.hiring': { lo: 'ຈ້າງງານ (ຫາຄົນ)', th: 'จ้างงาน (หาคน)', en: 'Hiring (Find Workers)' },
  'post.seeking': { lo: 'ຫາວຽກ (ສະເໜີໂຕ)', th: 'หางาน (เสนอตัว)', en: 'Seeking Work' },
  'post.success': { lo: 'ໂພສສຳເລັດ!', th: 'โพสต์สำเร็จ!', en: 'Posted successfully!' },

  // Categories
  'cat.restaurant': { lo: 'ຮ້ານອາຫານ', th: 'ร้านอาหาร', en: 'Restaurant' },
  'cat.construction': { lo: 'ກໍ່ສ້າງ', th: 'ก่อสร้าง', en: 'Construction' },
  'cat.delivery': { lo: 'ສົ່ງເຄື່ອງ', th: 'ส่งของ', en: 'Delivery' },
  'cat.cleaning': { lo: 'ທຳຄວາມສະອາດ', th: 'ทำความสะอาด', en: 'Cleaning' },
  'cat.shop': { lo: 'ຮ້ານຄ້າ', th: 'ร้านค้า', en: 'Shop' },
  'cat.factory': { lo: 'ໂຮງງານ', th: 'โรงงาน', en: 'Factory' },
  'cat.office': { lo: 'ຫ້ອງການ', th: 'สำนักงาน', en: 'Office' },
  'cat.other': { lo: 'ອື່ນໆ', th: 'อื่นๆ', en: 'Other' },

  // Admin
  'admin.title': { lo: 'ຫຼັງບ້ານ', th: 'หลังบ้าน', en: 'Admin Panel' },
  'admin.jobs': { lo: 'ລາຍການວຽກ', th: 'รายการงาน', en: 'Job Listings' },
  'admin.delete': { lo: 'ລຶບ', th: 'ลบ', en: 'Delete' },
  'admin.edit': { lo: 'ແກ້ໄຂ', th: 'แก้ไข', en: 'Edit' },
  'admin.total': { lo: 'ວຽກທັງໝົດ', th: 'งานทั้งหมด', en: 'Total Jobs' },

  // Footer
  'footer.about': { lo: 'ກ່ຽວກັບເຮົາ', th: 'เกี่ยวกับเรา', en: 'About Us' },
  'footer.aboutText': { lo: 'ແພລດຟອມຫາວຽກ ແລະ ຈ້າງງານ ຟຣີ ສຳລັບຄົນລາວ ໃນນະຄອນຫຼວງວຽງຈັນ', th: 'แพลตฟอร์มหางานและจ้างงานฟรี สำหรับคนลาวในนครหลวงเวียงจัน', en: 'Free job platform for Lao people in Vientiane Capital' },
  'footer.contact': { lo: 'ຕິດຕໍ່', th: 'ติดต่อ', en: 'Contact' },

  // Language
  'lang.lo': { lo: 'ລາວ', th: 'ลาว', en: 'Lao' },
  'lang.th': { lo: 'ໄທ', th: 'ไทย', en: 'Thai' },
  'lang.en': { lo: 'ອັງກິດ', th: 'อังกฤษ', en: 'English' },

  // Stats
  'stats.jobs': { lo: 'ວຽກທັງໝົດ', th: 'งานทั้งหมด', en: 'Total Jobs' },
  'stats.employers': { lo: 'ຜູ້ຈ້າງງານ', th: 'ผู้จ้างงาน', en: 'Employers' },
  'stats.seekers': { lo: 'ຜູ້ຫາງານ', th: 'ผู้หางาน', en: 'Job Seekers' },
} as const;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, lang: Language): string {
  return translations[key]?.[lang] || translations[key]?.['lo'] || key;
}

// Districts of Vientiane Capital
export const districts = [
  { id: 'chanthabouly', lo: 'ຈັນທະບູລີ', th: 'จันทะบุลี', en: 'Chanthabouly' },
  { id: 'sikhottabong', lo: 'ສີໂຄດຕະບອງ', th: 'สีโคตตะบอง', en: 'Sikhottabong' },
  { id: 'xaysetha', lo: 'ໄຊເສດຖາ', th: 'ไชเศรษฐา', en: 'Xaysetha' },
  { id: 'sisattanak', lo: 'ສີສັດຕະນາກ', th: 'สีสัตตนาค', en: 'Sisattanak' },
  { id: 'naxaithong', lo: 'ນາຊາຍທອງ', th: 'นาซายทอง', en: 'Naxaithong' },
  { id: 'xaythany', lo: 'ໄຊທານີ', th: 'ไชธานี', en: 'Xaythany' },
  { id: 'hadxaifong', lo: 'ຫາດຊາຍຟອງ', th: 'หาดซายฟอง', en: 'Hadxaifong' },
  { id: 'sangthong', lo: 'ສັງທອງ', th: 'สังทอง', en: 'Sangthong' },
  { id: 'pakngum', lo: 'ປາກງື່ມ', th: 'ปากงึม', en: 'Pakngum' },
];

export const categories = [
  { id: 'restaurant', icon: '🍜' },
  { id: 'construction', icon: '🏗️' },
  { id: 'delivery', icon: '🛵' },
  { id: 'cleaning', icon: '🧹' },
  { id: 'shop', icon: '🏪' },
  { id: 'factory', icon: '🏭' },
  { id: 'office', icon: '💼' },
  { id: 'other', icon: '📋' },
] as const;
