import type { ReactNode, ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
}

export function Button({ children, className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white shadow-sm shadow-brand-900/20 hover:bg-brand-500 disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
