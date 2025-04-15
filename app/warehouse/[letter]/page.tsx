'use client';

import { useParams } from 'next/navigation';
import { WarehouseDetails } from '@/components/WarehouseDetails';
import { useWarehouses } from '@/app/hooks/useWarehouses';
import { useEffect, useState } from 'react';
import { Warehouse } from '@/types/database';

export default function WarehousePage() {
  const params = useParams();
  const letter = params.letter as string;
  const { indoorWarehouses, outdoorWarehouses, loading } = useWarehouses();
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);

  useEffect(() => {
    const allWarehouses = [...indoorWarehouses, ...outdoorWarehouses];
    const foundWarehouse = allWarehouses.find((w: Warehouse) => w.letter === letter);
    setWarehouse(foundWarehouse || null);
  }, [letter, indoorWarehouses, outdoorWarehouses]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!warehouse) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Warehouse not found</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">The warehouse you&apos;re looking for doesn&apos;t exist.</p>
        </div>
      </div>
    );
  }

  return <WarehouseDetails warehouse={warehouse} />;
} 