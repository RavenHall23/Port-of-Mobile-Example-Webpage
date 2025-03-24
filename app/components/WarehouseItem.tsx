import type { WarehouseStatus } from '@/types/database';
import { statusColors, getWarehouseAverageStatus } from '@/utils/warehouse-utils';

interface Warehouse {
  letter: string;
  name: string;
}

interface WarehouseItemProps {
  warehouse: Warehouse;
  onSelect: (letter: string) => void;
  buttonStatus: Record<string, WarehouseStatus>;
}

export function WarehouseItem({ warehouse, onSelect, buttonStatus }: WarehouseItemProps) {
  return (
    <div
      onClick={() => onSelect(warehouse.letter)}
      className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
    >
      <div
        className={`w-3 h-3 rounded-full ${
          statusColors[getWarehouseAverageStatus(warehouse.letter, buttonStatus)].color
        }`}
      />
      <span>{warehouse.name}</span>
    </div>
  );
} 