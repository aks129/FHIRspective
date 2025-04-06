import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { ResourceQualityScore } from '@/types';

interface InteractiveBarChartProps {
  data: ResourceQualityScore[];
  onResourceSelect: (resourceType: string) => void;
}

export default function InteractiveBarChart({ data, onResourceSelect }: InteractiveBarChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  
  // Colors for the bars based on score
  const getBarColor = (score: number) => {
    if (score >= 90) return '#4ade80'; // Green
    if (score >= 70) return '#facc15'; // Yellow
    return '#f87171'; // Red
  };

  const handleClick = (data: any, index: number) => {
    setActiveIndex(index);
    onResourceSelect(data.resourceType);
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        onClick={(data) => data && data.activePayload && handleClick(data.activePayload[0].payload, data.activeTooltipIndex || 0)}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="resourceType" />
        <YAxis domain={[0, 100]} />
        <Tooltip
          formatter={(value: number) => [`${value.toFixed(1)}%`, 'Quality Score']}
          cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
        />
        <Legend />
        <Bar 
          dataKey="overallScore" 
          name="Quality Score" 
          radius={[4, 4, 0, 0]}
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={getBarColor(entry.overallScore)}
              stroke={activeIndex === index ? '#3b82f6' : 'transparent'}
              strokeWidth={activeIndex === index ? 2 : 0}
              style={{ cursor: 'pointer' }}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}