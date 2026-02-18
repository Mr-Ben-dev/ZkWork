import { FC } from 'react';

export const LoadingSpinner: FC<{ size?: number; className?: string }> = ({
  size = 24,
  className = '',
}) => (
  <div className={`flex items-center justify-center ${className}`}>
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="31.4 31.4"
        strokeLinecap="round"
        className="text-accent/30"
      />
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="15.7 47.1"
        strokeLinecap="round"
        className="text-accent"
      />
    </svg>
  </div>
);
