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
  const margin = 4; // 4px margin on each side
  const sectionSize = gridSize - (margin * 2);

  return (
    <div
      ref={ref}
      className={`absolute cursor-move ${isDragging ? 'opacity-50 scale-105' : ''}`}
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
    >
      <button
        onClick={handleClick}
        className={`w-full h-full rounded-lg flex items-center justify-center text-white font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 ${
          statusColors[section.status].color
        }`}
      >
        {section.number}
      </button>
      {showDeleteButton && (
        <button
          onClick={handleDelete}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-all transform hover:scale-110 animate-fadeIn"
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
      className={`absolute border border-gray-200 dark:border-gray-700 ${
        isOver ? 'bg-gray-100 dark:bg-gray-800 ring-2 ring-blue-400 dark:ring-blue-500' : ''
      }`}
      style={{
        left: `${position.x * gridSize}px`,
        top: `${position.y * gridSize}px`,
        width: `${gridSize}px`,
        height: `${gridSize}px`,
        zIndex: 10,
        transition: 'all 0.2s ease',
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
}

export const DraggableGrid: React.FC<DraggableGridProps> = ({
  sections,
  onSectionMove,
  onStatusChange,
  onSectionDelete,
}) => {
  const gridSize = 100; // Size of each grid cell in pixels
  const [gridWidth, setGridWidth] = useState(7); // Number of cells horizontally (7 columns)
  const [gridHeight, setGridHeight] = useState(6); // Number of cells vertically (6 rows)
  const [middleColumnIndex, setMiddleColumnIndex] = useState(3); // Index of the middle column (0-based)

  const [sectionStates, setSectionStates] = useState<SectionState[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized) {
      // Initialize section positions with the middle column being empty
      setSectionStates(
        sections.map((section, index) => {
          // Calculate position with middle column being empty
          let x = index % (gridWidth - 1); // Use gridWidth - 1 to account for empty column
          let y = Math.floor(index / (gridWidth - 1));
          
          // Adjust x position to skip the middle column
          if (x >= middleColumnIndex) {
            x += 1; // Shift positions after the middle column
          }
          
          return {
            id: section.key,
            position: { x, y },
            status: section.status,
            number: section.sectionNumber,
          };
        })
      );
      setInitialized(true);
    } else {
      // For subsequent updates, only add new sections without changing existing positions
      setSectionStates(prevStates => {
        const existingIds = new Set(prevStates.map(s => s.id));
        const newSections = sections
          .filter(section => !existingIds.has(section.key))
          .map((section, index) => {
            // Find an empty position for the new section, avoiding the middle column
            const usedPositions = new Set(prevStates.map(s => `${s.position.x},${s.position.y}`));
            let position = { x: 0, y: 0 };
            
            // Find the first available position, skipping the middle column
            for (let y = 0; y < gridHeight; y++) {
              for (let x = 0; x < gridWidth; x++) {
                // Skip the middle column
                if (x === middleColumnIndex) continue;
                
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
  }, [sections, initialized, gridWidth, gridHeight, middleColumnIndex]);

  // Update section positions when the middle column index changes
  useEffect(() => {
    if (initialized) {
      setSectionStates(prevStates => {
        return prevStates.map(section => {
          const { x, y } = section.position;
          
          // If the section is to the right of the middle column, adjust its position
          if (x > middleColumnIndex) {
            return {
              ...section,
              position: { x, y }
            };
          }
          
          return section;
        });
      });
    }
  }, [middleColumnIndex, initialized]);

  const handleDrop = (sectionId: string, position: Position) => {
    // Prevent dropping in the middle column
    if (position.x === middleColumnIndex) {
      return; // Don't allow drops in the middle column
    }
    
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

  const addColumnLeft = () => {
    // Add a column to the left of the grid
    setGridWidth(prev => prev + 1);
    setMiddleColumnIndex(prev => prev + 1);
    
    // Shift all sections to the right
    setSectionStates(prevStates => 
      prevStates.map(section => {
        const { x, y } = section.position;
        return {
          ...section,
          position: { x: x + 1, y }
        };
      })
    );
  };

  const addColumnRight = () => {
    // Add a column to the right of the grid
    setGridWidth(prev => prev + 1);
  };

  const removeColumnLeft = () => {
    if (gridWidth > 1) {
      // Check if any sections are in the leftmost column
      const sectionsInLeftColumn = sectionStates.filter(s => s.position.x === 0);
      
      if (sectionsInLeftColumn.length === 0) {
        // Remove the leftmost column
        setGridWidth(prev => prev - 1);
        
        // Shift all sections to the left
        setSectionStates(prevStates => 
          prevStates.map(section => {
            const { x, y } = section.position;
            return {
              ...section,
              position: { x: x - 1, y }
            };
          })
        );
        
        // Adjust the middle column index
        setMiddleColumnIndex(prev => prev - 1);
      } else {
        alert("Cannot remove column: There are sections in the leftmost column. Please move them first.");
      }
    }
  };

  const removeColumnRight = () => {
    if (gridWidth > 1) {
      // Check if any sections are in the rightmost column
      const sectionsInRightColumn = sectionStates.filter(s => s.position.x === gridWidth - 1);
      
      if (sectionsInRightColumn.length === 0) {
        // Remove the rightmost column
        setGridWidth(prev => prev - 1);
      } else {
        alert("Cannot remove column: There are sections in the rightmost column. Please move them first.");
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
    <div className="flex flex-col items-center">
      <div className="mb-6 flex flex-wrap gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Columns:</span>
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden">
            <div className="flex">
              <button 
                onClick={removeColumnLeft}
                className="px-2 py-1.5 bg-red-500 text-white hover:bg-red-600 transition-colors border-r border-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={gridWidth <= 1}
                title="Remove column from left"
              >
                ←
              </button>
              <button 
                onClick={removeColumnRight}
                className="px-2 py-1.5 bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={gridWidth <= 1}
                title="Remove column from right"
              >
                →
              </button>
            </div>
            <span className="w-10 text-center font-medium">{gridWidth}</span>
            <div className="flex">
              <button 
                onClick={addColumnLeft}
                className="px-2 py-1.5 bg-green-500 text-white hover:bg-green-600 transition-colors border-r border-green-600"
                title="Add column to left"
              >
                ←
              </button>
              <button 
                onClick={addColumnRight}
                className="px-2 py-1.5 bg-green-500 text-white hover:bg-green-600 transition-colors"
                title="Add column to right"
              >
                →
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Rows:</span>
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden">
            <button 
              onClick={removeRow}
              className="px-3 py-1.5 bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={gridHeight <= 1}
            >
              -
            </button>
            <span className="w-10 text-center font-medium">{gridHeight}</span>
            <button 
              onClick={addRow}
              className="px-3 py-1.5 bg-green-500 text-white hover:bg-green-600 transition-colors"
            >
              +
            </button>
          </div>
        </div>
      </div>
      
      <DndProvider backend={HTML5Backend}>
        <div
          className="relative bg-white dark:bg-gray-900 rounded-lg shadow-lg p-4"
          style={{
            width: `${gridWidth * gridSize + 32}px`,
            height: `${gridHeight * gridSize + 32}px`,
          }}
        >
          {/* Grid cells */}
          {Array.from({ length: gridWidth * gridHeight }).map((_, index) => {
            const x = index % gridWidth;
            const y = Math.floor(index / gridWidth);
            
            // Highlight the middle column
            const isMiddleColumn = x === middleColumnIndex;
            
            return (
              <GridCell
                key={index}
                position={{ x, y }}
                onDrop={handleDrop}
                gridSize={gridSize}
              />
            );
          })}

          {/* Middle column indicator */}
          <div 
            className="absolute bg-gray-100 dark:bg-gray-800 border-l-2 border-r-2 border-blue-400 dark:border-blue-500"
            style={{
              left: `${middleColumnIndex * gridSize}px`,
              top: 0,
              width: `${gridSize}px`,
              height: `${gridHeight * gridSize}px`,
              zIndex: 5,
            }}
          >
            <div className="flex items-center justify-center h-full">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">AISLE</span>
            </div>
          </div>

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