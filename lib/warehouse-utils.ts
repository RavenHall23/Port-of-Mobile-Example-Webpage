import { StatusColors } from "@/types/warehouse";

export const calculatePercentage = (statuses: string[]) => {
  if (statuses.length === 0) return 0;

  let total = 0;
  let count = 0;
  statuses.forEach((status) => {
    if (status) {
      total += parseInt(
        statusColors[status as keyof typeof statusColors].percentage
      );
      count++;
    }
  });
  return count > 0 ? Math.round(total / count) : 0;
};

export const calculateIndoorPercentage = (
  buttonStatus: Record<string, keyof typeof statusColors>,
  indoorWarehouses: string[]
) => {
  const indoorStatuses = indoorWarehouses
    .flatMap((warehouse) =>
      [1, 2, 3, 4].map((section) => buttonStatus[`${warehouse}${section}`])
    )
    .filter(Boolean);
  return calculatePercentage(indoorStatuses);
};

export const calculateOutdoorPercentage = (
  buttonStatus: Record<string, keyof typeof statusColors>,
  outdoorWarehouses: string[]
) => {
  const outdoorStatuses = outdoorWarehouses
    .flatMap((warehouse) =>
      [1, 2, 3, 4].map((section) => buttonStatus[`${warehouse}${section}`])
    )
    .filter(Boolean);
  return calculatePercentage(outdoorStatuses);
};

export const calculateTotalPercentage = (
  buttonStatus: Record<string, keyof typeof statusColors>
) => {
  return calculatePercentage(Object.values(buttonStatus));
};

export const getWarehouseAverageStatus = (
  warehouse: string,
  buttonStatus: Record<string, keyof typeof statusColors>
) => {
  const sections = [1, 2, 3, 4].map(
    (section) => buttonStatus[`${warehouse}${section}`]
  );
  const percentage = calculatePercentage(sections);
  if (percentage >= 100) return "red";
  if (percentage >= 50) return "orange";
  if (percentage >= 25) return "yellow";
  return "green";
};

export const statusColors = {
  green: { color: "bg-green-500", percentage: "0%" },
  yellow: { color: "bg-yellow-500", percentage: "25%" },
  orange: { color: "bg-orange-500", percentage: "50%" },
  red: { color: "bg-red-500", percentage: "100%" },
} as const; 