'use client';
import React from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import type { PriceHistoryPoint } from './mockData';

interface PriceSparklineProps {
  data: PriceHistoryPoint[];
}

export default function PriceSparkline({ data }: PriceSparklineProps) {
  const first = data[0]?.price ?? 0;
  const last = data[data.length - 1]?.price ?? 0;
  const trending = last <= first;

  return (
    <ResponsiveContainer width="100%" height={36}>
      <LineChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <Line
          type="monotone"
          dataKey="price"
          stroke={trending ? 'hsl(142,71%,45%)' : 'hsl(0,84%,60%)'}
          strokeWidth={1.5}
          dot={false}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-card border border-border rounded-lg px-2 py-1 text-xs shadow-md">
                  <span className="font-mono tabular-nums">${payload[0].value}</span>
                  <span className="text-muted-foreground ml-1">{payload[0].payload.date}</span>
                </div>
              );
            }
            return null;
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}