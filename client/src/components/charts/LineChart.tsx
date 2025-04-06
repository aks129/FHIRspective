import { CartesianGrid, Line, LineChart as RechartsLineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

// This component shows a placeholder line chart
// In a real application, this would be populated with historical assessment data
export default function LineChart() {
  // Sample data for demonstration
  const data = [
    { date: 'Jan', score: 75 },
    { date: 'Feb', score: 78 },
    { date: 'Mar', score: 82 },
    { date: 'Apr', score: 80 },
    { date: 'May', score: 84 },
    { date: 'Jun', score: 88 },
    { date: 'Jul', score: 84 },
  ];
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsLineChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis domain={[0, 100]} />
        <Tooltip formatter={(value: number) => [`${value}%`, 'Quality Score']} />
        <Line 
          type="monotone" 
          dataKey="score" 
          stroke="hsl(195, 100%, 35%)" 
          strokeWidth={2}
          activeDot={{ r: 8 }} 
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
