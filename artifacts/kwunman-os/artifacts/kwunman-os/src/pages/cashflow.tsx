import { useMemo, useState } from "react";
import {
  useListProjects,
  useListExpenses,
  useListPayslips,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatHKD } from "@/lib/format";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

type ViewRange = "12" | "24";

function generateMonths(count: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }
  return months;
}

const MONTH_LABELS: Record<string, string> = {
  "01": "1月", "02": "2月", "03": "3月", "04": "4月",
  "05": "5月", "06": "6月", "07": "7月", "08": "8月",
  "09": "9月", "10": "10月", "11": "11月", "12": "12月",
};

function shortLabel(ym: string) {
  const [y, m] = ym.split("-");
  return `${y.slice(2)}/${MONTH_LABELS[m]}`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border shadow-lg rounded-lg p-3 text-sm min-w-[180px]">
        <p className="font-bold border-b pb-2 mb-2 text-xs">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="flex justify-between gap-4 py-0.5" style={{ color: entry.color }}>
            <span>{entry.name}</span>
            <span className="font-mono font-semibold">{formatHKD(entry.value)}</span>
          </p>
        ))}
        {payload.length === 3 && (
          <p className="flex justify-between gap-4 pt-1 mt-1 border-t text-foreground font-semibold">
            <span>淨現金流</span>
            <span className={`font-mono ${payload[0].value - payload[1].value - payload[2].value >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatHKD(payload[0].value - payload[1].value - payload[2].value)}
            </span>
          </p>
        )}
      </div>
    );
  }
  return null;
};

export default function CashFlow() {
  const [range, setRange] = useState<ViewRange>("12");

  const { data: projects = [], isLoading: loadingProjects } = useListProjects({});
  const { data: expenses = [], isLoading: loadingExpenses } = useListExpenses({});
  const { data: payslips = [], isLoading: loadingPayslips } = useListPayslips({});

  const isLoading = loadingProjects || loadingExpenses || loadingPayslips;

  const months = useMemo(() => generateMonths(Number(range)), [range]);

  const chartData = useMemo(() => {
    const received: Record<string, number> = {};
    const expenseMap: Record<string, number> = {};
    const payrollMap: Record<string, number> = {};

    (projects as any[]).forEach((p) => {
      if (p.status !== "已完成" || !p.finalReceived) return;
      const dateStr = p.endDate || p.date;
      if (!dateStr) return;
      const ym = String(dateStr).slice(0, 7);
      received[ym] = (received[ym] ?? 0) + Number(p.finalReceived);
    });

    (expenses as any[]).forEach((e) => {
      if (e.status === "rejected") return;
      const dateStr = e.receiptDate || e.submittedAt;
      if (!dateStr) return;
      const ym = String(dateStr).slice(0, 7);
      expenseMap[ym] = (expenseMap[ym] ?? 0) + Number(e.amount);
    });

    (payslips as any[]).forEach((s) => {
      const ym = `${s.year}-${String(s.month).padStart(2, "0")}`;
      payrollMap[ym] = (payrollMap[ym] ?? 0) + Number(s.netPay);
    });

    return months.map((ym) => ({
      month: shortLabel(ym),
      ym,
      實收: received[ym] ?? 0,
      支出: expenseMap[ym] ?? 0,
      薪酬: payrollMap[ym] ?? 0,
      淨現金流: (received[ym] ?? 0) - (expenseMap[ym] ?? 0) - (payrollMap[ym] ?? 0),
    }));
  }, [projects, expenses, payslips, months]);

  const totals = useMemo(
    () => ({
      received: chartData.reduce((s, d) => s + d.實收, 0),
      expenses: chartData.reduce((s, d) => s + d.支出, 0),
      payroll: chartData.reduce((s, d) => s + d.薪酬, 0),
      net: chartData.reduce((s, d) => s + d.淨現金流, 0),
    }),
    [chartData]
  );

  const NetIcon =
    totals.net > 0 ? TrendingUp : totals.net < 0 ? TrendingDown : Minus;
  const netColor = totals.net > 0 ? "text-green-600" : totals.net < 0 ? "text-red-600" : "text-muted-foreground";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">現金流總覽</h1>
          <p className="text-muted-foreground mt-1">每月實收、支出與薪酬走勢</p>
        </div>
        <Tabs value={range} onValueChange={(v) => setRange(v as ViewRange)}>
          <TabsList>
            <TabsTrigger value="12">近12個月</TabsTrigger>
            <TabsTrigger value="24">近24個月</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">期間實收合計</p>
            <p className="text-xl font-bold text-green-700">{formatHKD(totals.received)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-400">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">期間支出合計</p>
            <p className="text-xl font-bold text-orange-600">{formatHKD(totals.expenses)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-400">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">期間薪酬合計</p>
            <p className="text-xl font-bold text-blue-600">{formatHKD(totals.payroll)}</p>
          </CardContent>
        </Card>
        <Card className={`border-l-4 ${totals.net >= 0 ? "border-l-emerald-500" : "border-l-red-500"}`}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">期間淨現金流</p>
            <div className={`flex items-center gap-1.5 ${netColor}`}>
              <NetIcon className="h-4 w-4" />
              <p className="text-xl font-bold">{formatHKD(Math.abs(totals.net))}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line chart */}
      <Card>
        <CardHeader>
          <CardTitle>月份走勢</CardTitle>
          <CardDescription>實收、支出與薪酬逐月對比</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="w-full h-[360px]" />
          ) : (
            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    dy={8}
                  />
                  <YAxis
                    tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    dx={-8}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: "12px", fontSize: "13px" }} />
                  <Line
                    type="monotone"
                    dataKey="實收"
                    stroke="#16a34a"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#16a34a" }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="支出"
                    stroke="#ea580c"
                    strokeWidth={2}
                    strokeDasharray="5 3"
                    dot={{ r: 3, fill: "#ea580c" }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="薪酬"
                    stroke="#2563eb"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    dot={{ r: 3, fill: "#2563eb" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Net cash flow bar chart */}
      <Card>
        <CardHeader>
          <CardTitle>淨現金流</CardTitle>
          <CardDescription>正數為盈餘，負數為虧損</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="w-full h-[240px]" />
          ) : (
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    dy={8}
                  />
                  <YAxis
                    tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    dx={-8}
                  />
                  <Tooltip
                    formatter={(v: number) => [formatHKD(v), "淨現金流"]}
                    labelStyle={{ fontWeight: "bold" }}
                  />
                  <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1.5} />
                  <Bar dataKey="淨現金流" radius={[3, 3, 0, 0]} maxBarSize={40}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.淨現金流 >= 0 ? "#16a34a" : "#dc2626"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly breakdown table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">月份明細</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">月份</th>
                  <th className="text-right px-4 py-2.5 font-medium text-green-700">實收</th>
                  <th className="text-right px-4 py-2.5 font-medium text-orange-600">支出</th>
                  <th className="text-right px-4 py-2.5 font-medium text-blue-600">薪酬</th>
                  <th className="text-right px-4 py-2.5 font-medium text-foreground">淨現金流</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[...chartData].reverse().map((row) => (
                  <tr key={row.ym} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-medium">{row.month}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-green-700">
                      {row.實收 > 0 ? formatHKD(row.實收) : <span className="text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-orange-600">
                      {row.支出 > 0 ? formatHKD(row.支出) : <span className="text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-blue-600">
                      {row.薪酬 > 0 ? formatHKD(row.薪酬) : <span className="text-muted-foreground/50">—</span>}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-mono font-semibold ${row.淨現金流 > 0 ? "text-green-600" : row.淨現金流 < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                      {row.淨現金流 === 0 ? <span className="text-muted-foreground/50">—</span> : formatHKD(row.淨現金流)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
