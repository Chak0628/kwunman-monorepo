import { useState } from "react";
import {
  useListPayslips,
  useListUsers,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { formatHKD } from "@/lib/format";
import { DollarSign, TrendingUp, Users } from "lucide-react";

const MONTHS = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"];

export default function Payroll() {
  const { canWrite } = useAuth();
  const { data: users } = useListUsers();
  const { data: payslips, isLoading } = useListPayslips();

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));
  const [viewYear, setViewYear] = useState(String(currentYear));

  const employees = (users ?? []);

  const yearPayslips = (payslips ?? []).filter(p => p.year === Number(viewYear));

  const getPayslip = (empId: number, month: number) =>
    yearPayslips.find(p => p.employeeId === empId && p.month === month);

  const yearlyTotal = yearPayslips.reduce((s, p) => s + p.netPay, 0);

  const employeeTotals = employees.map(emp => ({
    emp,
    total: yearPayslips.filter(p => p.employeeId === emp.id).reduce((s, p) => s + p.netPay, 0),
    count: yearPayslips.filter(p => p.employeeId === emp.id).length,
  }));

  const monthlyTotals = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    total: yearPayslips.filter(p => p.month === i + 1).reduce((s, p) => s + p.netPay, 0),
  }));

  const getRoleBadge = (role: string) => {
    const m: Record<string, string> = {
      管理者: "bg-purple-100 text-purple-800",
      參與者: "bg-blue-100 text-blue-800",
      員工: "bg-gray-100 text-gray-700",
    };
    return <Badge className={`text-xs ${m[role] ?? "bg-gray-100"}`}>{role}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">薪資總覽</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">查看全年薪資分佈，管理糧單請前往「糧單管理」</p>
        </div>
        <Select value={viewYear} onValueChange={setViewYear}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y} 年</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-green-600" />
              <p className="text-xs text-muted-foreground">{viewYear} 年實發薪金總計</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{formatHKD(yearlyTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-blue-600" />
              <p className="text-xs text-muted-foreground">員工人數</p>
            </div>
            <p className="text-2xl font-bold">{employees.length} <span className="text-base font-normal text-muted-foreground">人</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-amber-600" />
              <p className="text-xs text-muted-foreground">糧單記錄數</p>
            </div>
            <p className="text-2xl font-bold">{yearPayslips.length} <span className="text-base font-normal text-muted-foreground">張</span></p>
          </CardContent>
        </Card>
      </div>

      {/* Full-year grid — employees as rows, months as columns */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{viewYear} 年 — 全年薪資矩陣（實發薪金）</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-36 sticky left-0 bg-background z-20">員工</TableHead>
                  {MONTHS.map((m, i) => (
                    <TableHead key={i} className="text-center text-xs w-20">{m}月</TableHead>
                  ))}
                  <TableHead className="text-right w-28">全年合計</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-8 text-muted-foreground">載入中...</TableCell>
                  </TableRow>
                ) : employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-8 text-muted-foreground">未有員工帳戶</TableCell>
                  </TableRow>
                ) : (
                  <>
                    {employees.map(emp => {
                      const empTotal = employeeTotals.find(e => e.emp.id === emp.id);
                      return (
                        <TableRow key={emp.id} className="hover:bg-muted/30">
                          <TableCell className="sticky left-0 bg-background z-10 py-2">
                            <div className="font-medium text-sm">{emp.fullName}</div>
                            <div className="mt-0.5">{getRoleBadge(emp.role)}</div>
                          </TableCell>
                          {Array.from({ length: 12 }, (_, i) => {
                            const ps = getPayslip(emp.id, i + 1);
                            return (
                              <TableCell key={i} className="text-center py-2">
                                {ps ? (
                                  <span className="text-xs font-mono text-green-700 font-semibold">
                                    {ps.netPay.toLocaleString()}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground/40">—</span>
                                )}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-right font-mono font-bold text-sm text-green-700 py-2">
                            {empTotal?.total ? formatHKD(empTotal.total) : <span className="text-muted-foreground font-normal">—</span>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {/* Monthly totals row */}
                    <TableRow className="bg-muted/40 font-semibold border-t-2">
                      <TableCell className="sticky left-0 bg-muted/40 z-10 text-sm">月合計</TableCell>
                      {monthlyTotals.map(({ total }, i) => (
                        <TableCell key={i} className="text-center py-2">
                          {total > 0 ? (
                            <span className="text-xs font-mono font-bold">{total.toLocaleString()}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground/40">—</span>
                          )}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-mono font-bold text-green-700">
                        {formatHKD(yearlyTotal)}
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
