import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string, language: string = "lo"): string {
  try {
    const date = new Date(dateString);
    const locale = language === "en" ? enUS : laLocale;
    return format(date, "dd MMM yyyy HH:mm", { locale });
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString;
  }
}

export function formatCurrency(amount: number, language: string = "lo"): string {
  const symbol = language === "en" ? "kip" : "ກີບ";
  return `${amount.toLocaleString("en-US")} ${symbol}`;
}

export function daysOverdue(scheduledDate: string): number {
  const scheduled = new Date(scheduledDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  scheduled.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - scheduled.getTime()) / (1000 * 60 * 60 * 24));
}
