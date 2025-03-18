import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent, // this is the right one that jordyn didnt mean to push
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface WarehouseFormProps {
  type: 'indoor' | 'outdoor';
  onClose: () => void;
  onSubmit: (data: { name: string; sections: number }) => void;
}

export function WarehouseForm({ type, onClose, onSubmit }: WarehouseFormProps) {
  const [formData, setFormData] = React.useState({
    name: '',
    sections: '' // Change to empty string initially
  });

  const [error, setError] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Please enter a warehouse name');
      return;
    }
    const sectionsNum = parseInt(formData.sections);
    if (isNaN(sectionsNum) || sectionsNum < 1 || sectionsNum > 5000) {
      setError('Please enter a valid number of sections (1-5000)');
      return;
    }
    onSubmit({ name: formData.name, sections: sectionsNum });
    onClose();
  };

  const handleSectionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, sections: value });
    setError('');
  };

  const isFormValid = formData.name.trim() !== '' && 
    !isNaN(parseInt(formData.sections)) && 
    parseInt(formData.sections) >= 1 && 
    parseInt(formData.sections) <= 5000;

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
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setFormData({ ...formData, name: e.target.value });
                  setError('');
                }}
                required
                className={`${formData.name.trim() === '' ? 'border-red-500 focus-visible:ring-red-500' : 'border-green-500 focus-visible:ring-green-500'}`}
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="sections">Number of Sections</Label>
              <Input 
                id="sections" 
                type="number"
                min="1"
                max="5000"
                placeholder="Enter number of sections (1-5000)"
                value={formData.sections}
                onChange={handleSectionsChange}
                required
                className={`${
                  formData.sections === '' || 
                  isNaN(parseInt(formData.sections)) || 
                  parseInt(formData.sections) < 1 || 
                  parseInt(formData.sections) > 5000
                    ? 'border-red-500 focus-visible:ring-red-500'
                    : 'border-green-500 focus-visible:ring-green-500'
                }`}
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!isFormValid}>Add Warehouse</Button>
      </CardFooter>
    </Card>
  )
} 