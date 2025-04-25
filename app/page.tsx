"use client";
import { useState, useEffect } from "react";
import { useTheme } from 'next-themes'
import { SunIcon, MoonIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'
import Link from 'next/link'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { WarehouseItem } from "./components/WarehouseItem";
import { WarehouseForm } from "./components/WarehouseForm";
import { useWarehouses, type UseWarehousesReturn } from "./hooks/useWarehouses";
import { calculateTotalPercentage, calculateIndoorPercentage, calculateOutdoorPercentage, statusColors } from "./utils/warehouse-utils";
import type { WarehouseStatus } from '../types/database';
import { DraggableGrid } from "./components/DraggableGrid";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Label } from 'recharts';
import { AddSpaceForm } from "./components/AddSpaceForm";
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label as UILabel } from "@/components/ui/label"

interface WarehouseSection {
  status: WarehouseStatus;
  number: string;
}

interface Warehouse {
  letter: string;
  sections: WarehouseSection[];
}

interface WarehouseWithSections extends Warehouse {
  sections: Array<{
    status: WarehouseStatus;
    number: string;
  }>;
}

interface Warehouse {
  letter: string;
  name: string;
  last_modified?: string;
  updated_at?: string;
}

export default function Home() {
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);
  const [showAddSectionsModal, setShowAddSectionsModal] = useState(false);
  const [newSectionsCount, setNewSectionsCount] = useState(1);
  const [addingSections, setAddingSections] = useState(false);
  const [colorBlindMode, setColorBlindMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ type: 'indoor' | 'outdoor' | null; letter?: string }>({ type: null });
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);
  const [warehousesToDelete, setWarehousesToDelete] = useState<Set<string>>(new Set());
  const [undoTimeout, setUndoTimeout] = useState<NodeJS.Timeout | null>(null);
  const [removedSections, setRemovedSections] = useState<Array<{ letter: string; number: number }>>([]);
  const [showIndoorDropdown, setShowIndoorDropdown] = useState(false);
  const [showOutdoorDropdown, setShowOutdoorDropdown] = useState(false);
  const [isRemovingIndoor, setIsRemovingIndoor] = useState(false);
  const [isRemovingOutdoor, setIsRemovingOutdoor] = useState(false);
  const [showAddWarehouseModal, setShowAddWarehouseModal] = useState<{ type: 'indoor' | 'outdoor' | null }>({ type: null });
  
  const warehouseData = useWarehouses() as unknown as UseWarehousesReturn;
  const {
    indoorWarehouses,
    outdoorWarehouses,
    buttonStatus,
    loading,
    updateSectionStatus,
    updateSectionPosition,
    removeSection,
    sectionPositions,
    createWarehouse,
    addSections,
  } = warehouseData;

  const { theme, setTheme } = useTheme()

  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setShowIndoorDropdown(false);
        setShowOutdoorDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleWarehouseClick = (warehouse: string) => {
    setSelectedWarehouse(warehouse);
  };

  const handleButtonClick = async (warehouseLetter: string, sectionNumber: number) => {
    const currentStatus = buttonStatus[`${warehouseLetter}${sectionNumber}`];
    const newStatus = currentStatus === 'green' ? 'red' : 'green';
    await updateSectionStatus(warehouseLetter, sectionNumber, newStatus);
  };

  const handleAddSections = async () => {
    if (!selectedWarehouse || newSectionsCount < 1) return;
    
    setAddingSections(true);
    try {
      await addSections(selectedWarehouse, newSectionsCount);
      setShowAddSectionsModal(false);
      setNewSectionsCount(1);
    } catch (error) {
      console.error('Error adding sections:', error);
    } finally {
      setAddingSections(false);
    }
  };

  // Calculate percentages using the utility functions
  const totalPercentage = calculateTotalPercentage(buttonStatus);
  const indoorPercentage = calculateIndoorPercentage(buttonStatus, indoorWarehouses.map(w => w.letter));
  const outdoorPercentage = calculateOutdoorPercentage(buttonStatus, outdoorWarehouses.map(w => w.letter));

  // Custom tooltip formatter for the pie chart
  const tooltipFormatter = (
    value: number | string | Array<number | string>
  ) => {
    if (Array.isArray(value)) {
      return `${value.join(", ")}% Utilization`;
    }
    return `${value}% Utilization`;
  };

  const calculateUtilization = (letter: string) => {
    type UtilizationValue = 0 | 100;
    const sections = Object.entries(buttonStatus)
      .filter(([key]) => key.startsWith(letter))
      .map(([, status]) => {
        switch (status) {
          case 'green':
            return 100 as UtilizationValue;
          case 'red':
            return 0 as UtilizationValue;
          default:
            return 0 as UtilizationValue;
        }
      });

    if (sections.length === 0) return 0;
    const total = sections.reduce((sum: UtilizationValue, percentage: UtilizationValue) => 
      (sum + percentage) as UtilizationValue, 0 as UtilizationValue);
    return Math.round(total / sections.length);
  }
  
  // Define status colors with proper typing
  const statusColors: Record<WarehouseStatus, { color: string; percentage: string }> = {
    green: { color: 'bg-green-500 hover:bg-green-600', percentage: '100%' },
    red: { color: 'bg-red-500 hover:bg-red-600', percentage: '0%' }
  };

  const handleRemoveSection = async (warehouseLetter: string, sectionNumber: number) => {
    if (confirm(`Are you sure you want to remove Section ${String.fromCharCode(64 + sectionNumber)}?`)) {
      // Clear any existing timeout
      if (undoTimeout) {
        clearTimeout(undoTimeout);
      }

      const success = await removeSection(warehouseLetter, sectionNumber);
      if (success) {
        // Set new timeout for 3 seconds
        const timeout = setTimeout(() => {
          clearRemovedSections();
        }, 3000);
        setUndoTimeout(timeout);

        // If all sections are removed, clear the selection
        const remainingSections = Object.keys(buttonStatus).filter(key => key.startsWith(warehouseLetter));
        if (remainingSections.length === 0) {
          setSelectedWarehouse(null);
        }
      }
    }
  };

  const handleUndoClick = (section: (typeof removedSections)[0]) => {
    if (undoTimeout) {
      clearTimeout(undoTimeout);
      setUndoTimeout(null);
    }
    undoSectionRemoval(section);
  };

  const clearRemovedSections = () => {
    setRemovedSections([]);
    setUndoTimeout(null);
  };

  const undoSectionRemoval = (section: { letter: string; number: number }) => {
    setRemovedSections(prev => prev.filter(s => s.letter !== section.letter || s.number !== section.number));
  };

  const toggleWarehouseSelection = (letter: string) => {
    setWarehousesToDelete(prev => {
      const newSet = new Set(prev);
      if (newSet.has(letter)) {
        newSet.delete(letter);
      } else {
        newSet.add(letter);
      }
      return newSet;
    });
  };

  const handleRemoveSelectedWarehouses = () => {
    if (warehousesToDelete.size > 0) {
      setShowFinalConfirm(true);
    }
  };

  const handleFinalConfirm = async () => {
    // Here you would implement the actual warehouse removal logic
    // For now, we'll just close the modal and clear the selection
    setShowFinalConfirm(false);
    setWarehousesToDelete(new Set());
    setShowDeleteConfirm({ type: null });
  };

  if (loading) {
    return <div className="min-h-screen p-4 flex items-center justify-center">
      <div className="text-xl">Loading warehouses...</div>
    </div>;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Theme toggle and color blind mode buttons */}
        <div className="fixed top-6 right-6 flex flex-col gap-3 z-50">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-3 rounded-xl bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 transition-all duration-300 shadow-lg backdrop-blur-sm"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
              <SunIcon className="h-6 w-6 text-amber-500" />
          ) : (
            <MoonIcon className="h-6 w-6 text-gray-700" />
          )}
        </button>
        
        <button
          onClick={() => setColorBlindMode(!colorBlindMode)}
            className={`p-3 rounded-xl transition-all duration-300 shadow-lg backdrop-blur-sm ${
            colorBlindMode 
              ? 'bg-purple-500 hover:bg-purple-600 text-white' 
                : 'bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200'
          }`}
          aria-label="Toggle color blind mode"
        >
          {colorBlindMode ? (
            <EyeSlashIcon className="h-6 w-6" />
          ) : (
            <EyeIcon className="h-6 w-6" />
          )}
        </button>
      </div>

        <div className="container mx-auto px-4 py-8 min-h-screen flex flex-col items-center">
          {/* Header Section */}
          <div className="w-full max-w-6xl flex flex-col items-center mb-12">
          <div className="relative w-48 sm:w-64 h-12 sm:h-16 mb-6">
            <Image
              src="/images/apa-logo-full.png"
              alt="Alabama Port Authority Logo"
                width={256}
                height={64}
              style={{ objectFit: 'contain' }}
              priority
                className="dark:brightness-0 dark:invert transition-all duration-300"
            />
          </div>
            <h1 className="text-3xl sm:text-[40pt] font-[family-name:var(--font-geist-mono)] bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-400 dark:to-cyan-300 bg-clip-text text-transparent tracking-tight text-center font-bold mb-8">
            Warehouse Management
          </h1>

            {/* Dashboard Link Button */}
            <Link 
              href="/dashboard"
              className="w-32 h-12 bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-500 dark:to-cyan-400 text-white rounded-xl hover:from-blue-700 hover:to-cyan-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-hover:scale-110" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
            </svg>
              <span>Dashboard</span>
            </Link>
        </div>

          {/* Utilization Stats and Pie Chart */}
          <div className="w-full max-w-6xl mb-12">
            <div className="bg-white/90 dark:bg-gray-800/90 p-8 rounded-2xl shadow-xl backdrop-blur-sm">
              <h3 className="text-xl font-semibold mb-6 text-gray-800 dark:text-gray-100">Port Utilization</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { 
                          name: 'Indoor Warehouses', 
                          value: (100 - indoorPercentage)
                        },
                        { 
                          name: 'Outdoor Laydown', 
                          value: (100 - outdoorPercentage)
                        },
                        { 
                          name: 'Unused Space', 
                          value: (indoorPercentage + outdoorPercentage) / 2
                        }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
            innerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill={theme === 'dark' ? "#3b82f6" : "#2563eb"} />
                      <Cell fill={theme === 'dark' ? "#a855f7" : "#9333ea"} />
                      <Cell fill={theme === 'dark' ? "#4b5563" : "#9ca3af"} />
                      <Label
                        content={({ viewBox }) => {
                          if (!viewBox || !('cx' in viewBox) || !('cy' in viewBox)) return null;
                          const totalUtilization = Math.round(
                            (200 - (indoorPercentage + outdoorPercentage)) / 2
                          );
                          return (
                            <>
                              <text
                                x={viewBox.cx}
                                y={(viewBox.cy ?? 0) - 10}
                                textAnchor="middle"
                                dominantBaseline="central"
                                className="fill-gray-900 dark:fill-white"
                                style={{ fontSize: '24px', fontWeight: 'bold' }}
                              >
                                {totalUtilization}%
                              </text>
                              <text
                                x={viewBox.cx}
                                y={(viewBox.cy ?? 0) + 15}
                                textAnchor="middle"
                                className="fill-gray-800 dark:fill-gray-200"
                                style={{ fontSize: '14px', fontWeight: '500' }}
                              >
                                Total Utilization
                              </text>
                            </>
                          );
                        }}
                      />
                    </Pie>
                    <Tooltip 
                      formatter={(value) => `${Math.round(Number(value))}% Utilized`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Legend/breakdown */}
              <div className="flex justify-around mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                    {Math.round(100 - indoorPercentage)}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Indoor Warehouses
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                    {Math.round(100 - outdoorPercentage)}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Outdoor Laydown
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-600 dark:text-gray-400">
                    {Math.round((indoorPercentage + outdoorPercentage) / 2)}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Unused Space
                  </div>
                </div>
                </div>
              </div>
        </div>

          {/* Warehouse Selection */}
          <div className="w-full max-w-6xl grid grid-cols-1 sm:grid-cols-2 gap-8 mb-12">
            {/* Indoor Warehouses Dropdown */}
            <div className="bg-white/90 dark:bg-gray-800/90 p-8 rounded-2xl shadow-xl backdrop-blur-sm">
              <h2 className="text-xl font-semibold mb-6 text-gray-800 dark:text-gray-100 text-center">Indoor Warehouses</h2>
              <div className="relative dropdown-container">
                <button
                  onClick={() => {
                    setShowIndoorDropdown(!showIndoorDropdown);
                    setShowOutdoorDropdown(false);
                  }}
                  className="w-full h-16 px-6 py-4 rounded-xl text-lg font-medium transition-all duration-300 bg-gray-50/80 dark:bg-gray-700/80 hover:bg-white dark:hover:bg-gray-600 shadow-md hover:shadow-lg flex items-center justify-between"
                >
                  <span className="text-gray-800 dark:text-gray-100">
                    {selectedWarehouse && indoorWarehouses.find(w => w.letter === selectedWarehouse)
                      ? indoorWarehouses.find(w => w.letter === selectedWarehouse)?.name
                      : 'Select Warehouse'}
                  </span>
                  <ChevronDownIcon 
                    className={`h-5 w-5 text-gray-600 dark:text-gray-300 transition-transform duration-300 ${
                      showIndoorDropdown ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                
                {showIndoorDropdown && (
                  <div className="absolute z-50 w-full mt-2 py-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
                    {/* Management Options */}
                    <div className="px-6 py-3 flex gap-2">
                      <button
                        onClick={() => {
                          setShowAddSectionsModal(true);
                          setShowIndoorDropdown(false);
                        }}
                        className="flex-1 px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setIsRemovingIndoor(!isRemovingIndoor);
                          if (!isRemovingIndoor) {
                            setIsRemovingOutdoor(false);
                          }
                        }}
                        className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                          isRemovingIndoor 
                            ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                            : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        {isRemovingIndoor ? 'Done' : 'Remove'}
                      </button>
                </div>

                {/* Divider */}
                <div className="my-2 border-t border-gray-200 dark:border-gray-700" />
                
                {/* Warehouse List */}
                {indoorWarehouses.map((warehouse) => (
                  <div key={warehouse.letter} className="group relative">
            <button
                          onClick={() => {
                            if (!isRemovingIndoor) {
                              handleWarehouseClick(warehouse.letter);
                              setShowIndoorDropdown(false);
                            } else {
                              setShowDeleteConfirm({ type: 'indoor', letter: warehouse.letter });
                            }
                          }}
                          className={`w-full px-6 py-3 text-left transition-colors flex items-center justify-between ${
                            isRemovingIndoor
                              ? 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400'
                              : selectedWarehouse === warehouse.letter
                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          <span>{warehouse.name}</span>
                          {isRemovingIndoor && (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
            </button>
                </div>
                ))}
              </div>
            )}
          </div>
        </div>

            {/* Outdoor Warehouses Dropdown */}
            <div className="bg-white/90 dark:bg-gray-800/90 p-8 rounded-2xl shadow-xl backdrop-blur-sm">
              <h2 className="text-xl font-semibold mb-6 text-gray-800 dark:text-gray-100 text-center">Outdoor Warehouses</h2>
              <div className="relative dropdown-container">
                <button
                  onClick={() => {
                    setShowOutdoorDropdown(!showOutdoorDropdown);
                    setShowIndoorDropdown(false);
                  }}
                  className="w-full h-16 px-6 py-4 rounded-xl text-lg font-medium transition-all duration-300 bg-gray-50/80 dark:bg-gray-700/80 hover:bg-white dark:hover:bg-gray-600 shadow-md hover:shadow-lg flex items-center justify-between"
                >
                  <span className="text-gray-800 dark:text-gray-100">
                    {selectedWarehouse && outdoorWarehouses.find(w => w.letter === selectedWarehouse)
                      ? outdoorWarehouses.find(w => w.letter === selectedWarehouse)?.name
                      : 'Select Warehouse'}
                  </span>
                  <ChevronDownIcon 
                    className={`h-5 w-5 text-gray-600 dark:text-gray-300 transition-transform duration-300 ${
                      showOutdoorDropdown ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                
                {showOutdoorDropdown && (
                  <div className="absolute z-50 w-full mt-2 py-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
                    {/* Management Options */}
                    <div className="px-6 py-3 flex gap-2">
              <button
                        onClick={() => {
                          setShowAddSectionsModal(true);
                          setShowOutdoorDropdown(false);
                        }}
                        className="flex-1 px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setIsRemovingOutdoor(!isRemovingOutdoor);
                          if (!isRemovingOutdoor) {
                            setIsRemovingIndoor(false);
                          }
                        }}
                        className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                          isRemovingOutdoor 
                            ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                            : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                        {isRemovingOutdoor ? 'Done' : 'Remove'}
              </button>
            </div>
                    
                    {/* Divider */}
                    <div className="my-2 border-t border-gray-200 dark:border-gray-700" />
                    
                    {/* Warehouse List */}
                    {outdoorWarehouses.map((warehouse) => (
                      <div key={warehouse.letter} className="group relative">
                      <button
                          onClick={() => {
                            if (!isRemovingOutdoor) {
                              handleWarehouseClick(warehouse.letter);
                              setShowOutdoorDropdown(false);
                            } else {
                              setShowDeleteConfirm({ type: 'outdoor', letter: warehouse.letter });
                            }
                          }}
                          className={`w-full px-6 py-3 text-left transition-colors flex items-center justify-between ${
                            isRemovingOutdoor
                              ? 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400'
                              : selectedWarehouse === warehouse.letter
                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          <span>{warehouse.name}</span>
                          {isRemovingOutdoor && (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        )}
                      </button>
                      </div>
                    ))}
                  </div>
                )}
                    </div>
            </div>
          </div>

          {/* Selected Warehouse Section */}
          {selectedWarehouse && (
            <div className="w-full max-w-6xl">
              <div className="bg-white/90 dark:bg-gray-800/90 p-8 rounded-2xl shadow-xl backdrop-blur-sm">
                <DraggableGrid
                  sections={Object.entries(buttonStatus)
                    .filter(([key]) => key.startsWith(selectedWarehouse))
                    .map(([key, status]) => ({
                      key,
                      status,
                      sectionNumber: key.slice(1),
                      position: sectionPositions[key],
                    }))}
                  onSectionMove={(sectionId, position) => {
                    console.log('Section moved:', sectionId, position);
                  }}
                  onStatusChange={async (sectionId, status) => {
                    const warehouseLetter = sectionId.charAt(0);
                    const sectionNumber = parseInt(sectionId.slice(1));
                    await updateSectionStatus(warehouseLetter, sectionNumber, status);
                  }}
                  onSectionDelete={(sectionId) => {
                    const warehouseLetter = sectionId.charAt(0);
                    const sectionNumber = parseInt(sectionId.slice(1));
                    removeSection(warehouseLetter, sectionNumber);
                  }}
                  onSectionPositionUpdate={async (warehouseLetter, sectionNumber, position) => {
                    return await updateSectionPosition(warehouseLetter, sectionNumber, position);
                  }}
                  currentWarehouse={[...indoorWarehouses, ...outdoorWarehouses].find(w => w.letter === selectedWarehouse)?.name}
                  onAddSections={() => setShowAddSectionsModal(true)}
                  onClose={() => setSelectedWarehouse(null)}
                  colorBlindMode={colorBlindMode}
            />
          </div>
          </div>
        )}

          {/* Modals */}
        {showDeleteConfirm.type && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="w-full max-w-lg mx-4 bg-white/90 dark:bg-gray-800/90 p-8 rounded-2xl shadow-xl backdrop-blur-sm">
                <h3 className="text-xl font-bold mb-6">Select Warehouses to Remove</h3>
              <div className="mb-6 max-h-96 overflow-y-auto">
                <div className="space-y-2">
                  {showDeleteConfirm.type === 'indoor' 
                    ? indoorWarehouses.map((warehouse) => (
                        <label key={warehouse.letter} className="flex items-center space-x-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={warehousesToDelete.has(warehouse.letter)}
                            onChange={() => toggleWarehouseSelection(warehouse.letter)}
                            className="h-4 w-4 text-red-500 rounded border-gray-300 focus:ring-red-500"
                          />
                          <span>{warehouse.name}</span>
                        </label>
                      ))
                    : outdoorWarehouses.map((warehouse) => (
                        <label key={warehouse.letter} className="flex items-center space-x-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={warehousesToDelete.has(warehouse.letter)}
                            onChange={() => toggleWarehouseSelection(warehouse.letter)}
                            className="h-4 w-4 text-red-500 rounded border-gray-300 focus:ring-red-500"
                          />
                          <span>{warehouse.name}</span>
                        </label>
                      ))
                  }
                </div>
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {warehousesToDelete.size} warehouse{warehousesToDelete.size !== 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => {
                    setShowDeleteConfirm({ type: null });
                    setWarehousesToDelete(new Set());
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemoveSelectedWarehouses}
                  disabled={warehousesToDelete.size === 0}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {showFinalConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="w-full max-w-lg mx-4 bg-white/90 dark:bg-gray-800/90 p-8 rounded-2xl shadow-xl backdrop-blur-sm">
                <h3 className="text-xl font-bold mb-6">Confirm Warehouse Removal</h3>
              <div className="mb-6">
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  Are you sure you want to remove the following warehouse{warehousesToDelete.size !== 1 ? 's' : ''}?
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {Array.from(warehousesToDelete).map((letter) => {
                    const warehouse = [...indoorWarehouses, ...outdoorWarehouses].find(w => w.letter === letter);
                    return (
                      <div key={letter} className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        {warehouse?.name}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => {
                    setShowFinalConfirm(false);
                    setWarehousesToDelete(new Set());
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFinalConfirm}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Remove Warehouses
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddSectionsModal && selectedWarehouse && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="w-full max-w-lg mx-4 bg-white/90 dark:bg-gray-800/90 p-8 rounded-2xl shadow-xl backdrop-blur-sm">
                <h3 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">
                Add Sections to {
                  [...indoorWarehouses, ...outdoorWarehouses].find(w => w.letter === selectedWarehouse)?.name
                }
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Number of Sections to Add
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newSectionsCount}
                  onChange={(e) => setNewSectionsCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowAddSectionsModal(false);
                    setNewSectionsCount(1);
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSections}
                  disabled={addingSections || newSectionsCount < 1}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingSections ? 'Adding...' : 'Add Sections'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddWarehouseModal.type && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-[350px] bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>
                  Add New {showAddWarehouseModal.type === 'indoor' ? 'Warehouse' : 'Laydown Space'}
                </CardTitle>
                <CardDescription>
                  Enter the details for your new space
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => e.preventDefault()}>
                  <div className="grid w-full items-center gap-4">
                    <div className="flex flex-col space-y-1.5">
                      <UILabel htmlFor="name">Space Name:</UILabel>
                      <Input 
                        id="name" 
                        placeholder={`Enter ${showAddWarehouseModal.type === 'indoor' ? 'warehouse' : 'laydown space'} name`}
                      />
                    </div>
                    <div className="flex flex-col space-y-1.5">
                      <UILabel htmlFor="sections">Number of Sections:</UILabel>
                      <Input 
                        id="sections" 
                        type="number"
                        placeholder="Enter number of sections"
                        min="1"
                        max="5000"
                      />
                    </div>
                  </div>
                </form>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => setShowAddWarehouseModal({ type: null })}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={async () => {
                    const name = (document.getElementById('name') as HTMLInputElement).value;
                    const sections = parseInt((document.getElementById('sections') as HTMLInputElement).value);
                    
                    if (name && sections) {
                      await createWarehouse(showAddWarehouseModal.type, name, sections);
                      setShowAddWarehouseModal({ type: null });
                    }
                  }}
                >
                  Create Space
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
            </div>
          </div>
    </DndProvider>
  );
}
