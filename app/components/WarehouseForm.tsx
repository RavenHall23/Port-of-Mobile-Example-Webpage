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

interface WarehouseFormProps {
  type: 'indoor' | 'outdoor';
  onClose: () => void;
  onSubmit: (data: { name: string; sections: number }) => void;
}

export function WarehouseForm({ type, onClose, onSubmit }: WarehouseFormProps) {
  const [formData, setFormData] = React.useState({
    name: '',
    sections: 4 // Default to 4 sections
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
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
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                required
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const value = parseInt(e.target.value);
                  if (value >= 1 && value <= 5000) {
                    setFormData({ ...formData, sections: value });
                  }
                }}
                required
              />
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit}>Add Warehouse</Button>
      </CardFooter>
    </Card>
  )
} 