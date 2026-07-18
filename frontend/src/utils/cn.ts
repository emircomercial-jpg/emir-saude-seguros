import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Combina classes Tailwind de forma segura (usado por todos os componentes
// Shadcn UI). Convenção oficial da biblioteca.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
