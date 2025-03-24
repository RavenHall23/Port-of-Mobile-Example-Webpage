"use client";
import { useState } from "react";
import { PieChartComponent } from "@/components/ui/pie-chart";
import { WarehouseForm } from "@/components/WarehouseForm";
import { useWarehouses } from "@/hooks/useWarehouses";
import {
  calculateIndoorPercentage,
  calculateOutdoorPercentage,
  calculateTotalPercentage,
  getWarehouseAverageStatus,
  statusColors
} from "@/utils/warehouse-utils";

interface Warehouse {
  letter: string;
  name: string;
}

export default function Home() {
  const [indoorOpen, setIndoorOpen] = useState(false);
  const [outdoorOpen, setOutdoorOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);
  const [showIndoorForm, setShowIndoorForm] = useState(false);
  const [showOutdoorForm, setShowOutdoorForm] = useState(false);
  
  const {
    indoorWarehouses,
    outdoorWarehouses,
    buttonStatus,
    loading,
    createWarehouse,
    updateSectionStatus
  } = useWarehouses();

  const handleWarehouseClick = (warehouse: string) => {
    setSelectedWarehouse(warehouse);
    setIndoorOpen(false);
    setOutdoorOpen(false);
  };

  const handleButtonClick = async (warehouse: string, sectionNumber: number) => {
    const buttonKey = `${warehouse}${sectionNumber}`;
    const statusOrder: (keyof typeof statusColors)[] = ["green", "yellow", "orange", "red"];
    const currentStatus = buttonStatus[buttonKey];
    const currentIndex = currentStatus ? statusOrder.indexOf(currentStatus) : -1;
    const nextIndex = (currentIndex + 1) % statusOrder.length;
    const nextStatus = statusOrder[nextIndex];

    await updateSectionStatus(warehouse, sectionNumber, nextStatus);
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

  if (loading) {
    return <div className="min-h-screen p-8 flex items-center justify-center">
      <div className="text-xl">Loading warehouses...</div>
    </div>;
  }

  return (
    <div className="min-h-screen p-8 flex flex-col items-center justify-center">
      <h1 className="text-[32pt] font-[family-name:var(--font-geist-mono)] mb-12 bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent tracking-tight">
        Port of Mobile Test
      </h1>

      <div className="mb-8 w-full max-w-md">
        <PieChartComponent
          data={pieChartData}
          title="Port Utilization"
          description="Indoor and Outdoor Warehouses"
          centerLabel="Total Utilization"
          centerValue={totalPercentage}
          innerRadius={60}
          outerRadius={100}
          className="shadow-lg"
          tooltipFormatter={tooltipFormatter}
          footer={
            <div className="flex justify-around w-full pt-2">
              <div className="flex flex-col items-center">
                <span className="font-semibold text-blue-600 dark:text-blue-400 text-lg">
                  {indoorPercentage}%
                </span>
                <span className="text-sm text-muted-foreground">Indoor</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="font-semibold text-purple-600 dark:text-purple-400 text-lg">
                  {outdoorPercentage}%
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
            <div className="absolute mt-2 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg">
              {indoorWarehouses.map((warehouse) => (
                <div
                  key={warehouse.letter}
                  onClick={() => handleWarehouseClick(warehouse.letter)}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <div
                    className={`w-3 h-3 rounded-full ${
                      statusColors[getWarehouseAverageStatus(warehouse.letter, buttonStatus)].color
                    }`}
                  />
                  <span>{warehouse.name} (Warehouse {warehouse.letter})</span>
                </div>
              ))}
              <div
                className="flex items-center justify-between px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-t border-gray-200 dark:border-gray-700"
                onClick={() => setShowIndoorForm(true)}
              >
                <span className="text-blue-500">+ Create Warehouse</span>
              </div>
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
                  key={warehouse.letter}
                  onClick={() => handleWarehouseClick(warehouse.letter)}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <div
                    className={`w-3 h-3 rounded-full ${
                      statusColors[getWarehouseAverageStatus(warehouse.letter, buttonStatus)].color
                    }`}
                  />
                  <span>{warehouse.name} (Warehouse {warehouse.letter})</span>
                </div>
              ))}
              <div
                className="flex items-center justify-between px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-t border-gray-200 dark:border-gray-700"
                onClick={() => setShowOutdoorForm(true)}
              >
                <span className="text-purple-500">+ Create Warehouse</span>
              </div>
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

      {selectedWarehouse && (
        <div className="w-full">
          <h2 className="text-2xl font-bold mb-4 text-center">
            Warehouse {selectedWarehouse}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(buttonStatus)
              .filter(([key]) => key.startsWith(selectedWarehouse))
              .map(([key, status]) => {
                const sectionNumber = parseInt(key.slice(1));
                return (
                  <button
                    key={sectionNumber}
                    onClick={() =>
                      handleButtonClick(selectedWarehouse, sectionNumber)
                    }
                    className={`px-8 py-6 text-white rounded-lg transition-colors text-2xl font-semibold ${
                      status
                        ? statusColors[status].color
                        : "bg-blue-500 hover:bg-blue-600"
                    }`}
                  >
                    Section {String.fromCharCode(64 + sectionNumber)}
                    {status && (
                      <span className="ml-2">
                        ({statusColors[status].percentage})
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
