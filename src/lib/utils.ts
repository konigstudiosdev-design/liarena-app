import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility to merge tailwind classes with clsx logic
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Ensure it's available for non-module evaluation if needed
// @ts-ignore
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.cn = cn;
}
