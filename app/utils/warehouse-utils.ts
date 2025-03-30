import type { WarehouseStatus } from '@/types/database'

export const statusColors: Record<WarehouseStatus, { color: string; percentage: string }> = {
  green: {
    color: 'bg-green-500 hover:bg-green-600',
    percentage: '100%'
  },
  yellow: {
    color: 'bg-yellow-500 hover:bg-yellow-600',
    percentage: '75%'
  },
  orange: {
    color: 'bg-orange-500 hover:bg-orange-600',
    percentage: '50%'
  },
  red: {
    color: 'bg-red-500 hover:bg-red-600',
    percentage: '25%'
  }
}

export const calculateTotalPercentage = (buttonStatus: Record<string, WarehouseStatus>) => {
  const totalSections = Object.keys(buttonStatus).length;
  if (totalSections === 0) return 0;

  const totalGreen = Object.values(buttonStatus).filter(status => status === 'green').length;
  return (totalGreen / totalSections) * 100;
};

export const calculateIndoorPercentage = (buttonStatus: Record<string, WarehouseStatus>, indoorLetters: string[]) => {
  const indoorSections = Object.entries(buttonStatus).filter(([key]) => 
    indoorLetters.includes(key[0])
  );
  
  if (indoorSections.length === 0) return 0;

  const indoorGreen = indoorSections.filter(([, status]) => status === 'green').length;
  return (indoorGreen / indoorSections.length) * 100;
};

export const calculateOutdoorPercentage = (buttonStatus: Record<string, WarehouseStatus>, outdoorLetters: string[]) => {
  const outdoorSections = Object.entries(buttonStatus).filter(([key]) => 
    outdoorLetters.includes(key[0])
  );
  
  if (outdoorSections.length === 0) return 0;

  const outdoorGreen = outdoorSections.filter(([, status]) => status === 'green').length;
  return (outdoorGreen / outdoorSections.length) * 100;
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