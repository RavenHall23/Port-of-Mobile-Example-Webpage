'use client';

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WarehouseStatus } from "../../types/database";
import { TimeFilter } from "./TimeFilter";
import { LineChart } from "../components/ui/chart";

interface UtilizationStats {
  totalSections: number;
  occupiedSections: number;
  availableSections: number;
  statusBreakdown: {
    [key in WarehouseStatus]: number;
  };
  historicalData?: {
    date: string;
    utilization: number;
  }[];
}

interface WarehouseDashboardProps {
  stats: UtilizationStats;
  currentWarehouse?: string;
}

const CustomProgress = ({ value }: { value: number }) => {
  return (
    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-full bg-blue-500 transition-all duration-300"
        style={{ width: `${value}%` }}
      />
    </div>
  );
};

export const WarehouseDashboard: React.FC<WarehouseDashboardProps> = ({
  stats,
  currentWarehouse,
}) => {
  const [timeRange, setTimeRange] = useState<"day" | "week" | "month" | "year" | "custom">("day");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [historicalData, setHistoricalData] = useState<{ date: string; utilization: number }[]>([]);

  const utilizationPercentage = stats.totalSections > 0
    ? (stats.occupiedSections / stats.totalSections) * 100
    : 0;

  useEffect(() => {
    // Simulate fetching historical data based on time range
    const fetchHistoricalData = () => {
      const now = new Date();
      const data = [];
      let count = 0;

      switch (timeRange) {
        case "day":
          count = 24; // Hours in a day
          for (let i = 0; i < count; i++) {
            data.push({
              date: new Date(now.getTime() - (count - i) * 60 * 60 * 1000).toISOString(),
              utilization: Math.random() * 100,
            });
          }
          break;
        case "week":
          count = 7; // Days in a week
          for (let i = 0; i < count; i++) {
            data.push({
              date: new Date(now.getTime() - (count - i) * 24 * 60 * 60 * 1000).toISOString(),
              utilization: Math.random() * 100,
            });
          }
          break;
        case "month":
          count = 30; // Days in a month
          for (let i = 0; i < count; i++) {
            data.push({
              date: new Date(now.getTime() - (count - i) * 24 * 60 * 60 * 1000).toISOString(),
              utilization: Math.random() * 100,
            });
          }
          break;
        case "year":
          count = 12; // Months in a year
          for (let i = 0; i < count; i++) {
            data.push({
              date: new Date(now.getTime() - (count - i) * 30 * 24 * 60 * 60 * 1000).toISOString(),
              utilization: Math.random() * 100,
            });
          }
          break;
        case "custom":
          if (startDate && endDate) {
            const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
            for (let i = 0; i < days; i++) {
              data.push({
                date: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000).toISOString(),
                utilization: Math.random() * 100,
              });
            }
          }
          break;
      }

      setHistoricalData(data);
    };

    fetchHistoricalData();
  }, [timeRange, startDate, endDate]);

  const handleTimeRangeChange = (range: "day" | "week" | "month" | "year" | "custom", start?: Date, end?: Date) => {
    setTimeRange(range);
    if (range === "custom" && start && end) {
      setStartDate(start);
      setEndDate(end);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Warehouse Utilization</h2>
        <TimeFilter onRangeChange={handleTimeRangeChange} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Warehouse Overview Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Current Warehouse
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentWarehouse || "None"}</div>
            <p className="text-xs text-muted-foreground">
              Active warehouse location
            </p>
          </CardContent>
        </Card>

        {/* Total Sections Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Sections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSections}</div>
            <p className="text-xs text-muted-foreground">
              Total available sections
            </p>
          </CardContent>
        </Card>

        {/* Utilization Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{utilizationPercentage.toFixed(1)}%</div>
            <CustomProgress value={utilizationPercentage} />
            <p className="text-xs text-muted-foreground mt-2">
              {stats.occupiedSections} of {stats.totalSections} sections in use
            </p>
          </CardContent>
        </Card>

        {/* Available Sections Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Available Sections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.availableSections}</div>
            <p className="text-xs text-muted-foreground">
              Sections ready for use
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Historical Utilization Chart */}
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Historical Utilization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <LineChart
              data={historicalData.map(d => ({
                date: new Date(d.date).toLocaleDateString(),
                value: d.utilization
              }))}
              xAxisKey="date"
              yAxisKey="value"
              tooltipFormatter={(value) => `${value.toFixed(1)}% utilization`}
            />
          </div>
        </CardContent>
      </Card>

      {/* Status Breakdown Card */}
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Object.entries(stats.statusBreakdown).map(([status, count]) => (
              <div key={status} className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{
                  backgroundColor: status === 'green' ? '#22c55e' : '#ef4444'
                }} />
                <div className="flex-1">
                  <div className="text-sm font-medium capitalize">{status}</div>
                  <div className="text-sm text-muted-foreground">{count} sections</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 