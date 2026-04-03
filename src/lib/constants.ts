/**
 * Job posting cost configuration
 */
export const JOB_POSTING_COSTS = {
  URGENT: 5,
  FEATURED: 10,
  COMBINED: 15, // URGENT + FEATURED
  BASE: 0,
} as const;

/**
 * Pagination settings
 */
export const PAGINATION = {
  JOBS_PER_PAGE: 20,
  JOBS_HOME_PREVIEW: 6,
  JOBS_ADMIN_PAGE_SIZE: 50,
  USERS_ADMIN_PAGE_SIZE: 20,
} as const;

/**
 * Debounce delay (in milliseconds)
 */
export const DEBOUNCE_DELAY = {
  SEARCH:  300,
  FILTER: 300,
  AUTO_SAVE: 500,
} as const;

/**
 * Cache TTL (in milliseconds)
 */
export const CACHE_TTL = {
  USER_PROFILE: 5 * 60 * 1000, // 5 minutes
  JOB_LIST: 2 * 60 * 1000, // 2 minutes
  JOB_DETAIL: 10 * 60 * 1000, // 10 minutes
} as const;

/**
 * Time constants
 */
export const TIME_CONSTANTS = {
  MINUTES_PER_HOUR: 60,
  HOURS_PER_DAY: 24,
  DAYS_PER_WEEK: 7,
} as const;

/**
 * Calculate job posting cost
 */
export function calculateJobPostingCost(options: {
  isUrgent: boolean;
  isFeatured: boolean;
}): number {
  let cost = 0;
  if (options.isUrgent) cost += JOB_POSTING_COSTS.URGENT;
  if (options.isFeatured) cost += JOB_POSTING_COSTS.FEATURED;
  return cost;
}

/**
 * Format salary with locale
 */
export function formatSalary(salary: string | number): string {
  return Number(salary).toLocaleString() + '₭';
}

export function formatCoins(amount: number | string): string {
  return Number(amount).toLocaleString() + '₭';
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: never[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Time ago formatter
 */
export function timeAgo(date: string, lang: 'en' | 'th' | 'lo'): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) {
    return lang === 'en' ? 'now' : lang === 'th' ? 'เดี๋ยวนี้' : 'ດຽວນີ້';
  }
  if (minutes < 60) {
    return lang === 'en' ? `${minutes}m ago` : lang === 'th' ? `${minutes} นาทีที่แล้ว` : `${minutes} ນາທີກ່ອນ`;
  }
  if (hours < 24) {
    return lang === 'en' ? `${hours}h ago` : lang === 'th' ? `${hours} ชม.ที่แล้ว` : `${hours} ຊມ.ກ່ອນ`;
  }
  return lang === 'en' ? `${days}d ago` : lang === 'th' ? `${days} วันที่แล้ว` : `${days} ມື້ກ່ອນ`;
}
