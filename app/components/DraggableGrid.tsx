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
  gridSize: number;
}

const DraggableSection: React.FC<DraggableSectionProps> = ({ section, onMove, onStatusChange, gridSize }) => {
  const ref = useRef<HTMLDivElement>(null);
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

  // Calculate position with margin to prevent overlap with grid lines
  const margin = 4; // 4px margin on each side
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
    >
      <button
        onClick={handleClick}
        className={`w-full h-full rounded-lg flex items-center justify-center text-white font-semibold shadow-md hover:shadow-lg transition-all ${
          statusColors[section.status].color
        }`}
      >
        {section.number}
      </button>
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
      className={`absolute border-2 border-gray-700 dark:border-gray-600 ${
        isOver ? 'bg-gray-100 dark:bg-gray-800' : ''
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
}

export const DraggableGrid: React.FC<DraggableGridProps> = ({
  sections,
  onSectionMove,
  onStatusChange,
}) => {
  const gridSize = 100; // Size of each grid cell in pixels
  const gridWidth = 8; // Number of cells horizontally
  const gridHeight = 6; // Number of cells vertically

  const [sectionStates, setSectionStates] = useState<SectionState[]>([]);
  const [initialized, setInitialized] = useState(false);

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
  }, [sections, initialized]);

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

  return (
    <DndProvider backend={HTML5Backend}>
      <div
        className="relative bg-white dark:bg-gray-900"
        style={{
          width: `${gridWidth * gridSize}px`,
          height: `${gridHeight * gridSize}px`,
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
            gridSize={gridSize}
          />
        ))}
      </div>
    </DndProvider>
  );
}; 