import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"

interface WarehouseFormProps {
  type: 'indoor' | 'outdoor';
  onClose: () => void;
  onSubmit: (data: { name: string; sections: number }) => void;
}

export function WarehouseForm({ type, onClose, onSubmit }: WarehouseFormProps) {
  const [name, setName] = useState("");
  const [sections, setSections] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const sectionsNumber = parseInt(sections);
      if (isNaN(sectionsNumber) || sectionsNumber < 1 || sectionsNumber > 5000) {
        throw new Error('Number of sections must be between 1 and 5000');
      }
      await onSubmit({ name, sections: sectionsNumber });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while creating the warehouse');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Add {type.charAt(0).toUpperCase() + type.slice(1)} Warehouse</CardTitle>
        <CardDescription>Enter warehouse details below.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="name">Warehouse Name</Label>
              <Input 
                id="name" 
                placeholder="Enter warehouse name"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setName(e.target.value);
                  setError('');
                }}
                required
                className={`${error ? 'border-red-500 focus-visible:ring-red-500' : 'border-green-500 focus-visible:ring-green-500'}`}
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="sections">Number of Sections</Label>
              <Input 
                id="sections" 
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Enter number of sections (1-5000)"
                value={sections}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 5000)) {
                    setSections(value);
                    setError('');
                  }
                }}
                required
                className={`${error ? 'border-red-500 focus-visible:ring-red-500' : 'border-green-500 focus-visible:ring-green-500'}`}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Warehouse'}
        </Button>
      </CardFooter>
    </Card>
  )
} 