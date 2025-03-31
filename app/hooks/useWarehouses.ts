import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import type { Warehouse, WarehouseStatus, WarehouseType } from '@/types/database'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface RemovedSection {
  warehouseLetter: string;
  sectionNumber: number;
  status: WarehouseStatus;
  timestamp: number;
}

export function useWarehouses() {
  const [indoorWarehouses, setIndoorWarehouses] = useState<Warehouse[]>([])
  const [outdoorWarehouses, setOutdoorWarehouses] = useState<Warehouse[]>([])
  const [buttonStatus, setButtonStatus] = useState<Record<string, WarehouseStatus>>({})
  const [loading, setLoading] = useState(true)
  const [removedSections, setRemovedSections] = useState<RemovedSection[]>([])
  const [supabase] = useState(() => createClient())

  const fetchWarehouses = useCallback(async () => {
    if (!supabase) return;

    try {
      const { data: warehouseData, error } = await supabase
        .from('warehouses')
        .select('*')
        .order('letter');

      if (error) throw error;

      const indoor = warehouseData.filter(w => w.type === 'indoor');
      const outdoor = warehouseData.filter(w => w.type === 'outdoor');

      setIndoorWarehouses(indoor);
      setOutdoorWarehouses(outdoor);

      // Fetch sections status
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('warehouse_sections')
        .select('*');

      if (sectionsError) throw sectionsError;

      const newButtonStatus: Record<string, WarehouseStatus> = {};
      sectionsData.forEach(section => {
        const warehouse = warehouseData.find(w => w.id === section.warehouse_id);
        if (warehouse) {
          newButtonStatus[`${warehouse.letter}${section.section_number}`] = section.status;
        }
      });

      setButtonStatus(newButtonStatus);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  const sortWarehouses = (warehouses: Warehouse[]) => {
    return [...warehouses].sort((a, b) => a.name.localeCompare(b.name));
  };

  const createWarehouse = async (type: WarehouseType, name: string, sections: number) => {
    if (!supabase) return false;
    
    try {
      console.log('Starting warehouse creation with:', { type, name, sections });
      
      // Input validation
      if (!name || !sections || sections < 1 || sections > 5000) {
        throw new Error('Invalid input: Name is required and sections must be between 1 and 5000');
      }

      // Check for duplicate names within the same category
      const warehousesToCheck = type === 'indoor' ? indoorWarehouses : outdoorWarehouses;
      const isDuplicateName = warehousesToCheck.some(warehouse => 
        warehouse.name.toLowerCase() === name.toLowerCase()
      );

      if (isDuplicateName) {
        throw new Error(`A ${type} warehouse with the name "${name}" already exists. Please choose a different name.`);
      }

      // Get the next available letter
      const allWarehouses = [...indoorWarehouses, ...outdoorWarehouses];
      const existingLetters = allWarehouses.map(w => w.letter);
      const nextLetter = String.fromCharCode(
        Math.max(...existingLetters.map(l => l.charCodeAt(0)), 64) + 1
      );

      console.log('Creating warehouse with letter:', nextLetter);

      // Create warehouse record
      const warehouseData = {
        letter: nextLetter,
        name,
        type
      };
      console.log('Attempting to insert warehouse:', warehouseData);

      const { data: warehouse, error: warehouseError } = await supabase
        .from('warehouses')
        .insert([warehouseData])
        .select()
        .single();

      if (warehouseError) {
        console.error('Warehouse creation error:', warehouseError);
        console.error('Error details:', JSON.stringify(warehouseError, null, 2));
        throw new Error(`Failed to create warehouse: ${warehouseError.message}`);
      }

      if (!warehouse) {
        throw new Error('Warehouse was not created successfully');
      }

      console.log('Warehouse created successfully:', warehouse);

      // Create sections
      const sectionsToInsert = Array.from({ length: sections }, (_, i) => ({
        warehouse_id: warehouse.id,
        warehouse_name: name,
        section_number: i + 1,
        status: 'green' as WarehouseStatus
      }));

      console.log('Creating sections:', sectionsToInsert);

      const { error: sectionsError } = await supabase
        .from('warehouse_sections')
        .insert(sectionsToInsert);

      if (sectionsError) {
        console.error('Sections creation error:', sectionsError);
        console.error('Error details:', JSON.stringify(sectionsError, null, 2));
        throw new Error(`Failed to create sections: ${sectionsError.message}`);
      }

      console.log('Sections created successfully');

      // Update local state with sorting
      const newWarehouse = { 
        id: warehouse.id, 
        letter: nextLetter, 
        name,
        type,
        created_at: warehouse.created_at,
        updated_at: warehouse.updated_at
      };
      if (type === 'indoor') {
        setIndoorWarehouses(prev => sortWarehouses([...prev, newWarehouse]));
      } else {
        setOutdoorWarehouses(prev => sortWarehouses([...prev, newWarehouse]));
      }

      // Update button status
      const newStatus = { ...buttonStatus };
      for (let i = 1; i <= sections; i++) {
        newStatus[`${nextLetter}${i}`] = 'green';
      }
      setButtonStatus(newStatus);

      console.log('Warehouse creation completed successfully');
      return true;
    } catch (error) {
      console.error('Error creating warehouse:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw error;
    }
  };

  const updateSectionStatus = async (warehouseLetter: string, sectionNumber: number, status: WarehouseStatus) => {
    if (!supabase) return false;
    
    try {
      // Find the warehouse by letter
      const warehouse = [...indoorWarehouses, ...outdoorWarehouses].find(w => w.letter === warehouseLetter)
      if (!warehouse) throw new Error('Warehouse not found')

      const { error } = await supabase
        .from('warehouse_sections')
        .update({ status })
        .eq('warehouse_id', warehouse.id)
        .eq('section_number', sectionNumber)

      if (error) throw error

      setButtonStatus(prev => ({
        ...prev,
        [`${warehouseLetter}${sectionNumber}`]: status
      }))

      return true
    } catch (error) {
      console.error('Error updating section status:', error)
      return false
    }
  }

  const removeWarehouse = async (letter: string) => {
    if (!supabase) return false;
    
    try {
      // Get the warehouse to remove
      const { data: warehouse } = await supabase
        .from('warehouses')
        .select('*')
        .eq('letter', letter)
        .single();

      if (!warehouse) {
        console.error('Warehouse not found:', letter);
        return false;
      }

      // Delete sections first
      await supabase
        .from('warehouse_sections')
        .delete()
        .eq('warehouse_id', warehouse.id);

      // Delete warehouse
      await supabase
        .from('warehouses')
        .delete()
        .eq('letter', letter);

      // Remove all sections for this warehouse from buttonStatus
      const newButtonStatus = { ...buttonStatus };
      Object.keys(newButtonStatus).forEach(key => {
        if (key.startsWith(letter)) {
          delete newButtonStatus[key];
        }
      });
      setButtonStatus(newButtonStatus);
      
      await fetchWarehouses();
      return true;
    } catch (error) {
      console.error('Error removing warehouse:', error);
      return false;
    }
  };

  const removeSection = async (warehouseLetter: string, sectionNumber: number) => {
    if (!supabase) return false;
    
    try {
      // Get the current warehouse
      const { data: warehouse } = await supabase
        .from('warehouses')
        .select('*')
        .eq('letter', warehouseLetter)
        .single();

      if (!warehouse) return false;

      // Store the section's current status before removal
      const currentStatus = buttonStatus[`${warehouseLetter}${sectionNumber}`];
      
      // Save the removed section info for potential undo
      setRemovedSections(prev => [
        {
          warehouseLetter,
          sectionNumber,
          status: currentStatus || 'green',
          timestamp: Date.now()
        },
        ...prev.slice(0, 9) // Keep only the 10 most recent removals
      ]);

      // Delete the specific section from warehouse_sections
      await supabase
        .from('warehouse_sections')
        .delete()
        .eq('warehouse_id', warehouse.id)
        .eq('section_number', sectionNumber);

      // Update the warehouse with one less section
      await supabase
        .from('warehouses')
        .update({ sections: warehouse.sections - 1 })
        .eq('letter', warehouseLetter);

      // Remove the section from buttonStatus
      const newButtonStatus = { ...buttonStatus };
      delete newButtonStatus[`${warehouseLetter}${sectionNumber}`];

      setButtonStatus(newButtonStatus);
      await fetchWarehouses();
      return true;
    } catch (error) {
      console.error('Error removing section:', error);
      return false;
    }
  };

  const undoSectionRemoval = async (removedSection: RemovedSection) => {
    if (!supabase) return false;
    
    try {
      // Get the current warehouse
      const { data: warehouse } = await supabase
        .from('warehouses')
        .select('*')
        .eq('letter', removedSection.warehouseLetter)
        .single();

      if (!warehouse) return false;

      // Insert the section back into warehouse_sections
      await supabase
        .from('warehouse_sections')
        .insert({
          warehouse_id: warehouse.id,
          section_number: removedSection.sectionNumber,
          status: removedSection.status
        });

      // Update the warehouse with one more section
      await supabase
        .from('warehouses')
        .update({ sections: warehouse.sections + 1 })
        .eq('letter', removedSection.warehouseLetter);

      // Add the section back to buttonStatus
      const newButtonStatus = { ...buttonStatus };
      newButtonStatus[`${removedSection.warehouseLetter}${removedSection.sectionNumber}`] = removedSection.status;

      setButtonStatus(newButtonStatus);
      
      // Remove this section from removedSections
      setRemovedSections(prev => prev.filter(s => 
        s.warehouseLetter !== removedSection.warehouseLetter || 
        s.sectionNumber !== removedSection.sectionNumber
      ));

      await fetchWarehouses();
      return true;
    } catch (error) {
      console.error('Error restoring section:', error);
      return false;
    }
  };

  const downloadWarehouseData = () => {
    const doc = new jsPDF()
    const date = new Date()
    const formattedDate = date.toLocaleDateString()
    const formattedTime = date.toLocaleTimeString()
    
    // Title
    doc.setFontSize(20)
    doc.text('Warehouse Status Report', 14, 15)
    doc.setFontSize(12)
    doc.text(`Generated on: ${formattedDate} at ${formattedTime}`, 14, 25)
    doc.setFontSize(10)

    // Calculate percentages for each section
    const calculateSectionPercentage = (status: WarehouseStatus) => {
      switch (status) {
        case 'green': return 100
        case 'yellow': return 75
        case 'orange': return 50
        case 'red': return 0
        default: return 0
      }
    }

    // Calculate warehouse type statistics
    const calculateWarehouseStats = (warehouses: Warehouse[]) => {
      const sections = warehouses.flatMap(warehouse => 
        Object.entries(buttonStatus)
          .filter(([key]) => key.startsWith(warehouse.letter))
          .map(([, status]) => ({
            status,
            percentage: calculateSectionPercentage(status)
          }))
      )

      const totalSections = sections.length
      const totalPercentage = sections.reduce((sum, section) => sum + section.percentage, 0)
      const averagePercentage = totalSections > 0 ? Math.round(totalPercentage / totalSections) : 0

      return {
        totalSections,
        averagePercentage
      }
    }

    // Indoor Warehouses Table
    const indoorData = indoorWarehouses.map(warehouse => {
      const sections = Object.entries(buttonStatus)
        .filter(([key]) => key.startsWith(warehouse.letter))
        .map(([key, status]) => ({
          section: key.replace(warehouse.letter, ''),
          status,
          percentage: calculateSectionPercentage(status)
        }))
      
      return sections.map(section => [
        warehouse.name,
        'Indoor',
        section.section,
        `${section.percentage}% available`
      ])
    }).flat()

    if (indoorData.length > 0) {
      doc.text('Indoor Warehouses', 14, 35)
      autoTable(doc, {
        startY: 40,
        head: [['Name', 'Type', 'Section', 'Status']],
        body: indoorData,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 8 }
      })
    }

    // Outdoor Warehouses Table
    const outdoorData = outdoorWarehouses.map(warehouse => {
      const sections = Object.entries(buttonStatus)
        .filter(([key]) => key.startsWith(warehouse.letter))
        .map(([key, status]) => ({
          section: key.replace(warehouse.letter, ''),
          status,
          percentage: calculateSectionPercentage(status)
        }))
      
      return sections.map(section => [
        warehouse.name,
        'Outdoor',
        section.section,
        `${section.percentage}% available`
      ])
    }).flat()

    if (outdoorData.length > 0) {
      doc.text('Outdoor Warehouses', 14, (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15)
      autoTable(doc, {
        startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20,
        head: [['Name', 'Type', 'Section', 'Status']],
        body: outdoorData,
        theme: 'grid',
        headStyles: { fillColor: [46, 204, 113] },
        styles: { fontSize: 8 }
      })
    }

    // Summary Statistics
    const indoorStats = calculateWarehouseStats(indoorWarehouses)
    const outdoorStats = calculateWarehouseStats(outdoorWarehouses)
    const totalSections = indoorStats.totalSections + outdoorStats.totalSections
    const overallPercentage = totalSections > 0 
      ? Math.round((indoorStats.averagePercentage * indoorStats.totalSections + 
                    outdoorStats.averagePercentage * outdoorStats.totalSections) / totalSections)
      : 0

    const summaryY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15
    doc.text('Summary Statistics', 14, summaryY)
    doc.setFontSize(9)
    doc.text(`Indoor Warehouses: ${indoorStats.totalSections} sections, ${indoorStats.averagePercentage}% average availability`, 14, summaryY + 7)
    doc.text(`Outdoor Warehouses: ${outdoorStats.totalSections} sections, ${outdoorStats.averagePercentage}% average availability`, 14, summaryY + 14)
    doc.text(`Overall: ${totalSections} total sections, ${overallPercentage}% average availability`, 14, summaryY + 21)

    // Legend
    const legendY = summaryY + 35
    doc.text('Status Legend:', 14, legendY)
    doc.text('Green (100%): Available', 14, legendY + 7)
    doc.text('Yellow (75%): Partially Available', 14, legendY + 14)
    doc.text('Orange (50%): Limited Availability', 14, legendY + 21)
    doc.text('Red (0%): Not Available', 14, legendY + 28)

    // Download the PDF
    doc.save(`warehouse-status-${date.toISOString().replace(/[:.]/g, '-')}.pdf`)
  }

  const addSections = async (warehouseLetter: string, numberOfSections: number) => {
    if (!supabase) {
      console.error('Supabase client not initialized');
      throw new Error('Database connection not initialized');
    }
    
    try {
      // Get the current warehouse
      const { data: warehouse, error: warehouseError } = await supabase
        .from('warehouses')
        .select('*')
        .eq('letter', warehouseLetter)
        .single();

      if (warehouseError) {
        console.error('Error fetching warehouse:', warehouseError);
        throw new Error(`Failed to fetch warehouse: ${warehouseError.message}`);
      }

      if (!warehouse) {
        console.error('Warehouse not found:', warehouseLetter);
        throw new Error(`Warehouse ${warehouseLetter} not found`);
      }

      // Get the current highest section number
      const existingSections = Object.keys(buttonStatus)
        .filter(key => key.startsWith(warehouseLetter))
        .map(key => parseInt(key.slice(1)));
      
      const highestSectionNumber = Math.max(0, ...existingSections);

      // Create new sections starting from the next number
      const sectionsToInsert = Array.from(
        { length: numberOfSections }, 
        (_, i) => ({
          warehouse_id: warehouse.id,
          warehouse_name: warehouse.name,
          section_number: highestSectionNumber + i + 1,
          status: 'green' as WarehouseStatus
        })
      );

      console.log('Attempting to insert sections:', sectionsToInsert);

      // Insert new sections
      const { error: sectionsError } = await supabase
        .from('warehouse_sections')
        .insert(sectionsToInsert);

      if (sectionsError) {
        console.error('Error inserting sections:', sectionsError);
        console.error('Error details:', JSON.stringify(sectionsError, null, 2));
        throw new Error(`Failed to insert sections: ${sectionsError.message}`);
      }

      // Update button status
      const newButtonStatus = { ...buttonStatus };
      sectionsToInsert.forEach(section => {
        newButtonStatus[`${warehouseLetter}${section.section_number}`] = section.status;
      });
      setButtonStatus(newButtonStatus);

      await fetchWarehouses();
      return true;
    } catch (error) {
      console.error('Error adding sections:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to add sections: Unknown error occurred');
    }
  };

  const clearRemovedSections = () => {
    setRemovedSections([]);
  };

  return {
    indoorWarehouses,
    outdoorWarehouses,
    buttonStatus,
    loading,
    createWarehouse,
    updateSectionStatus,
    removeWarehouse,
    removeSection,
    downloadWarehouseData,
    removedSections,
    undoSectionRemoval,
    addSections,
    clearRemovedSections
  }
} 