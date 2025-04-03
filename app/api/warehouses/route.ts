import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize the Supabase client with elevated privileges
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, capacity, location, letter } = body;

    // Create warehouse
    const { data: warehouse, error: warehouseError } = await supabase
      .from('warehouses')
      .insert([{ name, capacity, type: location, letter }])
      .select()
      .single();

    if (warehouseError) {
      console.error('Warehouse creation error:', warehouseError);
      return NextResponse.json({ error: warehouseError.message }, { status: 400 });
    }

    if (!warehouse) {
      return NextResponse.json({ error: 'Failed to create warehouse' }, { status: 400 });
    }

    // Create sections
    const sectionsToInsert = Array.from({ length: capacity }, (_, i) => ({
      warehouse_id: warehouse.id,
      section_number: i + 1,
      status: 'green'
    }));

    const { error: sectionsError } = await supabase
      .from('warehouse_sections')
      .insert(sectionsToInsert);

    if (sectionsError) {
      console.error('Sections creation error:', sectionsError);
      return NextResponse.json({ error: sectionsError.message }, { status: 400 });
    }

    return NextResponse.json({ data: warehouse });
  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;

    // Delete sections first
    const { error: sectionsError } = await supabase
      .from('warehouse_sections')
      .delete()
      .eq('warehouse_id', id);

    if (sectionsError) {
      console.error('Error deleting sections:', sectionsError);
      return NextResponse.json({ error: sectionsError.message }, { status: 400 });
    }

    // Delete warehouse
    const { error: warehouseError } = await supabase
      .from('warehouses')
      .delete()
      .eq('id', id);

    if (warehouseError) {
      console.error('Error deleting warehouse:', warehouseError);
      return NextResponse.json({ error: warehouseError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 