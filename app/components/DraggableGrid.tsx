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

interface RowNumber {
  id: number;
  value: string;
}

interface DragItem {
  id: string;
  type: string;
  currentPosition: Position;
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
  
  const [{ isDragging }, drag] = useDrag({
    type: 'section',
    item: {
      id: section.id,
      type: 'section',
      currentPosition: section.position
    },
    collect: monitor => ({
      isDragging: !!monitor.isDragging()
    })
  });

  // Connect the drag ref
  drag(ref);

  const sectionSize = gridSize - 6;
  const xPosition = section.position.x < middleColumnIndex
    ? section.position.x * (gridSize + columnGap)
    : (section.position.x - 1) * (gridSize + columnGap) + aisleWidth + gridSize;
  
  const yPosition = section.position.y * (gridSize + rowGap);

  return (
    <div
      ref={ref}
      data-testid={`section-${section.id}`}
      className={`absolute cursor-move group transition-all duration-300 ${isDragging ? 'z-50' : 'z-10'}`}
      style={{
        left: `${xPosition}px`,
        top: `${yPosition}px`,
        width: `${sectionSize}px`,
        height: `${sectionSize}px`,
        opacity: isDragging ? 0.7 : 1,
        transform: isDragging ? 'scale(1.05)' : 'scale(1)',
        pointerEvents: 'all'
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
  onCreateSections?: (sectionNumbers: number[]) => Promise<void>;
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

// Update helper function to find next available position
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

  // First try left side (columns 0 and 1)
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x <= 1; x++) {
      if (!occupiedPositions.has(`${x},${y}`)) {
        return { x, y };
      }
    }
  }

  // Then try right side (columns 3 and 4)
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 3; x <= 4; x++) {
      if (!occupiedPositions.has(`${x},${y}`)) {
        return { x, y };
      }
    }
  }

  // If no position is found, return the first position (0,0) and log a warning
  console.warn('No available positions found in grid, defaulting to (0,0)');
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
  onCreateSections,
  onClose,
  colorBlindMode = false
}) => {
  const [gridSize, setGridSize] = useState(100);
  const [gridWidth, setGridWidth] = useState(7);
  const [gridHeight, setGridHeight] = useState(8);
  const [middleColumnIndex, setMiddleColumnIndex] = useState(2);
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
  const [rowNumbers, setRowNumbers] = useState<RowNumber[]>(() => 
    Array.from({ length: gridHeight }, (_, index) => ({
      id: index,
      value: (index + 1).toString()
    }))
  );
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [showRowDialog, setShowRowDialog] = useState(false);
  const [rowCount, setRowCount] = useState('1');
  const [isAddingRows, setIsAddingRows] = useState(false);

  const backend = isMobile ? TouchBackend : HTML5Backend;

  // Update useEffect for loading sections
  useEffect(() => {
    if (typeof window !== 'undefined' && sections.length > 0 && !initialized) {
      try {
        const savedPositions = localStorage.getItem('sectionPositions');
        const positions = savedPositions ? JSON.parse(savedPositions) : {};
        
        const initialStates: SectionState[] = [];
        
        // Process sections one by one to properly track occupied positions
        for (const section of sections) {
          const savedPosition = positions[section.key];
if (savedPosition) {
  return {
    id: section.key,
    position: savedPosition,
    status: section.status,
    number: section.sectionNumber
  };
}

// If there's no saved position, find the next available position
const position = savedPosition || findNextAvailablePosition(
  initialStates,
);
            middleColumnIndex,
            gridWidth,
            gridHeight
          );
          
          initialStates.push({
            id: section.key,
            position,

          return {
            id: section.key,
            position: nextPosition,

            status: section.status,
            number: section.sectionNumber
          });
        }
        
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
          if (existingState) {
            return {
              ...existingState,
              status: section.status,
              number: section.sectionNumber
            };
          }

          // Find next available position for new section
          const nextPosition = findNextAvailablePosition(
            prevStates,
            middleColumnIndex,
            gridWidth,
            gridHeight
          );

          return {
            id: section.key,
            position: nextPosition,
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

    // Validate column position
    const isValidColumn = newPosition.x <= 1 || (newPosition.x >= 3 && newPosition.x <= 4);
    if (!isValidColumn) {
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

  // Add handler for number editing
  const handleNumberEdit = (id: number, newValue: string) => {
    setRowNumbers(prev => 
      prev.map(row => 
        row.id === id ? { ...row, value: newValue } : row
      )
    );
  };

  // Add handler for finishing edit
  const handleEditComplete = () => {
    setEditingRowId(null);
  };


  // Add cleanup for drag operations
  useEffect(() => {
    return () => {
      // Cleanup any ongoing drag operations when component unmounts
      if (draggedSectionId) {
        setDraggedSectionId(null);
      }
    };
  }, [draggedSectionId]);

  const handleAddRowClick = () => {
    setShowRowDialog(true);
  };

  const handleAddRows = async () => {
    if (!currentWarehouse || !onCreateSections) return;
    
    const numRows = parseInt(rowCount, 10);
    if (isNaN(numRows) || numRows < 1) return;

    setIsAddingRows(true);
    
    try {
      // Get the current highest section number
      const currentNumbers = sections.map(s => {
        const match = s.sectionNumber.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      });
      const highestNumber = Math.max(0, ...currentNumbers);

      // Calculate new section numbers and create section states
      const newSectionNumbers: number[] = [];
      const newSections: SectionState[] = [];
      
      // Get the current highest row
      const currentMaxY = Math.max(...sectionStates.map(s => s.position.y), -1);
      const startRow = currentMaxY + 1;

      // Create sections for each new row
      for (let row = 0; row < numRows; row++) {
        // For each row, create 4 sections (2 on each side)
        for (let i = 0; i < 4; i++) {
          const sectionNumber = highestNumber + (row * 4) + i + 1;
          newSectionNumbers.push(sectionNumber);

          // Determine x position (0,1 for left side, 3,4 for right side)
          const x = i < 2 ? i : i + 1;
          const y = startRow + row;

          newSections.push({
            id: `section-${sectionNumber}`,
            position: { x, y },
            status: 'green',
            number: sectionNumber.toString()
          });
        }
      }

      // Create the new sections in the warehouse first
      await onCreateSections(newSectionNumbers);

      // Update the grid height
      const newHeight = Math.max(gridHeight, startRow + numRows);
      setGridHeight(newHeight);

      // Update row numbers
      setRowNumbers(prev => {
        const currentLength = prev.length;
        if (newHeight > currentLength) {
          const additionalRows = Array.from(
            { length: newHeight - currentLength },
            (_, index) => ({
              id: currentLength + index,
              value: (currentLength + index + 1).toString()
            })
          );
          return [...prev, ...additionalRows];
        }
        return prev;
      });

      // Update the section states
      setSectionStates(prevStates => {
        const updatedStates = [...prevStates, ...newSections];
        
        // Save positions to localStorage
        try {
          const positions = updatedStates.reduce((acc, section) => ({
            ...acc,
            [section.id]: section.position
          }), {});
          localStorage.setItem('sectionPositions', JSON.stringify(positions));
        } catch (error) {
          console.error('Error saving positions:', error);
        }

        return updatedStates;
      });

    } catch (error) {
      console.error('Error adding rows:', error);
    } finally {
      setIsAddingRows(false);
      setShowRowDialog(false);
      setRowCount('1');
    }
  };

  return (
    <div className="relative flex flex-col min-h-screen">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10">
        <div className="w-full max-w-lg mx-auto px-4 pt-4">
          {currentWarehouse && (
            <div className="bg-gradient-to-r from-blue-600/10 to-cyan-500/10 backdrop-blur-sm rounded-lg border border-white/5 overflow-hidden">
              <div className="flex flex-col">
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
                <div className="px-2 pb-2 flex gap-2">
                  {onAddSections && (
                    <button 
                      onClick={onAddSections}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600/80 to-cyan-500/80 text-white rounded-lg 
                               hover:from-blue-600/90 hover:to-cyan-500/90 transition-all duration-300 shadow-lg 
                               hover:shadow-xl flex items-center justify-center gap-2 backdrop-blur-sm border border-white/10"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                      </svg>
                      <span className="text-sm font-medium">Add Section</span>
                    </button>
                  )}
                  <button 
                    onClick={handleAddRowClick}
                    disabled={isAddingRows}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600/80 to-pink-500/80 text-white rounded-lg 
                             hover:from-purple-600/90 hover:to-pink-500/90 transition-all duration-300 shadow-lg 
                             hover:shadow-xl flex items-center justify-center gap-2 backdrop-blur-sm border border-white/10
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M20 13H4v-2h16v2zm-3-7H4v2h13V6zM4 18h13v-2H4v2z"/>
                    </svg>
                    <span className="text-sm font-medium">
                      {isAddingRows ? 'Adding...' : 'Add Row'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row Count Dialog */}
      {showRowDialog && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-white/10 w-80">
            <h3 className="text-white/90 text-lg font-medium mb-4">Add Rows</h3>
            <input
              type="number"
              min="1"
              max="10"
              value={rowCount}
              onChange={(e) => {
                const value = Math.min(Math.max(parseInt(e.target.value) || 1, 1), 10);
                setRowCount(value.toString());
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddRows();
                } else if (e.key === 'Escape') {
                  setShowRowDialog(false);
                  setRowCount('1');
                }
              }}
              className="w-full px-3 py-2 bg-gray-700/50 text-white rounded-lg border border-white/10 
                       focus:outline-none focus:ring-2 focus:ring-purple-500/50 mb-4"
              placeholder="Number of rows (1-10)"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowRowDialog(false);
                  setRowCount('1');
                }}
                className="px-4 py-2 text-white/70 hover:text-white/90 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRows}
                disabled={isAddingRows || parseInt(rowCount) < 1}
                className="px-4 py-2 bg-gradient-to-r from-purple-600/80 to-pink-500/80 text-white rounded-lg 
                         hover:from-purple-600/90 hover:to-pink-500/90 transition-all duration-300
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAddingRows ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid - Skewed and Centered */}

      <div className="flex-1 flex items-center justify-center transform -translate-x-2 mt-32 z-0">
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
      <div className="flex-1 flex items-center justify-center transform -translate-x-8 mt-32">
        <DndProvider backend={backend}>
          <div className="relative p-4 transform skew-x-1">
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

              <div className="flex items-center justify-center h-full relative">
                {/* Row Numbers */}
                <div className="absolute top-0 left-0 w-full h-full">
                  {rowNumbers.map((row) => (
                    <div
                      key={`row-number-${row.id}`}
                      className="absolute flex items-center justify-center w-full"
                      style={{
                        top: `${row.id * (gridSize + rowGap) + (gridSize / 2)}px`,
                        transform: 'translateY(-50%)'
                      }}
                    >
                      {editingRowId === row.id ? (
                        <input
                          type="text"
                          value={row.value}
                          onChange={(e) => handleNumberEdit(row.id, e.target.value)}
                          onBlur={handleEditComplete}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditComplete();
                            if (e.key === 'Escape') {
                              handleNumberEdit(row.id, (row.id + 1).toString());
                              handleEditComplete();
                            }
                          }}
                          className="w-6 h-6 bg-transparent text-white/50 text-sm font-medium text-center outline-none border border-white/20 rounded"
                          autoFocus
                        />
                      ) : (
                        <span 
                          className="text-white/50 text-sm font-medium cursor-pointer hover:text-white/70 transition-colors"
                          onClick={() => setEditingRowId(row.id)}
                        >
                          {row.value}
                        </span>
                      )}
                    </div>
                  ))}

              {/* Drop zones */}
              {Array.from({ length: gridWidth * gridHeight }).map((_, index) => {
                const x = index % gridWidth;
                const y = Math.floor(index / gridWidth);
                
                if (x === middleColumnIndex) return null;
                
                const xPosition = x < middleColumnIndex
                  ? x * (gridSize + columnGap)
                  : (x - 1) * (gridSize + columnGap) + aisleWidth + gridSize;
                
                const yPosition = y * (gridSize + rowGap);
                
                const isOccupied = sectionStates.some(
                  s => s.position.x === x && s.position.y === y
                );
                
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
                      isOccupied={isOccupied}
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
                <div className="flex items-center justify-center h-full relative">
                  {/* Row Numbers */}
                  <div className="absolute top-0 left-0 w-full h-full flex flex-col items-start ml-4">
                    {rowNumbers.filter(row => row.value !== '').map((row) => (
                      <div
                        key={`row-number-${row.id}`}
                        className="absolute flex items-center justify-center group"
                        style={{
                          top: `${row.id * (gridSize + rowGap) + gridSize}px`,
                          transform: 'translateY(-50%)',
                          zIndex: 10,
                          width: `${aisleWidth}px`
                        }}
                      >
                        {editingRowId === row.id ? (
                          <input
                            type="text"
                            value={row.value}
                            onChange={(e) => handleNumberEdit(row.id, e.target.value)}
                            onBlur={handleEditComplete}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEditComplete();
                              if (e.key === 'Escape') {
                                handleNumberEdit(row.id, (row.id + 1).toString());
                                handleEditComplete();
                              }
                            }}
                            className="w-5 h-5 bg-gray-900/50 text-white/50 text-xs font-medium text-center outline-none border border-white/20 rounded-full"
                            autoFocus
                          />
                        ) : (
                          <div className="relative flex items-center justify-center group">
                            <div 
                              className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm rounded-full"
                              style={{ margin: '-0.375rem' }}
                            />
                            <span 
                              className="relative text-white/50 text-xs font-medium cursor-pointer hover:text-white/70 transition-colors w-4 h-4 flex items-center justify-center"
                              onClick={() => setEditingRowId(row.id)}
                            >
                              {row.value}
                            </span>
                            <button
                              onClick={() => {
                                setRowNumbers(prev => prev.filter(r => r.id !== row.id));
                              }}
                              className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200
                                       text-red-500/70 hover:text-red-500/90 rounded-full -mr-3 -mt-1
                                       hover:bg-red-500/10 w-3 h-3 flex items-center justify-center"
                            >
                              <svg className="w-2 h-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
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
      </div>
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
  
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'section',
    canDrop: () => !isOccupied,
    drop: (item: { id: string }) => {
      if (item && item.id) {
        onDrop(item.id, { x, y });
      }
  const [{ isOver, canDrop }, drop] = useDrop<DragItem, { x: number; y: number }, { isOver: boolean; canDrop: boolean }>({
    accept: 'section',
    canDrop: (item, monitor) => {
      // Don't allow dropping in occupied spaces
      if (isOccupied) return false;
      
      // Don't allow dropping in the middle column (aisle)
      if (x === 2) return false;
      
      // Allow dropping only in valid columns (0,1 or 3,4)
      return x <= 1 || (x >= 3 && x <= 4);
    },
    drop: (item) => {
      onDrop(item.id, { x, y });
      return { x, y };

    },
    collect: monitor => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop()
    })
  }), [x, y, isOccupied]);

  // Combine refs
  useEffect(() => {
    if (ref.current) {
      drop(ref);
    }
  }, [drop]);
  const dropRef = useRef<HTMLDivElement>(null);
  drop(dropRef);

  return (
    <div
      ref={dropRef}
      data-testid={`dropzone-${x}-${y}`}
      style={{
        width: `${gridSize}px`,
        height: `${gridSize}px`,
        position: 'absolute',
        pointerEvents: 'all'
      }}
      className={`rounded-xl transition-colors duration-200 ${
        isOver && canDrop ? 'bg-gray-100/10' : 
        canDrop ? 'bg-gray-100/5' : ''
      }`}
    />
  );
}; 