"use client";
import { useState } from "react";
import { PieChartComponent } from "@/components/ui/pie-chart";
import { WarehouseForm } from "./components/WarehouseForm";

export default function Home() {
  const [indoorOpen, setIndoorOpen] = useState(false);
  const [outdoorOpen, setOutdoorOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(
    null
  );
  const [showWarehouseForm, setShowWarehouseForm] = useState(false);
  const [warehouseType, setWarehouseType] = useState<'indoor' | 'outdoor' | null>(null);
  const [buttonStatus, setButtonStatus] = useState<{
    [key: string]: keyof typeof statusColors;
  }>({
    // Indoor warehouses
    A1: "green",
    A2: "green",
    A3: "green",
    A4: "green",
    B1: "green",
    B2: "green",
    B3: "green",
    B4: "green",
    C1: "green",
    C2: "green",
    C3: "green",
    C4: "green",
    D1: "green",
    D2: "green",
    D3: "green",
    D4: "green",
    // Outdoor warehouses
    E1: "green",
    E2: "green",
    E3: "green",
    E4: "green",
    F1: "green",
    F2: "green",
    F3: "green",
    F4: "green",
    G1: "green",
    G2: "green",
    G3: "green",
    G4: "green",
    H1: "green",
    H2: "green",
    H3: "green",
    H4: "green",
  });

  const indoorWarehouses = ["A", "B", "C", "D"];
  const outdoorWarehouses = ["E", "F", "G", "H"];
  const statusColors = {
    green: { color: "bg-green-500", percentage: "0%" },
    yellow: { color: "bg-yellow-500", percentage: "25%" },
    orange: { color: "bg-orange-500", percentage: "50%" },
    red: { color: "bg-red-500", percentage: "100%" },
  };

  const handleWarehouseClick = (warehouse: string) => {
    setSelectedWarehouse(warehouse);
    setIndoorOpen(false);
    setOutdoorOpen(false);
  };

  const handleButtonClick = (warehouse: string, sectionNumber: number) => {
    const buttonKey = `${warehouse}${sectionNumber}`;

    // Cycle through status colors
    const statusOrder: (keyof typeof statusColors)[] = [
      "green",
      "yellow",
      "orange",
      "red",
    ];
    const currentStatus = buttonStatus[buttonKey];
    const currentIndex = currentStatus
      ? statusOrder.indexOf(currentStatus)
      : -1;
    const nextIndex = (currentIndex + 1) % statusOrder.length;

    setButtonStatus((prev) => ({
      ...prev,
      [buttonKey]: statusOrder[nextIndex],
    }));
  };

  const calculatePercentage = (statuses: string[]) => {
    if (statuses.length === 0) return 0;

    let total = 0;
    let count = 0;
    statuses.forEach((status) => {
      if (status) {
        total += parseInt(
          statusColors[status as keyof typeof statusColors].percentage
        );
        count++;
      }
    });
    return count > 0 ? Math.round(total / count) : 0;
  };

  const calculateTotalPercentage = () => {
    return calculatePercentage(Object.values(buttonStatus));
  };

  const calculateIndoorPercentage = () => {
    const indoorStatuses = indoorWarehouses
      .flatMap((warehouse) =>
        [1, 2, 3, 4].map((section) => buttonStatus[`${warehouse}${section}`])
      )
      .filter(Boolean);
    return calculatePercentage(indoorStatuses);
  };

  const calculateOutdoorPercentage = () => {
    const outdoorStatuses = outdoorWarehouses
      .flatMap((warehouse) =>
        [1, 2, 3, 4].map((section) => buttonStatus[`${warehouse}${section}`])
      )
      .filter(Boolean);
    return calculatePercentage(outdoorStatuses);
  };

  const getWarehouseAverageStatus = (warehouse: string) => {
    const sections = [1, 2, 3, 4].map(
      (section) => buttonStatus[`${warehouse}${section}`]
    );
    const percentage = calculatePercentage(sections);
    if (percentage >= 100) return "red";
    if (percentage >= 50) return "orange";
    if (percentage >= 25) return "yellow";
    return "green";
  };

  // Prepare data for pie chart
  const totalPercentage = calculateTotalPercentage();
  const indoorPercentage = calculateIndoorPercentage();
  const outdoorPercentage = calculateOutdoorPercentage();

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

  const handleCreateWarehouse = (type: 'indoor' | 'outdoor') => {
    setWarehouseType(type);
    setShowWarehouseForm(true);
    if (type === 'indoor') {
      setIndoorOpen(false);
    } else {
      setOutdoorOpen(false);
    }
  };

  const handleWarehouseSubmit = (data: { name: string; sections: number }) => {
    // Here you would typically handle the form submission
    // For now, we'll just log the data
    console.log('New warehouse:', { ...data, type: warehouseType });
    
    // You can add logic here to:
    // 1. Add the new warehouse to your warehouse list
    // 2. Update the UI to show the new warehouse
    // 3. Initialize the sections with default status
  };

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
                    onClick={() => handleWarehouseClick(warehouse)}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <div
                      className={`w-3 h-3 rounded-full ${
                        statusColors[getWarehouseAverageStatus(warehouse)].color
                      }`}
                    />
                    <span>Warehouse {warehouse}</span>
                  </div>
                ))}
                <div
                  className="flex items-center justify-between px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-t border-gray-200 dark:border-gray-700"
                  onClick={() => handleCreateWarehouse('indoor')}
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
                    key={warehouse}
                    onClick={() => handleWarehouseClick(warehouse)}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <div
                      className={`w-3 h-3 rounded-full ${
                        statusColors[getWarehouseAverageStatus(warehouse)].color
                      }`}
                    />
                    <span>Warehouse {warehouse}</span>
                  </div>
                ))}
                <div
                  className="flex items-center justify-between px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-t border-gray-200 dark:border-gray-700"
                  onClick={() => handleCreateWarehouse('outdoor')}
                >
                  <span className="text-purple-500">+ Create Warehouse</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {selectedWarehouse && (
          <div className="w-full">
            <h2 className="text-2xl font-bold mb-4 text-center">
              Warehouse {selectedWarehouse}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((sectionNumber) => {
                const buttonKey = `${selectedWarehouse}${sectionNumber}`;
                return (
                  <button
                    key={sectionNumber}
                    onClick={() =>
                      handleButtonClick(selectedWarehouse, sectionNumber)
                    }
                    className={`px-8 py-6 text-white rounded-lg transition-colors text-2xl font-semibold ${
                      buttonStatus[buttonKey]
                        ? statusColors[buttonStatus[buttonKey]].color
                        : "bg-blue-500 hover:bg-blue-600"
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

      {/* Warehouse Form Modal */}
      {showWarehouseForm && warehouseType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <WarehouseForm
            type={warehouseType}
            onClose={() => setShowWarehouseForm(false)}
            onSubmit={handleWarehouseSubmit}
          />
        </div>
      )}
    </div>
  );
}
