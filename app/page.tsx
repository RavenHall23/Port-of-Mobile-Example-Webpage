import Image from "next/image";
"use client";
import { useState } from "react";

export default function Home() {
  const [indoorOpen, setIndoorOpen] = useState(false);
  const [outdoorOpen, setOutdoorOpen] = useState(false);

  const warehouses = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  return (
    <div className="min-h-screen p-8 flex flex-col items-center justify-center">
      <h1 className="text-[20pt] font-[family-name:var(--font-geist-sans)] mb-12">
        Port of Mobile Test
      </h1>
      <div className="flex gap-8">
        <div className="relative">
          <button 
            onClick={() => setIndoorOpen(!indoorOpen)}
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-[family-name:var(--font-geist-sans)] text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            Indoor Warehouse
          </button>
          {indoorOpen && (
            <div className="absolute mt-2 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg">
              {warehouses.map((warehouse) => (
                <button
                  key={warehouse}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Warehouse {warehouse}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="relative">
          <button 
            onClick={() => setOutdoorOpen(!outdoorOpen)}
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-400 text-white font-[family-name:var(--font-geist-sans)] text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            Outdoor Warehouse
          </button>
          {outdoorOpen && (
            <div className="absolute mt-2 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg">
              {warehouses.map((warehouse) => (
                <button
                  key={warehouse}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Warehouse {warehouse}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
