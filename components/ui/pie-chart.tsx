"use client";

import * as React from "react";
import { Label, Pie, PieChart } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export type PieChartDataItem = {
  name: string;
  value: number;
  fill: string;
};

export type PieChartProps = {
  data: PieChartDataItem[];
  title?: string;
  description?: string;
  centerLabel?: string;
  centerValue?: number | string;
  innerRadius?: number;
  outerRadius?: number;
  className?: string;
  footer?: React.ReactNode;
  tooltipFormatter?: (
    value: number | string | Array<number | string>
  ) => React.ReactNode;
};

type ChartConfigItem = {
  label: string;
  color?: string;
};

export function PieChartComponent({
  data,
  title,
  description,
  centerLabel,
  centerValue,
  innerRadius = 60,
  outerRadius = 80,
  className = "",
  footer,
  tooltipFormatter,
}: PieChartProps) {
  // Create a chart config from the data
  const chartConfig = React.useMemo(() => {
    const config: Record<string, ChartConfigItem> = {
      value: {
        label: "Value",
      },
    };

    data.forEach((item) => {
      config[item.name] = {
        label: item.name,
        color: item.fill,
      };
    });

    return config;
  }, [data]);

  return (
    <Card className={`flex flex-col ${className}`}>
      {(title || description) && (
        <CardHeader className="items-center pb-0">
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent hideLabel formatter={tooltipFormatter} />
              }
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              strokeWidth={5}
            >
              {centerValue !== undefined && (
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-3xl font-bold"
                          >
                            {typeof centerValue === "number"
                              ? centerValue.toLocaleString()
                              : centerValue}
                            {typeof centerValue === "number" && "%"}
                          </tspan>
                          {centerLabel && (
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 24}
                              className="fill-muted-foreground"
                            >
                              {centerLabel}
                            </tspan>
                          )}
                        </text>
                      );
                    }
                  }}
                />
              )}
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      {footer && (
        <CardFooter className="flex-col gap-2 text-sm">{footer}</CardFooter>
      )}
    </Card>
  );
}
