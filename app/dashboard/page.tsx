import Link from 'next/link';
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
      {/* Back button */}
      <div className="mb-6">
        <Link 
          href="/"
          className="inline-flex items-center px-4 py-2 bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 shadow-sm"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 mr-2" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path 
              fillRule="evenodd" 
              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" 
              clipRule="evenodd" 
            />
          </svg>
          Back to Home
        </Link>
      </div>

      <WarehouseDashboard 
        stats={mockStats}
        currentWarehouse="Main Warehouse"
      />
    </div>
  );
} 