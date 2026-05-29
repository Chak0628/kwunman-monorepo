import { useState, useRef } from "react";
import {
  useListInvoices,
  useCreateInvoice,
  useUpdateInvoice,
  useDeleteInvoice,
  useGetNextInvoiceNo,
  useListProjects,
  useListClients,
  useListUsers,
  getListInvoicesQueryKey,
} from "@workspace/api-client-react";
import type { Invoice } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatHKD, formatDate } from "@/lib/format";
import {
  FileText, Plus, Printer, CheckCheck, Trash2, Search,
  Receipt, Truck, ClipboardCheck, CreditCard, ScrollText,
  FileSignature, DollarSign, Users,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";

const STATUS_COLORS: Record<string, string> = {
  未收: "bg-amber-100 text-amber-700 border-amber-300",
  已收: "bg-green-100 text-green-700 border-green-300",
  部分收款: "bg-blue-100 text-blue-700 border-blue-300",
  取消: "bg-gray-100 text-gray-500 border-gray-300",
};

const DOC_TYPES = [
  { key: "invoice", label: "Invoice / 發票", icon: FileSignature, desc: "向客戶發出付款通知書" },
  { key: "payment-advice", label: "付款通知", icon: CreditCard, desc: "確認付款安排的通知" },
  { key: "deposit-receipt", label: "訂金收據", icon: Receipt, desc: "訂金繳付確認收據" },
  { key: "delivery-note", label: "送貨單", icon: Truck, desc: "材料或物資送貨確認" },
  { key: "acceptance", label: "工程驗收單", icon: ClipboardCheck, desc: "工程完工驗收確認書" },
  { key: "expense-claim", label: "報銷單", icon: ScrollText, desc: "員工支出報銷申請" },
  { key: "salary-notice", label: "薪資通知單", icon: DollarSign, desc: "員工薪資發出通知" },
  { key: "quote", label: "報價單", icon: FileText, desc: "向客戶發出正式工程報價" },
] as const;

type DocKey = typeof DOC_TYPES[number]["key"];

// ─── PRINT TEMPLATES ──────────────────────────────────────────────────────────

function CO_HEADER() {
  return `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:12px;border-bottom:2px solid #1a2744;margin-bottom:20px;">
      <div>
        <div style="font-size:20px;font-weight:900;color:#1a2744;">冠文鋼結構工程有限公司</div>
        <div style="font-size:11px;color:#666;margin-top:3px;">KWUN MAN STEEL STRUCTURE ENGINEERING CO. LTD</div>
        <div style="font-size:10px;color:#888;margin-top:4px;">
          RM A 19/F MAX SHARE CTR 367-373 KING'S RD NORTH POINT HK<br/>
          Tel: (852) 6992 4722 / 6770 6146 / 5498 0312 | Email: KwunManSS@outlook.com
        </div>
      </div>
      <div style="text-align:right;">
        <img src="/favicon.ico" style="width:52px;height:52px;object-fit:contain;" onerror="this.style.display='none'" />
      </div>
    </div>
  `;
}

function openPrintWindow(title: string, body: string) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`
    <html><head><title>${title}</title>
    <style>
      *{box-sizing:border-box;}
      body{font-family:"Microsoft JhengHei","PingFang TC",sans-serif;padding:40px;max-width:720px;margin:0 auto;color:#111;font-size:13px;}
      table{width:100%;border-collapse:collapse;}
      th,td{padding:8px 10px;border:1px solid #ddd;font-size:12px;}
      th{background:#1a2744;color:white;font-weight:600;}
      .field-row{display:flex;gap:40px;margin-bottom:10px;}
      .field{flex:1;}
      .field-label{font-size:10px;color:#888;margin-bottom:3px;}
      .field-value{font-size:13px;font-weight:600;}
      .no-print{margin-top:24px;text-align:center;}
      .total-row td{font-weight:900;font-size:14px;background:#f0f4f8;}
      @media print{.no-print{display:none;}}
    </style></head><body>
    ${body}
    <div class="no-print">
      <button onclick="window.print()" style="padding:10px 28px;background:#1a2744;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;">
        列印 / 儲存為 PDF
      </button>
    </div>
    </body></html>
  `);
  win.document.close();
}

