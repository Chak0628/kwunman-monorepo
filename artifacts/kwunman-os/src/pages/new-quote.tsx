import { useState } from "react";
import { useLocation } from "wouter";
import {
  useGetNextProjectId,
  useCreateProject,
  useListClients,
  useCreateQuoteItem,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  Settings2,
  Phone,
  Mail,
  MapPin,
  Loader2,
  X,
  ChevronDown,
  ChevronRight,
  ImageIcon,
  XCircle,
  GripVertical,
  Printer,
  BookText,
} from "lucide-react";
import { useListNoteTemplates } from "@workspace/api-client-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const DEFAULT_PROJECT_TYPES = ["醫療", "金屬", "建築", "貨品", "其他"];
const DEFAULT_LOCATIONS: Record<string, string[]> = {
  醫療: [
    "律敦治醫院",
    "威爾斯親王醫院",
    "廣華醫院",
    "伊利沙伯醫院",
    "瑪麗醫院",
    "東區尤德夫人那打素醫院",
    "聯合醫院",
    "將軍澳醫院",
    "大埔醫院",
    "屯門醫院",
    "仁濟醫院",
    "博愛醫院",
    "北區醫院",
    "基督教聯合醫院",
    "流浮山醫院",
    "葛量洪醫院",
    "瑪嘉烈醫院",
    "明愛醫院",
    "天水圍醫院",
    "靈實醫院",
  ],
  金屬: [
    "觀塘工業區",
    "荃灣工業區",
    "葵涌工業區",
    "元朗工業區",
    "新蒲崗",
    "長沙灣",
    "九龍城",
    "土瓜灣",
    "紅磡",
    "火炭工業區",
  ],
  建築: [
    "港島區",
    "九龍區",
    "新界東",
    "新界西",
    "沙田",
    "屯門",
    "元朗",
    "離島",
    "將軍澳",
    "馬鞍山",
  ],
  貨品: ["送貨上門", "倉庫自取", "指定地點", "工廠直送"],
  其他: ["其他地點"],
};

type LineItem = {
  id: string;
  description: string;
  unitPrice: number;
  qty: number;
  notes: string;
  imageUrl: string;
  expanded: boolean;
  numbered: boolean;
};

type Client = {
  id: number;
  clientId: string;
  company: string;
  contactPerson: string;
  address: string;
  contactInfo: string;
  department: string;
};

