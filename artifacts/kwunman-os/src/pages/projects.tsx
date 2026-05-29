import { useState, useEffect, useCallback } from "react";
import {
  useListProjects,
  useListPayments,
  useCreatePayment,
  useDeletePayment,
  useUpdateProject,
  useListQuoteItems,
  useListExpenses,
  useCreateInvoice,
} from "@workspace/api-client-react";
import { formatHKD, formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  TrendingUp,
  DollarSign,
  Wrench,
  ChartBar,
  Trash2,
  Plus,
  X,
  Save,
  CheckCircle2,
  FileText,
  Printer,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";

type Project = {
  id: number;
  quoteId: string;
  date: string | null;
  location: string;
  projectItem: string;
  quoteAmount: number;
  client: string;
  clientId: string;
  status: string;
  depositStatus: string;
  startDate: string | null;
  endDate: string | null;
  invoiceStatus: string;
  finalReceived: number;
  balanceStatus: string;
  taxQuarterKwunman: string;
  taxQuarterGov: string;
  notes: string | null;
  paymentTerms: string | null;
  totalPaid?: number;
};

type Payment = {
  id: number;
  quoteId: string;
  amount: number;
  paymentType: string;
  paymentDate: string | null;
  notes: string | null;
  createdAt: string;
};

const PAYMENT_TYPES = ["訂金", "中期款", "尾款", "其他"];

// ── Quote print templates ─────────────────────────────────────────────────────
const COMPANY_HEADER_ZH = `
  <div style="font-size:18px;font-weight:900;color:#1a2744;">冠文鋼結構工程有限公司</div>
  <div style="font-size:10px;color:#888;margin-top:2px;">KWUNMAN STEEL STRUCTURE ENGINEERING CO. LTD</div>
  <div style="font-size:11px;color:#555;margin-top:6px;">RM A 19/F MAX SHARE CTR 367-373 KING'S RD<br>NORTH POINT, HONG KONG</div>
  <div style="font-size:11px;color:#555;margin-top:3px;">Tel: (852) 6992 4722 &nbsp;|&nbsp; (852) 6770 6146 &nbsp;|&nbsp; (852) 5498 0312</div>
  <div style="font-size:11px;color:#555;">Email: KwunManSS@outlook.com</div>`;

const BANK_DETAILS = `銀行名稱 Bank：恆生銀行 Hang Seng Bank Limited<br>
帳戶名稱 A/C Name：KwunMan Steel Structure Limited<br>
帳號 A/C No.：370-725707-883<br>
付款通知電郵 Payment advice to：KwunManSS@outlook.com`;

function buildQuoteHtml(project: Project, items: any[], lang: "zh" | "en"): string {
  const rows = items.map((item: any, idx: number) => {
    const amt = Number(item.unitPrice) * Number(item.qty);
    return `<tr>
      <td style="text-align:center;color:#555;border-bottom:1px solid #eee;padding:8px 10px;">${idx + 1}</td>
      <td style="border-bottom:1px solid #eee;padding:8px 10px;vertical-align:top;">
        <div style="font-weight:600;">${item.description || "—"}</div>
        ${item.notes ? `<div style="font-size:11px;color:#666;margin-top:2px;white-space:pre-line;">${item.notes}</div>` : ""}
      </td>
      <td style="text-align:right;border-bottom:1px solid #eee;padding:8px 10px;">HK$${Number(item.unitPrice).toLocaleString()}</td>
      <td style="text-align:center;border-bottom:1px solid #eee;padding:8px 10px;">${Number(item.qty)}</td>
      <td style="text-align:right;font-weight:600;border-bottom:1px solid #eee;padding:8px 10px;">HK$${amt.toLocaleString()}</td>
    </tr>`;
  }).join("");
  const total = items.reduce((s: number, i: any) => s + Number(i.unitPrice) * Number(i.qty), 0);

  const customTerms = project.paymentTerms && project.paymentTerms !== "無訂金"
    ? `<div style="white-space:pre-line;margin-bottom:8px;">${project.paymentTerms}</div>` : "";

  if (lang === "zh") {
    return `<html><head><title>報價單 ${project.quoteId}</title>
    <style>
      *{box-sizing:border-box;}
      body{font-family:"Microsoft JhengHei","PingFang TC",sans-serif;padding:40px;max-width:860px;margin:0 auto;color:#111;font-size:13px;line-height:1.5;}
      table{width:100%;border-collapse:collapse;}
      th{background:#1a2744;color:white;padding:8px 10px;font-size:12px;}
      .info-grid td{padding:6px 10px;font-size:12px;border:1px solid #ddd;}
      .info-grid .lbl{background:#f5f7fa;color:#888;font-size:11px;width:110px;}
      @media print{.no-print{display:none;}}
    </style></head><body>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1a2744;padding-bottom:14px;margin-bottom:20px;">
      <div>${COMPANY_HEADER_ZH}</div>
      <div style="text-align:right;">
        <div style="font-size:26px;font-weight:900;color:#1a2744;">報價單</div>
        <div style="font-size:12px;color:#666;margin-bottom:8px;">QUOTATION</div>
        <table style="border-collapse:collapse;margin-left:auto;">
          <tr><td style="font-size:11px;color:#888;padding:2px 8px 2px 0;text-align:right;">日期 Date:</td><td style="font-size:12px;font-weight:600;">${project.date ?? "—"}</td></tr>
          <tr><td style="font-size:11px;color:#888;padding:2px 8px 2px 0;text-align:right;">報價 NO.:</td><td style="font-size:14px;font-weight:900;color:#1a2744;">${project.quoteId}</td></tr>
        </table>
      </div>
    </div>

    <div style="margin-bottom:18px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#888;margin-bottom:6px;">客戶資料 Customer Information</div>
      <table class="info-grid">
        <tr><td class="lbl">客戶公司</td><td style="font-weight:600;">${project.client}</td><td class="lbl">施工地點</td><td>${project.location}</td></tr>
        <tr><td class="lbl">項目名稱</td><td colspan="3">${project.projectItem}</td></tr>
      </table>
    </div>

    <table style="margin-bottom:4px;">
      <thead><tr>
        <th style="width:44px;text-align:center;">編號<br>Item</th>
        <th style="text-align:left;">施工範圍 Scope of Work</th>
        <th style="width:120px;text-align:right;">單價<br>Unit Price</th>
        <th style="width:60px;text-align:center;">數量<br>Qty</th>
        <th style="width:120px;text-align:right;">金額<br>Amount</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <div style="margin-left:auto;width:300px;margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;padding:5px 10px;font-size:12px;color:#555;border-bottom:1px solid #eee;">
        <span>小計 Subtotal</span><span>HK$ ${total.toLocaleString()}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:5px 10px;font-size:12px;color:#555;border-bottom:1px solid #ddd;">
        <span>折扣 Discount</span><span>HK$ 0</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:8px 10px;font-size:16px;font-weight:900;color:#1a2744;border-top:2px solid #1a2744;">
        <span>總計 Total</span><span>HK$ ${total.toLocaleString()}</span>
      </div>
    </div>

    <div style="margin-bottom:18px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#888;margin-bottom:5px;">備註 Remarks</div>
      <div style="font-size:12px;color:#444;line-height:1.7;">
        · 所有工程遵循香港建築結構安全標準<br>
        · 施工期間約需 6 個工作天，實際時間視現場情況調整
      </div>
    </div>

    <div style="margin-bottom:18px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#888;margin-bottom:5px;">付款條款 Payment Terms</div>
      <div style="font-size:12px;color:#333;line-height:1.8;">
        ${customTerms}
        1. 銀行轉賬付款，請將付款通知電郵寄至 KwunManSS@outlook.com<br>
        <div style="margin-top:5px;padding:8px 12px;background:#f8f9fb;border:1px solid #e2e8f0;border-radius:4px;font-size:11px;">
          ${BANK_DETAILS}
        </div>
      </div>
    </div>

    <div style="margin-bottom:18px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#888;margin-bottom:5px;">條款及細則 Terms &amp; Conditions</div>
      <div style="font-size:11px;color:#555;line-height:1.7;">
        1. 本報價單有效期為 30 天<br>
        2. 本公司保留接受或拒絕任何訂單的權利<br>
        3. 工程完成後如有爭議，以本公司最終解釋為準
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-top:40px;">
      <div><div style="border-top:1px solid #333;padding-top:6px;font-size:12px;color:#666;">經手人 Authorized by</div><div style="height:44px;"></div></div>
      <div><div style="border-top:1px solid #333;padding-top:6px;font-size:12px;color:#666;">客戶確認回簽 Customer Signature</div><div style="height:44px;"></div></div>
      <div><div style="border-top:1px solid #333;padding-top:6px;font-size:12px;color:#666;">日期 Date</div><div style="height:44px;"></div></div>
    </div>

    <div style="text-align:center;margin-top:20px;font-size:13px;color:#1a2744;font-weight:700;">感謝您的惠顧！Thank You For Your Business!</div>

    <div class="no-print" style="margin-top:28px;text-align:center;">
      <button onclick="window.print()" style="padding:10px 32px;background:#1a2744;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;">列印 / 儲存為 PDF</button>
    </div>
    </body></html>`;
  }

  // English template
  return `<html><head><title>Quotation ${project.quoteId}</title>
  <style>
    *{box-sizing:border-box;}
    body{font-family:Arial,Helvetica,sans-serif;padding:40px;max-width:860px;margin:0 auto;color:#111;font-size:13px;line-height:1.5;}
    table{width:100%;border-collapse:collapse;}
    th{background:#1a2744;color:white;padding:8px 10px;font-size:12px;}
    .info-grid td{padding:6px 10px;font-size:12px;border:1px solid #ddd;}
    .info-grid .lbl{background:#f5f7fa;color:#888;font-size:11px;width:130px;}
    @media print{.no-print{display:none;}}
  </style></head><body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1a2744;padding-bottom:14px;margin-bottom:20px;">
    <div>
      <div style="font-size:18px;font-weight:900;color:#1a2744;">KwunMan Steel Structure Engineering Co. Ltd</div>
      <div style="font-size:10px;color:#888;margin-top:2px;">冠文鋼結構工程有限公司</div>
      <div style="font-size:11px;color:#555;margin-top:6px;">RM A 19/F MAX SHARE CTR 367-373 KING'S RD<br>NORTH POINT, HONG KONG</div>
      <div style="font-size:11px;color:#555;margin-top:3px;">Tel: (852) 6992 4722 &nbsp;|&nbsp; (852) 6770 6146 &nbsp;|&nbsp; (852) 5498 0312</div>
      <div style="font-size:11px;color:#555;">Email: KwunManSS@outlook.com</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:26px;font-weight:900;color:#1a2744;">QUOTATION</div>
      <div style="font-size:12px;color:#666;margin-bottom:8px;">報價單</div>
      <table style="border-collapse:collapse;margin-left:auto;">
        <tr><td style="font-size:11px;color:#888;padding:2px 8px 2px 0;text-align:right;">Date:</td><td style="font-size:12px;font-weight:600;">${project.date ?? "—"}</td></tr>
        <tr><td style="font-size:11px;color:#888;padding:2px 8px 2px 0;text-align:right;">Quotation No.:</td><td style="font-size:14px;font-weight:900;color:#1a2744;">${project.quoteId}</td></tr>
      </table>
    </div>
  </div>

  <div style="margin-bottom:18px;">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#888;margin-bottom:6px;">Customer Information</div>
    <table class="info-grid">
      <tr><td class="lbl">Company</td><td style="font-weight:600;">${project.client}</td><td class="lbl">Project Location</td><td>${project.location}</td></tr>
      <tr><td class="lbl">Item Description</td><td colspan="3">${project.projectItem}</td></tr>
    </table>
  </div>

  <table style="margin-bottom:4px;">
    <thead><tr>
      <th style="width:44px;text-align:center;">Item<br>No.</th>
      <th style="text-align:left;">Scope of Work / Description</th>
      <th style="width:130px;text-align:right;">Unit Price (HKD)</th>
      <th style="width:60px;text-align:center;">Qty</th>
      <th style="width:130px;text-align:right;">Total (HKD)</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div style="margin-left:auto;width:300px;margin-bottom:20px;">
    <div style="display:flex;justify-content:space-between;padding:5px 10px;font-size:12px;color:#555;border-bottom:1px solid #eee;">
      <span>Subtotal</span><span>HK$ ${total.toLocaleString()}</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:5px 10px;font-size:12px;color:#555;border-bottom:1px solid #ddd;">
      <span>Additional Charges</span><span>HK$ 0</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:8px 10px;font-size:16px;font-weight:900;color:#1a2744;border-top:2px solid #1a2744;">
      <span>Total Amount</span><span>HK$ ${total.toLocaleString()}</span>
    </div>
  </div>

  <div style="margin-bottom:18px;">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#888;margin-bottom:5px;">Remarks</div>
    <div style="font-size:12px;color:#444;line-height:1.7;">
      · All works comply with Hong Kong's structural safety standards.<br>
      · The construction period is approximately 6 working days, subject to adjustment based on site conditions.
    </div>
  </div>

  <div style="margin-bottom:18px;">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#888;margin-bottom:5px;">Payment Terms</div>
    <div style="font-size:12px;color:#333;line-height:1.8;">
      ${customTerms ? `<div style="white-space:pre-line;margin-bottom:8px;">${project.paymentTerms}</div>` : ""}
      1. Payment by bank transfer. Please email payment advice to KwunManSS@outlook.com<br>
      <div style="margin-top:5px;padding:8px 12px;background:#f8f9fb;border:1px solid #e2e8f0;border-radius:4px;font-size:11px;">
        Bank Name: Hang Seng Bank Limited<br>
        Account Name: KwunMan Steel Structure Limited<br>
        Account No.: 370-725707-883<br>
        Payment advice email: KwunManSS@outlook.com
      </div>
    </div>
  </div>

  <div style="margin-bottom:18px;">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#888;margin-bottom:5px;">Terms &amp; Conditions</div>
    <div style="font-size:11px;color:#555;line-height:1.7;">
      1. This quotation is valid for 30 days from the date of issue.<br>
      2. A deposit of 50% of the total amount must be paid before work commences. Deposit will be deducted from the final invoice.<br>
      3. The company reserves the right to accept or reject any order.
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-top:40px;">
    <div><div style="border-top:1px solid #333;padding-top:6px;font-size:12px;color:#666;">Authorized by</div><div style="height:44px;"></div></div>
    <div><div style="border-top:1px solid #333;padding-top:6px;font-size:12px;color:#666;">Customer Signature</div><div style="height:44px;"></div></div>
    <div><div style="border-top:1px solid #333;padding-top:6px;font-size:12px;color:#666;">Date</div><div style="height:44px;"></div></div>
  </div>

  <div style="text-align:center;margin-top:20px;font-size:13px;color:#1a2744;font-weight:700;">Thank You For Your Business! &nbsp; 感謝您的惠顧！</div>

  <div class="no-print" style="margin-top:28px;text-align:center;">
    <button onclick="window.print()" style="padding:10px 32px;background:#1a2744;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;">Print / Save as PDF</button>
  </div>
  </body></html>`;
}

// Button component that lazily fetches quote items then opens print window
function PrintQuoteButton({ project }: { project: Project }) {
  const { data: quoteItems = [], refetch } = useListQuoteItems(
    { quoteId: project.quoteId },
    { query: { enabled: false } } as any
  );

  const handlePrint = useCallback(async (lang: "zh" | "en", e: React.MouseEvent) => {
    e.stopPropagation();
    const result = await refetch();
    const items = (result.data as any[]) ?? (quoteItems as any[]);
    const html = buildQuoteHtml(project, items, lang);
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
  }, [project, refetch, quoteItems]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-1.5 gap-0.5 text-muted-foreground hover:text-primary"
          onClick={e => e.stopPropagation()}
          title="列印報價單"
        >
          <Printer className="h-3.5 w-3.5" />
          <ChevronDown className="h-2.5 w-2.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent onClick={e => e.stopPropagation()} align="end">
        <DropdownMenuItem onClick={e => handlePrint("zh", e)}>中文報價單</DropdownMenuItem>
        <DropdownMenuItem onClick={e => handlePrint("en", e)}>英文報價單 (English)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Payment terms helpers ─────────────────────────────────────────────────────
// paymentTerms format: "訂金: 50%（HK$100,000）\n尾款: 50%（HK$100,000）"
function parseFirstInstallmentPct(paymentTerms: string | null | undefined): number | null {
  if (!paymentTerms) return null;
  const firstLine = paymentTerms.split("\n").find((l) => l.trim());
  if (!firstLine) return null;
  const m = firstLine.match(/(\d+)%/);
  return m ? parseInt(m[1], 10) : null;
}

function calcDefaultFinalReceived(project: {
  finalReceived: number;
  depositStatus: string;
  paymentTerms?: string | null;
  quoteAmount: number;
}): string {
  if ((project.finalReceived ?? 0) > 0) return String(project.finalReceived);
  if (project.depositStatus === "有訂金") {
    const pct = parseFirstInstallmentPct(project.paymentTerms);
    if (pct !== null) {
      const computed = project.quoteAmount * pct / 100;
      if (computed > 0) return String(computed);
    }
  }
  return "0";
}

function PaymentSheet({
  project,
  open,
  onClose,
  onProjectUpdated,
}: {
  project: Project;
  open: boolean;
  onClose: () => void;
  onProjectUpdated: (p: Project) => void;
}) {
  const queryClient = useQueryClient();

  // ── Payment tab state ──
  const [newAmount, setNewAmount] = useState("");
  const [newType, setNewType] = useState("訂金");
  const [newDate, setNewDate] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [adding, setAdding] = useState(false);

  // ── Edit tab state ──
  const [editStatus, setEditStatus] = useState(project.status);
  const [editDepositStatus, setEditDepositStatus] = useState(project.depositStatus ?? "無訂金");
  const [editQuoteAmount, setEditQuoteAmount] = useState(String(project.quoteAmount));
  const [editFinalReceived, setEditFinalReceived] = useState(() => calcDefaultFinalReceived(project));
  const [editLocation, setEditLocation] = useState(project.location);
  const [editProjectItem, setEditProjectItem] = useState(project.projectItem);
  const [editStartDate, setEditStartDate] = useState(project.startDate ?? "");
  const [editEndDate, setEditEndDate] = useState(project.endDate ?? "");
  const [editNotes, setEditNotes] = useState(project.notes ?? "");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── Invoice generation state ──
  type InvoiceDraftRow = { type: string; amount: number; description: string; issueDate: string; dueDate: string };
  const [showInvoiceGen, setShowInvoiceGen] = useState(false);
  const [invoiceDraftRows, setInvoiceDraftRows] = useState<InvoiceDraftRow[]>([]);

  const parsePaymentTermsToRows = (): InvoiceDraftRow[] => {
    const today = new Date().toISOString().split("T")[0];
    const due = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
    if (!project.paymentTerms || project.paymentTerms === "無訂金") {
      return [{
        type: "全數",
        amount: project.quoteAmount,
        description: `${project.projectItem} — 全數`,
        issueDate: today,
        dueDate: due,
      }];
    }
    const lines = project.paymentTerms.split("\n").filter(Boolean);
    return lines.map((line) => {
      const m = line.match(/^(.+?):\s*(\d+)%（HK\$([\d,]+)）$/);
      if (m) {
        const type = m[1].trim();
        const amount = parseInt(m[3].replace(/,/g, ""), 10);
        return { type, amount, description: `${project.projectItem} — ${type}`, issueDate: today, dueDate: due };
      }
      return { type: "付款", amount: project.quoteAmount, description: `${project.projectItem} — 付款`, issueDate: today, dueDate: due };
    });
  };

  const openInvoiceGen = () => {
    setInvoiceDraftRows(parsePaymentTermsToRows());
    setShowInvoiceGen(true);
  };

  const { mutate: createInvoice, isPending: isCreatingInvoice } = useCreateInvoice({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      },
    },
  });

  const handleGenInvoices = async () => {
    let seq = 0;
    for (const row of invoiceDraftRows) {
      seq++;
      const paddedMonth = String(new Date().getMonth() + 1).padStart(2, "0");
      const invoiceNo = `INV-${new Date().getFullYear()}-${project.quoteId}-${String(seq).padStart(2, "0")}`;
      createInvoice({
        data: {
          invoiceNo,
          quoteId: project.quoteId,
          issueDate: row.issueDate,
          dueDate: row.dueDate || null,
          amount: row.amount,
          description: row.description,
          status: "未收",
          notes: null,
        },
      });
      void paddedMonth;
    }
    setShowInvoiceGen(false);
  };

  useEffect(() => {
    setEditStatus(project.status);
    setEditDepositStatus(project.depositStatus ?? "無訂金");
    setEditQuoteAmount(String(project.quoteAmount));
    setEditFinalReceived(calcDefaultFinalReceived(project));
    setEditLocation(project.location);
    setEditProjectItem(project.projectItem);
    setEditStartDate(project.startDate ?? "");
    setEditEndDate(project.endDate ?? "");
    setEditNotes(project.notes ?? "");
    setSaveSuccess(false);
  }, [project.quoteId]);

  const { data: payments = [], isLoading } = useListPayments(
    { quoteId: project.quoteId }
  );

  const { data: quoteItems = [] } = useListQuoteItems({ quoteId: project.quoteId });
  const { data: projectExpenses = [] } = useListExpenses({ projectId: project.quoteId });

  const handlePrintQuote = useCallback((lang: "zh" | "en") => {
    const items = (quoteItems as any[]);
    const html = buildQuoteHtml(project, items, lang);
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
  }, [project, quoteItems]);

  const { mutate: createPayment, isPending: isCreating } = useCreatePayment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        setNewAmount("");
        setNewDate("");
        setNewNotes("");
        setAdding(false);
      },
    },
  });

  const { mutate: deletePayment } = useDeletePayment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      },
    },
  });

  const { mutate: updateProject, isPending: isSaving } = useUpdateProject({
    mutation: {
      onSuccess: (updated) => {
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        onProjectUpdated(updated as unknown as Project);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      },
    },
  });

  const totalPaid = (payments as Payment[]).reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, project.quoteAmount - totalPaid);
  const pct = project.quoteAmount > 0 ? Math.min(100, (totalPaid / project.quoteAmount) * 100) : 0;

  const getTypeColor = (type: string) => {
    switch (type) {
      case "訂金":   return "bg-blue-100 text-blue-800 border-blue-200";
      case "中期款": return "bg-amber-100 text-amber-800 border-amber-200";
      case "尾款":  return "bg-green-100 text-green-800 border-green-200";
      default:       return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const handleAdd = () => {
    const amt = parseFloat(newAmount);
    if (!amt || amt <= 0) return;
    createPayment({
      data: {
        quoteId: project.quoteId,
        amount: amt,
        paymentType: newType,
        paymentDate: newDate || null,
        notes: newNotes || null,
      },
    });
    // 加「訂金」收款時自動將訂金狀態設為「有訂金」
    if (newType === "訂金" && editDepositStatus !== "有訂金") {
      setEditDepositStatus("有訂金");
      updateProject({
        projectId: project.quoteId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: { depositStatus: "有訂金" } as any,
      });
    }
  };

  const handleQuickStatus = (newStatus: string) => {
    setEditStatus(newStatus);
    updateProject({
      projectId: project.quoteId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { status: newStatus as any },
    });
  };

  const handleSave = () => {
    updateProject({
      projectId: project.quoteId,
      data: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: editStatus as any,
        depositStatus: editDepositStatus,
        quoteAmount: parseFloat(editQuoteAmount) || project.quoteAmount,
        finalReceived: parseFloat(editFinalReceived) || 0,
        location: editLocation,
        projectItem: editProjectItem,
        startDate: editStartDate || null,
        endDate: editEndDate || null,
        notes: editNotes || null,
      },
    });
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-[500px] flex flex-col p-0">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b">
          <SheetHeader>
            <SheetTitle className="text-base font-bold">
              {project.quoteId}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground truncate">
              {project.location} · {project.projectItem}
            </SheetDescription>
          </SheetHeader>

          {/* Quick status selector */}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0">工程狀態</span>
            <Select value={editStatus} onValueChange={handleQuickStatus}>
              <SelectTrigger className="h-7 text-xs border-0 bg-muted/50 rounded-md px-2 flex-1 max-w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="報價中">報價中</SelectItem>
                <SelectItem value="待通知">待通知</SelectItem>
                <SelectItem value="待收首期">待收首期</SelectItem>
                <SelectItem value="施工中">施工中</SelectItem>
                <SelectItem value="待收款">待收款</SelectItem>
                <SelectItem value="待收尾期">待收尾期</SelectItem>
                <SelectItem value="已完成">已完成</SelectItem>
                <SelectItem value="不成功">不成功</SelectItem>
              </SelectContent>
            </Select>
            {isSaving && <span className="text-xs text-muted-foreground">儲存中...</span>}
            {saveSuccess && <span className="text-xs text-green-600">已儲存</span>}
          </div>

          {/* Finance summary bar */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="rounded-lg bg-slate-50 border p-2.5">
              <div className="text-xs text-muted-foreground">報價金額</div>
              <div className="font-bold text-sm mt-0.5">{formatHKD(project.quoteAmount)}</div>
            </div>
            <div className="rounded-lg bg-green-50 border border-green-100 p-2.5">
              <div className="text-xs text-muted-foreground">已收合計</div>
              <div className="font-bold text-sm text-green-700 mt-0.5">{formatHKD(totalPaid)}</div>
            </div>
            <div className={`rounded-lg border p-2.5 ${remaining > 0 ? "bg-red-50 border-red-100" : "bg-green-50 border-green-100"}`}>
              <div className="text-xs text-muted-foreground">待收尾數</div>
              <div className={`font-bold text-sm mt-0.5 ${remaining > 0 ? "text-red-600" : "text-green-700"}`}>
                {remaining > 0 ? formatHKD(remaining) : "已收齊"}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          {project.status !== "不成功" && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>收款進度</span>
                <span>{pct.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-green-500" : "bg-blue-500"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="payments" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-5 mt-3 mb-0 w-auto self-start h-8">
            <TabsTrigger value="payments" className="text-xs px-3 h-6">收款紀錄</TabsTrigger>
            <TabsTrigger value="quote-items" className="text-xs px-3 h-6">報價明細</TabsTrigger>
            <TabsTrigger value="expenses" className="text-xs px-3 h-6">相關支出</TabsTrigger>
            <TabsTrigger value="details" className="text-xs px-3 h-6">工程詳情</TabsTrigger>
          </TabsList>

          {/* ── PAYMENTS TAB ── */}
          <TabsContent value="payments" className="flex-1 overflow-y-auto px-5 pt-3 pb-5 mt-0">
            {/* 實收大數 — 置頂突出 */}
            <div className="rounded-lg border-2 border-green-200 bg-green-50 p-3 mb-4">
              <div className="text-[10px] font-bold text-green-800 uppercase tracking-wide mb-1.5">
                實收大數 Final Received ★
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-green-700 shrink-0">HK$</span>
                <Input
                  type="number"
                  min={0}
                  step={1000}
                  value={editFinalReceived}
                  onChange={(e) => setEditFinalReceived(e.target.value)}
                  className="h-9 text-base font-bold border-green-300 focus:border-green-500 text-green-800"
                  placeholder="0"
                />
                <Button
                  size="sm"
                  className="shrink-0 bg-green-700 hover:bg-green-800 text-white h-9 px-4"
                  onClick={() =>
                    updateProject({
                      projectId: project.quoteId,
                      data: { finalReceived: parseFloat(editFinalReceived) || 0 },
                    })
                  }
                >
                  更新
                </Button>
              </div>
              <p className="text-[10px] text-green-600/70 mt-1.5">此為財務核心大數，影響所有報表統計。「不成功」狀態會自動清零。</p>
            </div>

            {/* 訂金狀態 toggle */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs text-muted-foreground font-medium shrink-0">訂金狀態：</span>
              <div className="flex gap-1.5">
                {(["無訂金", "有訂金"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setEditDepositStatus(opt);
                      if (opt === "有訂金" && parseFloat(editFinalReceived) === 0) {
                        const pct = parseFirstInstallmentPct(project.paymentTerms);
                        if (pct !== null) {
                          const computed = (parseFloat(editQuoteAmount) || project.quoteAmount) * pct / 100;
                          setEditFinalReceived(String(computed));
                        }
                      }
                      updateProject({
                        projectId: project.quoteId,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        data: { depositStatus: opt } as any,
                      });
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      editDepositStatus === opt
                        ? opt === "有訂金"
                          ? "bg-blue-100 text-blue-800 border-blue-300"
                          : "bg-gray-100 text-gray-700 border-gray-300"
                        : "bg-white text-muted-foreground border-border hover:border-foreground/40"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold">收款明細</div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => setAdding((v) => !v)}
              >
                {adding ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                {adding ? "取消" : "新增收款"}
              </Button>
            </div>

            {adding && (
              <div className="border rounded-lg p-3 mb-3 bg-muted/30 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs mb-1 block">金額 (HKD)</Label>
                    <Input
                      type="number"
                      placeholder="例: 20000"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">類型</Label>
                    <Select value={newType} onValueChange={setNewType}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">收款日期</Label>
                  <Input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">備註 (可選)</Label>
                  <Input
                    placeholder="備註..."
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <Button size="sm" className="w-full" onClick={handleAdd} disabled={isCreating || !newAmount}>
                  {isCreating ? "儲存中..." : "確認新增"}
                </Button>
              </div>
            )}

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (payments as Payment[]).length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                未有收款紀錄
                <div className="text-xs mt-1">點擊「新增收款」記錄訂金或分期款</div>
              </div>
            ) : (
              <div className="space-y-2">
                {(payments as Payment[]).map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border bg-white">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground font-medium shrink-0">
                        {i + 1}
                      </div>
                      <Badge variant="outline" className={`text-xs shrink-0 ${getTypeColor(p.paymentType)}`}>
                        {p.paymentType}
                      </Badge>
                      <div>
                        <div className="font-bold text-sm">{formatHKD(p.amount)}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.paymentDate ? formatDate(p.paymentDate) : "未記日期"}
                          {p.notes && ` · ${p.notes}`}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                      onClick={() => deletePayment({ paymentId: p.id })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                {/* Running total */}
                <div className="flex justify-between px-3 pt-2 text-sm border-t">
                  <span className="text-muted-foreground">合計</span>
                  <span className="font-bold text-green-700">{formatHKD(totalPaid)}</span>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── QUOTE ITEMS TAB ── */}
          <TabsContent value="quote-items" className="flex-1 overflow-y-auto px-5 pt-3 pb-5 mt-0">
            {/* Action buttons */}
            <div className="flex gap-2 mb-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" disabled={(quoteItems as any[]).length === 0}>
                    <Printer className="h-3.5 w-3.5" />
                    列印報價單
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => handlePrintQuote("zh")}>中文報價單</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePrintQuote("en")}>英文報價單 (English)</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {project.status !== "不成功" && project.status !== "報價中" && (
                <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs text-blue-700 border-blue-200 hover:bg-blue-50" onClick={openInvoiceGen}>
                  <FileText className="h-3.5 w-3.5" />
                  生成 Invoice
                </Button>
              )}
            </div>
            {(quoteItems as any[]).length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                此報價單暫無項目明細
              </div>
            ) : (
              <div className="space-y-3">
                {(quoteItems as any[]).map((item: any, idx: number) => (
                  <div key={item.id} className="rounded-lg border overflow-hidden">
                    {/* Main row */}
                    <div className="flex items-start gap-3 px-3 py-2.5 bg-muted/20">
                      <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium leading-snug">{item.description}</div>
                      </div>
                      <div className="text-right shrink-0 space-y-0.5">
                        <div className="font-bold text-sm">{formatHKD(Number(item.unitPrice) * Number(item.qty))}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatHKD(Number(item.unitPrice))} × {Number(item.qty)}
                        </div>
                      </div>
                    </div>
                    {/* Sub-notes */}
                    {item.notes && (
                      <div className="px-4 py-2 bg-white border-t border-dashed">
                        <div className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                          {item.notes}
                        </div>
                      </div>
                    )}
                    {/* Image */}
                    {item.imageUrl && (
                      <div className="px-3 py-2 bg-white border-t">
                        <img
                          src={item.imageUrl}
                          alt={`item ${idx + 1} image`}
                          className="max-h-48 object-contain rounded border"
                        />
                      </div>
                    )}
                  </div>
                ))}
                {/* Total */}
                <div className="flex justify-between px-2 pt-2 text-sm font-semibold border-t">
                  <span className="text-muted-foreground">報價合計</span>
                  <span className="text-primary">
                    {formatHKD((quoteItems as any[]).reduce((s: number, i: any) => s + Number(i.unitPrice) * Number(i.qty), 0))}
                  </span>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── EXPENSES TAB ── */}
          <TabsContent value="expenses" className="flex-1 overflow-y-auto px-5 pt-3 pb-5 mt-0">
            {(projectExpenses as any[]).length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                此工程暫無相關支出記錄
              </div>
            ) : (
              <div className="space-y-2">
                {(projectExpenses as any[]).map((exp: any) => (
                  <div key={exp.id} className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{exp.description}</div>
                      {exp.category && (
                        <div className="text-xs text-muted-foreground mt-0.5">{exp.category}</div>
                      )}
                      {exp.receiptDate && (
                        <div className="text-xs text-muted-foreground">{formatDate(exp.receiptDate)}</div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-sm">{formatHKD(Number(exp.amount))}</div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] mt-1 ${
                          exp.status === "approved"
                            ? "border-green-300 text-green-700 bg-green-50"
                            : exp.status === "rejected"
                            ? "border-red-300 text-red-700 bg-red-50"
                            : "border-yellow-300 text-yellow-700 bg-yellow-50"
                        }`}
                      >
                        {exp.status === "approved" ? "已批" : exp.status === "rejected" ? "拒絕" : "待審"}
                      </Badge>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between px-1 pt-2 text-sm border-t">
                  <span className="text-muted-foreground">支出合計</span>
                  <span className="font-bold text-red-600">
                    {formatHKD((projectExpenses as any[]).reduce((s: number, e: any) => s + Number(e.amount), 0))}
                  </span>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── DETAILS TAB ── */}
          <TabsContent value="details" className="flex-1 overflow-y-auto px-5 pt-3 pb-5 mt-0">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1.5 block text-muted-foreground">工程狀態</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="報價中">報價中</SelectItem>
                      <SelectItem value="待通知">待通知</SelectItem>
                      <SelectItem value="待收首期">待收首期</SelectItem>
                      <SelectItem value="施工中">施工中</SelectItem>
                      <SelectItem value="待收款">待收款</SelectItem>
                      <SelectItem value="待收尾期">待收尾期</SelectItem>
                      <SelectItem value="已完成">已完成</SelectItem>
                      <SelectItem value="不成功">不成功</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block text-muted-foreground">報價金額 (HKD)</Label>
                  <Input
                    type="number"
                    value={editQuoteAmount}
                    onChange={(e) => setEditQuoteAmount(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs mb-1.5 block text-muted-foreground">地點</Label>
                <Input
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div>
                <Label className="text-xs mb-1.5 block text-muted-foreground">工程項目</Label>
                <Input
                  value={editProjectItem}
                  onChange={(e) => setEditProjectItem(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1.5 block text-muted-foreground">開工日期</Label>
                  <Input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block text-muted-foreground">完工日期 (報稅用)</Label>
                  <Input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs mb-1.5 block text-muted-foreground">備註</Label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="工程備註..."
                  className="text-sm resize-none"
                  rows={3}
                />
              </div>

              {/* Read-only info */}
              <div className="rounded-lg bg-muted/40 p-3 space-y-2">
                <div className="text-xs font-medium text-muted-foreground mb-2">唯讀資料</div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">報價編號</span>
                  <span className="font-medium">{project.quoteId}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">客戶</span>
                  <span className="font-medium truncate max-w-[200px] text-right">{project.client}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">冠文季度</span>
                  <span className="font-medium">{project.taxQuarterKwunman}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">政府財政年</span>
                  <span className="font-medium">{project.taxQuarterGov}</span>
                </div>
              </div>

              <Button
                className="w-full gap-2"
                onClick={handleSave}
                disabled={isSaving}
                variant={saveSuccess ? "outline" : "default"}
              >
                {saveSuccess ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">已儲存</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {isSaving ? "儲存中..." : "儲存更改"}
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>

      {/* ── Invoice Generation Dialog ── */}
      <Dialog open={showInvoiceGen} onOpenChange={setShowInvoiceGen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>生成 Invoice — {project.quoteId}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1 max-h-[60vh] overflow-y-auto">
            <p className="text-xs text-muted-foreground">系統已按付款條款預填資料，請確認日期後按「確認建立」。</p>
            {invoiceDraftRows.map((row, idx) => (
              <div key={idx} className="border rounded-lg p-3 space-y-2 bg-slate-50">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{row.type}</span>
                  <span className="font-bold text-sm text-primary">{formatHKD(row.amount)}</span>
                </div>
                <Input
                  value={row.description}
                  onChange={e => setInvoiceDraftRows(rows => rows.map((r, i) => i === idx ? { ...r, description: e.target.value } : r))}
                  className="h-7 text-xs"
                  placeholder="Invoice 描述"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">出單日期</Label>
                    <Input type="date" value={row.issueDate} onChange={e => setInvoiceDraftRows(rows => rows.map((r, i) => i === idx ? { ...r, issueDate: e.target.value } : r))} className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">到期日</Label>
                    <Input type="date" value={row.dueDate} onChange={e => setInvoiceDraftRows(rows => rows.map((r, i) => i === idx ? { ...r, dueDate: e.target.value } : r))} className="h-7 text-xs" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvoiceGen(false)}>取消</Button>
            <Button onClick={handleGenInvoices} disabled={isCreatingInvoice} className="gap-1.5">
              <FileText className="h-4 w-4" />
              確認建立 {invoiceDraftRows.length > 1 ? `${invoiceDraftRows.length} 張 Invoice` : "Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}

export default function Projects() {
  const [taxView, setTaxView] = useState<"kwunman" | "gov">("kwunman");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [yearFilter, setYearFilter] = useState<string>(
    String(new Date().getFullYear())
  );

  function defaultGovYear() {
    const now = new Date();
    const m = now.getMonth() + 1;
    const y = now.getFullYear();
    return m >= 4
      ? `${y}/${String(y + 1).slice(2)}`
      : `${y - 1}/${String(y).slice(2)}`;
  }

  function handleTaxViewChange(v: "kwunman" | "gov") {
    setTaxView(v);
    setYearFilter(
      v === "kwunman" ? String(new Date().getFullYear()) : defaultGovYear()
    );
  }

  const { data: projects = [], isLoading } = useListProjects({
    taxView,
    search: search || undefined,
    status: statusFilter !== "all" ? (statusFilter as any) : undefined,
  });

  const allProjects = projects as Project[];

  const distinctYears = taxView === "kwunman"
    ? [...new Set(allProjects.map((p) => p.date?.slice(0, 4) ?? "").filter(Boolean))].sort().reverse()
    : [...new Set(allProjects.map((p) => p.taxQuarterGov?.split(" ")[0] ?? "").filter(Boolean))].sort().reverse();

  const list =
    yearFilter === "all"
      ? allProjects
      : taxView === "kwunman"
        ? allProjects.filter((p) => p.date?.startsWith(yearFilter))
        : allProjects.filter((p) => p.taxQuarterGov?.startsWith(yearFilter));

  const [projSortKey, setProjSortKey] = useState<string>("quoteId");
  const [projSortDir, setProjSortDir] = useState<"asc" | "desc">("desc");
  const handleProjSort = (key: string) => {
    if (projSortKey === key) setProjSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setProjSortKey(key); setProjSortDir("desc"); }
  };
  const ProjSortIcon = ({ col }: { col: string }) => {
    if (projSortKey !== col) return <ChevronsUpDown className="h-3 w-3 opacity-30 inline ml-1" />;
    return projSortDir === "asc" ? <ChevronUp className="h-3 w-3 inline ml-1" /> : <ChevronDown className="h-3 w-3 inline ml-1" />;
  };
  const sortedList = [...list].sort((a, b) => {
    let av: string | number, bv: string | number;
    switch (projSortKey) {
      case "date": av = a.endDate || a.date || ""; bv = b.endDate || b.date || ""; break;
      case "quoteAmount": av = Number(a.quoteAmount); bv = Number(b.quoteAmount); break;
      case "finalReceived": av = Number(a.finalReceived); bv = Number(b.finalReceived); break;
      case "client": av = a.client || ""; bv = b.client || ""; break;
      case "status": av = a.status || ""; bv = b.status || ""; break;
      default: av = a.quoteId || ""; bv = b.quoteId || ""; break;
    }
    const cmp = typeof av === "number" ? (av as number) - (bv as number) : String(av).localeCompare(String(bv), "zh-Hant");
    return projSortDir === "asc" ? cmp : -cmp;
  });

  // Only count money for active in-progress projects — 報價中/不成功/已完成 excluded from KPI
  const totalReceived = list
    .filter((p) => p.status === "進行中")
    .reduce((sum, p) => sum + p.finalReceived, 0);
  const estimatedCost = totalReceived * 0.6;
  const estimatedProfit = totalReceived * 0.4;
  const pendingQuoteTotal = list
    .filter((p) => p.status === "報價中")
    .reduce((sum, p) => sum + p.quoteAmount, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "已完成":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 text-xs">
            已完成
          </Badge>
        );
      case "不成功":
        return (
          <Badge
            variant="secondary"
            className="bg-gray-100 text-gray-500 hover:bg-gray-100 text-xs"
          >
            不成功
          </Badge>
        );
      case "報價中":
        return (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 text-xs">
            報價中
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDepositBadge = (depositStatus: string) => {
    if (!depositStatus || depositStatus === "無訂金" || depositStatus === "無") {
      return (
        <Badge
          variant="outline"
          className="text-xs text-gray-400 border-gray-200"
        >
          無訂金
        </Badge>
      );
    }
    return (
      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200 text-xs">
        有訂金
      </Badge>
    );
  };

  const kpiCards = [
    {
      label: "工程總營業額（實收）",
      value: formatHKD(totalReceived),
      sub: "已完成工程合計",
      icon: <DollarSign className="h-4 w-4 text-blue-600" />,
      color: "border-l-blue-500",
      valueClass: "text-blue-700",
    },
    {
      label: "預估工程成本 (60%)",
      value: formatHKD(estimatedCost),
      sub: "人工、材料及雜費",
      icon: <Wrench className="h-4 w-4 text-orange-500" />,
      color: "border-l-orange-400",
      valueClass: "text-orange-600",
    },
    {
      label: "預計淨利潤 (40%)",
      value: formatHKD(estimatedProfit),
      sub: "扣除成本後估算",
      icon: <TrendingUp className="h-4 w-4 text-green-600" />,
      color: "border-l-green-500",
      valueClass: "text-green-700",
    },
    {
      label: "報價中工程總值",
      value: formatHKD(pendingQuoteTotal),
      sub: `共 ${list.filter((p) => p.status === "報價中").length} 個待確認報價`,
      icon: <ChartBar className="h-4 w-4 text-purple-500" />,
      color: "border-l-purple-400",
      valueClass: "text-purple-700",
    },
  ];

  return (
    <div className="space-y-5 flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">過往報價紀錄 / 對帳庫</h1>
        <Tabs
          value={taxView}
          onValueChange={(v) => handleTaxViewChange(v as "kwunman" | "gov")}
        >
          <TabsList>
            <TabsTrigger value="kwunman">冠文年</TabsTrigger>
            <TabsTrigger value="gov">政府年</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Year filter */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-muted-foreground font-medium mr-1">
          年份篩選：
        </span>
        <button
          onClick={() => setYearFilter("all")}
          className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
            yearFilter === "all"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
          }`}
        >
          開業至今
        </button>
        {distinctYears.map((year) => (
          <button
            key={year}
            onClick={() => setYearFilter(year)}
            className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
              yearFilter === year
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
          >
            {year}
          </button>
        ))}
        {yearFilter !== "all" && (
          <span className="text-xs text-muted-foreground ml-2">
            共 {list.length} 條紀錄
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiCards.map((card) => (
          <Card
            key={card.label}
            className={`border-l-4 ${card.color} shadow-sm`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">
                  {card.label}
                </span>
                {card.icon}
              </div>
              <div className={`text-xl font-bold ${card.valueClass}`}>
                {card.value}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {card.sub}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="p-4 border-b flex flex-col sm:flex-row gap-3 items-center bg-muted/20">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜尋編號、客戶或工程項目..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="全部項目" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部項目</SelectItem>
              <SelectItem value="報價中">報價中</SelectItem>
              <SelectItem value="已完成">已完成</SelectItem>
              <SelectItem value="不成功">不成功</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto text-sm text-muted-foreground whitespace-nowrap">
            共 {list.length} 條紀錄
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-20 cursor-pointer select-none" onClick={() => handleProjSort("quoteId")}>
                  編號<ProjSortIcon col="quoteId" />
                </TableHead>
                <TableHead className="w-32 cursor-pointer select-none" onClick={() => handleProjSort("date")}>
                  完工日 / 季度<ProjSortIcon col="date" />
                </TableHead>
                <TableHead className="max-w-[180px]">地點 / 項目</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleProjSort("client")}>
                  客戶<ProjSortIcon col="client" />
                </TableHead>
                <TableHead className="text-right w-28">已收</TableHead>
                <TableHead className="text-right w-28 cursor-pointer select-none" onClick={() => handleProjSort("quoteAmount")}>
                  原金額<ProjSortIcon col="quoteAmount" />
                </TableHead>
                <TableHead className="text-right w-28 cursor-pointer select-none" onClick={() => handleProjSort("finalReceived")}>
                  實收大數<ProjSortIcon col="finalReceived" />
                </TableHead>
                <TableHead className="w-20">訂金狀態</TableHead>
                <TableHead className="w-20 cursor-pointer select-none" onClick={() => handleProjSort("status")}>
                  狀態<ProjSortIcon col="status" />
                </TableHead>
                <TableHead className="w-16 text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <TableRow key={i}>
                        {Array(9)
                          .fill(0)
                          .map((_, j) => (
                            <TableCell key={j}>
                              <Skeleton className="h-5 w-full" />
                            </TableCell>
                          ))}
                      </TableRow>
                    ))
                : list.length === 0
                  ? (
                    <TableRow>
                      <TableCell
                        colSpan={10}
                        className="h-32 text-center text-muted-foreground"
                      >
                        沒有找到符合條件的紀錄
                      </TableCell>
                    </TableRow>
                  )
                  : sortedList.map((p) => {
                      const displayDate = p.endDate || p.date;
                      const quarter =
                        taxView === "kwunman"
                          ? p.taxQuarterKwunman
                          : p.taxQuarterGov;
                      const quotePrefix =
                        taxView === "kwunman" ? "K" : "G";
                      const receivedDiff = p.finalReceived - p.quoteAmount;
                      return (
                        <TableRow
                          key={p.id}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => setSelectedProject(p)}
                        >
                          <TableCell className="font-medium text-primary text-sm">
                            {p.quoteId}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {displayDate
                                ? formatDate(displayDate)
                                : (
                                  <span className="text-muted-foreground">
                                    未有
                                  </span>
                                )}
                            </div>
                            {quarter && (
                              <div className="text-xs text-muted-foreground">
                                {quotePrefix}: {quarter}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[180px]">
                            <div
                              className="font-medium text-sm truncate"
                              title={p.location}
                            >
                              {p.location}
                            </div>
                            <div
                              className="text-xs text-muted-foreground truncate"
                              title={p.projectItem}
                            >
                              {p.projectItem}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{p.client}</TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {p.status === "不成功" || p.status === "已完成" || p.depositStatus !== "有訂金" ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (p.totalPaid ?? 0) > 0 ? (
                              <span className="text-blue-600 font-semibold">{formatHKD(p.totalPaid ?? 0)}</span>
                            ) : p.status === "施工中" && p.paymentTerms ? (
                              (() => {
                                const m = p.paymentTerms.match(/HK\$([\d,]+)/);
                                const hint = m ? parseInt(m[1].replace(/,/g, ""), 10) : null;
                                return hint ? (
                                  <span className="text-amber-600 text-xs leading-tight">
                                    應收訂金<br />{formatHKD(hint)}
                                  </span>
                                ) : <span className="text-muted-foreground">—</span>;
                              })()
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatHKD(p.quoteAmount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {p.status !== "進行中" ? (
                              <span className="text-muted-foreground text-sm">
                                —
                              </span>
                            ) : (
                              <div>
                                <div
                                  className={`font-mono text-sm font-semibold ${
                                    p.finalReceived === 0
                                      ? "text-muted-foreground"
                                      : "text-green-700"
                                  }`}
                                >
                                  {formatHKD(p.finalReceived)}
                                </div>
                                {receivedDiff > 0 && (
                                    <div className="text-xs text-green-600">
                                      +{formatHKD(receivedDiff)}
                                    </div>
                                  )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {getDepositBadge(p.depositStatus)}
                          </TableCell>
                          <TableCell>{getStatusBadge(p.status)}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-0.5">
                              <PrintQuoteButton project={p} />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProject(p);
                                }}
                                title="收款管理"
                              >
                                <DollarSign className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {selectedProject && (
        <PaymentSheet
          project={selectedProject}
          open={!!selectedProject}
          onClose={() => setSelectedProject(null)}
          onProjectUpdated={(updated) => setSelectedProject(updated)}
        />
      )}
    </div>
  );
}
