import type { Warehouse } from '@/types/database'
import { statusColors } from '@/app/utils/warehouse-utils'

interface WarehouseItemProps {
  warehouse: Warehouse
  onClick: () => void
  isSelected: boolean
  utilization: number
}

export function WarehouseItem({ warehouse, onClick, isSelected, utilization }: WarehouseItemProps) {
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

  return (
    <div
      onClick={onClick}
      className={`group flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl cursor-pointer transition-all duration-300 ease-in-out backdrop-blur-sm ${
        isSelected
          ? 'bg-blue-50/90 dark:bg-blue-900/40 shadow-md shadow-blue-500/5 dark:shadow-blue-400/5'
          : 'hover:bg-gray-50/80 dark:hover:bg-gray-800/40 hover:shadow-md hover:shadow-gray-500/5 dark:hover:shadow-gray-400/5'
      }`}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <div className={`w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full flex-shrink-0 bg-gradient-to-br ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 transition-all duration-300 group-hover:scale-110 ${getUtilizationColor(utilization)} ${getRingColor(utilization)}`} />
        <span className="font-medium whitespace-nowrap text-sm sm:text-base text-gray-800 dark:text-gray-100 transition-colors duration-200">
          {warehouse.name}
        </span>
      </div>
      <span className={`text-xs sm:text-sm flex-shrink-0 ml-2 sm:ml-3 font-medium transition-colors duration-200 ${getTextColor(utilization)}`}>
        ({utilization}% filled)
      </span>
    </div>
  )
} 