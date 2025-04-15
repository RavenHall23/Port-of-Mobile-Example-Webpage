'use client';

import { Warehouse } from '@/types/database';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useWarehouses } from '@/app/hooks/useWarehouses';
import { PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import { PieChartComponent } from '@/components/ui/pie-chart';
import { ThemeToggle } from './ThemeToggle';

interface WarehouseDetailsProps {
  warehouse: Warehouse;
}

export function WarehouseDetails({ warehouse }: WarehouseDetailsProps) {
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newSectionsCount, setNewSectionsCount] = useState(1);
  const {
    buttonStatus,
    updateSectionStatus,
    loading: warehousesLoading,
    addSections,
    removeSection
  } = useWarehouses();

  useEffect(() => {
    setLoading(warehousesLoading);
  }, [warehousesLoading]);

  const handleButtonClick = async (sectionNumber: number) => {
    const buttonKey = `${warehouse.letter}${sectionNumber}`;
    const currentStatus = buttonStatus[buttonKey];
    const nextStatus = currentStatus === 'green' ? 'red' : 'green';

    await updateSectionStatus(warehouse.letter, sectionNumber, nextStatus);
  };

  const handleAddSections = async () => {
    try {
      await addSections(warehouse.letter, newSectionsCount);
      setShowAddModal(false);
      setNewSectionsCount(1);
    } catch (err) {
      console.error('Error adding sections:', err);
    }
  };

  const handleRemoveSection = async (sectionNumber: number) => {
    if (confirm(`Are you sure you want to remove Section ${sectionNumber}?`)) {
      await removeSection(warehouse.letter, sectionNumber);
    }
  };

  // Calculate utilization data for the pie chart
  const getUtilizationData = () => {
    const sections = Object.entries(buttonStatus)
      .filter(([key]) => key.startsWith(warehouse.letter));
    const totalSections = sections.length;
    const usedSections = sections
      .filter(([, status]) => status === 'red')
      .length;
    const availableSections = totalSections - usedSections;

    return [
      {
        name: 'Used',
        value: totalSections > 0 ? (usedSections / totalSections) * 100 : 0,
        fill: '#ef4444'
      },
      {
        name: 'Available',
        value: totalSections > 0 ? (availableSections / totalSections) * 100 : 0,
        fill: '#22c55e'
      }
    ];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
            ← Back to Warehouses
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {warehouse.name}
          </h1>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-center p-4 gap-4">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center gap-1"
              onClick={() => setShowAddModal(true)}
            >
              <PlusIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Add Sections</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center gap-1"
              onClick={() => setShowRemoveModal(true)}
            >
              <TrashIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Remove Sections</span>
            </Button>
            <Button 
              variant="default" 
              size="sm"
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700"
              onClick={() => setShowRenameModal(true)}
            >
              <PencilIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Change Section Name</span>
            </Button>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-4xl">
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-center">Space Utilization</h2>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                <PieChartComponent
                  data={getUtilizationData()}
                  centerValue={Math.round((getUtilizationData()[0].value))}
                  centerLabel="Used"
                  tooltipFormatter={(value) => `${value}% Utilization`}
                />
              </div>
            </div>
            
            <h2 className="text-xl font-semibold mb-6 text-center">Sections</h2>
            <div className="grid grid-cols-3 gap-6 max-w-3xl mx-auto">
              {Object.entries(buttonStatus)
                .filter(([key]) => key.startsWith(warehouse.letter))
                .sort(([keyA], [keyB]) => {
                  const numA = parseInt(keyA.slice(1));
                  const numB = parseInt(keyB.slice(1));
                  return numA - numB;
                })
                .map(([key, status]) => {
                  const sectionNumber = parseInt(key.slice(1));
                  const bgColor = status === 'green' ? '#22c55e' : '#ef4444';
                  
                  return (
                    <button
                      key={sectionNumber}
                      onClick={() => handleButtonClick(sectionNumber)}
                      className="w-full p-6 rounded-lg border cursor-pointer hover:shadow-md transition-shadow text-left bg-white dark:bg-gray-800"
                    >
                      <h3 className="font-medium mb-3 text-base">Section {sectionNumber}</h3>
                      <div
                        className="w-full h-10 rounded flex items-center justify-center text-white font-bold text-base"
                        style={{ 
                          backgroundColor: bgColor,
                          transition: 'background-color 0.3s ease'
                        }}
                      >
                        {status === 'green' ? 'Available' : 'Unavailable'}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Add Sections Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
              <h3 className="text-xl font-semibold mb-4">Add Sections</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Number of Sections to Add
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newSectionsCount}
                  onChange={(e) => setNewSectionsCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddSections}
                >
                  Add Sections
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Remove Sections Modal */}
        {showRemoveModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
              <h3 className="text-xl font-semibold mb-4">Remove Sections</h3>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((sectionNumber) => (
                  <div key={sectionNumber} className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                    <span>Section {sectionNumber}</span>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleRemoveSection(sectionNumber)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="outline" onClick={() => setShowRemoveModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Rename Section Modal */}
        {showRenameModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
              <h3 className="text-xl font-semibold mb-4">Change Section Name</h3>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((sectionNumber) => (
                  <div key={sectionNumber} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`New name for Section ${sectionNumber}`}
                      className="flex-1 px-3 py-2 border rounded-lg"
                    />
                    <Button 
                      variant="default"
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Save
                    </Button>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="outline" onClick={() => setShowRenameModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 