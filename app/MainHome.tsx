"use client";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

export default function MainHome({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-start mb-8">
          <div className="flex flex-col items-center flex-1">
            <h1 className="text-3xl font-bold mb-4">Port of Mobile</h1>
            <Image
              src="/port of mobile logo.png"
              alt="Port of Mobile Logo"
              width={200}
              height={100}
              className="mb-4"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-full"
            size="icon"
          >
            {theme === "dark" ? (
              <SunIcon className="h-5 w-5" />
            ) : (
              <MoonIcon className="h-5 w-5" />
            )}
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
} 