import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amountCents: number, currency = "USD") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: currency,
  }).format(amountCents / 100);
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}
