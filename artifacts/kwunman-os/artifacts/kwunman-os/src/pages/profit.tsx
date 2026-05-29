import { useState } from "react";
import { useGetQuarterlyStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatHKD } from "@/lib/format";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Line,
  ComposedChart
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

export default function Profit() {
  const [taxView, setTaxView] = useState<"kwunman" | "gov">("kwunman");
  const { data: stats, isLoading } = useGetQuarterlyStats({ taxView });

  const chartData = stats?.map(stat => ({
    name: stat.quarter,
    '已收款': stat.totalReceived,
    '報價總額': stat.totalQuoted,
    '完成項目數': stat.completedCount
  })) || [];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border shadow-lg rounded-lg p-3 text-sm">
          <p className="font-bold border-b pb-2 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="flex justify-between gap-4 py-1" style={{ color: entry.color }}>
              <span>{entry.name}:</span>
              <span className="font-mono">
                {entry.name.includes('數') ? entry.value : formatHKD(entry.value)}
              </span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">利潤分析</h1>
          <p className="text-muted-foreground mt-1">各季度營收狀況統計</p>
        </div>
        <Tabs value={taxView} onValueChange={(v) => setTaxView(v as "kwunman" | "gov")}>
          <TabsList>
            <TabsTrigger value="kwunman">冠文自然年</TabsTrigger>
            <TabsTrigger value="gov">政府財政年</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>營收與報價趨勢</CardTitle>
            <CardDescription>
              顯示各季度的報價總額與實際收款金額對比
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="w-full h-[400px]" />
            ) : chartData.length === 0 ? (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                沒有足夠的數據生成圖表
              </div>
            ) : (
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      dy={10}
                    />
                    <YAxis 
                      yAxisId="left"
                      tickFormatter={(value) => `$${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      dx={-10}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar 
                      yAxisId="left"
                      dataKey="報價總額" 
                      fill="hsl(var(--muted))" 
                      radius={[4, 4, 0, 0]} 
                      barSize={40}
                    />
                    <Bar 
                      yAxisId="left"
                      dataKey="已收款" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]} 
                      barSize={40}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="完成項目數" 
                      stroke="hsl(var(--chart-2))" 
                      strokeWidth={3}
                      dot={{ r: 4, fill: "hsl(var(--chart-2))" }}
                      activeDot={{ r: 6 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          {stats?.map((stat) => (
            <Card key={stat.quarter} className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{stat.quarter}</CardTitle>
                <CardDescription>季度總結</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">實收金額</span>
                  <span className="font-bold text-primary">{formatHKD(stat.totalReceived)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">報價總額</span>
                  <span className="font-medium text-foreground">{formatHKD(stat.totalQuoted)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">項目數量</span>
                  <span className="font-medium">{stat.completedCount} / {stat.projectCount} 完結</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
