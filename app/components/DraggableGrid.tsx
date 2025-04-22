import { useState, useEffect, useRef } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { statusColors } from '../utils/warehouse-utils';
import type { WarehouseStatus } from '../../types/database';

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
  colorBlindMode: boolean;
}

const DraggableSection: React.FC<DraggableSectionProps> = ({ 
  section, 
  onMove, 
  onStatusChange, 
  onDelete,
  gridSize,
  colorBlindMode
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [showDeleteButton, setShowDeleteButton] = useState(false);
  const [isTouching, setIsTouching] = useState(false);
  const [touchStartTime, setTouchStartTime] = useState(0);
  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 });
  
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'section',
    item: () => {
      console.log('Drag begin - section:', section.id, 'from position:', section.position);
      return { 
        id: section.id, 
        position: section.position,
        originalPosition: section.position 
      };
    },
    collect: (monitor) => {
      const isDragging = !!monitor.isDragging();
      console.log('Drag collect - isDragging:', isDragging);
      return { isDragging };
    },
    end: (item: { id: string, position: Position, originalPosition: Position }, monitor) => {
      console.log('Drag end - item:', item);
      if (!monitor.didDrop()) {
        console.log('Drag cancelled - no drop, returning to original position');
        onMove(item.id, item.originalPosition);
        return;
      }
      const dropResult = monitor.getDropResult() as { position: Position };
      console.log('Drop result:', dropResult);
      if (dropResult) {
        onMove(item.id, dropResult.position);
      }
    },
    canDrag: true,
  }));

  // Apply the drag ref to our element
  drag(ref);

  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    // Prevent click if we're dragging
    if (isDragging) return;
    
    const newStatus = section.status === 'green' ? 'red' : 'green';
    onStatusChange(section.id, newStatus);
  };

  const handleDelete = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation(); // Prevent triggering the status change
    onDelete(section.id);
  };

  const handleMouseEnter = () => {
    setShowDeleteButton(true);
  };

  const handleMouseLeave = () => {
    setShowDeleteButton(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    console.log('Touch start - section:', section.id);
    setIsTouching(true);
    setTouchStartTime(Date.now());
    setTouchStartPos({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    });
    setShowDeleteButton(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isTouching) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartPos.x;
    const deltaY = touch.clientY - touchStartPos.y;
    
    // Only start dragging if we've moved a significant distance
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      console.log('Touch move - starting drag - section:', section.id);
      // The drag will be handled by react-dnd
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    console.log('Touch end - section:', section.id);
    const touchDuration = Date.now() - touchStartTime;
    setIsTouching(false);
    
    // Only show delete button briefly if it was a short touch
    if (touchDuration < 300) {
      setTimeout(() => {
        setShowDeleteButton(false);
      }, 1000);
    }
  };

  // Calculate position with margin to prevent overlap with grid lines
  const margin = gridSize < 80 ? 2 : 4;
  const sectionSize = gridSize - (margin * 2);

  // Get pattern class based on status and color blind mode
  const getPatternClass = (status: WarehouseStatus) => {
    if (!colorBlindMode) return '';
    
    return status === 'green' 
      ? 'pattern-diagonal-lines pattern-green-500 pattern-opacity-30' 
      : 'pattern-dots pattern-red-500 pattern-opacity-30';
  };

  // Get text indicator based on status and color blind mode
  const getStatusIndicator = (status: WarehouseStatus) => {
    if (!colorBlindMode) return '';
    
    return status === 'green' ? '✓' : '×';
  };

  return (
    <div
      ref={ref}
      className={`absolute cursor-move ${isDragging ? 'opacity-50 scale-105' : ''} ${
        isTouching ? 'scale-110 shadow-xl' : ''
      }`}
      style={{
        left: `${section.position.x * gridSize + margin}px`,
        top: `${section.position.y * gridSize + margin}px`,
        width: `${sectionSize}px`,
        height: `${sectionSize}px`,
        transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
        zIndex: isDragging ? 100 : 20,
        touchAction: 'none',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <button
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`w-full h-full rounded-lg flex items-center justify-center text-white font-semibold shadow-lg hover:shadow-xl transition-all transform ${
          isTouching ? 'scale-110 shadow-xl' : 'hover:scale-105'
        } ${
          statusColors[section.status].color
        } ${getPatternClass(section.status)}`}
        style={{
          touchAction: 'none',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
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
          onTouchStart={handleDelete}
          className={`absolute -top-2 -right-2 w-5 h-5 sm:w-6 sm:h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-all transform ${
            isTouching ? 'scale-110' : 'hover:scale-110'
          } animate-fadeIn`}
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
  const margin = gridSize < 80 ? 2 : 4;
  const cellSize = gridSize - (margin * 2);

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'section',
    drop: (item: { id: string, position: Position, originalPosition: Position }, monitor) => {
      console.log('Dropping item:', item.id, 'at grid position:', position);
      onDrop(item.id, position);
      return { position };
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
    hover: (item: { id: string, position: Position }, monitor) => {
      if (!ref.current) {
        return;
      }

      // Don't replace items with themselves
      if (item.position.x === position.x && item.position.y === position.y) {
        return;
      }
    },
  }));

  // Apply the drop ref to our element
  drop(ref);

  return (
    <div
      ref={ref}
      className={`absolute ${
        isOver && canDrop ? 'bg-gray-100 dark:bg-gray-800 ring-2 ring-blue-400 dark:ring-blue-500' : ''
      }`}
      style={{
        left: `${position.x * gridSize + margin}px`,
        top: `${position.y * gridSize + margin}px`,
        width: `${cellSize}px`,
        height: `${cellSize}px`,
        zIndex: 10,
        transition: 'all 0.2s ease',
        touchAction: 'none',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
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
  currentWarehouse?: string;
  onAddSections?: () => void;
  colorBlindMode?: boolean;
}

// Add this helper function at the top of the file
const isTouchDevice = () => {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );
};

export const DraggableGrid: React.FC<DraggableGridProps> = ({
  sections,
  onSectionMove,
  onStatusChange,
  onSectionDelete,
  onSectionPositionUpdate,
  currentWarehouse,
  onAddSections,
  colorBlindMode = false,
}) => {
  const [gridSize, setGridSize] = useState(100);
  const [gridWidth, setGridWidth] = useState(15);
  const [gridHeight, setGridHeight] = useState(10);
  const [middleColumnIndex, setMiddleColumnIndex] = useState(7);
  const [rowLabels, setRowLabels] = useState<RowLabel[]>([]);
  const [showAddLabel, setShowAddLabel] = useState(false);
  const [newLabelRow, setNewLabelRow] = useState<number | null>(null);
  const [newLabelText, setNewLabelText] = useState('');
  const [editingLabel, setEditingLabel] = useState<number | null>(null);
  const [editingLabelText, setEditingLabelText] = useState('');
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const [sectionStates, setSectionStates] = useState<SectionState[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Check if device is mobile
  useEffect(() => {
    const checkIfMobile = () => {
      const mobile = window.innerWidth < 768 || isTouchDevice();
      setIsMobile(mobile);
      
      // Adjust grid size based on screen width
      if (mobile) {
        setGridSize(60);
        setGridWidth(10);
        setMiddleColumnIndex(4);
      } else {
        setGridSize(100);
        setGridWidth(15);
        setMiddleColumnIndex(7);
      }
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  useEffect(() => {
    // Always update sections when they change
    const existingIds = new Set(sectionStates.map(s => s.id));
    const updatedSections = sections.map((section) => {
      // If section already exists, keep its current position
      const existingSection = sectionStates.find(s => s.id === section.key);
      if (existingSection) {
        return existingSection;
      }

      // For new sections, calculate position
      let position = section.position;
      if (!position) {
        const usedPositions = new Set(sectionStates.map(s => `${s.position.x},${s.position.y}`));
        const index = parseInt(section.sectionNumber) - 1;
        
        // Try to place new sections in a grid pattern, skipping the middle column
        let x = index % (gridWidth - 1);
        let y = Math.floor(index / (gridWidth - 1));
        
        // Adjust x position to skip the middle column
        if (x >= middleColumnIndex) {
          x += 1;
        }
        
        // If position is taken, find next available spot
        while (usedPositions.has(`${x},${y}`)) {
          x = (x + 1) % gridWidth;
          if (x === middleColumnIndex) x++; // Skip middle column
          if (x === 0) y++; // Move to next row if we wrap around
          if (y >= gridHeight) y = 0; // Wrap back to top if we reach bottom
        }
        
        position = { x, y };
      }

      return {
        id: section.key,
        position,
        status: section.status,
        number: section.sectionNumber,
      };
    });

    setSectionStates(updatedSections);
  }, [sections, gridWidth, gridHeight, middleColumnIndex]);

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
    console.log('Handling drop for section:', sectionId, 'at position:', position);
    
    // Validate position is within grid bounds
    if (position.x < 0 || position.x >= gridWidth || position.y < 0 || position.y >= gridHeight) {
      console.log('Drop position out of bounds, rejecting');
      return;
    }

    // Check if position is in middle column
    if (position.x === middleColumnIndex) {
      console.log('Drop position in middle column, rejecting');
      return;
    }

    // Check if position is already occupied
    const isOccupied = sectionStates.some(
      section => section.id !== sectionId && 
      section.position.x === position.x && 
      section.position.y === position.y
    );

    if (isOccupied) {
      console.log('Drop position occupied, rejecting');
      return;
    }

    // Update the section position
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
    setEditingLabel(rowIndex);
    setEditingLabelText('');
  };

  const handleSaveLabel = () => {
    if (editingLabelText.trim() !== '' && editingLabel !== null) {
      // Check if a label already exists for this row
      const existingLabelIndex = rowLabels.findIndex(label => label.rowIndex === editingLabel);
      
      if (existingLabelIndex >= 0) {
        // Update existing label
        setRowLabels(prev => 
          prev.map((label, index) => 
            index === existingLabelIndex 
              ? { ...label, label: editingLabelText } 
              : label
          )
        );
      } else {
        // Add new label
        setRowLabels(prev => [...prev, { rowIndex: editingLabel, label: editingLabelText }]);
      }
    }
    
    setEditingLabel(null);
  };

  const handleEditLabel = (rowIndex: number, currentLabel: string) => {
    setEditingLabel(rowIndex);
    setEditingLabelText(currentLabel);
  };

  const handleDeleteLabel = (rowIndex: number) => {
    setRowLabels(prev => prev.filter(label => label.rowIndex !== rowIndex));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveLabel();
    } else if (e.key === 'Escape') {
      setEditingLabel(null);
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
      <div className="mb-6 flex flex-col gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md w-full max-w-full">
        {/* Current Warehouse Label */}
        {currentWarehouse && (
          <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-600 via-blue-500 to-cyan-400 rounded-xl shadow-lg transform transition-all duration-300 hover:shadow-xl mx-4 sm:mx-0 max-w-[280px] sm:max-w-none mx-auto">
            <div className="flex items-center justify-center">
              <div className="flex flex-col items-center">
                <span className="text-white font-light text-xs sm:text-sm uppercase tracking-wider mb-1">Current Warehouse</span>
                <span className="text-white font-bold text-xl sm:text-3xl text-center">{currentWarehouse}</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Controls Row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full px-4 sm:px-0">
          {onAddSections && (
            <div className="flex items-center justify-center w-full sm:w-auto max-w-[280px] sm:max-w-none">
              <button 
                onClick={onAddSections}
                className="px-3 py-1.5 bg-green-500 text-white hover:bg-green-600 transition-colors rounded-md w-full sm:w-auto flex items-center justify-center gap-2"
                title="Add sections"
              >
                <span>Add Sections</span>
              </button>
            </div>
          )}
        </div>
      </div>
      
      <DndProvider 
        backend={isMobile ? TouchBackend : HTML5Backend}
        options={{
          enableMouseEvents: true,
          enableTouchEvents: true,
          enableKeyboardEvents: true,
          enableHoverOutsideTarget: true,
          delayTouchStart: 0,
          delayMouseStart: 0,
          touchSlop: 20,
          ignoreContextMenu: true,
          enableAutoScroll: true,
        }}
      >
        <div
          ref={gridRef}
          className="relative bg-white dark:bg-gray-900 rounded-lg shadow-lg p-2 sm:p-4 overflow-auto"
          style={{
            width: `${gridWidth * gridSize + 16}px`,
            height: `${gridHeight * gridSize + 16}px`,
            minWidth: isMobile ? '320px' : '800px',
            minHeight: isMobile ? '400px' : '600px',
            maxWidth: '100%',
            maxHeight: '80vh',
            touchAction: 'none',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none',
            WebkitOverflowScrolling: 'touch',
            overflow: 'auto',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {/* Grid cells - render all cells to enable drag and drop everywhere */}
          {Array.from({ length: gridWidth * gridHeight }).map((_, index) => {
            const x = index % gridWidth;
            const y = Math.floor(index / gridWidth);
            
            // Skip the middle column
            if (x === middleColumnIndex) {
              return null;
            }
            
            return (
              <GridCell
                key={`${x}-${y}`}
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

          {/* Row labels and add label buttons */}
          {Array.from({ length: gridHeight - 1 }).map((_, index) => {
            const rowIndex = index;
            const existingLabel = rowLabels.find(label => label.rowIndex === rowIndex);
            const isEditing = editingLabel === rowIndex;
            
            return (
              <div
                key={`row-${rowIndex}`}
                className="absolute flex items-center justify-center group"
                style={{
                  left: 0,
                  top: `${(rowIndex + 1) * gridSize - 15}px`,
                  width: `${gridWidth * gridSize}px`,
                  height: '30px',
                  zIndex: 15,
                }}
              >
                <div className="flex items-center justify-center w-full">
                  {isEditing ? (
                    <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg shadow-md px-2 py-1">
                      <input
                        type="text"
                        value={editingLabelText}
                        onChange={(e) => setEditingLabelText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleSaveLabel}
                        className="text-gray-800 dark:text-gray-200 text-xs sm:text-sm font-medium bg-transparent border-none focus:outline-none focus:ring-0 w-32"
                        placeholder="Enter label"
                        autoFocus
                      />
                    </div>
                  ) : existingLabel ? (
                    <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg shadow-md px-2 py-1">
                      <span className="text-gray-800 dark:text-gray-200 text-xs sm:text-sm font-medium">
                        {existingLabel.label}
                      </span>
                      <div className="flex ml-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditLabel(rowIndex, existingLabel.label)}
                          className="text-blue-500 hover:text-blue-600 text-xs ml-2 p-1"
                          title="Edit label"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => handleDeleteLabel(rowIndex)}
                          className="text-red-500 hover:text-red-600 text-xs ml-1 p-1"
                          title="Delete label"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAddLabel(rowIndex)}
                      className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 rounded-full w-8 h-8 sm:w-6 sm:h-6 flex items-center justify-center shadow-md hover:bg-gray-100 dark:hover:bg-gray-700"
                      title="Add label"
                    >
                      <span className="text-blue-500 text-lg">+</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}

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
              colorBlindMode={colorBlindMode}
            />
          ))}
        </div>
      </DndProvider>
    </div>
  );
}; 