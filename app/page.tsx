"use client";
import Image from "next/image";
import { useState } from "react";
import Link from "next/link";

export default function Home() {
  const [indoorOpen, setIndoorOpen] = useState(false);
  const [outdoorOpen, setOutdoorOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);
  const [activeButton, setActiveButton] = useState<number | null>(null);
  const [buttonStatus, setButtonStatus] = useState<{[key: string]: keyof typeof statusColors}>({});

  const indoorWarehouses = ['A', 'B', 'C', 'D'];
  const outdoorWarehouses = ['E', 'F', 'G', 'H'];
  const statusColors = {
    green: { color: 'bg-green-500', percentage: '0%' },
    yellow: { color: 'bg-yellow-500', percentage: '25%' },
    orange: { color: 'bg-orange-500', percentage: '50%' },
    red: { color: 'bg-red-500', percentage: '100%' }
  };

  const handleWarehouseClick = (warehouse: string, isIndoor: boolean) => {
    setSelectedWarehouse(warehouse);
    setIndoorOpen(false);
    setOutdoorOpen(false);
    
    // Initialize status for sections of this warehouse if not already set
    if (!buttonStatus[`${warehouse}1`]) {
      const newStatus: {[key: string]: keyof typeof statusColors} = {
        [`${warehouse}1`]: 'green',
        [`${warehouse}2`]: 'green',
        [`${warehouse}3`]: 'green',
        [`${warehouse}4`]: 'green'
      };
      setButtonStatus(prev => ({...prev, ...newStatus}));
    }
  };

  const handleButtonClick = (warehouse: string, sectionNumber: number) => {
    const buttonKey = `${warehouse}${sectionNumber}`;
    setActiveButton(sectionNumber);
    
    // Cycle through status colors
    const statusOrder: (keyof typeof statusColors)[] = ['green', 'yellow', 'orange', 'red'];
    const currentStatus = buttonStatus[buttonKey];
    const currentIndex = currentStatus ? statusOrder.indexOf(currentStatus) : -1;
    const nextIndex = (currentIndex + 1) % statusOrder.length;
    
    setButtonStatus(prev => ({
      ...prev,
      [buttonKey]: statusOrder[nextIndex]
    }));
  };

  const calculatePercentage = (statuses: string[]) => {
    if (statuses.length === 0) return 0;
    
    let total = 0;
    let count = 0;
    statuses.forEach(status => {
      if (status) {
        total += parseInt(statusColors[status as keyof typeof statusColors].percentage);
        count++;
      }
    });
    return count > 0 ? Math.round(total / count) : 0;
  };

  const calculateTotalPercentage = () => {
    return calculatePercentage(Object.values(buttonStatus));
  };

  const calculateIndoorPercentage = () => {
    const indoorStatuses = indoorWarehouses.flatMap(warehouse => 
      [1, 2, 3, 4].map(section => buttonStatus[`${warehouse}${section}`])
    ).filter(Boolean);
    return calculatePercentage(indoorStatuses);
  };

  const calculateOutdoorPercentage = () => {
    const outdoorStatuses = outdoorWarehouses.flatMap(warehouse => 
      [1, 2, 3, 4].map(section => buttonStatus[`${warehouse}${section}`])
    ).filter(Boolean);
    return calculatePercentage(outdoorStatuses);
  };

  return (
    <div className="min-h-screen p-8 flex flex-col items-center justify-center">
      <h1 className="text-[32pt] font-[family-name:var(--font-geist-mono)] mb-12 bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent tracking-tight">
        Port of Mobile Test
      </h1>
      <div className="mb-8 px-6 py-4 rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 shadow-md">
        <p className="font-[family-name:var(--font-geist-sans)] text-lg">
          <span className="font-semibold">Total Port Utilization: </span>
          <span className="text-emerald-600 dark:text-emerald-400">{calculateTotalPercentage()}%</span>
          <span className="mx-4">|</span>
          <span className="font-semibold">Indoor: </span>
          <span className="text-blue-600 dark:text-blue-400">{calculateIndoorPercentage()}%</span>
          <span className="mx-4">|</span>
          <span className="font-semibold">Outdoor: </span>
          <span className="text-purple-600 dark:text-purple-400">{calculateOutdoorPercentage()}%</span>
        </p>
      </div>
      <div className="flex flex-col gap-8 items-center">
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
                {indoorWarehouses.map((warehouse) => (
                  <div 
                    key={warehouse}
                    onClick={() => handleWarehouseClick(warehouse, true)}
                    className="flex items-center justify-between px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <span>Warehouse {warehouse}</span>
                  </div>
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
                {outdoorWarehouses.map((warehouse) => (
                  <div 
                    key={warehouse}
                    onClick={() => handleWarehouseClick(warehouse, false)}
                    className="flex items-center justify-between px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <span>Warehouse {warehouse}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {selectedWarehouse && (
          <div className="w-full">
            <h2 className="text-2xl font-bold mb-4 text-center">Warehouse {selectedWarehouse}</h2>
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(sectionNumber => {
                const buttonKey = `${selectedWarehouse}${sectionNumber}`;
                return (
                  <button 
                    key={sectionNumber}
                    onClick={() => handleButtonClick(selectedWarehouse, sectionNumber)}
                    className={`px-8 py-6 text-white rounded-lg transition-colors text-2xl font-semibold ${
                      buttonStatus[buttonKey] 
                        ? statusColors[buttonStatus[buttonKey]].color
                        : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                  >
                    Section {String.fromCharCode(64 + sectionNumber)}
                    {buttonStatus[buttonKey] && (
                      <span className="ml-2">
                        ({statusColors[buttonStatus[buttonKey]].percentage})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
