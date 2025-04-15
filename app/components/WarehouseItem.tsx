'use client';

import { useState } from 'react';
import { Warehouse } from '@/types/database';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { TrashIcon } from '@heroicons/react/24/outline';

interface WarehouseItemProps {
  warehouse: Warehouse;
  isSelected: boolean;
  utilization: number;
  onRemove: () => Promise<void>;
}

export function WarehouseItem({
  warehouse,
  isSelected,
  utilization,
  onRemove
}: WarehouseItemProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/warehouse/${warehouse.letter}`);
  };

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await onRemove();
    } catch (error) {
      console.error('Error removing warehouse:', error);
    }
  };

  return (
    <div
      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
      onClick={handleClick}
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white">
            {warehouse.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {warehouse.type === 'indoor' ? 'Indoor' : 'Outdoor'}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
          onClick={handleRemove}
        >
          <TrashIcon className="h-5 w-5" />
        </Button>
      </div>
      <div className="mt-2">
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${utilization}%`,
              backgroundColor: utilization > 80 
                ? '#ef4444' // red
                : utilization > 50 
                ? '#f59e0b' // amber
                : '#22c55e' // green
            }}
          />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {utilization.toFixed(1)}% utilized
        </p>
      </div>
    </div>
  );
}