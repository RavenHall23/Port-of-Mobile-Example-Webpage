"use client";
import { useState, useEffect } from "react";
import { useTheme } from 'next-themes'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'
import Link from 'next/link'
import { WarehouseItem } from "./components/WarehouseItem";
import { WarehouseForm } from "./components/WarehouseForm";
import { useWarehouses, type UseWarehousesReturn } from "./hooks/useWarehouses";
import { calculateTotalPercentage, calculateIndoorPercentage, calculateOutdoorPercentage, statusColors } from "./utils/warehouse-utils";
import type { WarehouseStatus } from '../types/database';
import { DraggableGrid } from "./components/DraggableGrid";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

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
  } = warehouseData;

  const { theme, setTheme } = useTheme()

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
      // Add sections logic here
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

  const handleAddSections = async () => {
    if (!selectedWarehouse || newSectionsCount < 1) return;
    
    setAddingSections(true);
    try {
      const success = await addSections(selectedWarehouse, newSectionsCount);
      if (success) {
        setShowAddSectionsModal(false);
        setNewSectionsCount(1);
      }
    } catch (error) {
      console.error('Error adding sections:', error);
      alert(error instanceof Error ? error.message : 'Failed to add sections. Please try again.');
    } finally {
      setAddingSections(false);
    }
  };

  const handleUndoClick = (section: (typeof removedSections)[0]) => {
    if (undoTimeout) {
      clearTimeout(undoTimeout);
      setUndoTimeout(null);
    }
    undoSectionRemoval(section);
  };

  if (loading) {
    return <div className="min-h-screen p-4 flex items-center justify-center">
      <div className="text-xl">Loading warehouses...</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Theme toggle and color blind mode buttons */}
      <div className="fixed top-4 right-4 flex flex-col gap-2">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors shadow-md"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <SunIcon className="h-6 w-6 text-yellow-500" />
          ) : (
            <MoonIcon className="h-6 w-6 text-gray-700" />
          )}
        </button>
        
        <button
          onClick={() => setColorBlindMode(!colorBlindMode)}
          className={`p-2 rounded-lg transition-colors shadow-md ${
            colorBlindMode 
              ? 'bg-purple-500 hover:bg-purple-600 text-white' 
              : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
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

      <div className="min-h-screen p-4 sm:p-8 flex flex-col items-center justify-start sm:justify-center">
        <div className="flex flex-col items-center mb-6 sm:mb-12">
          <div className="relative w-48 sm:w-64 h-12 sm:h-16 mb-6">
            <Image
              src="/images/apa-logo-full.png"
              alt="Alabama Port Authority Logo"
              width={256}
              height={64}
              style={{ objectFit: 'contain' }}
              priority
              className="dark:brightness-0 dark:invert"
            />
          </div>
          <h1 className="text-2xl sm:text-[32pt] font-[family-name:var(--font-geist-mono)] bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent tracking-tight text-center">
            Warehouse Management
          </h1>
        </div>

        {/* Dashboard Link Button */}
        <Link 
          href="/dashboard"
          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg hover:from-blue-700 hover:to-cyan-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 mb-8"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
            <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
          </svg>
          View Dashboard
        </Link>

        {/* Utilization Stats and Pie Chart */}
        <div className="w-full max-w-4xl mb-8">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Warehouse Utilization</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Available', value: totalPercentage },
                      { name: 'Occupied', value: 100 - totalPercentage }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    <Cell fill="#22c55e" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip formatter={tooltipFormatter} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Warehouse Selection */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 w-full sm:w-auto mb-8">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">Indoor Warehouses</h2>
            <div className="flex flex-wrap gap-2">
              {indoorWarehouses.map((warehouse) => (
                <button
                  key={warehouse.letter}
                  onClick={() => handleWarehouseClick(warehouse.letter)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    selectedWarehouse === warehouse.letter
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {warehouse.name}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">Outdoor Warehouses</h2>
            <div className="flex flex-wrap gap-2">
              {outdoorWarehouses.map((warehouse) => (
                <button
                  key={warehouse.letter}
                  onClick={() => handleWarehouseClick(warehouse.letter)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    selectedWarehouse === warehouse.letter
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {warehouse.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {selectedWarehouse && (
          <div className="w-full max-w-4xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">

                {[...indoorWarehouses, ...outdoorWarehouses].find(w => w.letter === selectedWarehouse)?.name || `Warehouse ${selectedWarehouse}`}
              </h2>
              <button
                onClick={() => setShowAddSectionsModal(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-5 w-5" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6" 
                  />
                </svg>
                Add Sections
              </button>
            </div>

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
              colorBlindMode={colorBlindMode}
            />
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm.type && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Select Warehouses to Remove</h3>
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

        {/* Final Confirmation Modal */}
        {showFinalConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Confirm Warehouse Removal</h3>
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

        {/* Add Sections Modal */}
        {showAddSectionsModal && selectedWarehouse && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
              <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
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
      </div>
    </div>
  );
}
