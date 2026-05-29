import { useState, useEffect } from "react";
import {
  useListPayslips,
  useListUsers,
  useCreatePayslip,
  useDeletePayslip,
  useListSchedules,
  getListPayslipsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { formatHKD, formatDate } from "@/lib/format";
import { CalendarDays, Download, Pencil, Trash2 } from "lucide-react";

const MONTHS = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];

const EMPTY_FORM = {
  employeeId: "",
  year: String(new Date().getFullYear()),
  month: String(new Date().getMonth() + 1),
  dailyRate: "",
  basicSalary: "",
  allowances: "0",
  overtime: "0",
  deductions: "0",
  notes: "",
};

export default function PayslipsAdmin() {
  const { canDelete, canWrite } = useAuth();
  const { data: users } = useListUsers();
  const { data: payslips, isLoading } = useListPayslips();
  const { toast } = useToast();
  const qc = useQueryClient();

  const createPayslip = useCreatePayslip();
  const deletePayslip = useDeletePayslip();

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; label: string } | null>(null);

  const scheduleMonth =
    form.employeeId && form.year && form.month
      ? `${form.year}-${String(form.month).padStart(2, "0")}`
      : undefined;

  const { data: rawScheduleData = [] } = useListSchedules(
    scheduleMonth ? { month: scheduleMonth } : undefined,
    { query: { enabled: !!form.employeeId && !!scheduleMonth } as any }
  );

  const scheduleData = (rawScheduleData as any[]).filter(
    (s) => !form.employeeId || s.employeeId === Number(form.employeeId)
  );
  const workDays = scheduleData.length;

  useEffect(() => {
    const rate = parseFloat(form.dailyRate || "0");
    if (rate > 0 && workDays > 0) {
      setForm(f => ({ ...f, basicSalary: String(Math.round(rate * workDays)) }));
    }
  }, [form.dailyRate, workDays, form.employeeId, form.year, form.month]);

  const calcNet = () => {
    const basic = parseFloat(form.basicSalary || "0");
    const allow = parseFloat(form.allowances || "0");
    const ot = parseFloat(form.overtime || "0");
    const ded = parseFloat(form.deductions || "0");
    return basic + allow + ot - ded;
  };

  const handleCreate = () => {
    if (!form.employeeId || !form.basicSalary) {
      toast({ variant: "destructive", title: "請填寫必填欄位（員工及基本薪金）" });
      return;
    }
    createPayslip.mutate(
      {
        data: {
          employeeId: Number(form.employeeId),
          year: Number(form.year),
          month: Number(form.month),
          basicSalary: parseFloat(form.basicSalary),
          allowances: parseFloat(form.allowances || "0"),
          overtime: parseFloat(form.overtime || "0"),
          deductions: parseFloat(form.deductions || "0"),
          netPay: calcNet(),
          notes: form.notes || null,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "糧單已建立" });
          setForm(f => ({ ...EMPTY_FORM, year: f.year, month: f.month }));
          qc.invalidateQueries({ queryKey: getListPayslipsQueryKey() });
        },
        onError: () => toast({ variant: "destructive", title: "建立失敗，該員工此月份可能已有糧單" }),
      }
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deletePayslip.mutate(
      { payslipId: deleteTarget.id },
      {
        onSuccess: () => {
          toast({ title: "糧單已刪除" });
          setDeleteTarget(null);
          qc.invalidateQueries({ queryKey: getListPayslipsQueryKey() });
        },
      }
    );
  };

  const getUserName = (id: number) =>
    (users ?? []).find(u => u.id === id)?.fullName ?? `員工 #${id}`;

  const handlePrint = (p: NonNullable<typeof payslips>[0]) => {
    const emp = (users ?? []).find(u => u.id === p.employeeId);
    const name = emp?.fullName ?? `員工 #${p.employeeId}`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>糧單 ${p.year}年${p.month}月 — ${name}</title>
      <style>
        body{font-family:"Microsoft JhengHei","PingFang TC",sans-serif;padding:48px;max-width:600px;margin:0 auto;color:#111;}
        .header{border-bottom:3px solid #1a2744;padding-bottom:14px;margin-bottom:24px;}
        .co{font-size:18px;font-weight:900;color:#1a2744;}
        .sub{font-size:12px;color:#666;margin-top:2px;}
        table{width:100%;border-collapse:collapse;margin-top:20px;}
        td{padding:10px 0;border-bottom:1px solid #eee;font-size:14px;}
        td:last-child{text-align:right;font-weight:600;}
        .total td{font-size:17px;font-weight:900;border-top:2px solid #1a2744;border-bottom:none;padding-top:14px;color:#1a2744;}
        .neg{color:#dc2626;}
        @media print{.no-print{display:none;}}
      </style></head><body>
      <div class="header">
        <div class="co">冠文鋼結構工程有限公司</div>
        <div class="sub">KWUNMAN STEEL STRUCTURE ENGINEERING CO. LTD</div>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <div>
          <div style="font-size:13px;color:#888;">員工姓名</div>
          <div style="font-size:17px;font-weight:700;">${name}</div>
          ${emp?.role ? `<div style="font-size:12px;color:#666;margin-top:2px;">${emp.role}</div>` : ""}
        </div>
        <div style="text-align:right;">
          <div style="font-size:13px;color:#888;">薪資期間</div>
          <div style="font-size:17px;font-weight:700;">${p.year}年${MONTHS[p.month - 1]}</div>
          <div style="font-size:12px;color:#666;">發出：${formatDate(p.issuedAt)}</div>
        </div>
      </div>
      <table>
        <tr><td>基本薪金</td><td>HK$ ${p.basicSalary.toLocaleString()}</td></tr>
        <tr><td>津貼</td><td>HK$ ${p.allowances.toLocaleString()}</td></tr>
        <tr><td>加班費</td><td>HK$ ${p.overtime.toLocaleString()}</td></tr>
        <tr><td class="neg">扣款</td><td class="neg">- HK$ ${p.deductions.toLocaleString()}</td></tr>
        <tr class="total"><td>實發薪金</td><td>HK$ ${p.netPay.toLocaleString()}</td></tr>
      </table>
      ${p.notes ? `<p style="margin-top:20px;color:#666;font-size:13px;background:#f8f9fb;padding:10px 14px;border-radius:4px;">備註：${p.notes}</p>` : ""}
      <div class="no-print" style="margin-top:32px;text-align:center;">
        <button onclick="window.print()" style="padding:10px 28px;background:#1a2744;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;">列印 / 儲存為 PDF</button>
      </div>
      </body></html>
    `);
    win.document.close();
  };

  // Filter payslips
  const [filterYear, setFilterYear] = useState(String(currentYear));
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterEmp, setFilterEmp] = useState("all");

  const filtered = (payslips ?? []).filter(p => {
    if (p.year !== Number(filterYear)) return false;
    if (filterMonth !== "all" && p.month !== Number(filterMonth)) return false;
    if (filterEmp !== "all" && p.employeeId !== Number(filterEmp)) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">糧單管理</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">建立及管理員工糧單</p>
      </div>

      {/* Issue payslip form */}
      {canWrite && (
        <Card>
          <CardContent className="pt-4 space-y-4">
            <p className="text-sm font-semibold text-foreground border-b pb-2">出糧</p>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>員工 *</Label>
                <Select value={form.employeeId} onValueChange={v => setForm(f => ({ ...f, employeeId: v, basicSalary: "", dailyRate: "" }))}>
                  <SelectTrigger><SelectValue placeholder="選擇員工..." /></SelectTrigger>
                  <SelectContent>
                    {(users ?? []).map(u => (
                      <SelectItem key={u.id} value={String(u.id)}>{u.fullName} ({u.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>年份</Label>
                <Select value={form.year} onValueChange={v => setForm(f => ({ ...f, year: v, basicSalary: "", dailyRate: "" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>月份</Label>
                <Select value={form.month} onValueChange={v => setForm(f => ({ ...f, month: v, basicSalary: "", dailyRate: "" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {form.employeeId && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-700">
                  <CalendarDays className="h-3.5 w-3.5" /> 從更表自動計算
                </div>
                <p className="text-xs text-blue-600">
                  {form.year}年{MONTHS[Number(form.month) - 1]} 更表：<span className="font-bold ml-1">{workDays} 日</span>
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">每日工資 (HK$)</Label>
                    <Input type="number" value={form.dailyRate}
                      onChange={e => setForm(f => ({ ...f, dailyRate: e.target.value }))}
                      placeholder="例：1500" className="h-7 text-xs" />
                  </div>
                  {form.dailyRate && workDays > 0 && (
                    <div className="text-right pt-4">
                      <p className="text-xs text-muted-foreground">預計基本薪金</p>
                      <p className="font-bold text-sm text-blue-700">
                        {formatHKD(Math.round(parseFloat(form.dailyRate) * workDays))}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="flex items-center gap-1">
                  基本薪金 *
                  {form.dailyRate && workDays > 0 && <span className="text-xs text-blue-600 font-normal">（已自動填入）</span>}
                </Label>
                <div className="relative">
                  <Input type="number" value={form.basicSalary}
                    onChange={e => setForm(f => ({ ...f, basicSalary: e.target.value }))} placeholder="0" />
                  {form.dailyRate && workDays > 0 && (
                    <Pencil className="h-3 w-3 absolute right-3 top-1/2 -translate-y-1/2 text-blue-400" />
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <Label>津貼</Label>
                <Input type="number" value={form.allowances}
                  onChange={e => setForm(f => ({ ...f, allowances: e.target.value }))} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>加班費</Label>
                <Input type="number" value={form.overtime}
                  onChange={e => setForm(f => ({ ...f, overtime: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label>扣款</Label>
                <Input type="number" value={form.deductions}
                  onChange={e => setForm(f => ({ ...f, deductions: e.target.value }))} placeholder="0" />
              </div>
            </div>
            <div className="bg-green-50 rounded-md px-3 py-2 flex justify-between items-center">
              <span className="text-sm font-medium">實發薪金</span>
              <span className="text-lg font-bold text-green-600">{formatHKD(calcNet())}</span>
            </div>
            <div className="space-y-1">
              <Label>備註</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="備註..." />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleCreate} disabled={createPayslip.isPending}>
                {createPayslip.isPending ? "建立中..." : "建立糧單"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payslip records */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex gap-3 flex-wrap items-center border-b pb-3">
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y} 年</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有月份</SelectItem>
                {MONTHS.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterEmp} onValueChange={setFilterEmp}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有員工</SelectItem>
                {(users ?? []).map(u => <SelectItem key={u.id} value={String(u.id)}>{u.fullName}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground ml-auto">共 {filtered.length} 張</span>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">載入中...</div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">未有符合的糧單記錄</div>
          ) : (
            <div className="divide-y">
              {filtered
                .slice().sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month || b.employeeId - a.employeeId)
                .map(p => (
                  <div key={p.id} className="flex items-center gap-3 py-3 hover:bg-muted/20 group">
                    <div className="w-20 flex-shrink-0">
                      <Badge variant="outline" className="font-mono text-xs">
                        {p.year}/{String(p.month).padStart(2, "0")}
                      </Badge>
                    </div>
                    <div className="w-24 flex-shrink-0">
                      <p className="text-sm font-medium">{getUserName(p.employeeId)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(p.issuedAt)}</p>
                    </div>
                    <div className="flex-1 grid grid-cols-4 gap-2 text-xs text-right">
                      <div><span className="text-muted-foreground">基本</span><br /><span className="font-mono">{p.basicSalary.toLocaleString()}</span></div>
                      <div><span className="text-muted-foreground">津貼+OT</span><br /><span className="font-mono">{(p.allowances + p.overtime).toLocaleString()}</span></div>
                      <div><span className="text-muted-foreground text-red-500">扣款</span><br /><span className="font-mono text-red-600">-{p.deductions.toLocaleString()}</span></div>
                      <div><span className="text-muted-foreground">實發</span><br /><span className="font-mono font-bold text-green-700">{formatHKD(p.netPay)}</span></div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="下載糧單"
                        onClick={() => handlePrint(p)}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      {canDelete && (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                          onClick={() => setDeleteTarget({ id: p.id, label: `${getUserName(p.employeeId)} ${p.year}/${p.month}` })}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>確認刪除糧單</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">確定刪除 <strong>{deleteTarget?.label}</strong> 的糧單？</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deletePayslip.isPending}>刪除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
