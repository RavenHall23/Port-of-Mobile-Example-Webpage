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

interface RowLabel {
  rowIndex: number;
  label: string;
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
      className={`absolute ${
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
    position?: { x: number, y: number };
  }>;
  onSectionMove: (sectionId: string, position: Position) => void;
  onStatusChange: (sectionId: string, status: WarehouseStatus) => void;
  onSectionDelete?: (sectionId: string) => void;
  onSectionPositionUpdate: (warehouseLetter: string, sectionNumber: number, position: Position) => Promise<boolean>;
}

export const DraggableGrid: React.FC<DraggableGridProps> = ({
  sections,
  onSectionMove,
  onStatusChange,
  onSectionDelete,
  onSectionPositionUpdate,
}) => {
  const gridSize = 100; // Size of each grid cell in pixels
  const [gridWidth, setGridWidth] = useState(15); // Increased initial width
  const [gridHeight, setGridHeight] = useState(10); // Increased initial height
  const [middleColumnIndex, setMiddleColumnIndex] = useState(7); // Adjusted middle column index
  const [rowLabels, setRowLabels] = useState<RowLabel[]>([]);
  const [showAddLabel, setShowAddLabel] = useState(false);
  const [newLabelRow, setNewLabelRow] = useState<number | null>(null);
  const [newLabelText, setNewLabelText] = useState('');
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);

  const [sectionStates, setSectionStates] = useState<SectionState[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized) {
      // Initialize section positions from props or calculate default positions
      setSectionStates(
        sections.map((section) => {
          // Use provided position or calculate default
          let position = section.position || { x: 0, y: 0 };
          
          // If no position is provided, calculate default position
          if (!section.position) {
            const index = parseInt(section.sectionNumber) - 1;
            let x = index % (gridWidth - 1); // Use gridWidth - 1 to account for empty column
            let y = Math.floor(index / (gridWidth - 1));
            
            // Adjust x position to skip the middle column
            if (x >= middleColumnIndex) {
              x += 1; // Shift positions after the middle column
            }
            position = { x, y };
          }
          
          return {
            id: section.key,
            position,
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
          .map((section) => {
            // Use provided position or find first available position
            let position = section.position;
            
            if (!position) {
              const usedPositions = new Set(prevStates.map(s => `${s.position.x},${s.position.y}`));
              position = { x: 0, y: 0 };
              
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
    setSectionStates(prevStates => {
      const newStates = prevStates.map(section => {
        if (section.id === sectionId) {
          // Extract warehouse letter and section number from the section ID
          const warehouseLetter = section.id.charAt(0);
          const sectionNumber = parseInt(section.id.slice(1));
          
          // Update position in the database
          onSectionPositionUpdate(warehouseLetter, sectionNumber, position);
          
          return {
            ...section,
            position,
          };
        }
        return section;
      });
      return newStates;
    });
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

  const handleAddLabel = (rowIndex: number) => {
    setNewLabelRow(rowIndex);
    setNewLabelText('');
    setShowAddLabel(true);
  };

  const handleSaveLabel = () => {
    if (newLabelText.trim() !== '' && newLabelRow !== null) {
      // Check if a label already exists for this row
      const existingLabelIndex = rowLabels.findIndex(label => label.rowIndex === newLabelRow);
      
      if (existingLabelIndex >= 0) {
        // Update existing label
        setRowLabels(prev => 
          prev.map((label, index) => 
            index === existingLabelIndex 
              ? { ...label, label: newLabelText } 
              : label
          )
        );
      } else {
        // Add new label
        setRowLabels(prev => [...prev, { rowIndex: newLabelRow, label: newLabelText }]);
      }
    }
    
    setShowAddLabel(false);
    setNewLabelRow(null);
  };

  const handleEditLabel = (rowIndex: number, newLabel: string) => {
    setRowLabels(prev => 
      prev.map(label => 
        label.rowIndex === rowIndex 
          ? { ...label, label: newLabel } 
          : label
      )
    );
  };

  const handleDeleteLabel = (rowIndex: number) => {
    setRowLabels(prev => prev.filter(label => label.rowIndex !== rowIndex));
  };

  return (
    <div className="flex flex-col items-center">
      <div className="mb-6 flex flex-wrap gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Row Labels:</span>
          <button 
            onClick={() => setShowAddLabel(true)}
            className="px-3 py-1.5 bg-blue-500 text-white hover:bg-blue-600 transition-colors rounded-md"
            title="Add row label"
          >
            Add Label
          </button>
        </div>
      </div>
      
      <DndProvider backend={HTML5Backend}>
        <div
          className="relative bg-white dark:bg-gray-900 rounded-lg shadow-lg p-4 overflow-auto"
          style={{
            width: `${gridWidth * gridSize + 32}px`,
            height: `${gridHeight * gridSize + 32}px`,
            minWidth: '800px', // Ensure minimum width for usability
            minHeight: '600px', // Ensure minimum height for usability
          }}
        >
          {/* Grid cells - render all cells to enable drag and drop everywhere */}
          {Array.from({ length: gridWidth * gridHeight }).map((_, index) => {
            const x = index % gridWidth;
            const y = Math.floor(index / gridWidth);
            
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
            className="absolute bg-gray-100 dark:bg-gray-800"
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

          {/* Row labels */}
          {rowLabels.map((label) => (
            <div
              key={`label-${label.rowIndex}`}
              className="absolute flex items-center justify-center group"
              style={{
                left: 0,
                top: `${(label.rowIndex + 1) * gridSize - 15}px`,
                width: `${gridWidth * gridSize}px`,
                height: '30px',
                zIndex: 15,
              }}
            >
              <div className="flex items-center">
                <span className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm font-bold px-3 py-1.5 rounded-md shadow-md border border-gray-300 dark:border-gray-600">
                  {label.label}
                </span>
                <div className="flex ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setNewLabelRow(label.rowIndex);
                      setNewLabelText(label.label);
                      setShowAddLabel(true);
                    }}
                    className="text-blue-500 hover:text-blue-600 text-xs ml-2"
                    title="Edit label"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => handleDeleteLabel(label.rowIndex)}
                    className="text-red-500 hover:text-red-600 text-xs ml-1"
                    title="Delete label"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Add label UI */}
          {showAddLabel && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg w-80">
                <h3 className="text-lg font-medium mb-4">Add Row Label</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Row Position
                  </label>
                  <select
                    value={newLabelRow !== null ? newLabelRow : ''}
                    onChange={(e) => setNewLabelRow(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select a row</option>
                    {Array.from({ length: gridHeight - 1 }).map((_, index) => (
                      <option key={index} value={index}>
                        Between Row {index + 1} and {index + 2}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Label Text
                  </label>
                  <input
                    type="text"
                    value={newLabelText}
                    onChange={(e) => setNewLabelText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter label text"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setShowAddLabel(false)}
                    className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveLabel}
                    className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                    disabled={newLabelRow === null || newLabelText.trim() === ''}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Draggable sections */}
          {sectionStates.map((section) => (
            <DraggableSection
              key={section.id}
              section={section}
              onMove={(id, position) => {
                setDraggedSectionId(id);
                handleDrop(id, position);
              }}
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