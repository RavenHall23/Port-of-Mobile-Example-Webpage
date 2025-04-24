'use client';

import { Warehouse } from "../../types/database";
import { cn } from "@/lib/utils";

interface WarehouseItemProps {
  warehouse: Warehouse;
  onClick: () => void;
  isSelected: boolean;
  utilization: number;
  lastModified: string;
}

export function WarehouseItem({
  warehouse,
  onClick,
  isSelected,
  utilization,
  lastModified,
}: WarehouseItemProps) {
  const getUtilizationColor = (percentage: number) => {
    const status = percentage === 100 ? 'red' : 'green';
    return statusColors[status]?.color || 'bg-green-500';
  }

  const getTextColor = (percentage: number) => {
    return percentage === 100
      ? 'text-rose-600 dark:text-rose-400'
      : 'text-emerald-600 dark:text-emerald-400'
  }

  const getRingColor = (percentage: number) => {
    return percentage === 100
      ? 'ring-rose-500/30 dark:ring-rose-400/30'
      : 'ring-emerald-500/30 dark:ring-emerald-400/30'
  }

  const formatLastModified = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch (error) {
      return 'Unknown';
    }
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 hover:bg-gray-50/80 dark:hover:bg-gray-800/40 cursor-pointer border-b border-gray-200 dark:border-gray-700 rounded-lg transition-all duration-200",
        isSelected && "bg-blue-50/50 dark:bg-blue-900/20"
      )}
        
      onClick={onClick}
    >
      <div className="flex flex-col">
        <span className="font-medium">{warehouse.name}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Last modified: {formatLastModified(lastModified)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex flex-col items-end">
          <span className="text-sm font-medium">{utilization}% utilized</span>
          <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${utilization}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 