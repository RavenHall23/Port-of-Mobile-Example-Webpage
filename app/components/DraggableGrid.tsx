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
}

const DraggableSection: React.FC<DraggableSectionProps> = ({ 
  section, 
  onMove, 
  onStatusChange, 
  onDelete,
  gridSize,
  colorBlindMode,
  isMobile,
  middleColumnIndex
}) => {
  const ref = useRef<HTMLDivElement>(null);
  
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'section',
    item: {
      id: section.id,
      type: 'section',
      currentPosition: section.position
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  }), [section.id, section.position]);

  drag(ref);

  return (
    <div
      ref={ref}
      data-testid={`section-${section.id}`}
      className={`absolute cursor-move group ${isDragging ? 'z-50' : 'z-10'}`}
      style={{
        left: `${section.position.x * (gridSize + 8) + 8}px`,
        top: `${section.position.y * (gridSize + 8) + 8}px`,
        width: `${gridSize}px`,
        height: `${gridSize}px`,
        opacity: isDragging ? 0.5 : 1,
        transform: isDragging ? 'scale(1.05)' : 'scale(1)',
        transition: 'transform 0.2s ease-out, opacity 0.2s ease-out'
      }}
    >
      <button
        className={`w-full h-full rounded-xl flex items-center justify-center text-white font-semibold shadow-lg transition-all duration-300 backdrop-blur-sm ${
          section.status === 'green' 
            ? 'bg-emerald-500/90 hover:bg-emerald-600/90' 
            : 'bg-red-500/90 hover:bg-red-600/90'
        } ${colorBlindMode ? 'pattern-diagonal-lines' : ''}`}
        onClick={() => onStatusChange(section.id, section.status === 'green' ? 'red' : 'green')}
      />
      <button
        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500/90 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600/90 transition-all duration-300 opacity-0 group-hover:opacity-100"
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
  colorBlindMode = false,
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
      
      // Adjust grid size based on screen width
      if (mobile) {
        setGridSize(60);
        setGridWidth(5); // 2 columns on each side + 1 aisle
        setGridHeight(8);
        setMiddleColumnIndex(2);
      } else {
        setGridSize(80);
        setGridWidth(7); // 3 columns on each side + 1 aisle
        setGridHeight(8);
        setMiddleColumnIndex(3);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  return (
    <div className="flex flex-col items-center w-full">
      <div className="mb-6 flex flex-col gap-4 bg-white/5 backdrop-blur-sm p-4 rounded-xl shadow-lg w-full max-w-full border border-white/10">
        {/* Current Warehouse Label */}
        {currentWarehouse && (
          <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-600/90 via-blue-500/90 to-cyan-400/90 backdrop-blur-sm rounded-xl shadow-lg transform transition-all duration-300 hover:shadow-xl mx-4 sm:mx-0 max-w-[280px] sm:max-w-none mx-auto border border-white/20">
            <div className="flex items-center justify-center">
              <div className="flex flex-col items-center">
                <span className="text-white/80 font-light text-xs sm:text-sm uppercase tracking-wider mb-1">Current Warehouse</span>
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
                className="px-4 py-2 bg-emerald-500/90 text-white hover:bg-emerald-600/90 transition-all duration-300 rounded-lg w-full sm:w-auto flex items-center justify-center gap-2 shadow-lg hover:shadow-xl backdrop-blur-sm"
                title="Add sections"
              >
                <span>Add Sections</span>
              </button>
            </div>
          )}
        </div>
      </div>
      
      <DndProvider backend={backend}>
        <div className="relative bg-gray-900/50 backdrop-blur-md rounded-2xl shadow-2xl p-8 overflow-hidden mx-auto border border-white/10">
          {/* Grid container */}
          <div
            style={{
              width: `${(gridWidth * (gridSize + 8)) + 48}px`,
              height: `${(gridHeight * (gridSize + 8)) + 48}px`,
              minWidth: isMobile ? '320px' : '600px',
              minHeight: isMobile ? '400px' : '600px',
              maxWidth: '100%',
              maxHeight: '80vh',
              position: 'relative'
            }}
          >
            {/* Drop zones */}
            {Array.from({ length: gridWidth * gridHeight }).map((_, index) => {
              const x = index % gridWidth;
              const y = Math.floor(index / gridWidth);
              
              if (x === middleColumnIndex) return null;
              
              return (
                <div
                  key={`cell-${x}-${y}`}
                  className="absolute"
                  style={{
                    left: `${x * (gridSize + 8) + 8}px`,
                    top: `${y * (gridSize + 8) + 8}px`,
                    width: `${gridSize}px`,
                    height: `${gridSize}px`
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
              className="absolute bg-gray-800/50 backdrop-blur-sm"
              style={{
                left: `${middleColumnIndex * (gridSize + 8)}px`,
                top: 0,
                width: `${gridSize + 8}px`,
                height: '100%',
                zIndex: 5
              }}
            >
              <div className="flex items-center justify-center h-full">
                <span className="text-cyan-400/80 font-medium tracking-widest rotate-90 transform text-sm">
                  AISLE
                </span>
              </div>
            </div>

            {/* Sections */}
            {sectionStates.map((section) => (
              <DraggableSection
                key={`section-${section.id}`}
                section={section}
                onMove={(id, position) => handleDrop(id, position)}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
                gridSize={gridSize}
                colorBlindMode={colorBlindMode}
                isMobile={isMobile}
                middleColumnIndex={middleColumnIndex}
              />
            ))}
          </div>
        </div>
      </DndProvider>
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