function ListSettingsDialog({
  open,
  onClose,
  title,
  items,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  items: string[];
  onSave: (items: string[]) => void;
}) {
  const [localItems, setLocalItems] = useState<string[]>(items);
  const [newItem, setNewItem] = useState("");

  const handleAdd = () => {
    if (newItem.trim()) {
      setLocalItems((prev) => [...prev, newItem.trim()]);
      setNewItem("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {localItems.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 bg-muted/40 rounded px-2 py-1.5"
            >
              <span className="flex-1 text-sm">{item}</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                onClick={() =>
                  setLocalItems((prev) => prev.filter((_, i) => i !== idx))
                }
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          {localItems.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              未有項目
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="輸入新項目..."
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
          />
          <Button variant="outline" onClick={handleAdd}>
            加入
          </Button>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onClose}>
            取消
          </Button>
          <Button
            size="sm"
            className="bg-[#1a2744] hover:bg-[#1a2744]/90 text-white"
            onClick={() => {
              onSave(localItems);
              onClose();
            }}
          >
            儲存
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NoteTemplatePicker({ onSelect }: { onSelect: (content: string) => void }) {
  const { data: templates = [] } = useListNoteTemplates();
  const [open, setOpen] = useState(false);

  if (templates.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm"
          className="h-6 px-2 py-0 text-[10px] gap-1 border-[#1a2744]/30 text-[#1a2744]/70 hover:text-[#1a2744]">
          <BookText className="h-3 w-3" />
          快速範本
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-1">
        {templates.map(t => (
          <button
            key={t.id}
            type="button"
            className="w-full text-left px-3 py-2 rounded hover:bg-muted text-sm"
            onClick={() => { onSelect(t.content); setOpen(false); }}
          >
            <div className="font-medium text-xs text-[#1a2744]">{t.title}</div>
            <div className="text-xs text-muted-foreground truncate mt-0.5">{t.content}</div>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export default function NewQuote() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: nextIdData } = useGetNextProjectId();
  const { data: clientsRaw = [] } = useListClients();
  const createProject = useCreateProject();
  const createQuoteItemMutation = useCreateQuoteItem();

  const clients = clientsRaw as Client[];
  const quoteId = nextIdData?.nextId ?? "---";

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedContactId, setSelectedContactId] = useState("");
  const [projectType, setProjectType] = useState("");
  const [locationPreset, setLocationPreset] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [itemName, setItemName] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: "1", description: "", unitPrice: 0, qty: 1, notes: "", imageUrl: "", expanded: false, numbered: true },
    { id: "2", description: "", unitPrice: 0, qty: 1, notes: "", imageUrl: "", expanded: false, numbered: true },
    { id: "3", description: "", unitPrice: 0, qty: 1, notes: "", imageUrl: "", expanded: false, numbered: true },
  ]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [discountType, setDiscountType] = useState<"cash" | "percent">("cash");
  const [discountValue, setDiscountValue] = useState(0);
  const [notes, setNotes] = useState("");

  // ── 收款條款 state ──
  type Installment = { id: string; type: string; pct: number };
  const [depositOption, setDepositOption] = useState<"無訂金" | "有訂金">("無訂金");
  const [installments, setInstallments] = useState<Installment[]>([
    { id: "1", type: "訂金", pct: 30 },
    { id: "2", type: "中期款", pct: 60 },
    { id: "3", type: "尾款", pct: 10 },
  ]);
  const installmentTotal = installments.reduce((s, i) => s + i.pct, 0);
  const applyTemplate = (rows: Omit<Installment, "id">[]) =>
    setInstallments(rows.map((r, i) => ({ ...r, id: String(i + 1) })));
  const computePaymentTerms = () => {
    if (depositOption === "無訂金") return null;
    return installments
      .map(
        (i) =>
          `${i.type}: ${i.pct}%（HK$${Math.round((grandTotal * i.pct) / 100).toLocaleString()}）`
      )
      .join("\n");
  };

  const [projectTypes, setProjectTypes] = useState<string[]>(() => {
    try {
      const s = localStorage.getItem("kwunman_project_types");
      return s ? JSON.parse(s) : DEFAULT_PROJECT_TYPES;
    } catch {
      return DEFAULT_PROJECT_TYPES;
    }
  });
  const [locationMap, setLocationMap] = useState<Record<string, string[]>>(
    () => {
      try {
        const s = localStorage.getItem("kwunman_locations");
        return s ? JSON.parse(s) : DEFAULT_LOCATIONS;
      } catch {
        return DEFAULT_LOCATIONS;
      }
    }
  );
  const [showTypeSettings, setShowTypeSettings] = useState(false);
  const [showLocationSettings, setShowLocationSettings] = useState(false);

  const companies = [...new Set(clients.map((c) => c.company))].sort();
  const contactsForCompany = clients.filter(
    (c) => c.company === selectedCompany
  );
  const selectedContact = clients.find((c) => c.clientId === selectedContactId);

  const handleCompanyChange = (company: string) => {
    setSelectedCompany(company);
    setSelectedContactId("");
  };

  const handleTypeChange = (type: string) => {
    setProjectType(type);
    setLocationPreset("");
  };

  const subtotal = lineItems.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const discountAmt =
    discountType === "cash" ? discountValue : subtotal * (discountValue / 100);
  const grandTotal = Math.max(0, subtotal - discountAmt);

  const newBlankItem = (): LineItem => ({
    id: Date.now().toString() + Math.random(),
    description: "",
    unitPrice: 0,
    qty: 1,
    notes: "",
    imageUrl: "",
    expanded: false,
    numbered: true,
  });

  const addLineItem = () =>
    setLineItems((prev) => [...prev, newBlankItem()]);

  const insertRowAfter = (idx: number) =>
    setLineItems((prev) => {
      const next = [...prev];
      next.splice(idx + 1, 0, newBlankItem());
      return next;
    });

  const removeLineItem = (id: string) =>
    setLineItems((prev) =>
      prev.length > 1 ? prev.filter((i) => i.id !== id) : prev
    );

  const updateLineItem = (
    id: string,
    field: keyof LineItem,
    value: string | number | boolean
  ) =>
    setLineItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    );

  const toggleExpand = (id: string) =>
    setLineItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, expanded: !i.expanded } : i))
    );

  const toggleNumbered = (id: string) =>
    setLineItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, numbered: !i.numbered } : i))
    );

  const handleImageUpload = (id: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      updateLineItem(id, "imageUrl", (e.target?.result as string) ?? "");
    };
    reader.readAsDataURL(file);
  };

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIdx(idx);
  };

  const handleDrop = (e: React.DragEvent, toIdx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === toIdx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    setLineItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(toIdx, 0, moved!);
      return next;
    });
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setDragOverIdx(null);
  };

  // Dynamic seq numbers: only count rows where numbered === true
  let seqCounter = 0;
  const seqNumbers = lineItems.map((item) => {
    if (item.numbered) { seqCounter++; return seqCounter; }
    return null;
  });

  const saveProjectTypes = (types: string[]) => {
    setProjectTypes(types);
    localStorage.setItem("kwunman_project_types", JSON.stringify(types));
  };

  const saveLocations = (locs: string[]) => {
    const updated = { ...locationMap, [projectType]: locs };
    setLocationMap(updated);
    localStorage.setItem("kwunman_locations", JSON.stringify(updated));
  };

  const currentLocations = projectType ? (locationMap[projectType] ?? []) : [];

  const parseContactInfo = (info: string) => {
    const mobile =
      info.match(/(?:M:|Mobile:|Tel:)\s*([^|,\n]+)/i)?.[1]?.trim() ?? "";
    const email =
      info.match(/(?:E:|Email:)\s*([^|,\n]+)/i)?.[1]?.trim() ?? "";
    return { mobile, email };
  };
  const contactInfo = selectedContact
    ? parseContactInfo(selectedContact.contactInfo)
    : { mobile: "", email: "" };

  const handlePrint = () => {
    const validItems = lineItems.filter((i) => i.description.trim());
    const location =
      locationPreset && siteAddress
        ? `${locationPreset} — ${siteAddress}`
        : locationPreset || siteAddress || "（未填）";
    const win = window.open("", "_blank");
    if (!win) return;
    const itemRows = validItems
      .filter((i) => i.unitPrice > 0 || i.description)
      .map((item, idx) => {
        const amt = item.unitPrice * item.qty;
        return `
          <tr>
            <td style="text-align:center;color:#666;">${idx + 1}</td>
            <td>
              <div style="font-weight:600;">${item.description || "—"}</div>
              ${item.notes ? `<div style="font-size:12px;color:#555;margin-top:3px;white-space:pre-line;">${item.notes}</div>` : ""}
            </td>
            <td style="text-align:right;">HK$${item.unitPrice.toLocaleString()}</td>
            <td style="text-align:center;">${item.qty}</td>
            <td style="text-align:right;font-weight:600;">HK$${amt.toLocaleString()}</td>
          </tr>`;
      })
      .join("");
    const discountLine =
      discountValue > 0
        ? `<tr style="color:#c00;"><td colspan="4" style="text-align:right;">折扣</td><td style="text-align:right;">- HK$${discountAmt.toLocaleString()}</td></tr>`
        : "";
    const termsHtml = depositOption === "有訂金" && installments.length > 0
      ? `<div class="section"><div class="section-title">付款條款</div>
          <table style="width:100%;border-collapse:collapse;">
          ${installments.map(i => `<tr><td style="padding:4px 0;color:#333;">${i.type}</td><td style="text-align:right;font-weight:600;">HK$${Math.round((grandTotal * i.pct) / 100).toLocaleString()} (${i.pct}%)</td></tr>`).join("")}
          </table></div>`
      : "";
    win.document.write(`
      <html><head><title>報價單 ${quoteId}</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: "Microsoft JhengHei", "PingFang TC", sans-serif; padding: 48px; max-width: 800px; margin: 0 auto; color: #111; font-size:14px; }
        .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px; border-bottom:2px solid #1a2744; padding-bottom:16px; }
        .company-name { font-size:20px; font-weight:900; color:#1a2744; letter-spacing:1px; }
        .company-sub { font-size:11px; color:#666; margin-top:3px; }
        .quote-meta { text-align:right; }
        .quote-no { font-size:22px; font-weight:900; color:#1a2744; }
        .quote-label { font-size:11px; color:#888; margin-bottom:2px; }
        .client-block { background:#f8f9fb; border:1px solid #e2e8f0; border-radius:6px; padding:14px 18px; margin-bottom:20px; display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        .client-row { font-size:13px; }
        .client-label { font-size:10px; color:#888; text-transform:uppercase; letter-spacing:.8px; margin-bottom:2px; }
        table.items { width:100%; border-collapse:collapse; margin-bottom:16px; }
        table.items th { background:#1a2744; color:white; padding:8px 10px; font-size:12px; font-weight:600; }
        table.items td { padding:9px 10px; border-bottom:1px solid #eee; vertical-align:top; font-size:13px; }
        table.items tr:last-child td { border-bottom:none; }
        .total-section { margin-left:auto; width:260px; }
        .total-row { display:flex; justify-content:space-between; padding:5px 0; font-size:13px; border-bottom:1px solid #f0f0f0; }
        .grand-total { display:flex; justify-content:space-between; padding:10px 0; font-size:18px; font-weight:900; color:#1a2744; border-top:2px solid #1a2744; margin-top:4px; }
        .section { margin-top:20px; }
        .section-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; color:#888; margin-bottom:8px; }
        .notes-box { background:#fffbeb; border:1px solid #fde68a; border-radius:6px; padding:12px 14px; font-size:13px; white-space:pre-line; color:#78350f; }
        .footer { margin-top:40px; padding-top:16px; border-top:1px solid #e2e8f0; font-size:11px; color:#999; text-align:center; }
        .sig-grid { display:grid; grid-template-columns:1fr 1fr; gap:40px; margin-top:40px; }
        .sig-box { border-top:1px solid #ccc; padding-top:8px; font-size:12px; color:#666; }
        @media print { .no-print { display:none; } body { padding:24px; } }
      </style></head><body>
      <div class="header">
        <div>
          <div class="company-name">冠文鋼結構工程有限公司</div>
          <div class="company-sub">KWUNMAN STEEL STRUCTURE ENGINEERING CO. LTD</div>
        </div>
        <div class="quote-meta">
          <div class="quote-label">報價單 QUOTATION</div>
          <div class="quote-no">${quoteId}</div>
          <div style="font-size:12px;color:#555;margin-top:4px;">日期：${date}</div>
        </div>
      </div>
      <div class="client-block">
        <div>
          <div class="client-label">客戶公司</div>
          <div class="client-row" style="font-weight:600;">${selectedCompany || "—"}</div>
        </div>
        <div>
          <div class="client-label">聯絡人</div>
          <div class="client-row">${selectedContact?.contactPerson || "—"}</div>
        </div>
        <div>
          <div class="client-label">工程地點</div>
          <div class="client-row">${location}</div>
        </div>
        <div>
          <div class="client-label">工程類別</div>
          <div class="client-row">${projectType || "—"}</div>
        </div>
        ${contactInfo.mobile ? `<div><div class="client-label">電話</div><div class="client-row">${contactInfo.mobile}</div></div>` : ""}
        ${contactInfo.email ? `<div><div class="client-label">電郵</div><div class="client-row">${contactInfo.email}</div></div>` : ""}
      
      </div>
      <table class="items">
        <thead><tr>
          <th style="width:40px;">#</th>
          <th style="text-align:left;">工程項目</th>
          <th style="text-align:right;width:110px;">單價</th>
          <th style="text-align:center;width:60px;">數量</th>
          <th style="text-align:right;width:110px;">金額</th>
        </tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div class="total-section">
        <div class="total-row"><span>小計</span><span>HK$${subtotal.toLocaleString()}</span></div>
        ${discountLine}
        <div class="grand-total"><span>報價總額</span><span>HK$${grandTotal.toLocaleString()}</span></div>
      </div>
      ${termsHtml}
      ${notes.trim() ? `<div class="section"><div class="section-title">備註</div><div class="notes-box">${notes.trim()}</div></div>` : ""}
      <div class="sig-grid">
        <div class="sig-box">客戶簽署 Client Signature</div>
        <div class="sig-box">公司代表 Company Representative</div>
      </div>
      <div class="footer">冠文鋼結構工程有限公司 · 此報價單由系統自動生成</div>
      <div class="no-print" style="margin-top:24px;text-align:center;">
        <button onclick="window.print()" style="padding:10px 28px;background:#1a2744;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;">列印 / 儲存為 PDF</button>
      </div>
      </body></html>`);
    win.document.close();
  };

  const onSubmit = () => {
    if (!selectedCompany) {
      toast({ variant: "destructive", title: "請先選擇客戶公司" });
      return;
    }
    const validItems = lineItems.filter((i) => i.description.trim());
    const location =
      locationPreset && siteAddress
        ? `${locationPreset} — ${siteAddress}`
        : locationPreset || siteAddress || "";

    createProject.mutate(
      {
        data: {
          quoteId,
          date,
          client: selectedCompany,
          clientId: selectedContactId || "",
          projectType: projectType || null,
          location,
          projectItem:
            itemName || validItems[0]?.description || location || "(未填)",
          quoteAmount: grandTotal,
          status: "報價中",
          depositStatus: depositOption,
          paymentTerms: computePaymentTerms(),
          notes: notes.trim() || null,
        },
      },
      {
        onSuccess: (project: unknown) => {
          const p = project as { quoteId: string };
          validItems.forEach((item, idx) => {
            createQuoteItemMutation.mutate({
              data: {
                quoteId: p.quoteId,
                seqNo: idx + 1,
                description: item.description,
                unitPrice: item.unitPrice,
                qty: item.qty,
                notes: item.notes.trim() || null,
                imageUrl: item.imageUrl || null,
              },
            });
          });
          queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
          toast({ title: "成功", description: `報價 ${p.quoteId} 已建立` });
          setLocation("/projects");
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "建立失敗",
            description: "請重試",
          });
        },
      }
    );
  };

  const isPending = createProject.isPending;

  return (
    <div className="max-w-5xl mx-auto pb-10">
      {/* Header bar */}
      <div className="bg-[#1a2744] text-white rounded-t-lg px-6 py-4 flex items-center justify-between">
        <div>
          <div className="font-bold text-lg tracking-wide">冠文專業報價系統</div>
          <div className="text-xs text-blue-300 mt-0.5">
            KWUNMAN STEEL STRUCTURE — PROFESSIONAL OS
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-white border-white/30 bg-transparent hover:bg-white/10"
            onClick={() => setLocation("/projects")}
          >
            取消
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-white border-white/30 bg-transparent hover:bg-white/10 gap-1.5"
            onClick={handlePrint}
          >
            <Printer className="h-3.5 w-3.5" />
            列印報價單
          </Button>
          <Button
            size="sm"
            className="bg-blue-500 hover:bg-blue-400 text-white border-0"
            disabled={isPending}
            onClick={onSubmit}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            儲存報價
          </Button>
        </div>
      </div>

      {/* Form body */}
      <div className="border border-t-0 rounded-b-lg bg-white p-6 space-y-6 shadow-sm">
        {/* Row 1: Quote No + Date */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] font-bold text-[#1a2744] uppercase tracking-widest mb-1.5 block">
              報價單號 (Quotation No.)
            </label>
            <Input
              readOnly
              value={quoteId}
              className="font-mono font-bold text-[#1a2744] text-base border-[#1a2744]/30 bg-[#1a2744]/5"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[#1a2744] uppercase tracking-widest mb-1.5 block">
              日期 (Date)
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border-[#1a2744]/30"
            />
          </div>
        </div>

        {/* Row 2: Client + Contact */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-[#1a2744] uppercase tracking-widest mb-1.5 block">
              客戶公司 (Client Company)
            </label>
            <Select value={selectedCompany} onValueChange={handleCompanyChange}>
              <SelectTrigger className="border-[#1a2744]/30">
                <SelectValue placeholder="選擇客戶公司..." />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company} value={company}>
                    {company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-[#1a2744] uppercase tracking-widest mb-1.5 block">
              聯絡人 (Attn)
            </label>
            <Select
              value={selectedContactId}
              onValueChange={setSelectedContactId}
              disabled={!selectedCompany}
            >
              <SelectTrigger className="border-[#1a2744]/30">
                <SelectValue
                  placeholder={
                    selectedCompany ? "選擇聯絡人..." : "請先選擇公司"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {contactsForCompany.map((c) => (
                  <SelectItem key={c.clientId} value={c.clientId}>
                    {c.contactPerson}
                    {c.department ? ` — ${c.department}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Contact info strip */}
        {selectedContact && (
          <div className="flex flex-wrap gap-x-6 gap-y-1 bg-[#1a2744]/5 border border-[#1a2744]/10 rounded-md px-4 py-3 text-sm">
            {contactInfo.mobile && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Phone className="h-3.5 w-3.5 text-[#1a2744]" />
                <span className="font-semibold text-[#1a2744] uppercase text-[10px] tracking-wider">
                  Mobile:
                </span>
                <span className="text-sm">{contactInfo.mobile}</span>
              </div>
            )}
            {contactInfo.email && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Mail className="h-3.5 w-3.5 text-[#1a2744]" />
                <span className="font-semibold text-[#1a2744] uppercase text-[10px] tracking-wider">
                  Email:
                </span>
                <span className="text-sm">{contactInfo.email}</span>
              </div>
            )}
            {selectedContact.address && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-[#1a2744]" />
                <span className="font-semibold text-[#1a2744] uppercase text-[10px] tracking-wider">
                  通訊地址:
                </span>
                <span className="text-sm">{selectedContact.address}</span>
              </div>
            )}
          </div>
        )}

        {/* Row 3: Project Type + Location */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-bold text-[#1a2744] uppercase tracking-widest">
                工程類型 (Type)
              </label>
              <button
                type="button"
                className="flex items-center gap-1 text-[10px] text-[#1a2744]/50 hover:text-[#1a2744] transition-colors"
                onClick={() => setShowTypeSettings(true)}
              >
                <Settings2 className="h-3 w-3" />
                管理
              </button>
            </div>
            <Select value={projectType} onValueChange={handleTypeChange}>
              <SelectTrigger className="border-[#1a2744]/30">
                <SelectValue placeholder="選擇工程類型..." />
              </SelectTrigger>
              <SelectContent>
                {projectTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-bold text-[#1a2744] uppercase tracking-widest">
                常用地點 (Location)
              </label>
              <button
                type="button"
                disabled={!projectType}
                className="flex items-center gap-1 text-[10px] text-[#1a2744]/50 hover:text-[#1a2744] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                onClick={() => setShowLocationSettings(true)}
              >
                <Settings2 className="h-3 w-3" />
                管理
              </button>
            </div>
            <Select
              value={locationPreset}
              onValueChange={setLocationPreset}
              disabled={!projectType}
            >
              <SelectTrigger className="border-[#1a2744]/30">
                <SelectValue
                  placeholder={
                    projectType ? "選擇常用地點..." : "請先選擇工程類型"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {currentLocations.map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    {loc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 4: Item Name + Site Address */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-[#1a2744] uppercase tracking-widest mb-1.5 block">
              項目名稱 (Item Description)
            </label>
            <Input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="輸入工程名稱..."
              className="border-[#1a2744]/30"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[#1a2744] uppercase tracking-widest mb-1.5 block">
              施工地址 (Site Address)
            </label>
            <Input
              value={siteAddress}
              onChange={(e) => setSiteAddress(e.target.value)}
              placeholder="輸入工地現場詳細地址..."
              className="border-[#1a2744]/30"
            />
          </div>
        </div>

        {/* Line items table */}
        <div className="border border-[#1a2744]/20 rounded-lg overflow-hidden">
          {/* Table header */}
          <div className="bg-[#1a2744] text-white grid grid-cols-[1.5rem_2rem_3rem_1fr_9rem_6rem_9rem_4.5rem] text-[10px] font-bold uppercase tracking-widest">
            <div />
            <div />
            <div className="px-1 py-2.5 text-center">序號</div>
            <div className="px-3 py-2.5">施工範圍 (Scope of Work)</div>
            <div className="px-3 py-2.5 text-right">單價 Unit Price</div>
            <div className="px-2 py-2.5 text-center">數量 Qty</div>
            <div className="px-3 py-2.5 text-right">金額 (HKD)</div>
            <div />
          </div>

          {/* Line item rows */}
          {lineItems.map((item, idx) => {
            const seqNum = seqNumbers[idx];
            const isSubRow = !item.numbered;
            const isDragTarget = dragOverIdx === idx && dragIdx !== idx;
            return (
              <div
                key={item.id}
                className={`border-b border-[#1a2744]/10 group transition-colors ${
                  isDragTarget ? "border-t-2 border-t-blue-400" : ""
                } ${dragIdx === idx ? "opacity-40" : ""} ${
                  isSubRow ? "bg-[#1a2744]/[0.02]" : ""
                }`}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
              >
                {/* Main row */}
                <div className="grid grid-cols-[1.5rem_2rem_3rem_1fr_9rem_6rem_9rem_4.5rem] items-start hover:bg-blue-50/20 transition-colors">
                  {/* Drag handle */}
                  <div className="py-3 flex items-start justify-center pt-3.5 cursor-grab active:cursor-grabbing">
                    <GripVertical className="h-4 w-4 text-[#1a2744]/25 group-hover:text-[#1a2744]/50 transition-colors" />
                  </div>
                  {/* Expand toggle */}
                  <div className="py-3 flex items-start justify-center pt-3.5">
                    <button
                      type="button"
                      onClick={() => toggleExpand(item.id)}
                      className="text-[#1a2744]/40 hover:text-[#1a2744] transition-colors"
                      title={item.expanded ? "收起詳情" : "展開說明 / 加圖片"}
                    >
                      {item.expanded
                        ? <ChevronDown className="h-3.5 w-3.5" />
                        : <ChevronRight className="h-3.5 w-3.5" />
                      }
                    </button>
                  </div>
                  {/* Seq number — click to toggle */}
                  <div className="px-1 py-3 text-center self-center">
                    <button
                      type="button"
                      onClick={() => toggleNumbered(item.id)}
                      title={item.numbered ? "點擊取消序號（變成附加說明行）" : "點擊啟用序號"}
                      className={`w-6 h-6 rounded text-xs font-bold transition-all ${
                        item.numbered
                          ? "bg-[#1a2744]/10 text-[#1a2744] hover:bg-red-50 hover:text-red-400"
                          : "border border-dashed border-[#1a2744]/20 text-[#1a2744]/20 hover:border-[#1a2744]/50 hover:text-[#1a2744]/50"
                      }`}
                    >
                      {item.numbered ? seqNum : "–"}
                    </button>
                  </div>
                  {/* Description */}
                  <div className={`px-3 py-2 ${isSubRow ? "pl-6" : ""}`}>
                    <Textarea
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                      placeholder={isSubRow ? "附加說明行（不佔序號）..." : "請輸入施工詳細內容..."}
                      className={`resize-none min-h-[2rem] text-sm border-transparent focus:border-[#1a2744]/30 p-1 ${
                        isSubRow ? "text-[#1a2744]/70 italic" : ""
                      }`}
                      rows={2}
                    />
                    <div className="flex gap-1 mt-0.5">
                      {item.notes && (
                        <span className="text-[10px] text-[#1a2744]/50 bg-[#1a2744]/5 rounded px-1.5 py-0.5">含說明</span>
                      )}
                      {item.imageUrl && (
                        <span className="text-[10px] text-blue-600/70 bg-blue-50 rounded px-1.5 py-0.5 flex items-center gap-0.5">
                          <ImageIcon className="h-2.5 w-2.5" /> 含圖片
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Unit price — hidden for sub-rows */}
                  <div className="px-2 py-3 self-center">
                    {!isSubRow ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground shrink-0">$</span>
                        <Input
                          type="number"
                          min={0}
                          step={100}
                          value={item.unitPrice || ""}
                          placeholder="0"
                          onChange={(e) => updateLineItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm text-right border-[#1a2744]/20 w-full"
                        />
                      </div>
                    ) : (
                      <div className="h-8 border-l border-dashed border-[#1a2744]/10 ml-4" />
                    )}
                  </div>
                  {/* Qty — hidden for sub-rows */}
                  <div className="px-2 py-3 self-center">
                    {!isSubRow ? (
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        value={item.qty || ""}
                        placeholder="1"
                        onChange={(e) => updateLineItem(item.id, "qty", parseFloat(e.target.value) || 1)}
                        className="h-8 text-sm text-center border-[#1a2744]/20"
                      />
                    ) : (
                      <div className="h-8 border-l border-dashed border-[#1a2744]/10 ml-2" />
                    )}
                  </div>
                  {/* Amount — hidden for sub-rows */}
                  <div className="px-3 py-3 self-center text-right">
                    {!isSubRow ? (
                      <span className="text-sm font-semibold text-[#1a2744]">
                        HK$ {(item.unitPrice * item.qty).toLocaleString("en-HK", { minimumFractionDigits: 0 })}
                      </span>
                    ) : (
                      <div className="h-8 border-l border-dashed border-[#1a2744]/10 ml-8" />
                    )}
                  </div>
                  {/* Actions: insert + delete */}
                  <div className="py-2 self-center flex flex-col items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-[#1a2744]/50 hover:text-[#1a2744] hover:bg-[#1a2744]/10 transition-opacity"
                      onClick={() => insertRowAfter(idx)}
                      title="在此行之後插入新行"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive transition-opacity"
                      onClick={() => removeLineItem(item.id)}
                      title="刪除此行"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Expanded rich section */}
                {item.expanded && (
                  <div className="mx-3 mb-3 rounded-lg border border-[#1a2744]/10 bg-[#1a2744]/[0.02] overflow-hidden">
                    <div className="grid grid-cols-2 divide-x divide-[#1a2744]/10">
                      <div className="p-3">
                        <div className="text-[10px] font-bold text-[#1a2744] uppercase tracking-widest mb-2">
                          施工說明 / 附加備份 (Sub-notes)
                        </div>
                        <Textarea
                          value={item.notes}
                          onChange={(e) => updateLineItem(item.id, "notes", e.target.value)}
                          placeholder={"包含設計與製作:\n• 按現場情況設計懸掛支架\n• 安裝設計懸掛支架\n不包括: ..."}
                          className="resize-none text-sm border-[#1a2744]/20 bg-white min-h-[120px]"
                          rows={5}
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">每行代表一個要點，可使用 • 符號</p>
                      </div>
                      <div className="p-3">
                        <div className="text-[10px] font-bold text-[#1a2744] uppercase tracking-widest mb-2">
                          設計圖 / 現場相片 (Image)
                        </div>
                        {item.imageUrl ? (
                          <div className="relative">
                            <img
                              src={item.imageUrl}
                              alt="item"
                              className="w-full max-h-48 object-contain rounded border border-[#1a2744]/10 bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => updateLineItem(item.id, "imageUrl", "")}
                              className="absolute top-1 right-1 text-red-500 hover:text-red-600 bg-white rounded-full shadow"
                              title="移除圖片"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <label
                            htmlFor={`img-${item.id}`}
                            className="flex flex-col items-center justify-center h-[120px] border-2 border-dashed border-[#1a2744]/20 rounded-lg cursor-pointer hover:border-[#1a2744]/50 hover:bg-[#1a2744]/5 transition-colors"
                          >
                            <ImageIcon className="h-8 w-8 text-[#1a2744]/30 mb-2" />
                            <span className="text-xs text-[#1a2744]/50">點擊上載圖片</span>
                            <span className="text-[10px] text-[#1a2744]/30 mt-0.5">JPG / PNG</span>
                          </label>
                        )}
                        <input
                          id={`img-${item.id}`}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(item.id, file);
                            e.target.value = "";
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add row button */}
          <div className="px-4 py-3 bg-muted/20 border-b border-[#1a2744]/10">
            <Button
              variant="outline"
              size="sm"
              onClick={addLineItem}
              className="border-dashed border-[#1a2744]/30 text-[#1a2744]/60 hover:border-[#1a2744] hover:text-[#1a2744] text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              新增主要報價項目 (Add Item)
            </Button>
          </div>

          {/* Discount + Total footer */}
          <div className="px-6 py-4 space-y-3">
            <div className="flex items-center justify-end gap-3">
              <span className="text-sm text-muted-foreground">
                折扣 (Discount)
              </span>
              <div className="flex rounded-md overflow-hidden border border-[#1a2744]/20">
                <button
                  type="button"
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    discountType === "cash"
                      ? "bg-[#1a2744] text-white"
                      : "bg-white text-[#1a2744] hover:bg-[#1a2744]/10"
                  }`}
                  onClick={() => setDiscountType("cash")}
                >
                  現金 $
                </button>
                <button
                  type="button"
                  className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-[#1a2744]/20 ${
                    discountType === "percent"
                      ? "bg-[#1a2744] text-white"
                      : "bg-white text-[#1a2744] hover:bg-[#1a2744]/10"
                  }`}
                  onClick={() => setDiscountType("percent")}
                >
                  百分比 %
                </button>
              </div>
              <Input
                type="number"
                min={0}
                value={discountValue || ""}
                placeholder="0"
                onChange={(e) =>
                  setDiscountValue(parseFloat(e.target.value) || 0)
                }
                className="w-24 h-8 text-right border-[#1a2744]/20"
              />
              <span className="w-36 text-right text-sm font-medium text-destructive">
                - HK$ {discountAmt.toLocaleString("en-HK")}
              </span>
            </div>

            <div className="flex items-center justify-end gap-4 pt-3 border-t border-[#1a2744]/10">
              <span className="text-base font-bold text-[#1a2744] tracking-wide">
                總計 GRAND TOTAL
              </span>
              <span className="text-2xl font-bold text-[#1a2744] min-w-[10rem] text-right">
                HK${" "}
                {grandTotal.toLocaleString("en-HK", {
                  minimumFractionDigits: 0,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* 收款條款 */}
        <div className="border border-[#1a2744]/20 rounded-lg p-4 space-y-3">
          <label className="text-[10px] font-bold text-[#1a2744] uppercase tracking-widest block">
            收款條款 (Payment Terms)
          </label>

          {/* 有/無訂金 toggle */}
          <div className="flex gap-2">
            {(["無訂金", "有訂金"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setDepositOption(opt)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  depositOption === opt
                    ? "bg-[#1a2744] text-white border-[#1a2744]"
                    : "bg-white text-[#1a2744] border-[#1a2744]/30 hover:border-[#1a2744]"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>

          {depositOption === "有訂金" && (
            <div className="space-y-3">
              {/* 快速套用範本 */}
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[10px] text-[#1a2744]/60 font-semibold uppercase tracking-wide">快速範本：</span>
                {[
                  { label: "30 + 60 + 10", rows: [{ type: "訂金", pct: 30 }, { type: "中期款", pct: 60 }, { type: "尾款", pct: 10 }] },
                  { label: "50 + 40 + 10", rows: [{ type: "訂金", pct: 50 }, { type: "中期款", pct: 40 }, { type: "尾款", pct: 10 }] },
                  { label: "50 + 50", rows: [{ type: "訂金", pct: 50 }, { type: "尾款", pct: 50 }] },
                  { label: "100% 全數", rows: [{ type: "全數", pct: 100 }] },
                ].map((t) => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => applyTemplate(t.rows)}
                    className="px-3 py-1 text-xs rounded border border-[#1a2744]/25 bg-[#1a2744]/5 hover:bg-[#1a2744]/10 text-[#1a2744] transition-colors"
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* 分期明細表 */}
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_80px_1fr_28px] gap-2 text-[10px] font-semibold text-[#1a2744]/50 uppercase tracking-wide px-1">
                  <span>類型</span>
                  <span className="text-right">百分比</span>
                  <span className="text-right">金額 (HKD)</span>
                  <span />
                </div>
                {installments.map((row, idx) => (
                  <div key={row.id} className="grid grid-cols-[1fr_80px_1fr_28px] gap-2 items-center">
                    <input
                      value={row.type}
                      onChange={(e) =>
                        setInstallments((prev) =>
                          prev.map((r) => r.id === row.id ? { ...r, type: e.target.value } : r)
                        )
                      }
                      className="border border-[#1a2744]/20 rounded px-2 py-1 text-sm w-full focus:outline-none focus:border-[#1a2744]"
                      placeholder="類型"
                    />
                    <div className="flex items-center border border-[#1a2744]/20 rounded overflow-hidden">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={row.pct}
                        onChange={(e) =>
                          setInstallments((prev) =>
                            prev.map((r) => r.id === row.id ? { ...r, pct: Number(e.target.value) } : r)
                          )
                        }
                        className="w-full px-2 py-1 text-sm text-right focus:outline-none"
                      />
                      <span className="pr-1.5 text-sm text-[#1a2744]/50">%</span>
                    </div>
                    <div className="text-right text-sm text-[#1a2744]/70 font-medium">
                      HK${Math.round((grandTotal * row.pct) / 100).toLocaleString()}
                    </div>
                    <button
                      type="button"
                      disabled={installments.length <= 1}
                      onClick={() =>
                        setInstallments((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="text-red-400 hover:text-red-600 disabled:opacity-20 text-base leading-none"
                    >
                      ×
                    </button>
                  </div>
                ))}

                {/* 加行 + 合計 */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      setInstallments((prev) => [
                        ...prev,
                        { id: String(Date.now()), type: "其他", pct: 0 },
                      ])
                    }
                    className="text-xs text-[#1a2744]/60 hover:text-[#1a2744] underline underline-offset-2"
                  >
                    + 加行
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#1a2744]/60">合計：</span>
                    <span
                      className={`text-sm font-bold ${
                        installmentTotal === 100
                          ? "text-green-600"
                          : "text-red-500"
                      }`}
                    >
                      {installmentTotal}%
                    </span>
                    {installmentTotal !== 100 && (
                      <span className="text-xs text-red-400">（需等於 100%）</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] font-bold text-[#1a2744] uppercase tracking-widest block">
              備註 (Notes)
            </label>
            <NoteTemplatePicker onSelect={(content) => setNotes(content)} />
          </div>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="其他補充資料..."
            className="resize-none border-[#1a2744]/30"
            rows={3}
          />
        </div>

        {/* Bottom actions */}
        <div className="flex justify-end gap-3 pt-2 border-t">
          <Button
            variant="outline"
            onClick={() => setLocation("/projects")}
          >
            取消
          </Button>
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4" />
            列印報價單
          </Button>
          <Button
            className="bg-[#1a2744] hover:bg-[#1a2744]/90 text-white"
            disabled={isPending}
            onClick={onSubmit}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            儲存報價
          </Button>
        </div>
      </div>

      {/* Settings Modals */}
      <ListSettingsDialog
        open={showTypeSettings}
        onClose={() => setShowTypeSettings(false)}
        title="管理工程類型"
        items={projectTypes}
        onSave={saveProjectTypes}
      />
      <ListSettingsDialog
        open={showLocationSettings}
        onClose={() => setShowLocationSettings(false)}
        title={`管理地點 — ${projectType || "請先選擇工程類型"}`}
        items={currentLocations}
        onSave={saveLocations}
      />
    </div>
  );
}
