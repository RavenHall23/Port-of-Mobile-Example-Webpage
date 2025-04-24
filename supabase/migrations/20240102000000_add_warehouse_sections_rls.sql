-- Enable RLS on warehouse_sections table
ALTER TABLE public.warehouse_sections ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read warehouse sections
CREATE POLICY "Allow authenticated users to read warehouse sections"
    ON public.warehouse_sections
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert warehouse sections
CREATE POLICY "Allow authenticated users to insert warehouse sections"
    ON public.warehouse_sections
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to update warehouse sections
CREATE POLICY "Allow authenticated users to update warehouse sections"
    ON public.warehouse_sections
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to delete warehouse sections
CREATE POLICY "Allow authenticated users to delete warehouse sections"
    ON public.warehouse_sections
    FOR DELETE
    TO authenticated
    USING (true); 