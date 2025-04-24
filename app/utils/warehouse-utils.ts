'use client';

import type { WarehouseStatus } from '../../types/database';

export const statusColors = {
  green: {
    color: 'bg-green-500',
    percentage: '100%',
  },
  red: {
    color: 'bg-red-500',
    percentage: '0%',
  },
};

export const calculateTotalPercentage = (buttonStatus: Record<string, WarehouseStatus>) => {
  const totalSections = Object.keys(buttonStatus).length;
  if (totalSections === 0) return 0;

  const greenSections = Object.values(buttonStatus).filter(status => status === 'green').length;
  return (greenSections / totalSections) * 100;
};

export const calculateIndoorPercentage = (
  buttonStatus: Record<string, WarehouseStatus>,
  indoorWarehouseLetters: string[]
) => {
  const indoorSections = Object.entries(buttonStatus)
    .filter(([key]) => indoorWarehouseLetters.includes(key[0]))
    .map(([, status]) => status);

  if (indoorSections.length === 0) return 0;

  const greenSections = indoorSections.filter(status => status === 'green').length;
  return (greenSections / indoorSections.length) * 100;
};

export const calculateOutdoorPercentage = (
  buttonStatus: Record<string, WarehouseStatus>,
  outdoorWarehouseLetters: string[]
) => {
  const outdoorSections = Object.entries(buttonStatus)
    .filter(([key]) => outdoorWarehouseLetters.includes(key[0]))
    .map(([, status]) => status);

  if (outdoorSections.length === 0) return 0;

  const greenSections = outdoorSections.filter(status => status === 'green').length;
  return (greenSections / outdoorSections.length) * 100;
};

export const getWarehouseAverageStatus = (warehouseLetter: string, buttonStatus: Record<string, WarehouseStatus>): WarehouseStatus => {
  const warehouseSections = Object.entries(buttonStatus).filter(([key]) => key.startsWith(warehouseLetter));
  
  if (warehouseSections.length === 0) return 'green';

  const statusCounts = warehouseSections.reduce((acc, [, status]) => {
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<WarehouseStatus, number>);

  const maxCount = Math.max(...Object.values(statusCounts));
  const dominantStatus = Object.entries(statusCounts).find(([, count]) => count === maxCount)?.[0] as WarehouseStatus;

  return dominantStatus || 'green';
}; 