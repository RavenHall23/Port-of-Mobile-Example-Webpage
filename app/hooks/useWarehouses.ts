import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import type { Warehouse, WarehouseStatus, WarehouseSection, WarehouseType } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { UserOptions } from 'jspdf-autotable'

// Extend jsPDF with autoTable
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: UserOptions) => jsPDF;
}

export function useWarehouses() {
  const [indoorWarehouses, setIndoorWarehouses] = useState<Warehouse[]>([])
  const [outdoorWarehouses, setOutdoorWarehouses] = useState<Warehouse[]>([])
  const [buttonStatus, setButtonStatus] = useState<Record<string, WarehouseStatus>>({})
  const [loading, setLoading] = useState(true)
  const [supabase, setSupabase] = useState<SupabaseClient<Database> | null>(null)

  useEffect(() => {
    const initSupabase = async () => {
      const client = await createClient()
      setSupabase(client)
      await fetchWarehouses(client)
    }
    initSupabase()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const sortWarehouses = (warehouses: Warehouse[]) => {
    return [...warehouses].sort((a, b) => a.name.localeCompare(b.name));
  };

  const fetchWarehouses = async (client: SupabaseClient<Database>) => {
    try {
      console.log('Starting warehouse fetch...');
      setLoading(true);

      // Fetch warehouses
      const { data: warehouses, error: warehousesError } = await client
        .from('warehouses')
        .select('*')
        .order('created_at', { ascending: true });

      if (warehousesError) {
        console.error('Error fetching warehouses:', warehousesError);
        throw warehousesError;
      }

      console.log('Fetched warehouses:', warehouses);

      // Fetch sections
      const { data: sections, error: sectionsError } = await client
        .from('warehouse_sections')
        .select('*');

      if (sectionsError) {
        console.error('Error fetching sections:', sectionsError);
        throw sectionsError;
      }

      console.log('Fetched sections:', sections);

      // Process warehouses and sections
      const indoor: Warehouse[] = [];
      const outdoor: Warehouse[] = [];
      const status: Record<string, WarehouseStatus> = {};

      warehouses.forEach((warehouse: Warehouse) => {
        const warehouseSections = sections.filter(
          (section: WarehouseSection) => section.warehouse_id === warehouse.id
        );

        warehouseSections.forEach((section: WarehouseSection) => {
          status[`${warehouse.letter}${section.section_number}`] = section.status;
        });

        if (warehouse.type === 'indoor') {
          indoor.push(warehouse);
        } else {
          outdoor.push(warehouse);
        }
      });

      // Sort warehouses alphabetically
      setIndoorWarehouses(sortWarehouses(indoor));
      setOutdoorWarehouses(sortWarehouses(outdoor));
      setButtonStatus(status);
      console.log('Warehouse fetch completed successfully');
    } catch (error) {
      console.error('Error in fetchWarehouses:', error);
      throw error;
    } finally {
      setLoading(false);
    }
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
      console.log('Starting warehouse removal for letter:', letter);
      
      // Find the warehouse to remove
      const allWarehouses = [...indoorWarehouses, ...outdoorWarehouses];
      const warehouseToRemove = allWarehouses.find(w => w.letter === letter);
      
      if (!warehouseToRemove) {
        console.error('Warehouse not found:', letter);
        return false;
      }

      console.log('Found warehouse to remove:', warehouseToRemove);

      // Delete sections first
      const { error: sectionsError } = await supabase
        .from('warehouse_sections')
        .delete()
        .eq('warehouse_id', warehouseToRemove.id);

      if (sectionsError) {
        console.error('Error deleting sections:', sectionsError);
        throw sectionsError;
      }

      // Delete warehouse
      const { error: warehouseError } = await supabase
        .from('warehouses')
        .delete()
        .eq('id', warehouseToRemove.id);

      if (warehouseError) {
        console.error('Error deleting warehouse:', warehouseError);
        throw warehouseError;
      }

      // Update local state with sorting
      if (warehouseToRemove.type === 'indoor') {
        setIndoorWarehouses(prev => sortWarehouses(prev.filter(w => w.letter !== letter)));
      } else {
        setOutdoorWarehouses(prev => sortWarehouses(prev.filter(w => w.letter !== letter)));
      }

      // Update button status
      const newStatus = { ...buttonStatus };
      Object.keys(newStatus).forEach(key => {
        if (key.startsWith(letter)) {
          delete newStatus[key];
        }
      });
      setButtonStatus(newStatus);

      console.log('Warehouse removal completed successfully');
      return true;
    } catch (error) {
      console.error('Error removing warehouse:', error);
      return false;
    }
  }

  const downloadWarehouseData = () => {
    const doc = new jsPDF()
    const date = new Date().toLocaleDateString()
    
    // Title
    doc.setFontSize(20)
    doc.text('Warehouse Status Report', 14, 15)
    doc.setFontSize(12)
    doc.text(`Generated on: ${date}`, 14, 25)
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
          .map(([key, status]) => ({
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
      doc.text('Outdoor Warehouses', 14, (doc as any).lastAutoTable.finalY + 15)
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
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

    const summaryY = (doc as any).lastAutoTable.finalY + 15
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
    doc.save(`warehouse-status-${date.replace(/\//g, '-')}.pdf`)
  }

  return {
    indoorWarehouses,
    outdoorWarehouses,
    buttonStatus,
    loading,
    createWarehouse,
    updateSectionStatus,
    removeWarehouse,
    downloadWarehouseData
  }
} 