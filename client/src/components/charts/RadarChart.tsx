import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart as RechartsRadarChart, ResponsiveContainer } from 'recharts';

interface DimensionScores {
  completeness: number;
  conformity: number;
  plausibility: number;
  timeliness?: number;
  calculability?: number;
}

interface RadarChartProps {
  dimensions: DimensionScores;
}

export default function RadarChart({ dimensions }: RadarChartProps) {
  // Convert the dimensions object to an array format needed by Recharts
  const data = Object.entries(dimensions)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => ({
      dimension: key.charAt(0).toUpperCase() + key.slice(1),
      score: value
    }));
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsRadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="dimension" />
        <PolarRadiusAxis angle={90} domain={[0, 100]} />
        <Radar
          name="Quality"
          dataKey="score"
          stroke="hsl(195, 100%, 35%)"
          fill="hsl(195, 100%, 35%)"
          fillOpacity={0.6}
        />
      </RechartsRadarChart>
    </ResponsiveContainer>
  );
}
