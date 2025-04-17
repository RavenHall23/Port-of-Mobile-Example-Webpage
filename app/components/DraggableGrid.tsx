import { useState, useEffect, useRef } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { statusColors } from '@/utils/warehouse-utils';
import type { WarehouseStatus } from '@/types/database';

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
  onMove: (id: string, position: Position) => void;
  onStatusChange: (id: string, status: WarehouseStatus) => void;
  onDelete: (id: string) => void;
  gridSize: number;
}

const DraggableSection: React.FC<DraggableSectionProps> = ({ 
  section, 
  onMove, 
  onStatusChange, 
  onDelete,
  gridSize 
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [showDeleteButton, setShowDeleteButton] = useState(false);
  
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'section',
    item: { id: section.id, position: section.position },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  // Apply the drag ref to our element
  drag(ref);

  const handleClick = () => {
    const newStatus = section.status === 'green' ? 'red' : 'green';
    onStatusChange(section.id, newStatus);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the status change
    onDelete(section.id);
  };

  const handleMouseEnter = () => {
    setShowDeleteButton(true);
  };

  const handleMouseLeave = () => {
    setShowDeleteButton(false);
  };

  // Calculate position with margin to prevent overlap with grid lines
  const margin = 6; // 6px margin on each side
  const sectionSize = gridSize - (margin * 2);

  return (
    <div
      ref={ref}
      className={`absolute cursor-move ${isDragging ? 'opacity-50' : ''}`}
      style={{
        left: `${section.position.x * gridSize + margin}px`,
        top: `${section.position.y * gridSize + margin}px`,
        width: `${sectionSize}px`,
        height: `${sectionSize}px`,
        transition: 'all 0.2s ease',
        zIndex: 20,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={handleClick}
        className={`w-full h-full rounded-lg flex items-center justify-center text-white font-semibold shadow-md hover:shadow-lg transition-all ${
          statusColors[section.status].color
        }`}
      >
        {section.number}
      </button>
      {showDeleteButton && (
        <button
          onClick={handleDelete}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
          title="Delete section"
        >
          ×
        </button>
      )}
    </div>
  );
};

interface GridCellProps {
  position: Position;
  onDrop: (sectionId: string, position: Position) => void;
  gridSize: number;
}

const GridCell: React.FC<GridCellProps> = ({ position, onDrop, gridSize }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'section',
    drop: (item: { id: string, position: Position }) => {
      onDrop(item.id, position);
      return { position };
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  // Apply the drop ref to our element
  drop(ref);

  return (
    <div
      ref={ref}
      className={`absolute border border-gray-300 dark:border-gray-600 ${
        isOver ? 'bg-gray-50 dark:bg-gray-800' : ''
      }`}
      style={{
        left: `${position.x * gridSize}px`,
        top: `${position.y * gridSize}px`,
        width: `${gridSize}px`,
        height: `${gridSize}px`,
        zIndex: 10,
      }}
    />
  );
};

interface DraggableGridProps {
  sections: Array<{
    key: string;
    status: WarehouseStatus;
    sectionNumber: string;
  }>;
  onSectionMove: (sectionId: string, position: Position) => void;
  onStatusChange: (sectionId: string, status: WarehouseStatus) => void;
  onSectionDelete?: (sectionId: string) => void;
  className?: string;
}

export const DraggableGrid: React.FC<DraggableGridProps> = ({
  sections,
  onSectionMove,
  onStatusChange,
  onSectionDelete,
  className = '',
}) => {
  const gridSize = 100; // Size of each grid cell in pixels
  const [gridWidth, setGridWidth] = useState(8); // Number of cells horizontally
  const [gridHeight, setGridHeight] = useState(6); // Number of cells vertically

  const [sectionStates, setSectionStates] = useState<SectionState[]>([]);
  const [initialized, setInitialized] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!initialized) {
      // Initialize section positions only once
      setSectionStates(
        sections.map((section, index) => ({
          id: section.key,
          position: {
            x: index % gridWidth,
            y: Math.floor(index / gridWidth),
          },
          status: section.status,
          number: section.sectionNumber,
        }))
      );
      setInitialized(true);
    } else {
      // For subsequent updates, only add new sections without changing existing positions
      setSectionStates(prevStates => {
        const existingIds = new Set(prevStates.map(s => s.id));
        const newSections = sections
          .filter(section => !existingIds.has(section.key))
          .map((section, index) => {
            // Find an empty position for the new section
            const usedPositions = new Set(prevStates.map(s => `${s.position.x},${s.position.y}`));
            let position = { x: 0, y: 0 };
            
            // Find the first available position
            for (let y = 0; y < gridHeight; y++) {
              for (let x = 0; x < gridWidth; x++) {
                if (!usedPositions.has(`${x},${y}`)) {
                  position = { x, y };
                  break;
                }
              }
              if (position.x !== 0 || position.y !== 0) break;
            }
            
            return {
              id: section.key,
              position,
              status: section.status,
              number: section.sectionNumber,
            };
          });
        
        return [...prevStates, ...newSections];
      });
    }
  }, [sections, initialized, gridWidth, gridHeight]);

  // Add event listeners for custom events
  useEffect(() => {
    const handleAddColumn = () => addColumn();
    const handleRemoveColumn = () => removeColumn();
    const handleAddRow = () => addRow();
    const handleRemoveRow = () => removeRow();

    const gridElement = gridRef.current;
    if (gridElement) {
      gridElement.addEventListener('addColumn', handleAddColumn);
      gridElement.addEventListener('removeColumn', handleRemoveColumn);
      gridElement.addEventListener('addRow', handleAddRow);
      gridElement.addEventListener('removeRow', handleRemoveRow);
    }

    return () => {
      if (gridElement) {
        gridElement.removeEventListener('addColumn', handleAddColumn);
        gridElement.removeEventListener('removeColumn', handleRemoveColumn);
        gridElement.removeEventListener('addRow', handleAddRow);
        gridElement.removeEventListener('removeRow', handleRemoveRow);
      }
    };
  }, []);

  const handleDrop = (sectionId: string, position: Position) => {
    // Update the section's position in the state
    setSectionStates((prev) =>
      prev.map((section) =>
        section.id === sectionId ? { ...section, position } : section
      )
    );
    
    // Notify parent component about the move
    onSectionMove(sectionId, position);
  };

  const handleStatusChange = (sectionId: string, status: WarehouseStatus) => {
    setSectionStates((prev) =>
      prev.map((section) =>
        section.id === sectionId ? { ...section, status } : section
      )
    );
    onStatusChange(sectionId, status);
  };

  const handleDelete = (sectionId: string) => {
    // Remove the section from the state
    setSectionStates((prev) => prev.filter((section) => section.id !== sectionId));
    
    // Notify parent component about the deletion if callback is provided
    if (onSectionDelete) {
      onSectionDelete(sectionId);
    }
  };

  const addColumn = () => {
    setGridWidth(prev => prev + 1);
  };

  const removeColumn = () => {
    if (gridWidth > 1) {
      // Check if any sections are in the last column
      const sectionsInLastColumn = sectionStates.filter(s => s.position.x === gridWidth - 1);
      
      if (sectionsInLastColumn.length === 0) {
        setGridWidth(prev => prev - 1);
      } else {
        alert("Cannot remove column: There are sections in the last column. Please move them first.");
      }
    }
  };

  const addRow = () => {
    setGridHeight(prev => prev + 1);
  };

  const removeRow = () => {
    if (gridHeight > 1) {
      // Check if any sections are in the last row
      const sectionsInLastRow = sectionStates.filter(s => s.position.y === gridHeight - 1);
      
      if (sectionsInLastRow.length === 0) {
        setGridHeight(prev => prev - 1);
      } else {
        alert("Cannot remove row: There are sections in the last row. Please move them first.");
      }
    }
  };

  return (
    <div className={`flex flex-col items-center ${className}`} ref={gridRef}>
      <DndProvider backend={HTML5Backend}>
        <div
          className="relative bg-white dark:bg-gray-900 rounded-xl shadow-lg p-4 border border-gray-300 dark:border-gray-600"
          style={{
            width: `${gridWidth * gridSize + 8}px`,
            height: `${gridHeight * gridSize + 8}px`,
          }}
        >
          {/* Grid cells */}
          {Array.from({ length: gridWidth * gridHeight }).map((_, index) => (
            <GridCell
              key={index}
              position={{
                x: index % gridWidth,
                y: Math.floor(index / gridWidth),
              }}
              onDrop={handleDrop}
              gridSize={gridSize}
            />
          ))}

          {/* Draggable sections */}
          {sectionStates.map((section) => (
            <DraggableSection
              key={section.id}
              section={section}
              onMove={handleDrop}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              gridSize={gridSize}
            />
          ))}
        </div>
      </DndProvider>
    </div>
  );
}; 