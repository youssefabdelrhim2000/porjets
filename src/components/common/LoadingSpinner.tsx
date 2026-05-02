// ============================================
// LoadingSpinner Component
// Reusable loading indicator
// ============================================

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  message?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-3',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className = '',
  message,
}) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div 
        className={`${sizeClasses[size]} border-primary border-t-transparent rounded-full animate-spin`}
      />
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
};
