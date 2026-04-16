'use client';
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';

interface AlertAreaChartProps {
  data: { date: string; price: number }[];
  targetPrice: number;
  currency?: string;
}

export default function AlertAreaChart({ data, targetPrice, currency = 'USD' }: AlertAreaChartProps) {
  const symbol = currency === 'USD' ? '$' : `${currency} `;
  return (
    <ResponsiveContainer width="100%" height={80}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 4 }}>
        <defs>
          <linearGradient id="alertGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(173,80%,32%)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(173,80%,32%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(215,16%,47%)' }} tickLine={false} axisLine={false} />
        <YAxis hide domain={['auto', 'auto']} />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-card border border-border rounded-lg px-2 py-1 text-xs shadow-md">
                  <span className="font-mono tabular-nums">{symbol}{Number(payload[0].value).toFixed(2)}</span>
                  <span className="text-muted-foreground ml-1">{payload[0].payload.date}</span>
                </div>
              );
            }
            return null;
          }}
        />
        <ReferenceLine y={targetPrice} stroke="hsl(38,92%,50%)" strokeDasharray="4 3" strokeWidth={1.5} />
        <Area
          type="monotone"
          dataKey="price"
          stroke="hsl(173,80%,32%)"
          strokeWidth={2}
          fill="url(#alertGradient)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}