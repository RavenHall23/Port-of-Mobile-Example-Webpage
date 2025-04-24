'use client';

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ChartData {
  date: string;
  value: number;
}

interface LineChartProps {
  data: ChartData[];
  xAxisKey: string;
  yAxisKey: string;
  tooltipFormatter?: (value: number) => string;
}

export function LineChart({
  data,
  xAxisKey,
  yAxisKey,
  tooltipFormatter = (value) => value.toString(),
}: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsLineChart
        data={data}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey={xAxisKey}
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => {
            if (typeof value === "string") {
              return value;
            }
            return new Date(value).toLocaleDateString();
          }}
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => `${value}%`}
        />
        <Tooltip
          formatter={(value: number) => tooltipFormatter(value)}
          labelFormatter={(label) => {
            if (typeof label === "string") {
              return label;
            }
            return new Date(label).toLocaleDateString();
          }}
        />
        <Line
          type="monotone"
          dataKey={yAxisKey}
          stroke="#2563eb"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 8 }}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
} 