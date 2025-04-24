'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

type TimeRange = "day" | "week" | "month" | "year" | "custom";

interface TimeFilterProps {
  onRangeChange: (range: TimeRange, startDate?: Date, endDate?: Date) => void;
}

export const TimeFilter: React.FC<TimeFilterProps> = ({ onRangeChange }) => {
  const [selectedRange, setSelectedRange] = useState<TimeRange>("day");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();

  const handleRangeChange = (range: TimeRange) => {
    setSelectedRange(range);
    if (range === "custom") {
      if (customStartDate && customEndDate) {
        onRangeChange(range, customStartDate, customEndDate);
      }
    } else {
      onRangeChange(range);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex gap-2">
        <Button
          variant={selectedRange === "day" ? "default" : "outline"}
          size="sm"
          onClick={() => handleRangeChange("day")}
        >
          Day
        </Button>
        <Button
          variant={selectedRange === "week" ? "default" : "outline"}
          size="sm"
          onClick={() => handleRangeChange("week")}
        >
          Week
        </Button>
        <Button
          variant={selectedRange === "month" ? "default" : "outline"}
          size="sm"
          onClick={() => handleRangeChange("month")}
        >
          Month
        </Button>
        <Button
          variant={selectedRange === "year" ? "default" : "outline"}
          size="sm"
          onClick={() => handleRangeChange("year")}
        >
          Year
        </Button>
        <Button
          variant={selectedRange === "custom" ? "default" : "outline"}
          size="sm"
          onClick={() => handleRangeChange("custom")}
        >
          Custom
        </Button>
      </div>

      {selectedRange === "custom" && (
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-[200px] justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customStartDate ? format(customStartDate, "PPP") : "Start date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={customStartDate}
                onSelect={(date) => {
                  setCustomStartDate(date);
                  if (date && customEndDate) {
                    onRangeChange("custom", date, customEndDate);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-[200px] justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customEndDate ? format(customEndDate, "PPP") : "End date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={customEndDate}
                onSelect={(date) => {
                  setCustomEndDate(date);
                  if (date && customStartDate) {
                    onRangeChange("custom", customStartDate, date);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}; 