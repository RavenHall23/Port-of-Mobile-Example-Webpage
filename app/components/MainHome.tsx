'use client';

import { ThemeToggle } from './ThemeToggle';

interface MainHomeProps {
  children: React.ReactNode;
}

export default function MainHome({ children }: MainHomeProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      {children}
    </div>
  );
} 