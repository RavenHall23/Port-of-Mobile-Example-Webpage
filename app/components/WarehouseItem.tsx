import type { Warehouse } from '@/types/database'

interface WarehouseItemProps {
  warehouse: Warehouse
  onClick: () => void
  isSelected: boolean
  utilization: number
  lastModified: string
}

export function WarehouseItem({ warehouse, onClick, isSelected, utilization, lastModified }: WarehouseItemProps) {
  const formatLastModified = (dateString: string) => {
    try {
      console.log('Formatting date string:', dateString);
      
      // Handle undefined or null values
      if (!dateString) {
        console.error('Date string is undefined or null');
        return 'Unknown';
      }
      
      const date = new Date(dateString);
      console.log('Parsed date object:', date);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.error('Invalid date:', dateString);
        return 'Unknown';
      }
      
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      console.log('Time difference in seconds:', diffInSeconds);
      
      if (diffInSeconds < 60) {
        return 'Just now';
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
      } else {
        // For dates older than 24 hours, show the full date and time
        return date.toLocaleString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZoneName: 'short'
        });
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Unknown';
    }
  };

  return (
    <div
      className={`flex items-center justify-between px-4 py-2 hover:bg-gray-50/80 dark:hover:bg-gray-800/40 cursor-pointer border-t border-gray-200 dark:border-gray-700 rounded-lg transition-all duration-200 ${
        isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex flex-col">
        <span className="font-medium text-gray-900 dark:text-gray-100">{warehouse.name}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">Last modified: {formatLastModified(lastModified)}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {utilization}%
        </div>
      </div>
    </div>
  );
} 