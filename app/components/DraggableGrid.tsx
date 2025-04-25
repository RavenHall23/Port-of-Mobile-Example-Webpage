import { useState, useEffect, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { statusColors } from '../utils/warehouse-utils';
import type { WarehouseStatus } from '../../types/database';

// Constants for grid dimensions
const gridWidth = 6;  // Total width including aisle
const gridHeight = 8; // Total height of the grid

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
  isMobile: boolean;
  middleColumnIndex: number;
  rowGap: number;
  columnGap: number;
  aisleWidth: number;
}

const DraggableSection: React.FC<DraggableSectionProps> = ({ 
  section, 
  onMove, 
  onStatusChange, 
  onDelete,
  gridSize,
  colorBlindMode,
  isMobile,
  middleColumnIndex,
  rowGap,
  columnGap,
  aisleWidth
}) => {
  const ref = useRef<HTMLDivElement>(null);
  
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'section',
    item: {
      id: section.id,
      type: 'section',
      currentPosition: section.position
    },
    collect: monitor => ({
      isDragging: monitor.isDragging()
    })
  }), [section.id, section.position]);

  drag(ref);

  return (
    <div
      ref={ref}
      data-testid={`section-${section.id}`}
      className={`absolute cursor-move group transition-all duration-300 ${isDragging ? 'z-50' : 'z-10'}`}
      style={{
        left: `${section.position.x * gridSize}px`,
        top: `${section.position.y * (gridSize + rowGap)}px`,
        width: `${gridSize}px`,
        height: `${gridSize}px`,
        opacity: isDragging ? 0.7 : 1,
        transform: isDragging ? 'scale(1.05)' : 'scale(1)',
      }}
    >
      <button
        className={`w-full h-full rounded-lg flex items-center justify-center shadow-lg 
                   transition-all duration-300 backdrop-blur-sm border border-white/10
                   ${section.status === 'green' 
                     ? 'bg-emerald-500/90 hover:bg-emerald-500/95' 
                     : 'bg-red-500/90 hover:bg-red-500/95'
                   } ${colorBlindMode ? 'pattern-diagonal-lines' : ''}`}
        onClick={() => onStatusChange(section.id, section.status === 'green' ? 'red' : 'green')}
      />
      <button
        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500/90 text-white/90 rounded-full 
                   flex items-center justify-center shadow-lg hover:bg-red-600/95 
                   transition-all duration-300 opacity-0 group-hover:opacity-100 text-xs
                   border border-white/10"
        onClick={() => onDelete(section.id)}
      >
        ×
      </button>
    </div>
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
  onClose?: () => void;
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

// Add helper function to find next available position
const findNextAvailablePosition = (
  sectionStates: SectionState[],
  middleColumnIndex: number,
  gridWidth: number,
  gridHeight: number
): Position => {
  // Create a set of occupied positions
  const occupiedPositions = new Set(
    sectionStates.map(section => `${section.position.x},${section.position.y}`)
  );

  // Try to find a position on the left side first
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < middleColumnIndex; x++) {
      if (!occupiedPositions.has(`${x},${y}`)) {
        return { x, y };
      }
    }
  }

  // If left side is full, try right side
  for (let y = 0; y < gridHeight; y++) {
    for (let x = middleColumnIndex + 1; x < gridWidth; x++) {
      if (!occupiedPositions.has(`${x},${y}`)) {
        return { x, y };
      }
    }
  }

  // If no position found, return first position on left side
  return { x: 0, y: 0 };
};

