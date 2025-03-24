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
  const totalSections = Object.keys(buttonStatus).length
  if (totalSections === 0) return 0

  const statusCounts = Object.values(buttonStatus).reduce((acc, status) => {
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {} as Record<WarehouseStatus, number>)

  const totalPercentage = Object.entries(statusCounts).reduce((sum, [status, count]) => {
    const percentage = parseInt(statusColors[status as WarehouseStatus].percentage)
    return sum + (percentage * count)
  }, 0)

  return Math.round(totalPercentage / totalSections)
}

export const calculateIndoorPercentage = (buttonStatus: Record<string, WarehouseStatus>, indoorLetters: string[]) => {
  const indoorSections = Object.entries(buttonStatus).filter(([key]) => 
    indoorLetters.includes(key[0])
  )

  if (indoorSections.length === 0) return 0

  const indoorPercentage = indoorSections.reduce((sum, [_, status]) => {
    const percentage = parseInt(statusColors[status].percentage)
    return sum + percentage
  }, 0)

  return Math.round(indoorPercentage / indoorSections.length)
}

export const calculateOutdoorPercentage = (buttonStatus: Record<string, WarehouseStatus>, outdoorLetters: string[]) => {
  const outdoorSections = Object.entries(buttonStatus).filter(([key]) => 
    outdoorLetters.includes(key[0])
  )

  if (outdoorSections.length === 0) return 0

  const outdoorPercentage = outdoorSections.reduce((sum, [_, status]) => {
    const percentage = parseInt(statusColors[status].percentage)
    return sum + percentage
  }, 0)

  return Math.round(outdoorPercentage / outdoorSections.length)
}

export const getWarehouseAverageStatus = (warehouseLetter: string, buttonStatus: Record<string, WarehouseStatus>): WarehouseStatus => {
  const warehouseSections = Object.entries(buttonStatus)
    .filter(([key]) => key.startsWith(warehouseLetter))
    .map(([_, status]) => status)

  if (warehouseSections.length === 0) return 'green'

  const statusValues = {
    green: 4,
    yellow: 3,
    orange: 2,
    red: 1
  }

  const averageValue = warehouseSections.reduce((sum, status) => sum + statusValues[status], 0) / warehouseSections.length

  if (averageValue >= 3.5) return 'green'
  if (averageValue >= 2.5) return 'yellow'
  if (averageValue >= 1.5) return 'orange'
  return 'red'
} 