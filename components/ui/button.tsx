import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-xl font-bold transition-all active:scale-95 duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none shadow-sm',
          {
            primary:
              'bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary',
            secondary:
              'border-2 border-primary bg-transparent text-foreground hover:bg-primary/10 focus:ring-primary',
            ghost: 'text-foreground hover:bg-muted focus:ring-muted',
            danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive',
          }[variant],
          {
            sm: 'px-3 py-1.5 text-sm',
            md: 'px-6 py-2.5 text-base',
            lg: 'px-8 py-3.5 text-lg uppercase tracking-wider',
          }[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };
