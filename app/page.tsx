"use client";
import { useState, useEffect } from "react";
import { WarehouseItem } from "@/components/WarehouseItem";
import { WarehouseForm } from "@/components/WarehouseForm";
import { useWarehouses } from "@/app/hooks/useWarehouses";
import type { WarehouseStatus } from '@/types/database';
import { PieChartComponent } from "@/components/ui/pie-chart";
import { calculateTotalPercentage, calculateIndoorPercentage, calculateOutdoorPercentage, statusColors } from "./utils/warehouse-utils";
import MainHome from './MainHome'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'

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
  const [error, setError] = useState<string | null>(null);
  
  const {
    indoorWarehouses,
    outdoorWarehouses,
    buttonStatus,
    loading,
    createWarehouse,
    updateSectionStatus,
    removeWarehouse,
    removeSection,
    downloadWarehouseData,
    removedSections,
    undoSectionRemoval,
    addSections,
    clearRemovedSections
  } = useWarehouses();

  // Handle cleanup of timeout
  useEffect(() => {
    return () => {
      if (undoTimeout) {
        clearTimeout(undoTimeout);
      }
    };
  }, [undoTimeout]);

  const calculateUtilization = (letter: string) => {
    const sections = Object.entries(buttonStatus)
      .filter(([key]) => key.startsWith(letter))
      .map(([, status]) => status === 'red' ? 100 : 0);

    if (sections.length === 0) return 0;
    const total = sections.reduce((sum: number, value: number) => sum + value, 0);
    return Math.round(total / sections.length);
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
      fill: "hsl(199, 89%, 65%)", // darker light blue
    },
    {
      name: "Outdoor",
      value: outdoorPercentage,
      fill: "hsl(280, 65%, 70%)", // darker light pinkish purple
    },
  ];

  const tooltipFormatter = (value: number | string | Array<number | string>) => {
    if (Array.isArray(value)) {
      return `${value.join(", ")}% Utilization`;
    }
    return `${value}% Utilization`;
  };

  const handleCreateWarehouse = async (type: 'indoor' | 'outdoor', data: { name: string; sections: number }) => {
    try {
      setError(null);
      const success = await createWarehouse(type, data.name, data.sections);
      if (success) {
        if (type === 'indoor') {
          setShowIndoorForm(false);
        } else {
          setShowOutdoorForm(false);
        }
      }
    } catch (err) {
      console.error('Error creating warehouse:', err);
      setError(err instanceof Error ? err.message : 'Failed to create warehouse');
    }
  };

  return (
    <MainHome>
      <div className="space-y-6">
        {/* Pie Chart */}
        <div className="flex flex-col items-center">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <PieChartComponent
              data={pieChartData}
              tooltipFormatter={tooltipFormatter}
              centerValue={totalPercentage.toFixed(1)}
              centerLabel="Total Utilization"
              title="Warehouse Utilization"
            />
            <div className="flex justify-center gap-8 mt-6">
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold" style={{ color: "hsl(199, 89%, 65%)" }}>
                  {indoorPercentage.toFixed(1)}%
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">Indoor</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold" style={{ color: "hsl(280, 65%, 70%)" }}>
                  {outdoorPercentage.toFixed(1)}%
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">Outdoor</span>
              </div>
            </div>
          </div>
        </div>

        {/* Indoor Warehouses Dropdown */}
        <div className="space-y-2">
          <div className="flex justify-between items-center bg-[hsl(199,89%,65%)] bg-opacity-20 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIndoorOpen(!indoorOpen)}
                className="p-2 rounded-md hover:bg-accent"
              >
                {indoorOpen ? (
                  <ChevronUpIcon className="h-5 w-5" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5" />
                )}
              </button>
              <h2 className="text-xl font-semibold">Indoor Warehouses</h2>
            </div>
            <button
              onClick={() => setShowIndoorForm(true)}
              className="px-4 py-2 bg-[hsl(199,89%,65%)] text-white rounded-md hover:bg-[hsl(199,89%,55%)] transition-colors"
            >
              Add Indoor
            </button>
          </div>
          {indoorOpen && (
            <div className="space-y-2">
              {indoorWarehouses.map((warehouse) => (
                <WarehouseItem
                  key={warehouse.letter}
                  warehouse={warehouse}
                  onClick={() => setSelectedWarehouse(warehouse.letter)}
                  isSelected={selectedWarehouse === warehouse.letter}
                  utilization={calculateUtilization(warehouse.letter)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Outdoor Laydowns Dropdown */}
        <div className="space-y-2">
          <div className="flex justify-between items-center bg-[hsl(280,65%,70%)] bg-opacity-20 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOutdoorOpen(!outdoorOpen)}
                className="p-2 rounded-md hover:bg-accent"
              >
                {outdoorOpen ? (
                  <ChevronUpIcon className="h-5 w-5" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5" />
                )}
              </button>
              <h2 className="text-xl font-semibold">Outdoor Laydowns</h2>
            </div>
            <button
              onClick={() => setShowOutdoorForm(true)}
              className="px-4 py-2 bg-[hsl(199,89%,65%)] text-white rounded-md hover:bg-[hsl(199,89%,55%)] transition-colors"
            >
              Add Outdoor
            </button>
          </div>
          {outdoorOpen && (
            <div className="space-y-2">
              {outdoorWarehouses.map((warehouse) => (
                <WarehouseItem
                  key={warehouse.letter}
                  warehouse={warehouse}
                  onClick={() => setSelectedWarehouse(warehouse.letter)}
                  isSelected={selectedWarehouse === warehouse.letter}
                  utilization={calculateUtilization(warehouse.letter)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {showIndoorForm && (
        <WarehouseForm
          type="indoor"
          onSubmit={(data) => handleCreateWarehouse('indoor', data)}
          onClose={() => setShowIndoorForm(false)}
        />
      )}

      {showOutdoorForm && (
        <WarehouseForm
          type="outdoor"
          onSubmit={(data) => handleCreateWarehouse('outdoor', data)}
          onClose={() => setShowOutdoorForm(false)}
        />
      )}
    </MainHome>
  );
} 