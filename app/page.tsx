"use client";
import Image from "next/image";
import { useState } from "react";
import Link from "next/link";

export default function Home() {
  const [indoorOpen, setIndoorOpen] = useState(false);
  const [outdoorOpen, setOutdoorOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);
  const [activeButton, setActiveButton] = useState<number | null>(null);
  const [buttonStatus, setButtonStatus] = useState<{[key: number]: keyof typeof statusColors}>({});

  const warehouses = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const statusColors = {
    green: { color: 'bg-green-500', percentage: '0%' },
    yellow: { color: 'bg-yellow-500', percentage: '25%' },
    orange: { color: 'bg-orange-500', percentage: '50%' },
    red: { color: 'bg-red-500', percentage: '100%' }
  };

  return (
    <div className="min-h-screen p-8 flex flex-col items-center justify-center">
      <h1 className="text-[20pt] font-[family-name:var(--font-geist-sans)] mb-12">
        Port of Mobile Test
      </h1>
      <div className="mb-8 px-6 py-4 rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 shadow-md">
        <p className="font-[family-name:var(--font-geist-sans)] text-lg">
          <span className="font-semibold">Total Port Utilization: </span>
          <span className="text-emerald-600 dark:text-emerald-400">85%</span>
          <span className="mx-4">|</span>
          <span className="font-semibold">Indoor: </span>
          <span className="text-blue-600 dark:text-blue-400">100%</span>
          <span className="mx-4">|</span>
          <span className="font-semibold">Outdoor: </span>
          <span className="text-purple-600 dark:text-purple-400">15%</span>
        </p>
      </div>
      <div className="flex flex-col gap-8 items-center">
        <div className="flex gap-8">
          <Link href="/indoor">
            <button 
              className="px-12 py-6 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-[family-name:var(--font-geist-sans)] text-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              Indoor Warehouse
            </button>
          </Link>
          <Link href="/outdoor">
            <button 
              className="px-12 py-6 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-400 text-white font-[family-name:var(--font-geist-sans)] text-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              Outdoor Warehouse
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
