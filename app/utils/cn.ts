import { ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combines multiple class names together and efficiently handles Tailwind CSS classes
 * @param inputs Class names or conditions to be merged
 * @returns Merged class string optimized for Tailwind CSS
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
} 