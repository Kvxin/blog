import * as React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: 'default' | 'outline' | 'ghost';
}

export function Button({ className, variant = 'default', ...props }: ButtonProps) {
	return (
		<button
			className={cn(
				'inline-flex items-center justify-center rounded-none px-5 py-2.5 text-xs font-black uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:pointer-events-none disabled:opacity-50 border-2',
				variant === 'default' && 'border-black bg-black text-white hover:bg-[#e60000] hover:border-[#e60000]',
				variant === 'outline' && 'border-black bg-white text-black hover:bg-black hover:text-white',
				variant === 'ghost' && 'border-transparent text-black hover:bg-[#f2f2f2] hover:text-[#e60000]',
				className
			)}
			{...props}
		/>
	);
}
