'use client';
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingDown, TrendingUp } from 'lucide-react';

interface PriceHistoryChartProps {
  data: { date: string; price: number }[];
  currency?: string;
  productName?: string;
}

export default function PriceHistoryChart({ data, currency = 'USD', productName }: PriceHistoryChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
        No price history available
      </div>
    );
  }

  const prices = data.map(d => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const firstPrice = data[0].price;
  const lastPrice = data[data.length - 1].price;
  const change = lastPrice - firstPrice;
  const changePct = Math.round((change / firstPrice) * 100);
  const isDown = change <= 0;
  const sym = currency === 'USD' ? '$' : `${currency} `;

  const color = isDown ? 'hsl(142,71%,45%)' : 'hsl(0,84%,60%)';
  const gradientId = `price-gradient-${productName?.replace(/\s/g, '') || 'chart'}`;

  return (
    <div>
      {/* Summary row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 text-xs font-semibold ${isDown ? 'text-success' : 'text-destructive'}`}>
            {isDown ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
            {isDown ? '↓' : '↑'} {Math.abs(changePct)}% over {data.length} weeks
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>Low: <span className="font-semibold text-success">{sym}{minPrice.toFixed(2)}</span></span>
          <span>High: <span className="font-semibold text-destructive">{sym}{maxPrice.toFixed(2)}</span></span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.2} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[minPrice * 0.97, maxPrice * 1.03]}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${sym}${v.toFixed(0)}`}
            width={55}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs shadow-md">
                    <span className="font-mono tabular-nums font-bold text-foreground">
                      {sym}{Number(payload[0].value).toFixed(2)}
                    </span>
                    <span className="text-muted-foreground ml-1.5">{payload[0].payload.date}</span>
                  </div>
                );
              }
              return null;
            }}
          />
          <ReferenceLine y={minPrice} stroke="hsl(142,71%,45%)" strokeDasharray="3 3" strokeOpacity={0.6} />
          <Area
            type="monotone"
            dataKey="price"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={{ fill: color, r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: color, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
