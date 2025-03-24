import type { Warehouse } from '@/types/database'

interface WarehouseItemProps {
  warehouse: Warehouse
  onClick: () => void
  isSelected: boolean
  utilization: number
}

export function WarehouseItem({ warehouse, onClick, isSelected, utilization }: WarehouseItemProps) {
  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 75) return 'from-green-500/90 to-emerald-500/90 dark:from-green-400/90 dark:to-emerald-400/90'
    if (percentage >= 50) return 'from-yellow-500/90 to-amber-500/90 dark:from-yellow-400/90 dark:to-amber-400/90'
    if (percentage >= 25) return 'from-orange-500/90 to-amber-600/90 dark:from-orange-400/90 dark:to-amber-500/90'
    return 'from-red-500/90 to-rose-600/90 dark:from-red-400/90 dark:to-rose-500/90'
  }

  const getTextColor = (percentage: number) => {
    if (percentage >= 75) return 'text-emerald-600 dark:text-emerald-400'
    if (percentage >= 50) return 'text-amber-600 dark:text-amber-400'
    if (percentage >= 25) return 'text-orange-600 dark:text-orange-400'
    return 'text-rose-600 dark:text-rose-400'
  }

  const getRingColor = (percentage: number) => {
    if (percentage >= 75) return 'ring-emerald-500/30 dark:ring-emerald-400/30'
    if (percentage >= 50) return 'ring-amber-500/30 dark:ring-amber-400/30'
    if (percentage >= 25) return 'ring-orange-500/30 dark:ring-orange-400/30'
    return 'ring-rose-500/30 dark:ring-rose-400/30'
  }

  return (
    <div
      onClick={onClick}
      className={`group flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all duration-300 ease-in-out backdrop-blur-sm ${
        isSelected
          ? 'bg-blue-50/90 dark:bg-blue-900/40 shadow-md shadow-blue-500/5 dark:shadow-blue-400/5'
          : 'hover:bg-gray-50/80 dark:hover:bg-gray-800/40 hover:shadow-md hover:shadow-gray-500/5 dark:hover:shadow-gray-400/5'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 bg-gradient-to-br ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 transition-all duration-300 group-hover:scale-110 ${getUtilizationColor(utilization)} ${getRingColor(utilization)}`} />
        <span className="font-medium whitespace-nowrap text-gray-800 dark:text-gray-100 transition-colors duration-200">
          {warehouse.name}
        </span>
      </div>
      <span className={`text-sm flex-shrink-0 ml-3 font-medium transition-colors duration-200 ${getTextColor(utilization)}`}>
        ({utilization}% available)
      </span>
    </div>
  )
} 