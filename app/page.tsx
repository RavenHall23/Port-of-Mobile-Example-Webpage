"use client";
import { useState } from "react";
import { WarehouseItem } from "@/components/WarehouseItem";
import { WarehouseForm } from "@/components/WarehouseForm";
import { useWarehouses } from "@/app/hooks/useWarehouses";
import { PieChartComponent } from "@/components/ui/pie-chart";
import { calculateIndoorPercentage, calculateOutdoorPercentage } from "./utils/warehouse-utils";
import MainHome from './components/MainHome'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'

export default function Home() {
  const [indoorOpen, setIndoorOpen] = useState(false);
  const [outdoorOpen, setOutdoorOpen] = useState(false);
  const [showIndoorForm, setShowIndoorForm] = useState(false);
  const [showOutdoorForm, setShowOutdoorForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const {
    indoorWarehouses,
    outdoorWarehouses,
    buttonStatus,
    createWarehouse,
    removeWarehouse
  } = useWarehouses();

  const calculateUtilization = (letter: string) => {
    const sections = Object.entries(buttonStatus)
      .filter(([key]) => key.startsWith(letter))
      .map(([, status]) => status === 'red' ? 100 : 0);

    if (sections.length === 0) return 0;
    const total = sections.reduce((sum: number, value: number) => sum + value, 0);
    return Math.round(total / sections.length);
  };

  // Calculate percentages using the utility functions
  const indoorPercentage = calculateIndoorPercentage(buttonStatus, indoorWarehouses.map(w => w.letter));
  const outdoorPercentage = calculateOutdoorPercentage(buttonStatus, outdoorWarehouses.map(w => w.letter));

  // Calculate overall utilization with 50% weight for each type
  const indoorContribution = indoorPercentage * 0.5;  // 50% of total space
  const outdoorContribution = outdoorPercentage * 0.5;  // 50% of total space
  const overallUtilization = indoorContribution + outdoorContribution;

  // Calculate unutilized space (100% - total utilization)
  const unutilizedPercentage = 100 - overallUtilization;

  // Prepare data for pie chart
  const pieChartData = [
    {
      name: "Indoor",
      value: indoorContribution,
      fill: "hsl(199, 89%, 65%)", // blue
    },
    {
      name: "Outdoor",
      value: outdoorContribution,
      fill: "hsl(280, 65%, 70%)", // purple
    },
    {
      name: "Unutilized",
      value: unutilizedPercentage,
      fill: "hsl(215, 20%, 85%)", // whitish gray
    }
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
              centerValue={overallUtilization.toFixed(1)}
            centerLabel="Overall Utilization"
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
            {/* Legend */}
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              {pieChartData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ 
                      background: item.name === "Indoor" 
                        ? "linear-gradient(135deg, hsl(199, 89%, 75%), hsl(199, 89%, 55%))"
                        : item.name === "Outdoor"
                        ? "linear-gradient(135deg, hsl(280, 65%, 80%), hsl(280, 65%, 60%))"
                        : "linear-gradient(135deg, hsl(215, 20%, 95%), hsl(215, 20%, 75%))"
                    }}
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {item.name} ({item.value.toFixed(1)}%)
                  </span>
                </div>
              ))}
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
                  isSelected={false}
                  utilization={calculateUtilization(warehouse.letter)}
                  onRemove={async () => {
                    try {
                      await removeWarehouse(warehouse.letter);
                    } catch (error) {
                      console.error('Error removing warehouse:', error);
                      setError('Failed to remove warehouse');
                    }
                  }}
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
                  isSelected={false}
                  utilization={calculateUtilization(warehouse.letter)}
                  onRemove={async () => {
                    try {
                      await removeWarehouse(warehouse.letter);
                    } catch (error) {
                      console.error('Error removing warehouse:', error);
                      setError('Failed to remove warehouse');
                    }
                  }}
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

      {/* Modal Overlay */}
      {(showIndoorForm || showOutdoorForm) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
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
            </div>
          </div>
        )}
    </MainHome>
  );
} 