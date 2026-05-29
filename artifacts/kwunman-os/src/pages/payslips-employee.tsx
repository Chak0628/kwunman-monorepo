import { useListPayslips } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { formatHKD, formatDate } from "@/lib/format";
import { Download, FileText, Wallet } from "lucide-react";

const MONTHS_ZH = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];

export default function EmployeePayslips() {
  const { user } = useAuth();
  const { data: payslips, isLoading } = useListPayslips();

  const totalReceived = (payslips ?? []).reduce((s, p) => s + p.netPay, 0);
  const latestPayslip = payslips && payslips.length > 0 ? payslips[payslips.length - 1] : null;

  const handleDownload = (p: NonNullable<typeof payslips>[0]) => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>糧單 ${p.year}年${p.month}月</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: "Helvetica Neue", sans-serif; padding: 50px; color: #1a1a1a; }
        .header { border-bottom: 3px solid #1e293b; padding-bottom: 16px; margin-bottom: 24px; }
        .company { font-size: 20px; font-weight: 800; color: #1e293b; }
        .subtitle { color: #64748b; font-size: 13px; margin-top: 4px; }
        .title-row { display: flex; justify-content: space-between; align-items: flex-start; }
        .payslip-label { background: #1e293b; color: white; padding: 6px 16px; border-radius: 4px; font-size: 14px; font-weight: 600; }
        .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
        .meta-item label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
        .meta-item p { font-size: 15px; font-weight: 600; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th { background: #f1f5f9; text-align: left; padding: 10px 12px; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; }
        td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
        td:last-child { text-align: right; font-weight: 500; }
        .total-row td { background: #f0fdf4; font-weight: 700; font-size: 16px; color: #16a34a; border-bottom: none; border-top: 2px solid #16a34a; }
        .footer { margin-top: 32px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
        .print-btn { margin-top: 20px; padding: 10px 24px; background: #1e293b; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; }
        @media print { .print-btn { display: none; } }
      </style></head>
      <body>
        <div class="header">
          <div class="title-row">
            <div>
              <div class="company">冠文鋼結構工程有限公司</div>
              <div class="subtitle">KWUNMAN STEEL STRUCTURE ENGINEERING CO., LTD.</div>
            </div>
            <div class="payslip-label">薪資明細</div>
          </div>
        </div>
        <div class="meta">
          <div class="meta-item"><label>員工姓名</label><p>${user?.fullName ?? "-"}</p></div>
          <div class="meta-item"><label>薪資月份</label><p>${p.year}年${MONTHS_ZH[p.month - 1]}</p></div>
          <div class="meta-item"><label>用戶帳號</label><p>${user?.username ?? "-"}</p></div>
          <div class="meta-item"><label>發出日期</label><p>${formatDate(p.issuedAt)}</p></div>
        </div>
        <table>
          <thead><tr><th>項目</th><th style="text-align:right">金額 (HKD)</th></tr></thead>
          <tbody>
            <tr><td>基本薪金</td><td>HK$ ${p.basicSalary.toLocaleString()}</td></tr>
            <tr><td>津貼</td><td>HK$ ${p.allowances.toLocaleString()}</td></tr>
            <tr><td>加班費</td><td>HK$ ${p.overtime.toLocaleString()}</td></tr>
            <tr><td>扣款</td><td style="color:#dc2626">- HK$ ${p.deductions.toLocaleString()}</td></tr>
            <tr class="total-row"><td>實發薪金</td><td>HK$ ${p.netPay.toLocaleString()}</td></tr>
          </tbody>
        </table>
        ${p.notes ? `<p style="font-size:13px;color:#64748b">備註：${p.notes}</p>` : ""}
        <div class="footer">此糧單由冠文鋼結構管理系統 (KwunMan OS) 自動生成</div>
        <button class="print-btn" onclick="window.print()">列印 / 儲存為 PDF</button>
      </body></html>
    `);
    win.document.close();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">糧單數量</p>
            <p className="text-2xl font-bold">{payslips?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">累計已收薪金</p>
            <p className="text-xl font-bold text-green-600">{formatHKD(totalReceived)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">最近薪金</p>
            <p className="text-xl font-bold text-green-600">
              {latestPayslip ? formatHKD(latestPayslip.netPay) : "-"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4" /> 糧單記錄
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">載入中...</div>
          ) : !payslips?.length ? (
            <div className="px-6 py-10 text-center">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">暫無糧單記錄</p>
              <p className="text-xs text-muted-foreground mt-1">如有疑問請聯絡管理員</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_100px_110px_110px_110px_90px] gap-2 px-6 py-2 border-b bg-muted/40 text-xs font-medium text-muted-foreground">
                <span>月份</span>
                <span>發出日期</span>
                <span className="text-right">基本薪金</span>
                <span className="text-right">加/扣項</span>
                <span className="text-right text-green-600">實發薪金</span>
                <span className="text-center">下載</span>
              </div>
              <div className="divide-y">
                {[...payslips].reverse().map((p) => {
                  const adjustments = p.allowances + p.overtime - p.deductions;
                  return (
                    <div key={p.id} className="grid grid-cols-[1fr_100px_110px_110px_110px_90px] gap-2 px-6 py-3 items-center hover:bg-muted/30">
                      <div>
                        <p className="font-medium text-sm">{p.year}年 {MONTHS_ZH[p.month - 1]}</p>
                        {p.notes && <p className="text-xs text-muted-foreground">{p.notes}</p>}
                      </div>
                      <span className="text-xs text-muted-foreground">{p.issuedAt.slice(0, 10)}</span>
                      <span className="text-sm text-right">{formatHKD(p.basicSalary)}</span>
                      <span className={`text-sm text-right ${adjustments >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {adjustments >= 0 ? "+" : ""}{formatHKD(adjustments)}
                      </span>
                      <span className="text-sm text-right font-bold text-green-600">{formatHKD(p.netPay)}</span>
                      <div className="flex justify-center">
                        <Button
                          size="sm"
                          className="h-7 px-3 gap-1 text-xs bg-slate-700 hover:bg-slate-800 text-white"
                          onClick={() => handleDownload(p)}
                        >
                          <Download className="h-3 w-3" /> 下載
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
