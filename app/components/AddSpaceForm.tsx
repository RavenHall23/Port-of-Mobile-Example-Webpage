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

interface AddSpaceFormProps {
  type: 'indoor' | 'outdoor';
  onClose: () => void;
  onSubmit: (data: { name: string; sections: number }) => void;
}

export function AddSpaceForm({ type, onClose, onSubmit }: AddSpaceFormProps) {
  const [spaceName, setSpaceName] = useState("");
  const [sectionCount, setSectionCount] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!spaceName.trim()) {
      setError("Space name is required");
      return;
    }

    const sections = parseInt(sectionCount);
    if (isNaN(sections) || sections < 1) {
      setError("Please enter a valid number of sections");
      return;
    }

    onSubmit({ name: spaceName, sections });
  };

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Add New {type === 'indoor' ? 'Warehouse' : 'Laydown'} Space</CardTitle>
        <CardDescription>Enter the details for your new space</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="spaceName">Space Name:</Label>
              <Input 
                id="spaceName"
                value={spaceName}
                onChange={(e) => setSpaceName(e.target.value)}
                placeholder="Enter space name"
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="sections">Number of Sections:</Label>
              <Input 
                id="sections"
                type="number"
                value={sectionCount}
                onChange={(e) => setSectionCount(e.target.value)}
                placeholder="Enter number of sections"
                min="1"
              />
            </div>
            {error && (
              <div className="text-sm text-red-500 mt-2">
                {error}
              </div>
            )}
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit}>Create Space</Button>
      </CardFooter>
    </Card>
  )
} 