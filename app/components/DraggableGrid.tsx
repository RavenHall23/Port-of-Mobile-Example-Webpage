import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { statusColors } from '@/utils/warehouse-utils';
import type { WarehouseStatus } from '@/types/database';
import { PlusIcon } from '@heroicons/react/24/outline';

interface Position {
  x: number;
  y: number;
}

interface SectionState {
  id: string;
  position: Position;
  status: WarehouseStatus;
  number: string;
}

interface DraggableSectionProps {
  section: SectionState;
  onStatusChange: (id: string, status: WarehouseStatus) => void;
  onDelete: (id: string) => void;
  gridSize: number;
  colorBlindMode: boolean;
}

const DraggableSection: React.FC<DraggableSectionProps> = ({ 
  section, 
  onStatusChange, 
  onDelete,
  gridSize,
  colorBlindMode
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [showDeleteButton, setShowDeleteButton] = useState(false);

  const handleClick = () => {
    const newStatus = section.status === 'green' ? 'red' : 'green';
    onStatusChange(section.id, newStatus);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(section.id);
  };

  const handleMouseEnter = () => {
    setShowDeleteButton(true);
  };

  const handleMouseLeave = () => {
    setShowDeleteButton(false);
  };

  const margin = gridSize < 80 ? 2 : 4;
  const sectionSize = gridSize - (margin * 2);

  const getPatternClass = (status: WarehouseStatus) => {
    if (!colorBlindMode) return '';
    
    return status === 'green' 
      ? 'pattern-diagonal-lines pattern-green-500 pattern-opacity-30' 
      : 'pattern-dots pattern-red-500 pattern-opacity-30';
  };

  const getStatusIndicator = (status: WarehouseStatus) => {
    if (!colorBlindMode) return '';
    
    return status === 'green' ? '✓' : '×';
  };

  return (
    <div
      ref={ref}
      className="absolute cursor-move"
      style={{
        left: `${section.position.x * gridSize + margin}px`,
        top: `${section.position.y * gridSize + margin}px`,
        width: `${sectionSize}px`,
        height: `${sectionSize}px`,
        transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
        zIndex: 20,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleMouseEnter}
      onTouchEnd={handleMouseLeave}
    >
      <button
        onClick={handleClick}
        className={`w-full h-full rounded-lg flex items-center justify-center text-white font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 ${
          statusColors[section.status].color
        } ${getPatternClass(section.status)}`}
      >
        <div className="flex flex-col items-center">
          <span className={`${gridSize < 80 ? 'text-xs' : 'text-sm'}`}>{section.number}</span>
          {getStatusIndicator(section.status) && (
            <span className="text-white font-bold">{getStatusIndicator(section.status)}</span>
          )}
        </div>
      </button>
      {showDeleteButton && (
        <button
          onClick={handleDelete}
          className="absolute -top-2 -right-2 w-5 h-5 sm:w-6 sm:h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-all transform hover:scale-110 animate-fadeIn"
          title="Delete section"
        >
          ×
        </button>
      )}
    </div>
  );
};

interface DraggableGridProps {
  sections: Array<{
    key: string;
    position: Position;
    status: WarehouseStatus;
    sectionNumber: string;
  }>;
  onStatusChange: (warehouseLetter: string, sectionNumber: number, status: WarehouseStatus) => void;
  onSectionDelete: (warehouseLetter: string, sectionNumber: number) => void;
  currentWarehouse: string;
  onAddSections: (warehouseLetter: string) => void;
  colorBlindMode?: boolean;
}

export const DraggableGrid: React.FC<DraggableGridProps> = ({
  sections,
  onStatusChange,
  onSectionDelete,
  currentWarehouse,
  onAddSections,
  colorBlindMode = false,
}) => {
  const [gridSize, setGridSize] = useState(100);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkIfMobile = () => {
      const isMobile = window.innerWidth < 768;
      setGridSize(isMobile ? 60 : 100);
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  const handleStatusChange = (sectionId: string, status: WarehouseStatus) => {
    const warehouseLetter = sectionId.charAt(0);
    const sectionNumber = parseInt(sectionId.slice(1));
    onStatusChange(warehouseLetter, sectionNumber, status);
  };

  const handleDelete = (sectionId: string) => {
    const warehouseLetter = sectionId.charAt(0);
    const sectionNumber = parseInt(sectionId.slice(1));
    onSectionDelete(warehouseLetter, sectionNumber);
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {currentWarehouse}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => onAddSections(currentWarehouse)}
            className="p-2 text-green-500 hover:text-green-600 transition-colors"
            title="Add sections"
          >
            <PlusIcon className="h-6 w-6" />
          </button>
        </div>
      </div>
      <div
        ref={gridRef}
        className="relative bg-gray-100 dark:bg-gray-800 rounded-lg p-4 min-h-[400px]"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(10, ${gridSize}px)`,
          gridTemplateRows: `repeat(10, ${gridSize}px)`,
          gap: '2px',
        }}
      >
        {sections.map((section) => (
          <DraggableSection
            key={section.key}
            section={{
              id: section.key,
              position: section.position,
              status: section.status,
              number: section.sectionNumber,
            }}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
            gridSize={gridSize}
            colorBlindMode={colorBlindMode}
          />
        ))}
      </div>
    </div>
  );
}; 