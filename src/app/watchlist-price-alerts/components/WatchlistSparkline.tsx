'use client';
import React from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';

interface WatchlistSparklineProps {
  data: { date: string; price: number }[];
  currency?: string;
}

export default function WatchlistSparkline({ data, currency = 'USD' }: WatchlistSparklineProps) {
  const first = data[0]?.price ?? 0;
  const last = data[data.length - 1]?.price ?? 0;
  const isDown = last <= first;

  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={data} margin={{ top: 4, right: 2, left: 2, bottom: 4 }}>
        <Line
          type="monotone"
          dataKey="price"
          stroke={isDown ? 'hsl(142,71%,45%)' : 'hsl(0,84%,60%)'}
          strokeWidth={2}
          dot={false}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-card border border-border rounded-lg px-2 py-1 text-xs shadow-md">
                  <span className="font-mono tabular-nums font-semibold">
                    {currency === 'USD' ? '$' : `${currency} `}{Number(payload[0].value).toFixed(2)}
                  </span>
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