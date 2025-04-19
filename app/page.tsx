"use client";
import { useState, useEffect } from "react";
import { useTheme } from 'next-themes'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { WarehouseItem } from "@/components/WarehouseItem";
import { WarehouseForm } from "@/components/WarehouseForm";
import { useWarehouses } from "@/app/hooks/useWarehouses";
import { calculateTotalPercentage, calculateIndoorPercentage, calculateOutdoorPercentage, statusColors } from "@/utils/warehouse-utils";
import type { WarehouseStatus } from '@/types/database';
import { PieChartComponent } from "@/components/ui/pie-chart";
import { DraggableGrid } from "@/components/DraggableGrid";

export default function Home() {
  const [indoorOpen, setIndoorOpen] = useState(false);
  const [outdoorOpen, setOutdoorOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);
  const [showIndoorForm, setShowIndoorForm] = useState(false);
  const [showOutdoorForm, setShowOutdoorForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ type: 'indoor' | 'outdoor' | null }>({ type: null });
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);
  const [warehousesToDelete, setWarehousesToDelete] = useState<Set<string>>(new Set());
  const [showAddSectionsModal, setShowAddSectionsModal] = useState(false);
  const [newSectionsCount, setNewSectionsCount] = useState(1);
  const [addingSections, setAddingSections] = useState(false);
  const [undoTimeout, setUndoTimeout] = useState<NodeJS.Timeout | null>(null);
  const [colorBlindMode, setColorBlindMode] = useState(false);
  
  const {
    indoorWarehouses,
    outdoorWarehouses,
    buttonStatus,
    loading,
    createWarehouse,
    updateSectionStatus,
    updateSectionPosition,
    removeWarehouse,
    removeSection,
    downloadWarehouseData,
    removedSections,
    undoSectionRemoval,
    addSections,
    clearRemovedSections,
    sectionPositions,
  } = useWarehouses();

  const { theme, setTheme } = useTheme()

  // Clear any existing timeout when component unmounts
  useEffect(() => {
    return () => {
      if (undoTimeout) {
        clearTimeout(undoTimeout);
      }
    };
  }, [undoTimeout]);

  const handleWarehouseClick = (warehouse: string) => {
    const allWarehouses = [...indoorWarehouses, ...outdoorWarehouses];
    const selectedWarehouseData = allWarehouses.find(w => w.letter === warehouse);
    if (selectedWarehouseData) {
      setSelectedWarehouse(warehouse);
      setIndoorOpen(false);
      setOutdoorOpen(false);
    }
  };

  const handleRemoveWarehouse = async (letter: string) => {
    const success = await removeWarehouse(letter);
    if (success) {
      if (selectedWarehouse === letter) {
        setSelectedWarehouse(null);
      }
      setWarehousesToDelete(prev => {
        const newSet = new Set(prev);
        newSet.delete(letter);
        return newSet;
      });
    }
  };

  const handleRemoveSelectedWarehouses = async () => {
    setShowDeleteConfirm({ type: null });
    setShowFinalConfirm(true);
  };

  const handleFinalConfirm = async () => {
    const promises = Array.from(warehousesToDelete).map(letter => handleRemoveWarehouse(letter));
    await Promise.all(promises);
    setShowFinalConfirm(false);
    setWarehousesToDelete(new Set());
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

  const handleButtonClick = async (warehouseLetter: string, sectionNumber: number) => {
    const currentStatus = buttonStatus[`${warehouseLetter}${sectionNumber}`];
    const newStatus = currentStatus === 'green' ? 'red' : 'green';
    const success = await updateSectionStatus(warehouseLetter, sectionNumber, newStatus);
    if (!success) {
      alert('Failed to update section status. Please try again.');
    }
  };

  const handleCreateWarehouse = async (type: 'indoor' | 'outdoor', data: { name: string; sections: number }) => {
    const success = await createWarehouse(type, data.name, data.sections);
    if (success) {
      setShowIndoorForm(false);
      setShowOutdoorForm(false);
    }
  };

  // Calculate percentages using the utility functions
  const totalPercentage = calculateTotalPercentage(buttonStatus);
  const indoorPercentage = calculateIndoorPercentage(buttonStatus, indoorWarehouses.map(w => w.letter));
  const outdoorPercentage = calculateOutdoorPercentage(buttonStatus, outdoorWarehouses.map(w => w.letter));

  // Prepare data for pie chart
  const pieChartData = [
    {
      name: "Indoor",
      value: indoorPercentage,
      fill: "hsl(221, 83%, 53%)", // blue-600
    },
    {
      name: "Outdoor",
      value: outdoorPercentage,
      fill: "hsl(265, 89%, 78%)", // purple-400
    },
  ];

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
          case 'green': return 100 as UtilizationValue
          case 'red': return 0 as UtilizationValue
          default: return 0 as UtilizationValue
        }
      })

    if (sections.length === 0) return 0
    const total = sections.reduce((sum: UtilizationValue, percentage: UtilizationValue) => 
      (sum + percentage) as UtilizationValue, 0 as UtilizationValue)
    return Math.round(total / sections.length)
  }

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
    return <div className="min-h-screen p-8 flex items-center justify-center">
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

      <div className="min-h-screen p-8 flex flex-col items-center justify-center">
        <h1 className="text-[32pt] font-[family-name:var(--font-geist-mono)] mb-12 bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent tracking-tight">
          Port of Mobile Test
        </h1>

        <div className="flex justify-center mb-4">
          <button
            onClick={downloadWarehouseData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Download Report
          </button>
        </div>

        <div className="mb-8 w-full max-w-md">
          <PieChartComponent
            data={pieChartData}
            title="Port Utilization"
            description="Indoor and Outdoor Warehouses"
            centerLabel="Total Utilization"
            centerValue={Math.round(totalPercentage)}
            innerRadius={60}
            outerRadius={100}
            className="shadow-lg"
            tooltipFormatter={tooltipFormatter}
            footer={
              <div className="flex justify-around w-full pt-2">
                <div className="flex flex-col items-center">
                  <span className="font-semibold text-blue-600 dark:text-blue-400 text-lg">
                    {Math.round(indoorPercentage)}%
                  </span>
                  <span className="text-sm text-muted-foreground">Indoor</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-semibold text-purple-600 dark:text-purple-400 text-lg">
                    {Math.round(outdoorPercentage)}%
                  </span>
                  <span className="text-sm text-muted-foreground">Outdoor</span>
                </div>
              </div>
            }
          />
        </div>

        <div className="flex gap-8">
          <div className="relative">
            <button
              onClick={() => setIndoorOpen(!indoorOpen)}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-[family-name:var(--font-geist-sans)] text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              Indoor Warehouse
            </button>
            {indoorOpen && (
              <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 w-fit min-w-[200px]">
                {indoorWarehouses.map((warehouse) => {
                  const utilization = calculateUtilization(warehouse.letter)
                  return (
                    <WarehouseItem
                      key={warehouse.letter}
                      warehouse={warehouse}
                      onClick={() => handleWarehouseClick(warehouse.letter)}
                      isSelected={selectedWarehouse === warehouse.letter}
                      utilization={utilization}
                    />
                  )
                })}
                <div
                  className="flex items-center justify-between px-4 py-2 mt-2 hover:bg-gray-50/80 dark:hover:bg-gray-800/40 cursor-pointer border-t border-gray-200 dark:border-gray-700 rounded-lg transition-all duration-200"
                  onClick={() => setShowIndoorForm(true)}
                >
                  <span className="text-blue-500 dark:text-blue-400">+ Create Warehouse</span>
                </div>
                {indoorWarehouses.length > 0 && (
                  <div
                    className="flex items-center justify-between px-4 py-2 hover:bg-gray-50/80 dark:hover:bg-gray-800/40 cursor-pointer border-t border-gray-200 dark:border-gray-700 rounded-lg transition-all duration-200"
                    onClick={() => setShowDeleteConfirm({ type: 'indoor' })}
                  >
                    <span className="text-red-500 dark:text-red-400">- Remove Warehouse</span>
                  </div>
                )}
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
              <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 w-fit min-w-[200px]">
                {outdoorWarehouses.map((warehouse) => {
                  const utilization = calculateUtilization(warehouse.letter)
                  return (
                    <WarehouseItem
                      key={warehouse.letter}
                      warehouse={warehouse}
                      onClick={() => handleWarehouseClick(warehouse.letter)}
                      isSelected={selectedWarehouse === warehouse.letter}
                      utilization={utilization}
                    />
                  )
                })}
                <div
                  className="flex items-center justify-between px-4 py-2 mt-2 hover:bg-gray-50/80 dark:hover:bg-gray-800/40 cursor-pointer border-t border-gray-200 dark:border-gray-700 rounded-lg transition-all duration-200"
                  onClick={() => setShowOutdoorForm(true)}
                >
                  <span className="text-purple-500 dark:text-purple-400">+ Create Warehouse</span>
                </div>
                {outdoorWarehouses.length > 0 && (
                  <div
                    className="flex items-center justify-between px-4 py-2 hover:bg-gray-50/80 dark:hover:bg-gray-800/40 cursor-pointer border-t border-gray-200 dark:border-gray-700 rounded-lg transition-all duration-200"
                    onClick={() => setShowDeleteConfirm({ type: 'outdoor' })}
                  >
                    <span className="text-red-500 dark:text-red-400">- Remove Warehouse</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Warehouse Forms */}
        {showIndoorForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <WarehouseForm
              type="indoor"
              onClose={() => setShowIndoorForm(false)}
              onSubmit={(data) => handleCreateWarehouse('indoor', data)}
            />
          </div>
        )}

        {showOutdoorForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <WarehouseForm
              type="outdoor"
              onClose={() => setShowOutdoorForm(false)}
              onSubmit={(data) => handleCreateWarehouse('outdoor', data)}
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

        {selectedWarehouse && (
          <div className="mt-8">
            <div className="flex justify-center">
              <DraggableGrid
                sections={Object.entries(buttonStatus).map(([key, status]) => ({
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

        {/* Undo Panel */}
        {removedSections.length > 0 && removedSections[0] && (
          <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 animate-fade-in-up z-40">
            <div className="flex items-center gap-3 relative">
              <div className="absolute bottom-0 left-0 h-1 bg-gray-200 dark:bg-gray-700 w-full rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 animate-progress" />
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Section {String.fromCharCode(64 + removedSections[0].sectionNumber)} removed from {
                  [...indoorWarehouses, ...outdoorWarehouses].find(w => w.letter === removedSections[0].warehouseLetter)?.name
                }
              </span>
              <button
                onClick={() => handleUndoClick(removedSections[0])}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Undo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