export const DraggableGrid: React.FC<DraggableGridProps> = ({
  sections,
  onSectionMove,
  onStatusChange,
  onSectionDelete,
  onSectionPositionUpdate,
  currentWarehouse,
  onAddSections,
  onClose,
  colorBlindMode = false
}) => {
  const [gridSize, setGridSize] = useState(100);
  const [gridWidth, setGridWidth] = useState(7);
  const [gridHeight, setGridHeight] = useState(7);
  const [middleColumnIndex, setMiddleColumnIndex] = useState(3);
  const [isDraggingAisle, setIsDraggingAisle] = useState(false);
  const [rowLabels, setRowLabels] = useState<RowLabel[]>([]);
  const [showAddLabel, setShowAddLabel] = useState(false);
  const [newLabelRow, setNewLabelRow] = useState<number | null>(null);
  const [newLabelText, setNewLabelText] = useState('');
  const [editingLabel, setEditingLabel] = useState<number | null>(null);
  const [editingLabelText, setEditingLabelText] = useState('');
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const aisleRef = useRef<HTMLDivElement>(null);

  const [sectionStates, setSectionStates] = useState<SectionState[]>([]);
  const [initialized, setInitialized] = useState(false);

  const backend = isMobile ? TouchBackend : HTML5Backend;

  // Load saved positions from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && sections.length > 0 && !initialized) {
      try {
        const savedPositions = localStorage.getItem('sectionPositions');
        const positions = savedPositions ? JSON.parse(savedPositions) : {};
        
        const initialStates = sections.map((section) => {
          const savedPosition = positions[section.key];
          return {
            id: section.key,
            position: savedPosition || findNextAvailablePosition([], middleColumnIndex, gridWidth, gridHeight),
            status: section.status,
            number: section.sectionNumber
          };
        });
        
        setSectionStates(initialStates);
        setInitialized(true);
      } catch (error) {
        console.error('Error loading saved positions:', error);
      }
    }
  }, [sections, middleColumnIndex, gridWidth, gridHeight, initialized]);

  // Save positions to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined' && sectionStates.length > 0) {
      try {
        const positions = sectionStates.reduce((acc, section) => ({
          ...acc,
          [section.id]: section.position
        }), {});
        localStorage.setItem('sectionPositions', JSON.stringify(positions));
      } catch (error) {
        console.error('Error saving positions:', error);
      }
    }
  }, [sectionStates]);

  // Update existing sections while maintaining their positions
  useEffect(() => {
    if (sections.length > 0 && initialized) {
      setSectionStates(prevStates => {
        const newStates = sections.map(section => {
          const existingState = prevStates.find(state => state.id === section.key);
          const savedPositions = localStorage.getItem('sectionPositions');
          const positions = savedPositions ? JSON.parse(savedPositions) : {};
          const savedPosition = positions[section.key];
          
          return {
            id: section.key,
            position: savedPosition || existingState?.position || findNextAvailablePosition(prevStates, middleColumnIndex, gridWidth, gridHeight),
            status: section.status,
            number: section.sectionNumber
          };
        });
        return newStates;
      });
    }
  }, [sections, middleColumnIndex, gridWidth, gridHeight, initialized]);

  // Add effect to handle window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768 || isTouchDevice();
      setIsMobile(mobile);
      
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const minSize = Math.min(
        Math.floor((vw - 64) / 5), // More space for horizontal gaps
        Math.floor((vh - 120) / 12) // Adjusted for vertical spacing
      );
      
      setGridSize(minSize);
      setGridWidth(5);
      setGridHeight(10);
      setMiddleColumnIndex(2);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Constants for layout with improved spacing
  const columnGap = 8; // Increased horizontal gap
  const rowGap = 8; // Vertical gap
  const aisleWidth = 12; // Wider aisle

  const isValidColumn = (x: number) => {
    // Allow positions in first two columns (0,1) or last two columns (3,4)
    return (x <= 1) || (x >= 3 && x <= 4);
  };

  const handleDrop = async (sectionId: string, newPosition: Position) => {
    // Don't allow dropping in the aisle column
    if (newPosition.x === middleColumnIndex) {
      return;
    }

    // Check if the position is already occupied
    const isOccupied = sectionStates.some(
      section => section.id !== sectionId && 
      section.position.x === newPosition.x && 
      section.position.y === newPosition.y
    );

    if (isOccupied) {
      return;
    }

    // Update the section's position
    setSectionStates(prevStates => {
      const newStates = prevStates.map(section => 
        section.id === sectionId
          ? { ...section, position: newPosition }
          : section
      );
      
      // Save to localStorage
      try {
        const positions = newStates.reduce((acc, section) => ({
          ...acc,
          [section.id]: section.position
        }), {});
        localStorage.setItem('sectionPositions', JSON.stringify(positions));
      } catch (error) {
        console.error('Error saving positions:', error);
      }
      
      return newStates;
    });

    // Notify parent component
    onSectionMove(sectionId, newPosition);
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
    setSectionStates((prev) => {
      const newStates = prev.filter((section) => section.id !== sectionId);
      
      // Update localStorage after deletion
      try {
        const positions = newStates.reduce((acc, section) => ({
          ...acc,
          [section.id]: section.position
        }), {});
        localStorage.setItem('sectionPositions', JSON.stringify(positions));
      } catch (error) {
        console.error('Error saving positions:', error);
      }
      
      return newStates;
    });
    
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

  const handleAisleDrop = (dropX: number) => {
    // Ensure aisle can't be placed at the edges
    if (dropX > 0 && dropX < gridWidth - 1) {
      const oldMiddleIndex = middleColumnIndex;
      setMiddleColumnIndex(dropX);
      
      // Update section positions when aisle moves
      setSectionStates(prevStates => {
        return prevStates.map(section => {
          const { x, y } = section.position;
          
          // If section was to the right of the old aisle
          if (x > oldMiddleIndex) {
            // Move left if new aisle is further right
            if (dropX > oldMiddleIndex) {
              return {
                ...section,
                position: { x: x - 1, y }
              };
            }
          }
          // If section was to the left of the old aisle
          else if (x < oldMiddleIndex) {
            // Move right if new aisle is further left
            if (dropX < oldMiddleIndex) {
              return {
                ...section,
                position: { x: x + 1, y }
              };
            }
          }
          return section;
        });
      });
    }
  };

  const [, aisleDrop] = useDrop(() => ({
    accept: 'aisle',
    hover: (item: any, monitor) => {
      if (!gridRef.current) return;
      
      const gridRect = gridRef.current.getBoundingClientRect();
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      
      const x = Math.floor((clientOffset.x - gridRect.left) / gridSize);
      if (x !== middleColumnIndex && x > 0 && x < gridWidth - 1) {
        handleAisleDrop(x);
      }
    }
  }));

  const [{ isDragging }, aisleDrag] = useDrag(() => ({
    type: 'aisle',
    collect: monitor => ({
      isDragging: !!monitor.isDragging()
    }),
    item: { type: 'aisle' }
  }));

  aisleDrag(aisleRef);
  aisleDrop(gridRef);

  // Add styles for consistent box sizing
  const boxStyles = {
    width: `${gridSize}px`,
    height: `${gridSize}px`,
    borderRadius: '8px',
  };

  return (
    <div className="relative flex flex-col min-h-screen">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10">
        <div className="w-full max-w-lg mx-auto px-4 pt-4">
          {currentWarehouse && (
            <div className="bg-gradient-to-r from-blue-600/10 to-cyan-500/10 backdrop-blur-sm rounded-lg border border-white/5 overflow-hidden">
              <div className="flex items-center justify-between p-2">
                <h2 className="text-white/90 text-sm font-medium">{currentWarehouse}</h2>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="p-1 hover:bg-white/5 rounded-md transition-colors"
                  >
                    <svg className="w-4 h-4 text-white/70" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid - Skewed and Centered */}
      <div className="flex-1 flex items-center justify-center transform -translate-x-2">
        <DndProvider backend={backend}>
          <div className="relative p-4 transform skew-x-1">
            <div
              style={{
                width: `${(4 * gridSize) + (3 * columnGap) + aisleWidth}px`,
                height: `${(10 * gridSize) + (9 * rowGap)}px`,
                position: 'relative',
                transform: 'perspective(1000px) rotateY(2deg)',
                transformStyle: 'preserve-3d'
              }}
            >
              {/* Drop zones */}
              {Array.from({ length: gridWidth * gridHeight }).map((_, index) => {
                const x = index % gridWidth;
                const y = Math.floor(index / gridWidth);
                
                if (x === middleColumnIndex) return null;
                
                const xPosition = x < middleColumnIndex
                  ? x * (gridSize + columnGap)
                  : (x - 1) * (gridSize + columnGap) + aisleWidth + gridSize;
                
                const yPosition = y * (gridSize + rowGap);
                
                return (
                  <div
                    key={`cell-${x}-${y}`}
                    className="absolute transition-all duration-200"
                    style={{
                      left: `${xPosition}px`,
                      top: `${yPosition}px`,
                      width: `${gridSize}px`,
                      height: `${gridSize}px`,
                      transform: 'translateZ(0)'
                    }}
                  >
                    <DropZone
                      x={x}
                      y={y}
                      onDrop={handleDrop}
                      gridSize={gridSize}
                      isOccupied={sectionStates.some(
                        s => s.position.x === x && s.position.y === y
                      )}
                    />
                  </div>
                );
              })}

              {/* Aisle */}
              <div
                className="absolute backdrop-blur-sm"
                style={{
                  left: `${2 * (gridSize + columnGap)}px`,
                  top: 0,
                  width: `${aisleWidth}px`,
                  height: '100%',
                  zIndex: 5,
                  transform: 'translateZ(2px)'
                }}
              >
                <div className="flex items-center justify-center h-full">
                  <span className="text-blue-400/40 font-medium tracking-widest rotate-90 transform text-[8px]">
                    ·
                  </span>
                </div>
              </div>

              {/* Sections */}
              {sectionStates.map((section) => {
                const isLeftSide = section.position.x < middleColumnIndex;
                const adjustedX = isValidColumn(section.position.x) 
                  ? section.position.x 
                  : isLeftSide ? 1 : 3;
                
                const xPosition = adjustedX < middleColumnIndex
                  ? adjustedX * (gridSize + columnGap)
                  : (adjustedX - 1) * (gridSize + columnGap) + aisleWidth + gridSize;
                
                const yPosition = section.position.y * (gridSize + rowGap);
                
                return (
                  <DraggableSection
                    key={`section-${section.id}`}
                    section={{
                      ...section,
                      position: {
                        x: adjustedX,
                        y: section.position.y
                      }
                    }}
                    onMove={(id, position) => {
                      const newX = position.x < middleColumnIndex
                        ? Math.min(position.x, 1)
                        : Math.max(3, 4);
                      handleDrop(id, { ...position, x: newX });
                    }}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                    gridSize={gridSize}
                    colorBlindMode={colorBlindMode}
                    isMobile={isMobile}
                    middleColumnIndex={middleColumnIndex}
                    rowGap={rowGap}
                    columnGap={columnGap}
                    aisleWidth={aisleWidth}
                  />
                );
              })}
            </div>
          </div>
        </DndProvider>
      </div>

      {/* Footer Button */}
      {onAddSections && (
        <div className="absolute bottom-0 left-0 right-0 pb-4 flex justify-center">
          <button 
            onClick={onAddSections}
            className="px-4 py-2 bg-gradient-to-r from-blue-600/80 to-cyan-500/80 text-white rounded-lg 
                     hover:from-blue-600/90 hover:to-cyan-500/90 transition-all duration-300 shadow-lg 
                     hover:shadow-xl flex items-center gap-2 backdrop-blur-sm border border-white/10"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            <span className="text-sm font-medium">Add Section</span>
          </button>
        </div>
      )}
    </div>
  );
};

interface DropZoneProps {
  x: number;
  y: number;
  onDrop: (id: string, position: Position) => void;
  gridSize: number;
  isOccupied: boolean;
}

const DropZone: React.FC<DropZoneProps> = ({ x, y, onDrop, gridSize, isOccupied }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'section',
    canDrop: () => !isOccupied,
    drop: (item: { id: string }) => {
      onDrop(item.id, { x, y });
    },
    collect: monitor => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  });

  // Apply the drop ref to our ref
  drop(ref);

  return (
    <div
      ref={ref}
      className={`w-full h-full rounded-xl transition-colors duration-200 ${
        isOver && canDrop ? 'bg-gray-100/10' : ''
      }`}
    />
  );
}; 