// Invoice print template (hidden DOM for react-to-print)
function InvoicePrintTemplate({
  invoice,
  project,
  printRef,
}: {
  invoice: Invoice;
  project?: { projectItem: string; location: string; client: string };
  printRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={printRef}
      className="hidden print:block p-10 font-sans text-gray-900"
      style={{ width: "210mm", minHeight: "297mm", fontFamily: "sans-serif" }}
    >
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-wide">冠文鋼結構工程有限公司</h1>
          <p className="text-sm text-gray-500 mt-1">KWUN MAN STEEL STRUCTURE ENGINEERING LTD</p>
          <p className="text-xs text-gray-400 mt-1">RM A 19/F MAX SHARE CTR 367-373 KING'S RD NORTH POINT HK</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black text-gray-800">INVOICE</p>
          <p className="text-lg font-bold text-gray-700 mt-1">{invoice.invoiceNo}</p>
        </div>
      </div>
      <hr className="border-gray-900 border-2 mb-6" />
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">致</p>
          <p className="font-bold text-base">{project?.client ?? "-"}</p>
          <p className="text-sm text-gray-600 mt-1">{project?.location ?? ""}</p>
        </div>
        <div className="text-right">
          <div className="space-y-1 text-sm">
            <div className="flex justify-end gap-4">
              <span className="text-gray-500">出單日期：</span>
              <span className="font-medium">{formatDate(invoice.issueDate)}</span>
            </div>
            {invoice.dueDate && (
              <div className="flex justify-end gap-4">
                <span className="text-gray-500">到期日期：</span>
                <span className="font-medium">{formatDate(invoice.dueDate)}</span>
              </div>
            )}
            <div className="flex justify-end gap-4">
              <span className="text-gray-500">工程編號：</span>
              <span className="font-medium">{invoice.quoteId}</span>
            </div>
          </div>
        </div>
      </div>
      <table className="w-full mb-8 text-sm">
        <thead>
          <tr className="bg-gray-900 text-white">
            <th className="text-left px-4 py-2 font-medium">工程描述</th>
            <th className="text-right px-4 py-2 font-medium w-32">金額 (HKD)</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b">
            <td className="px-4 py-4 align-top">
              <p className="font-medium">{invoice.description}</p>
              {project?.projectItem && project.projectItem !== invoice.description && (
                <p className="text-gray-500 text-xs mt-1">{project.projectItem}</p>
              )}
            </td>
            <td className="px-4 py-4 text-right font-semibold">{formatHKD(invoice.amount)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr className="bg-gray-100">
            <td className="px-4 py-3 text-right font-bold text-base">應付總額：</td>
            <td className="px-4 py-3 text-right font-black text-base">{formatHKD(invoice.amount)}</td>
          </tr>
        </tfoot>
      </table>
      {invoice.notes && (
        <div className="mb-8 p-4 border border-gray-200 rounded">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">備註</p>
          <p className="text-sm text-gray-700">{invoice.notes}</p>
        </div>
      )}
      <div className="mt-16 grid grid-cols-2 gap-8 text-sm">
        <div>
          <p className="text-xs text-gray-500 mb-8">請按以下方式付款：</p>
          <div className="border-t border-gray-400 pt-2">
            <p className="text-xs text-gray-500">授權簽署</p>
          </div>
        </div>
        <div className="text-right text-xs text-gray-400 mt-auto">
          <p>冠文鋼結構工程有限公司</p>
          <p>此 Invoice 由系統自動生成</p>
        </div>
      </div>
    </div>
  );
}

// ─── DOC GENERATE PANEL ───────────────────────────────────────────────────────

function DocGeneratePanel({
  docKey,
  projects,
  clients,
  users,
}: {
  docKey: DocKey;
  projects: any[];
  clients: any[];
  users: any[];
}) {
  const today = new Date().toISOString().split("T")[0];

  // Common state
  const [quoteId, setQuoteId] = useState("");
  const [clientId, setClientId] = useState("");
  const [date, setDate] = useState(today!);
  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState("");
  const [depositPct, setDepositPct] = useState("30");
  const [refNo, setRefNo] = useState("");
  const [empId, setEmpId] = useState("");
  const [items, setItems] = useState([{ desc: "", qty: "1", unit: "" }]);

  const selectedProject = projects.find(p => p.quoteId === quoteId);
  const selectedClient = clients.find(c => c.clientId === clientId) ||
    (selectedProject ? clients.find(c => c.company === selectedProject.client) : null);
  const selectedEmployee = users.find(u => u.id === Number(empId));

  const handleAutoFill = () => {
    if (selectedProject) {
      setClientId(selectedClient?.clientId ?? clientId);
      if (selectedProject.quoteAmount) setAmount(String(selectedProject.quoteAmount));
    }
  };

  const addItem = () => setItems(i => [...i, { desc: "", qty: "1", unit: "" }]);
  const updateItem = (idx: number, k: keyof typeof items[0], v: string) =>
    setItems(i => i.map((it, j) => j === idx ? { ...it, [k]: v } : it));

  const generate = () => {
    const proj = selectedProject;
    const client = selectedClient;
    const emp = selectedEmployee;

    if (docKey === "payment-advice") {
      const body = `
        ${CO_HEADER()}
        <div style="display:flex;justify-content:space-between;margin-bottom:16px;">
          <div style="font-size:18px;font-weight:900;">Payment Advice　付款通知</div>
          <div style="text-align:right;font-size:12px;color:#666;">發出日期：${date}</div>
        </div>
        <div class="field-row">
          <div class="field"><div class="field-label">Project No.</div><div class="field-value">${quoteId || "—"}</div></div>
          <div class="field"><div class="field-label">客戶名稱</div><div class="field-value">${client?.company || proj?.client || "—"}</div></div>
        </div>
        <div class="field-row">
          <div class="field"><div class="field-label">施工地點</div><div class="field-value">${proj?.location || "—"}</div></div>
          <div class="field"><div class="field-label">參考編號</div><div class="field-value">${refNo || "—"}</div></div>
        </div>
        <table style="margin-top:16px;"><thead><tr>
          <th>Invoice No.</th><th>付款貨幣</th><th>付款日期</th><th>付款金額</th>
        </tr></thead><tbody>
          <tr><td>${refNo || "—"}</td><td>HKD</td><td>${date}</td><td>${amount ? `HK$ ${parseFloat(amount).toLocaleString()}` : "—"}</td></tr>
        </tbody></table>
        ${notes ? `<p style="margin-top:14px;color:#555;font-size:12px;background:#f8f9fb;padding:8px 12px;border-radius:4px;">備註：${notes}</p>` : ""}
      `;
      openPrintWindow(`付款通知 ${quoteId}`, body);
    }

    else if (docKey === "deposit-receipt") {
      const depositAmt = amount ? Math.round(parseFloat(amount) * parseFloat(depositPct) / 100) : 0;
      const body = `
        ${CO_HEADER()}
        <div style="display:flex;justify-content:space-between;margin-bottom:16px;">
          <div style="font-size:18px;font-weight:900;">Deposit Receipt　訂金收據</div>
          <div style="text-align:right;font-size:12px;color:#666;">發出日期：${date}</div>
        </div>
        <div class="field-row">
          <div class="field"><div class="field-label">ORD NO.</div><div class="field-value">ORD-000-${quoteId || "QXXX"}</div></div>
          <div class="field"><div class="field-label">客戶編號</div><div class="field-value">${client?.clientId || "—"}</div></div>
        </div>
        <div class="field-row">
          <div class="field"><div class="field-label">客戶名稱</div><div class="field-value">${client?.company || proj?.client || "—"}</div></div>
          <div class="field"><div class="field-label">工作地點</div><div class="field-value">${proj?.location || "—"}</div></div>
        </div>
        <table style="margin-top:16px;"><thead><tr>
          <th>描述</th><th>合約金額</th><th>訂金比例</th><th>應付訂金</th>
        </tr></thead><tbody>
          <tr>
            <td>${proj?.projectItem || "工程費用"}</td>
            <td>${amount ? `HK$ ${parseFloat(amount).toLocaleString()}` : "—"}</td>
            <td>${depositPct}%</td>
            <td style="font-weight:900;color:#1a2744;">${depositAmt ? `HK$ ${depositAmt.toLocaleString()}` : "—"}</td>
          </tr>
        </tbody></table>
        ${notes ? `<p style="margin-top:14px;color:#555;font-size:12px;background:#f8f9fb;padding:8px 12px;border-radius:4px;">備註：${notes}</p>` : ""}
        <div style="margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:24px;">
          <div><div style="border-top:1px solid #999;padding-top:6px;font-size:11px;color:#888;">客戶簽署</div></div>
          <div><div style="border-top:1px solid #999;padding-top:6px;font-size:11px;color:#888;">授權簽署</div></div>
        </div>
      `;
      openPrintWindow(`訂金收據 ${quoteId}`, body);
    }

    else if (docKey === "delivery-note") {
      const itemRows = items.map((it, i) => `
        <tr><td>${i + 1}</td><td>${it.desc || "—"}</td><td style="text-align:center;">${it.qty}</td><td style="text-align:center;">${it.qty}</td><td style="text-align:center;">—</td></tr>
      `).join("");
      const body = `
        ${CO_HEADER()}
        <div style="display:flex;justify-content:space-between;margin-bottom:16px;">
          <div style="font-size:18px;font-weight:900;">Delivery Note　送貨單</div>
          <div style="text-align:right;font-size:12px;color:#666;">日期：${date}</div>
        </div>
        <div class="field-row">
          <div class="field"><div class="field-label">客戶</div><div class="field-value">${client?.company || proj?.client || "—"}</div></div>
          <div class="field"><div class="field-label">報價單編號</div><div class="field-value">${quoteId || "—"}</div></div>
        </div>
        <div class="field-row">
          <div class="field"><div class="field-label">收貨地址</div><div class="field-value">${proj?.location || "—"}</div></div>
          <div class="field"><div class="field-label">送貨單編號</div><div class="field-value">DN-${quoteId || "XXX"}</div></div>
        </div>
        <table style="margin-top:14px;">
          <thead><tr><th>Item</th><th>Description 描述</th><th>Ordered 已訂購</th><th>Delivered 發貨</th><th>Outstanding 餘額</th></tr></thead>
          <tbody>${itemRows}</tbody>
        </table>
        ${notes ? `<p style="margin-top:14px;color:#555;font-size:12px;background:#f8f9fb;padding:8px 12px;border-radius:4px;">備註：${notes}</p>` : ""}
        <div style="margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:24px;">
          <div><div style="border-top:1px solid #999;padding-top:6px;font-size:11px;color:#888;">收貨簽署</div></div>
          <div><div style="border-top:1px solid #999;padding-top:6px;font-size:11px;color:#888;">送貨員簽署</div></div>
        </div>
      `;
      openPrintWindow(`送貨單 ${quoteId}`, body);
    }

    else if (docKey === "acceptance") {
      const itemRows = items.map((it, i) => `
        <tr><td>${i + 1}</td><td>${it.desc || "—"}</td><td style="text-align:center;">&#x25A1; 合格 &#x25A1; 不合格</td><td>${notes || ""}</td></tr>
      `).join("");
      const body = `
        ${CO_HEADER()}
        <div style="display:flex;justify-content:space-between;margin-bottom:16px;">
          <div style="font-size:18px;font-weight:900;">工程驗收單<br/><span style="font-size:13px;font-weight:400;">Engineering Acceptance Form</span></div>
          <div style="text-align:right;font-size:12px;color:#666;">日期：${date}</div>
        </div>
        <div class="field-row">
          <div class="field"><div class="field-label">客戶識別碼</div><div class="field-value">${client?.clientId || "—"}</div></div>
          <div class="field"><div class="field-label">報價單號</div><div class="field-value">${quoteId || "—"}</div></div>
        </div>
        <div class="field-row">
          <div class="field"><div class="field-label">工程項目</div><div class="field-value">${proj?.projectItem || "—"}</div></div>
          <div class="field"><div class="field-label">施工地點</div><div class="field-value">${proj?.location || "—"}</div></div>
        </div>
        <table style="margin-top:14px;">
          <thead><tr><th>編號</th><th>施工項目</th><th>驗收結果</th><th>備註</th></tr></thead>
          <tbody>${itemRows || `<tr><td>1</td><td>${proj?.projectItem || "—"}</td><td style="text-align:center;">&#x25A1; 合格 &#x25A1; 不合格</td><td></td></tr>`}</tbody>
        </table>
        <div style="margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:24px;">
          <div><div style="border-top:1px solid #999;padding-top:6px;font-size:11px;color:#888;">客戶簽署 / 日期</div></div>
          <div><div style="border-top:1px solid #999;padding-top:6px;font-size:11px;color:#888;">承建商簽署 / 日期</div></div>
        </div>
      `;
      openPrintWindow(`工程驗收單 ${quoteId}`, body);
    }

    else if (docKey === "expense-claim") {
      const itemRows = items.map((it, i) => `
        <tr><td>${i + 1}</td><td>${it.desc || "—"}</td><td style="text-align:right;">${it.unit ? `HK$ ${parseFloat(it.unit).toLocaleString()}` : "—"}</td><td>${it.qty || ""}</td><td>${quoteId || ""}</td><td>${date}</td></tr>
      `).join("");
      const total = items.reduce((s, it) => s + (parseFloat(it.unit || "0") || 0), 0);
      const body = `
        ${CO_HEADER()}
        <div style="display:flex;justify-content:space-between;margin-bottom:16px;">
          <div style="font-size:18px;font-weight:900;">報銷單 Expense Claim Form</div>
          <div style="text-align:right;font-size:12px;color:#666;">日期：${date}</div>
        </div>
        <div class="field-row">
          <div class="field"><div class="field-label">申請人</div><div class="field-value">${emp?.fullName || "—"}</div></div>
          <div class="field"><div class="field-label">部門</div><div class="field-value">${emp?.role || "—"}</div></div>
        </div>
        <table style="margin-top:14px;">
          <thead><tr><th>NO.</th><th>項目</th><th style="text-align:right;">金額(HKD)</th><th>詳情</th><th>工程No.</th><th>日期</th></tr></thead>
          <tbody>${itemRows}</tbody>
          <tfoot>
            <tr class="total-row"><td colspan="2" style="text-align:right;">合計</td><td style="text-align:right;">HK$ ${total.toLocaleString()}</td><td colspan="3"></td></tr>
          </tfoot>
        </table>
        ${notes ? `<p style="margin-top:14px;color:#555;font-size:12px;background:#f8f9fb;padding:8px 12px;border-radius:4px;">備註：${notes}</p>` : ""}
        <div style="margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:24px;">
          <div><div style="border-top:1px solid #999;padding-top:6px;font-size:11px;color:#888;">申請人簽署</div></div>
          <div><div style="border-top:1px solid #999;padding-top:6px;font-size:11px;color:#888;">批准人簽署</div></div>
        </div>
      `;
      openPrintWindow(`報銷單 ${emp?.fullName || ""}`, body);
    }

    else if (docKey === "salary-notice") {
      const userRows = (empId ? [emp].filter(Boolean) : users).map((u: any) => `
        <tr>
          <td>${u.fullName}</td><td>${u.role}</td>
          <td style="text-align:right;">${u.basicSalary ? `HK$ ${u.basicSalary.toLocaleString()}` : "—"}</td>
          <td style="text-align:right;">—</td>
          <td style="text-align:right;font-weight:700;">—</td>
        </tr>
      `).join("");
      const body = `
        ${CO_HEADER()}
        <div style="font-size:18px;font-weight:900;margin-bottom:14px;">薪資通知單 Salary Notice</div>
        <div class="field-row">
          <div class="field"><div class="field-label">薪資期間</div><div class="field-value">${date.slice(0,7)}</div></div>
          <div class="field"><div class="field-label">發出日期</div><div class="field-value">${date}</div></div>
        </div>
        <table style="margin-top:14px;">
          <thead><tr><th>姓名</th><th>工種</th><th style="text-align:right;">基本薪金</th><th style="text-align:right;">MPF</th><th style="text-align:right;">實發薪金</th></tr></thead>
          <tbody>${userRows || `<tr><td colspan="5" style="text-align:center;color:#999;">— 請選擇員工 —</td></tr>`}</tbody>
        </table>
        ${notes ? `<p style="margin-top:14px;color:#555;font-size:12px;background:#f8f9fb;padding:8px 12px;border-radius:4px;">備註：${notes}</p>` : ""}
      `;
      openPrintWindow("薪資通知單", body);
    }

    else if (docKey === "quote") {
      const itemRows = items.map((it, i) => `
        <tr><td>${i + 1}</td><td>${it.desc || "—"}</td><td style="text-align:right;">${it.unit ? `HK$ ${parseFloat(it.unit).toLocaleString()}` : "—"}</td></tr>
      `).join("");
      const total = amount ? parseFloat(amount) : items.reduce((s, it) => s + (parseFloat(it.unit || "0") || 0), 0);
      const body = `
        ${CO_HEADER()}
        <div style="display:flex;justify-content:space-between;margin-bottom:16px;">
          <div style="font-size:18px;font-weight:900;">Quotation　報價單</div>
          <div style="text-align:right;font-size:12px;color:#666;">
            <div>報價單號：<strong>${quoteId || "—"}</strong></div>
            <div>日期：${date}</div>
          </div>
        </div>
        <div class="field-row">
          <div class="field"><div class="field-label">致</div><div class="field-value">${client?.company || proj?.client || "—"}</div></div>
          <div class="field"><div class="field-label">施工地點</div><div class="field-value">${proj?.location || "—"}</div></div>
        </div>
        <table style="margin-top:14px;">
          <thead><tr><th>No.</th><th>工程項目說明</th><th style="text-align:right;">報價金額 (HKD)</th></tr></thead>
          <tbody>${itemRows}</tbody>
          <tfoot>
            <tr class="total-row"><td colspan="2" style="text-align:right;">總報價金額</td><td style="text-align:right;">HK$ ${total.toLocaleString()}</td></tr>
          </tfoot>
        </table>
        ${notes ? `<p style="margin-top:14px;color:#555;font-size:12px;background:#f8f9fb;padding:8px 12px;border-radius:4px;">備註：${notes}</p>` : ""}
        <div style="margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:24px;">
          <div><div style="border-top:1px solid #999;padding-top:6px;font-size:11px;color:#888;">客戶確認</div></div>
          <div><div style="border-top:1px solid #999;padding-top:6px;font-size:11px;color:#888;">授權簽署</div></div>
        </div>
      `;
      openPrintWindow(`報價單 ${quoteId}`, body);
    }
  };

  const needsItems = ["delivery-note", "acceptance", "expense-claim", "quote"].includes(docKey);
  const needsEmployee = ["expense-claim", "salary-notice"].includes(docKey);
  const needsDepositPct = docKey === "deposit-receipt";
  const needsProject = !["expense-claim", "salary-notice"].includes(docKey);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {needsProject && (
          <div className="space-y-1.5">
            <Label>關聯工程（選填）</Label>
            <Select value={quoteId || "none"} onValueChange={v => {
              const val = v === "none" ? "" : v;
              setQuoteId(val);
              if (val) {
                const p = projects.find(x => x.quoteId === val);
                if (p?.quoteAmount) setAmount(String(p.quoteAmount));
                const c = clients.find(x => x.company === p?.client);
                if (c) setClientId(c.clientId);
              }
            }}>
              <SelectTrigger><SelectValue placeholder="選擇工程..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">不關聯工程</SelectItem>
                {projects.filter(p => p.status !== "不成功").map((p: any) => (
                  <SelectItem key={p.quoteId} value={p.quoteId}>
                    {p.quoteId} — {p.client}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {needsProject && (
          <div className="space-y-1.5">
            <Label>客戶</Label>
            <Select value={clientId || "none"} onValueChange={v => setClientId(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="選擇客戶..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">選填</SelectItem>
                {clients.map((c: any) => (
                  <SelectItem key={c.clientId} value={c.clientId}>{c.company}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {needsEmployee && (
          <div className="space-y-1.5">
            <Label>員工</Label>
            <Select value={empId || "all"} onValueChange={v => setEmpId(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="選擇員工..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部員工</SelectItem>
                {users.map((u: any) => (
                  <SelectItem key={u.id} value={String(u.id)}>{u.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>日期</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>

        {!["salary-notice"].includes(docKey) && (
          <div className="space-y-1.5">
            <Label>
              {docKey === "deposit-receipt" ? "合約金額 (HK$)" :
               docKey === "delivery-note" ? "參考金額 (HK$)" :
               docKey === "quote" ? "總報價金額 (HK$)" : "金額 (HK$)"}
            </Label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
          </div>
        )}

        {docKey === "payment-advice" && (
          <div className="space-y-1.5">
            <Label>Invoice 參考編號</Label>
            <Input value={refNo} onChange={e => setRefNo(e.target.value)} placeholder="INV-XXXX" />
          </div>
        )}

        {needsDepositPct && (
          <div className="space-y-1.5">
            <Label>訂金比例 (%)</Label>
            <Input type="number" value={depositPct} onChange={e => setDepositPct(e.target.value)} placeholder="30" min="1" max="100" />
          </div>
        )}
      </div>

      {/* Items table for delivery-note / acceptance / expense-claim / quote */}
      {needsItems && (
        <div className="space-y-2">
          <Label>{docKey === "expense-claim" ? "報銷項目" : docKey === "delivery-note" ? "貨品清單" : "工程項目"}</Label>
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2 font-medium text-xs">描述</th>
                  <th className="text-left p-2 font-medium text-xs w-20">數量</th>
                  {(docKey === "expense-claim" || docKey === "quote") && (
                    <th className="text-left p-2 font-medium text-xs w-28">金額 (HK$)</th>
                  )}
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-1">
                      <Input value={it.desc} onChange={e => updateItem(i, "desc", e.target.value)}
                        placeholder="描述..." className="h-7 text-xs" />
                    </td>
                    <td className="p-1">
                      <Input value={it.qty} onChange={e => updateItem(i, "qty", e.target.value)}
                        className="h-7 text-xs" type="number" min="1" />
                    </td>
                    {(docKey === "expense-claim" || docKey === "quote") && (
                      <td className="p-1">
                        <Input value={it.unit} onChange={e => updateItem(i, "unit", e.target.value)}
                          placeholder="0" className="h-7 text-xs" type="number" />
                      </td>
                    )}
                    <td className="p-1">
                      {items.length > 1 && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400"
                          onClick={() => setItems(items.filter((_, j) => j !== i))}>
                          ×
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addItem}>
            + 新增項目
          </Button>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>備註</Label>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="額外說明..." rows={2} />
      </div>

      {/* Auto-fill hint */}
      {quoteId && selectedProject && (
        <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700">
          已選工程：<strong>{selectedProject.quoteId}</strong> — {selectedProject.projectItem}
          {selectedProject.location && ` | ${selectedProject.location}`}
        </div>
      )}

      <div className="flex justify-end pt-2 border-t">
        <Button onClick={generate} className="gap-2">
          <Printer className="h-4 w-4" /> 生成並列印
        </Button>
      </div>
    </div>
  );
}

// ─── INVOICE MANAGEMENT (sub-panel) ──────────────────────────────────────────

function InvoicePanel({
  projects,
}: {
  projects: any[];
}) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [form, setForm] = useState({
    quoteId: "",
    issueDate: new Date().toISOString().split("T")[0]!,
    dueDate: "",
    amount: "",
    description: "",
    notes: "",
  });

  const printRef = useRef<HTMLDivElement>(null);
  const { data: invoices, isLoading } = useListInvoices({});
  const { data: nextNoData } = useGetNextInvoiceNo();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const projectMap = Object.fromEntries(projects.map((p) => [p.quoteId, p]));
  const filtered = (invoices ?? []).filter((inv) => {
    const matchStatus = filterStatus === "all" || inv.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch = !q || inv.invoiceNo.toLowerCase().includes(q) ||
      inv.quoteId.toLowerCase().includes(q) ||
      (projectMap[inv.quoteId]?.client ?? "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });
  const totalOutstanding = (invoices ?? [])
    .filter(i => i.status === "未收" || i.status === "部分收款")
    .reduce((s, i) => s + i.amount, 0);

  const handleCreate = () => {
    if (!form.quoteId || !form.amount || !form.description) {
      toast({ variant: "destructive", title: "請填寫工程編號、金額、描述" });
      return;
    }
    createInvoice.mutate(
      { data: { quoteId: form.quoteId, issueDate: form.issueDate, dueDate: form.dueDate || undefined, amount: parseFloat(form.amount), description: form.description, notes: form.notes || undefined, status: "未收" } },
      {
        onSuccess: () => {
          toast({ title: "Invoice 已建立" });
          setShowCreate(false);
          setForm({ quoteId: "", issueDate: new Date().toISOString().split("T")[0]!, dueDate: "", amount: "", description: "", notes: "" });
          queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey({}) });
        },
        onError: () => toast({ variant: "destructive", title: "建立失敗" }),
      }
    );
  };

  const handleMarkPaid = (inv: Invoice) => {
    updateInvoice.mutate(
      { invoiceId: inv.id, data: { status: "已收" } },
      { onSuccess: () => { toast({ title: `${inv.invoiceNo} 已結清` }); queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey({}) }); } }
    );
  };

  const handleDelete = (inv: Invoice) => {
    if (!confirm(`確定刪除 ${inv.invoiceNo}？`)) return;
    deleteInvoice.mutate(
      { invoiceId: inv.id },
      { onSuccess: () => { toast({ title: "已刪除" }); queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey({}) }); } }
    );
  };

  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: previewInvoice?.invoiceNo ?? "Invoice" });
  const previewProject = previewInvoice ? projectMap[previewInvoice.quoteId] : undefined;

  return (
    <div className="space-y-4">
      {previewInvoice && (
        <InvoicePrintTemplate invoice={previewInvoice} project={previewProject} printRef={printRef} />
      )}

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Invoice 總數</p>
          <p className="text-2xl font-bold">{invoices?.length ?? 0}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">待收款</p>
          <p className="text-2xl font-bold text-amber-600">{(invoices ?? []).filter(i => i.status === "未收").length}</p>
          <p className="text-xs text-amber-500">{formatHKD(totalOutstanding)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">已收款</p>
          <p className="text-2xl font-bold text-green-600">{(invoices ?? []).filter(i => i.status === "已收").length}</p>
        </CardContent></Card>
      </div>

      <div className="flex gap-2 flex-wrap items-center justify-between">
        <div className="flex gap-1.5 flex-wrap">
          {["all", "未收", "已收", "部分收款", "取消"].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterStatus === s ? "bg-slate-900 text-white border-slate-900" : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"}`}>
              {s === "all" ? "全部" : s}
            </button>
          ))}
        </div>
        <Button size="sm" className="h-8 gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus className="h-3.5 w-3.5" /> 新增 Invoice
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input placeholder="搜尋..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-[110px_1fr_1fr_100px_90px_90px_80px] gap-2 px-4 py-2 border-b bg-muted/40 text-xs font-medium text-muted-foreground">
            <span>Invoice 編號</span><span>工程 / 客戶</span><span>描述</span>
            <span className="text-right">金額</span><span className="text-right">日期</span>
            <span className="text-center">狀態</span><span className="text-center">操作</span>
          </div>
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">載入中...</div>
          ) : !filtered.length ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <FileText className="mx-auto h-8 w-8 text-gray-300 mb-2" />
              {invoices?.length === 0 ? "尚未建立任何 Invoice" : "沒有符合條件的 Invoice"}
            </div>
          ) : (
            <div className="divide-y max-h-[420px] overflow-y-auto">
              {filtered.map(inv => {
                const proj = projectMap[inv.quoteId];
                return (
                  <div key={inv.id} className="grid grid-cols-[110px_1fr_1fr_100px_90px_90px_80px] gap-2 px-4 py-2.5 items-center hover:bg-muted/30">
                    <span className="font-mono text-xs font-semibold text-slate-700">{inv.invoiceNo}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{proj?.projectItem ?? inv.quoteId}</p>
                      <p className="text-xs text-muted-foreground truncate">{inv.quoteId} | {proj?.client ?? "-"}</p>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{inv.description}</p>
                    <span className="text-xs text-right font-semibold">{formatHKD(inv.amount)}</span>
                    <span className="text-xs text-right text-muted-foreground">{formatDate(inv.issueDate)}</span>
                    <div className="flex justify-center">
                      <Badge className={`text-xs ${STATUS_COLORS[inv.status] ?? ""}`}>{inv.status}</Badge>
                    </div>
                    <div className="flex justify-center gap-0.5">
                      <button onClick={() => { setPreviewInvoice(inv); setTimeout(() => handlePrint(), 100); }}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500" title="列印">
                        <Printer className="h-3 w-3" />
                      </button>
                      {inv.status === "未收" && (
                        <button onClick={() => handleMarkPaid(inv)}
                          className="p-1.5 rounded hover:bg-green-50 text-green-600" title="已收款">
                          <CheckCheck className="h-3 w-3" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(inv)}
                        className="p-1.5 rounded hover:bg-red-50 text-red-400" title="刪除">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>新增 Invoice</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Invoice 編號（自動）</Label>
                <Input className="mt-1 h-8 text-sm" disabled value={nextNoData?.nextNo ?? ""} placeholder="自動生成" />
              </div>
              <div>
                <Label className="text-xs">工程編號 *</Label>
                <Select value={form.quoteId} onValueChange={v => {
                  const proj = projects?.find(p => p.quoteId === v);
                  setForm(f => ({ ...f, quoteId: v, description: proj?.projectItem ?? f.description, amount: proj?.quoteAmount ? String(proj.quoteAmount) : f.amount }));
                }}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="選擇工程" /></SelectTrigger>
                  <SelectContent>
                    {projects.filter(p => p.status !== "不成功").map(p => (
                      <SelectItem key={p.quoteId} value={p.quoteId}>{p.quoteId} — {p.client}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">出單日期 *</Label>
                <Input type="date" className="mt-1 h-8 text-sm" value={form.issueDate} onChange={e => setForm(f => ({ ...f, issueDate: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">到期日期</Label>
                <Input type="date" className="mt-1 h-8 text-sm" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">金額 (HKD) *</Label>
              <Input type="number" className="mt-1 h-8 text-sm" placeholder="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">工程描述 *</Label>
              <Textarea className="mt-1 text-sm" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">備註</Label>
              <Input className="mt-1 h-8 text-sm" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
              <Button onClick={handleCreate} disabled={createInvoice.isPending}>建立 Invoice</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function Documents() {
  const [activeDoc, setActiveDoc] = useState<DocKey>("invoice");
  const { data: projects = [] } = useListProjects();
  const { data: clients = [] } = useListClients();
  const { data: users = [] } = useListUsers();

  const docInfo = DOC_TYPES.find(d => d.key === activeDoc)!;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">單據生成</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">建立、管理及列印各類工程及行政單據</p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {DOC_TYPES.map(dt => (
          <button
            key={dt.key}
            onClick={() => setActiveDoc(dt.key)}
            className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-all ${
              activeDoc === dt.key
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-primary/40 hover:bg-muted/30"
            }`}
          >
            <dt.icon className={`h-4 w-4 flex-shrink-0 ${activeDoc === dt.key ? "text-primary" : "text-muted-foreground"}`} />
            <div className="min-w-0">
              <p className={`text-xs font-semibold truncate leading-tight ${activeDoc === dt.key ? "text-primary" : "text-foreground"}`}>{dt.label}</p>
              <p className="text-[10px] text-muted-foreground truncate">{dt.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <docInfo.icon className="h-4 w-4" />
            {docInfo.label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeDoc === "invoice" ? (
            <InvoicePanel projects={projects as any[]} />
          ) : (
            <DocGeneratePanel
              docKey={activeDoc}
              projects={projects as any[]}
              clients={clients as any[]}
              users={users as any[]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
