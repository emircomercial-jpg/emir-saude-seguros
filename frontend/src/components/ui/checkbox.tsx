import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

// Checkbox simples e acessível (sem dependência do Radix Checkbox, para
// manter o número de pacotes reduzido).
export function Checkbox({ checked, onCheckedChange, disabled, className, ...rest }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'h-5 w-5 shrink-0 rounded border border-input flex items-center justify-center transition-colors',
        checked ? 'bg-primary border-primary text-primary-foreground' : 'bg-background',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
      {...rest}
    >
      {checked && <Check size={14} />}
    </button>
  );
}
