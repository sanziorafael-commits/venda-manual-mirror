"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type DateRangePickerProps = {
  value: DateRange | undefined;
  onChange: (nextValue: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Selecione a data",
  className,
  disabled = false,
}: DateRangePickerProps) {
  const label = React.useMemo(() => {
    if (!value?.from) {
      return placeholder;
    }

    if (!value.to) {
      return format(value.from, "dd/MM/yyyy");
    }

    return `${format(value.from, "dd/MM/yyyy")} - ${format(
      value.to,
      "dd/MM/yyyy",
    )}`;
  }, [placeholder, value]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "min-w-55 justify-start text-left font-normal",
            !value?.from && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="size-4" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="range"
          selected={value}
          onSelect={onChange}
          numberOfMonths={2}
          defaultMonth={value?.from}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

