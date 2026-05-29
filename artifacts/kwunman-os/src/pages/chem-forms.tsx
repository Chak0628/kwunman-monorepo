import { useState, useRef } from "react";
import {
  useListChemForms,
  useGetChemForm,
  useCreateChemForm,
  useUpdateChemForm,
  useDeleteChemForm,
  useAddChemFormReceipt,
  useListExpenseCategories,
  useCreateExpenseCategory,
  useUpdateExpenseCategory,
  useDeleteExpenseCategory,
  useListExpenseMerchants,
  useCreateExpenseMerchant,
  useUpdateExpenseMerchant,
  useDeleteExpenseMerchant,
  useListProjects,
  getListChemFormsQueryKey,
  getGetChemFormQueryKey,
  getListExpenseCategoriesQueryKey,
  getListExpenseMerchantsQueryKey,
} from "@workspace/api-client-react";
import { useUpload } from "@workspace/object-storage-web";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatHKD } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Pencil, X, FileImage, ExternalLink, CheckCircle, XCircle } from "lucide-react";

const BANKS = ["大新銀行", "恒生銀行"];

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  pending: { label: "待批核", className: "bg-amber-100 text-amber-700 border-amber-300" },
  approved: { label: "已發還", className: "bg-green-100 text-green-700 border-green-300" },
  rejected: { label: "已拒絕", className: "bg-red-100 text-red-700 border-red-300" },
};

