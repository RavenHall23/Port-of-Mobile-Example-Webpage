import type { Warehouse } from '@/types/database'

interface WarehouseItemProps {
  warehouse: Warehouse
  onClick: () => void
  isSelected: boolean
  utilization: number
}

export function WarehouseItem({ warehouse, onClick, isSelected, utilization }: WarehouseItemProps) {
  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 75) return 'bg-green-500 dark:bg-green-400'
    if (percentage >= 50) return 'bg-yellow-500 dark:bg-yellow-400'
    if (percentage >= 25) return 'bg-orange-500 dark:bg-orange-400'
    return 'bg-red-500 dark:bg-red-400'
  }

  const getTextColor = (percentage: number) => {
    if (percentage >= 75) return 'text-green-600 dark:text-green-400'
    if (percentage >= 50) return 'text-yellow-600 dark:text-yellow-400'
    if (percentage >= 25) return 'text-orange-600 dark:text-orange-400'
    return 'text-red-600 dark:text-red-400'
  }

  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
        isSelected
          ? 'bg-blue-100 dark:bg-blue-900'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
    >
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getUtilizationColor(utilization)}`} />
        <span className="font-medium whitespace-nowrap">{warehouse.name}</span>
      </div>
      <span className={`text-sm flex-shrink-0 ml-2 ${getTextColor(utilization)}`}>
        ({utilization}% available)
      </span>
    </div>
  )
} 