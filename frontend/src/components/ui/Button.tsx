import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

const variantClass: Record<ButtonVariant, string> = {
  primary: 'bg-cyan-500 text-slate-950 hover:bg-cyan-400',
  secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
  danger: 'bg-rose-500 text-white hover:bg-rose-400',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100'
};

const Button = ({ children, variant = 'primary', className = '', fullWidth = false, ...props }: Props) => {
  return (
    <button
      type="button"
      {...props}
      className={[
        'rounded-xl px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60',
        variantClass[variant],
        fullWidth ? 'w-full' : '',
        className
      ].join(' ')}
    >
      {children}
    </button>
  );
};

export default Button;