function getMonthOptions() {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${d.getFullYear()}年${d.getMonth() + 1}月`;
    opts.push({ value, label });
  }
  return opts;
}

function formatClaimMonth(v: string | null | undefined) {
  if (!v) return "-";
  const [y, m] = v.split("-");
  return `${y}年${parseInt(m)}月`;
}

function formatDate(s: string | null | undefined) {
  if (!s) return "-";
  return s.replace(/-/g, "/");
}

let _lid = 0;
function localId() { return String(++_lid); }

interface LocalItem {
  lid: string;
  category: string;
  merchant: string;
  amount: string;
  projectId: string;
  itemDate: string;
}

function emptyItem(): LocalItem {
  return { lid: localId(), category: "", merchant: "", amount: "", projectId: "", itemDate: "" };
}

// ── Shared category/merchant management mini-dialog ──────────────────────────

interface ManageListDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  items: { id: number; name: string }[];
  onCreate: (name: string) => Promise<void>;
  onUpdate: (id: number, name: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

function ManageListDialog({ open, onClose, title, items, onCreate, onUpdate, onDelete }: ManageListDialogProps) {
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    await onCreate(newName.trim());
    setNewName("");
    setBusy(false);
  };

  const handleUpdate = async () => {
    if (!editId || !editName.trim()) return;
    setBusy(true);
    await onUpdate(editId, editName.trim());
    setEditId(null);
    setBusy(false);
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {items.map(item => (
            <div key={item.id} className="flex gap-2 items-center">
              {editId === item.id ? (
                <>
                  <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-7 text-sm flex-1" autoFocus />
                  <Button size="sm" className="h-7 px-2" onClick={handleUpdate} disabled={busy}>存</Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditId(null)}>取消</Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm truncate">{item.name}</span>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditId(item.id); setEditName(item.name); }}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" onClick={() => onDelete(item.id)}>
                    <X className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          ))}
          {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">暫無項目</p>}
        </div>
        <div className="flex gap-2 pt-2 border-t">
          <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="新增..." className="h-8 text-sm" onKeyDown={e => e.key === "Enter" && handleCreate()} />
          <Button size="sm" className="h-8 px-3" onClick={handleCreate} disabled={busy || !newName.trim()}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>完成</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ChemForms() {
  const { user, isAdmin, canWrite } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { uploadFile } = useUpload();

  const isEmployee = user?.role === "員工";
  const monthOptions = getMonthOptions();
  const currentMonth = monthOptions[0]?.value ?? "";

  // ── Data ──────────────────────────────────────────────────────────────────
  const listParams = isEmployee ? { submitterId: user?.id } : {};
  const { data: forms = [], isLoading } = useListChemForms(listParams);
  const { data: categories = [] } = useListExpenseCategories();
  const { data: merchants = [] } = useListExpenseMerchants();
  const { data: projects = [] } = useListProjects();

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createForm = useCreateChemForm();
  const updateForm = useUpdateChemForm();
  const deleteForm = useDeleteChemForm();
  const addReceipt = useAddChemFormReceipt();
  const createCat = useCreateExpenseCategory();
  const updateCat = useUpdateExpenseCategory();
  const deleteCat = useDeleteExpenseCategory();
  const createMer = useCreateExpenseMerchant();
  const updateMer = useUpdateExpenseMerchant();
  const deleteMer = useDeleteExpenseMerchant();

  const invalidateForms = () => qc.invalidateQueries({ queryKey: getListChemFormsQueryKey() });
  const invalidateCats = () => qc.invalidateQueries({ queryKey: getListExpenseCategoriesQueryKey() });
  const invalidateMers = () => qc.invalidateQueries({ queryKey: getListExpenseMerchantsQueryKey() });

  // ── UI State ──────────────────────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [viewFormId, setViewFormId] = useState<number | null>(null);
  const [approveFormId, setApproveFormId] = useState<number | null>(null);
  const [approveBank, setApproveBank] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; formNo: string | null } | null>(null);
  const [showManageCats, setShowManageCats] = useState(false);
  const [showManageMers, setShowManageMers] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // ── Create form state ─────────────────────────────────────────────────────
  const [claimMonth, setClaimMonth] = useState(currentMonth);
  const [department, setDepartment] = useState("鋼結構部");
  const [items, setItems] = useState<LocalItem[]>([emptyItem()]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── View detail state ─────────────────────────────────────────────────────
  const { data: viewDetail, isLoading: viewLoading } = useGetChemForm(
    viewFormId ?? 0,
    { query: { enabled: viewFormId !== null, queryKey: getGetChemFormQueryKey(viewFormId ?? 0) } }
  );

  const approveTarget = forms.find(f => f.id === approveFormId) ?? null;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const totalAmount = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

  const updateItem = (lid: string, patch: Partial<LocalItem>) =>
    setItems(prev => prev.map(i => i.lid === lid ? { ...i, ...patch } : i));

  const removeItem = (lid: string) =>
    setItems(prev => prev.filter(i => i.lid !== lid));

  const resetCreate = () => {
    setClaimMonth(currentMonth);
    setDepartment("鋼結構部");
    setItems([emptyItem()]);
    setPendingFiles([]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPendingFiles(prev => [...prev, ...files]);
    e.target.value = "";
  };

  // ── Submit create form ────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!claimMonth) {
      toast({ variant: "destructive", title: "請選擇報銷月份" });
      return;
    }
    const validItems = items.filter(i => parseFloat(i.amount) > 0);
    if (validItems.length === 0) {
      toast({ variant: "destructive", title: "請最少填寫一項有效金額" });
      return;
    }

    setSubmitting(true);
    try {
      const created = await createForm.mutateAsync({
        data: {
          submitterId: user!.id,
          submitterName: user!.fullName,
          claimMonth,
          department: department || null,
          items: validItems.map((item, idx) => ({
            category: item.category || null,
            merchant: item.merchant || null,
            amount: parseFloat(item.amount) || 0,
            projectId: item.projectId || null,
            itemDate: item.itemDate || null,
            sortOrder: idx,
          })),
        },
      });

      for (const file of pendingFiles) {
        try {
          const resp = await uploadFile(file);
          const objectPath = resp?.objectPath;
          if (objectPath) {
            await addReceipt.mutateAsync({ chemFormId: created.id, data: { fileUrl: objectPath, fileName: file.name } });
          }
        } catch { /* best-effort */ }
      }

      toast({ title: `報銷單 ${created.formNo} 已提交` });
      setShowCreate(false);
      resetCreate();
      invalidateForms();
    } catch {
      toast({ variant: "destructive", title: "提交失敗，請重試" });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Approve / Reject ──────────────────────────────────────────────────────
  const handleApprove = () => {
    if (!approveFormId) return;
    if (!approveBank) { toast({ variant: "destructive", title: "請選擇放款銀行" }); return; }
    updateForm.mutate(
      { chemFormId: approveFormId, data: { status: "approved", bankUsed: approveBank } },
      {
        onSuccess: () => {
          toast({ title: "已批核，款項已記錄" });
          setApproveFormId(null);
          setApproveBank("");
          invalidateForms();
        },
        onError: () => toast({ variant: "destructive", title: "操作失敗" }),
      }
    );
  };

  const handleReject = () => {
    if (!approveFormId) return;
    updateForm.mutate(
      { chemFormId: approveFormId, data: { status: "rejected" } },
      {
        onSuccess: () => {
          toast({ title: "已拒絕申請" });
          setApproveFormId(null);
          invalidateForms();
          if (viewFormId === approveFormId) setViewFormId(null);
        },
        onError: () => toast({ variant: "destructive", title: "操作失敗" }),
      }
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteForm.mutate(
      { chemFormId: deleteTarget.id },
      {
        onSuccess: () => {
          toast({ title: "報銷單已刪除" });
          setDeleteTarget(null);
          invalidateForms();
        },
        onError: () => toast({ variant: "destructive", title: "刪除失敗" }),
      }
    );
  };

  // ── Category/Merchant management handlers ─────────────────────────────────
  const catHandlers = {
    onCreate: async (name: string) => {
      await createCat.mutateAsync({ data: { name } });
      invalidateCats();
    },
    onUpdate: async (id: number, name: string) => {
      await updateCat.mutateAsync({ categoryId: id, data: { name } });
      invalidateCats();
    },
    onDelete: async (id: number) => {
      await deleteCat.mutateAsync({ categoryId: id });
      invalidateCats();
    },
  };

  const merHandlers = {
    onCreate: async (name: string) => {
      await createMer.mutateAsync({ data: { name } });
      invalidateMers();
    },
    onUpdate: async (id: number, name: string) => {
      await updateMer.mutateAsync({ merchantId: id, data: { name } });
      invalidateMers();
    },
    onDelete: async (id: number) => {
      await deleteMer.mutateAsync({ merchantId: id });
      invalidateMers();
    },
  };

  // ── Filtered forms ────────────────────────────────────────────────────────
  const filteredForms = statusFilter === "all" ? forms : forms.filter(f => f.status === statusFilter);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue placeholder="全部狀態" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部狀態</SelectItem>
              <SelectItem value="pending">待批核</SelectItem>
              <SelectItem value="approved">已發還</SelectItem>
              <SelectItem value="rejected">已拒絕</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">{filteredForms.length} 筆</span>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => { resetCreate(); setShowCreate(true); }}>
          <Plus className="h-4 w-4" /> 提交報銷單
        </Button>
      </div>

      {/* Main list */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-[90px_90px_1fr_110px_100px_90px_100px_100px] gap-2 px-5 py-2.5 border-b bg-muted/40 text-xs font-medium text-muted-foreground">
            <span>日期</span>
            <span>報銷單號</span>
            <span>申請人</span>
            <span>報銷月份</span>
            <span className="text-right">總金額</span>
            <span>狀態</span>
            <span>放款銀行</span>
            <span className="text-center">操作</span>
          </div>
          {isLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">載入中...</div>
          ) : filteredForms.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">暫無報銷單</div>
          ) : (
            <div className="divide-y">
              {filteredForms.map(f => {
                const s = STATUS_MAP[f.status] ?? STATUS_MAP.pending;
                return (
                  <div key={f.id} className="grid grid-cols-[90px_90px_1fr_110px_100px_90px_100px_100px] gap-2 px-5 py-3 items-center hover:bg-muted/30">
                    <span className="text-xs text-muted-foreground">{formatDate(f.createdAt.slice(0, 10))}</span>
                    <span className="font-mono font-semibold text-sm">{f.formNo ?? "-"}</span>
                    <span className="text-sm">{f.submitterName}</span>
                    <span className="text-sm">{formatClaimMonth(f.claimMonth)}</span>
                    <span className="text-sm font-mono text-right">{formatHKD(f.totalAmount)}</span>
                    <Badge className={`text-xs w-fit ${s.className}`}>{s.label}</Badge>
                    <span className="text-xs text-muted-foreground">{f.bankUsed ?? "-"}</span>
                    <div className="flex gap-1 justify-center">
                      <Button size="sm" variant="ghost" className="h-7 text-xs px-2"
                        onClick={() => setViewFormId(f.id)}>查閱</Button>
                      {canWrite && f.status === "pending" && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-green-600"
                          onClick={() => { setApproveFormId(f.id); setApproveBank(""); }}>審批</Button>
                      )}
                      {isAdmin && (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                          onClick={() => setDeleteTarget({ id: f.id, formNo: f.formNo })}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Create Form Dialog ─────────────────────────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={o => { if (!o && !submitting) { setShowCreate(false); resetCreate(); } }}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>提交個人墊支報銷單</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-5 pr-1">
            {/* Header fields */}
            <div className="grid grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">報銷月份 *</Label>
                <Select value={claimMonth} onValueChange={setClaimMonth}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {monthOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">報銷單號</Label>
                <div className="h-8 flex items-center px-3 rounded-md border bg-muted text-sm text-muted-foreground font-mono">自動生成</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">申請人</Label>
                <div className="h-8 flex items-center px-3 rounded-md border bg-muted text-sm">{user?.fullName}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">部門</Label>
                <Input value={department} onChange={e => setDepartment(e.target.value)} className="h-8 text-sm" placeholder="部門名稱" />
              </div>
            </div>

            {/* Line items table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">費用明細</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowManageCats(true)}>
                    <Pencil className="h-3 w-3" /> 管理分類
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowManageMers(true)}>
                    <Pencil className="h-3 w-3" /> 管理商戶
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs h-8 w-[160px]">項目（分類）</TableHead>
                      <TableHead className="text-xs h-8 w-[160px]">詳情（商戶）</TableHead>
                      <TableHead className="text-xs h-8 w-[110px]">金額 (HK$)</TableHead>
                      <TableHead className="text-xs h-8 w-[130px]">工程編號</TableHead>
                      <TableHead className="text-xs h-8 w-[130px]">日期</TableHead>
                      <TableHead className="text-xs h-8 w-[40px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.lid}>
                        <TableCell className="py-1.5">
                          <Select
                            value={item.category || "__none__"}
                            onValueChange={v => updateItem(item.lid, { category: v === "__none__" ? "" : v })}
                          >
                            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="選擇分類" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">（無）</SelectItem>
                              {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <Select
                            value={item.merchant || "__none__"}
                            onValueChange={v => updateItem(item.lid, { merchant: v === "__none__" ? "" : v })}
                          >
                            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="選擇商戶" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">（無）</SelectItem>
                              {merchants.map(m => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.amount}
                            onChange={e => updateItem(item.lid, { amount: e.target.value })}
                            className="h-7 text-xs font-mono"
                            placeholder="0.00"
                          />
                        </TableCell>
                        <TableCell className="py-1.5">
                          <Select
                            value={item.projectId || "__none__"}
                            onValueChange={v => updateItem(item.lid, { projectId: v === "__none__" ? "" : v })}
                          >
                            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="（選填）" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">（無）</SelectItem>
                              {projects.map(p => (
                                <SelectItem key={p.quoteId} value={p.quoteId}>
                                  {p.quoteId}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <Input
                            type="date"
                            value={item.itemDate}
                            onChange={e => updateItem(item.lid, { itemDate: e.target.value })}
                            className="h-7 text-xs"
                          />
                        </TableCell>
                        <TableCell className="py-1.5">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                            onClick={() => removeItem(item.lid)} disabled={items.length === 1}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Button size="sm" variant="outline" className="mt-2 gap-1.5 h-7 text-xs" onClick={() => setItems(prev => [...prev, emptyItem()])}>
                <Plus className="h-3 w-3" /> 新增一行
              </Button>
            </div>

            {/* Total + upload */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-xs text-muted-foreground mb-1">合計報銷總金額</p>
                <p className="text-2xl font-bold font-mono text-primary">{formatHKD(totalAmount)}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">上傳收據相片</Label>
                <div
                  className="border-2 border-dashed rounded-lg p-3 text-center cursor-pointer hover:bg-muted/30"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileImage className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground">點擊上傳相片</p>
                </div>
                <input ref={fileInputRef} type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
                {pendingFiles.length > 0 && (
                  <div className="space-y-1">
                    {pendingFiles.map((f, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs bg-muted/40 rounded px-2 py-1">
                        <FileImage className="h-3 w-3 text-muted-foreground" />
                        <span className="flex-1 truncate">{f.name}</span>
                        <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => setPendingFiles(prev => prev.filter((_, i) => i !== idx))}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t">
            <Button variant="outline" onClick={() => { setShowCreate(false); resetCreate(); }} disabled={submitting}>取消</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "提交中..." : "確認提交"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Detail Dialog ─────────────────────────────────────────────── */}
      <Dialog open={viewFormId !== null} onOpenChange={o => !o && setViewFormId(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle>
                報銷單 {viewDetail?.formNo ?? "..."}
                {viewDetail && (
                  <Badge className={`ml-2 text-xs ${STATUS_MAP[viewDetail.status]?.className}`}>
                    {STATUS_MAP[viewDetail.status]?.label}
                  </Badge>
                )}
              </DialogTitle>
            </div>
          </DialogHeader>

          {viewLoading || !viewDetail ? (
            <div className="py-10 text-center text-sm text-muted-foreground">載入中...</div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Header info */}
              <div className="grid grid-cols-4 gap-3 p-3 bg-muted/30 rounded-lg text-sm">
                <div><p className="text-xs text-muted-foreground">申請人</p><p className="font-medium">{viewDetail.submitterName}</p></div>
                <div><p className="text-xs text-muted-foreground">報銷月份</p><p className="font-medium">{formatClaimMonth(viewDetail.claimMonth)}</p></div>
                <div><p className="text-xs text-muted-foreground">部門</p><p className="font-medium">{viewDetail.department ?? "-"}</p></div>
                <div><p className="text-xs text-muted-foreground">提交日期</p><p className="font-medium">{formatDate(viewDetail.createdAt.slice(0, 10))}</p></div>
              </div>

              {/* Items table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs h-8">項目</TableHead>
                      <TableHead className="text-xs h-8">商戶</TableHead>
                      <TableHead className="text-xs h-8 text-right">金額</TableHead>
                      <TableHead className="text-xs h-8">工程編號</TableHead>
                      <TableHead className="text-xs h-8">日期</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(viewDetail.items ?? []).length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">無明細記錄</TableCell></TableRow>
                    ) : (viewDetail.items ?? []).map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm py-2">{item.category ?? "-"}</TableCell>
                        <TableCell className="text-sm py-2">{item.merchant ?? "-"}</TableCell>
                        <TableCell className="text-sm py-2 text-right font-mono">{formatHKD(item.amount)}</TableCell>
                        <TableCell className="text-sm py-2 font-mono">{item.projectId ?? "-"}</TableCell>
                        <TableCell className="text-sm py-2">{formatDate(item.itemDate)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/30 font-semibold">
                      <TableCell colSpan={2} className="text-sm py-2">合計</TableCell>
                      <TableCell className="text-sm py-2 text-right font-mono">{formatHKD(viewDetail.totalAmount)}</TableCell>
                      <TableCell colSpan={2} />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Receipts */}
              {(viewDetail.receipts ?? []).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">附上收據</p>
                  <div className="flex flex-wrap gap-2">
                    {(viewDetail.receipts ?? []).map(r => (
                      <a key={r.id} href={r.fileUrl} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs bg-muted/50 border rounded px-2 py-1.5 hover:bg-muted">
                        <FileImage className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate max-w-[120px]">{r.fileName || "收據"}</span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Approve section — admin/partner only, pending forms */}
              {canWrite && viewDetail.status === "pending" && (
                <div className="p-4 border border-amber-200 bg-amber-50 rounded-lg space-y-3">
                  <p className="text-sm font-medium text-amber-800">審批此報銷單</p>
                  <div className="flex gap-3 items-end">
                    <div className="space-y-1 flex-1">
                      <Label className="text-xs">放款銀行</Label>
                      <Select value={approveBank} onValueChange={setApproveBank}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="選擇銀行..." /></SelectTrigger>
                        <SelectContent>
                          {BANKS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button size="sm" className="h-8 gap-1.5 bg-green-600 hover:bg-green-700"
                      onClick={() => { setApproveFormId(viewFormId); handleApproveFromView(); }}
                      disabled={!approveBank || updateForm.isPending}>
                      <CheckCircle className="h-4 w-4" /> 批准發還
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => { setApproveFormId(viewFormId); handleRejectFromView(); }}
                      disabled={updateForm.isPending}>
                      <XCircle className="h-4 w-4" /> 拒絕
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-2 border-t">
            <Button variant="outline" onClick={() => setViewFormId(null)}>關閉</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Approve Dialog (from list) ─────────────────────────────────────── */}
      <Dialog open={approveFormId !== null && viewFormId === null} onOpenChange={o => !o && setApproveFormId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>審批報銷單 {approveTarget?.formNo}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              申請人：{approveTarget?.submitterName}｜金額：{formatHKD(approveTarget?.totalAmount ?? 0)}
            </p>
            <div className="space-y-1">
              <Label>放款銀行</Label>
              <Select value={approveBank} onValueChange={setApproveBank}>
                <SelectTrigger><SelectValue placeholder="選擇銀行..." /></SelectTrigger>
                <SelectContent>
                  {BANKS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveFormId(null)}>取消</Button>
            <Button variant="outline" className="text-red-600 border-red-200" onClick={handleReject} disabled={updateForm.isPending}>拒絕</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleApprove} disabled={updateForm.isPending}>批准發還</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ─────────────────────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>確認刪除報銷單</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">確定刪除報銷單 <strong>{deleteTarget?.formNo}</strong>？此操作無法撤銷。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteForm.isPending}>刪除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Manage Categories Dialog ───────────────────────────────────────── */}
      <ManageListDialog
        open={showManageCats}
        onClose={() => setShowManageCats(false)}
        title="管理費用分類"
        items={categories}
        {...catHandlers}
      />

      {/* ── Manage Merchants Dialog ────────────────────────────────────────── */}
      <ManageListDialog
        open={showManageMers}
        onClose={() => setShowManageMers(false)}
        title="管理商戶"
        items={merchants}
        {...merHandlers}
      />
    </div>
  );

  function handleApproveFromView() {
    if (!viewFormId || !approveBank) { toast({ variant: "destructive", title: "請選擇放款銀行" }); return; }
    updateForm.mutate(
      { chemFormId: viewFormId, data: { status: "approved", bankUsed: approveBank } },
      {
        onSuccess: () => {
          toast({ title: "已批核，款項已記錄" });
          setApproveBank("");
          qc.invalidateQueries({ queryKey: getGetChemFormQueryKey(viewFormId) });
          invalidateForms();
        },
        onError: () => toast({ variant: "destructive", title: "操作失敗" }),
      }
    );
  }

  function handleRejectFromView() {
    if (!viewFormId) return;
    updateForm.mutate(
      { chemFormId: viewFormId, data: { status: "rejected" } },
      {
        onSuccess: () => {
          toast({ title: "已拒絕申請" });
          qc.invalidateQueries({ queryKey: getGetChemFormQueryKey(viewFormId) });
          invalidateForms();
        },
        onError: () => toast({ variant: "destructive", title: "操作失敗" }),
      }
    );
  }
}
