import { WarehouseDashboard } from "../components/WarehouseDashboard";

// Mock data for demonstration
const mockStats = {
  totalSections: 100,
  occupiedSections: 75,
  availableSections: 25,
  statusBreakdown: {
    green: 60,
    red: 15,
  },
};

export default function DashboardPage() {
  return (
    <div className="container mx-auto p-4">
      <WarehouseDashboard 
        stats={mockStats}
        currentWarehouse="Main Warehouse"
      />
    </div>
  );
} 