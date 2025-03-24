import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import type { Warehouse, WarehouseSection, WarehouseType, WarehouseStatus } from '@/types/database'

interface WarehouseWithName {
  id: string;
  letter: string;
  name: string;
}

export function useWarehouses() {
  const [indoorWarehouses, setIndoorWarehouses] = useState<Warehouse[]>([])
  const [outdoorWarehouses, setOutdoorWarehouses] = useState<Warehouse[]>([])
  const [buttonStatus, setButtonStatus] = useState<Record<string, WarehouseStatus>>({})
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchWarehouses()
  }, [])

  const fetchWarehouses = async () => {
    try {
      console.log('Fetching warehouses...')
      // Fetch warehouses
      const { data: warehouses, error: warehousesError } = await supabase
        .from('warehouses')
        .select('*')
        .order('letter')

      if (warehousesError) {
        console.error('Warehouses fetch error:', warehousesError)
        throw warehousesError
      }

      console.log('Fetched warehouses:', warehouses)

      // Fetch sections
      const { data: sections, error: sectionsError } = await supabase
        .from('warehouse_sections')
        .select('*')

      if (sectionsError) {
        console.error('Sections fetch error:', sectionsError)
        throw sectionsError
      }

      console.log('Fetched sections:', sections)

      // Process warehouses
      const indoor = warehouses
        .filter(w => w.type === 'indoor')
        .map(w => ({ id: w.id, letter: w.letter, name: w.name }))
      const outdoor = warehouses
        .filter(w => w.type === 'outdoor')
        .map(w => ({ id: w.id, letter: w.letter, name: w.name }))
      setIndoorWarehouses(indoor)
      setOutdoorWarehouses(outdoor)

      // Process sections
      const status: Record<string, WarehouseStatus> = {}
      sections.forEach(section => {
        const warehouse = [...indoor, ...outdoor].find(w => w.id === section.warehouse_id)
        if (warehouse) {
          status[`${warehouse.letter}${section.section_number}`] = section.status
        }
      })
      setButtonStatus(status)
    } catch (error) {
      console.error('Error fetching warehouses:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
    } finally {
      setLoading(false)
    }
  }

  const createWarehouse = async (type: 'indoor' | 'outdoor', name: string, sections: number) => {
    try {
      console.log('Starting warehouse creation with:', { type, name, sections });
      
      // Input validation
      if (!name || !sections || sections < 1 || sections > 5000) {
        throw new Error('Invalid input: Name is required and sections must be between 1 and 5000');
      }

      // Check for duplicate names across all warehouses
      const allWarehouses = [...indoorWarehouses, ...outdoorWarehouses];
      const isDuplicateName = allWarehouses.some(warehouse => 
        warehouse.name.toLowerCase() === name.toLowerCase()
      );

      if (isDuplicateName) {
        const existingWarehouse = allWarehouses.find(w => 
          w.name.toLowerCase() === name.toLowerCase()
        );
        throw new Error(`A warehouse with the name "${name}" already exists. Please choose a different name.`);
      }

      // Get the next available letter
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

      // Update local state
      const newWarehouse = { id: warehouse.id, letter: nextLetter, name };
      if (type === 'indoor') {
        setIndoorWarehouses(prev => [...prev, newWarehouse]);
      } else {
        setOutdoorWarehouses(prev => [...prev, newWarehouse]);
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
    try {
      console.log('Removing warehouse:', letter)
      
      // Find the warehouse ID
      const warehouse = [...indoorWarehouses, ...outdoorWarehouses].find(w => w.letter === letter)
      if (!warehouse) {
        throw new Error('Warehouse not found')
      }

      // Delete all sections first (due to foreign key constraint)
      const { error: sectionsError } = await supabase
        .from('warehouse_sections')
        .delete()
        .eq('warehouse_id', warehouse.id)

      if (sectionsError) {
        console.error('Error deleting sections:', sectionsError)
        throw sectionsError
      }

      // Delete the warehouse
      const { error: warehouseError } = await supabase
        .from('warehouses')
        .delete()
        .eq('id', warehouse.id)

      if (warehouseError) {
        console.error('Error deleting warehouse:', warehouseError)
        throw warehouseError
      }

      // Update local state
      setIndoorWarehouses(prev => prev.filter(w => w.letter !== letter))
      setOutdoorWarehouses(prev => prev.filter(w => w.letter !== letter))
      
      // Remove section statuses
      const newButtonStatus = { ...buttonStatus }
      Object.keys(newButtonStatus).forEach(key => {
        if (key.startsWith(letter)) {
          delete newButtonStatus[key]
        }
      })
      setButtonStatus(newButtonStatus)

      return true
    } catch (error) {
      console.error('Error removing warehouse:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return false
    }
  }

  return {
    indoorWarehouses,
    outdoorWarehouses,
    buttonStatus,
    loading,
    createWarehouse,
    updateSectionStatus,
    removeWarehouse
  }
} 