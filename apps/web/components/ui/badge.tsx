import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary/10 text-primary',
        ready: 'border-transparent bg-[hsl(var(--ready))]/12 text-[hsl(var(--ready))]',
        critical: 'border-transparent bg-[hsl(var(--critical))]/14 text-[hsl(var(--critical))]',
        muted: 'border-transparent bg-muted text-muted-foreground',
        outline: 'text-muted-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export function Badge({ className, variant, ...props }:
  React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
