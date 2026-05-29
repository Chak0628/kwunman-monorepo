import { useState, useRef } from "react";
import {
  useListExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense,
  useListExpenseCategories, useCreateExpenseCategory, useUpdateExpenseCategory, useDeleteExpenseCategory,
  useListExpenseMerchants, useCreateExpenseMerchant, useUpdateExpenseMerchant, useDeleteExpenseMerchant,
  getListExpensesQueryKey, getListExpenseCategoriesQueryKey, getListExpenseMerchantsQueryKey,
} from "@workspace/api-client-react";
import { useUpload } from "@workspace/object-storage-web";
import { formatHKD, formatDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Plus, Trash2, ChevronUp, ChevronDown, ChevronsUpDown, Pencil, Tag, Store, Paperclip, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

const BANKS = ["大新銀行", "恒生銀行"];

const EMPTY_FORM = {
  description: "",
  amount: "",
  category: "",
  bank: "",
  merchant: "",
  receiptUrl: "",
  receiptDate: new Date().toISOString().split("T")[0],
  projectId: "",
  notes: "",
};

type FormState = typeof EMPTY_FORM;

function CategoriesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: categories = [] } = useListExpenseCategories();
  const createCat = useCreateExpenseCategory();
  const updateCat = useUpdateExpenseCategory();
  const deleteCat = useDeleteExpenseCategory();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const invalidate = () => qc.invalidateQueries({ queryKey: getListExpenseCategoriesQueryKey() });

  const handleAdd = () => {
    if (!newName.trim()) return;
    createCat.mutate({ data: { name: newName.trim() } }, {
      onSuccess: () => { toast({ title: "已新增分類" }); setNewName(""); invalidate(); },
      onError: () => toast({ variant: "destructive", title: "新增失敗" }),
    });
  };
  const handleUpdate = (id: number) => {
    if (!editingName.trim()) return;
    updateCat.mutate({ categoryId: id, data: { name: editingName.trim() } }, {
      onSuccess: () => { toast({ title: "已更新" }); setEditingId(null); invalidate(); },
      onError: () => toast({ variant: "destructive", title: "更新失敗" }),
    });
  };
  const handleDelete = (id: number) => {
    deleteCat.mutate({ categoryId: id }, {
      onSuccess: () => { toast({ title: "已刪除" }); invalidate(); },
      onError: () => toast({ variant: "destructive", title: "刪除失敗" }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>管理費用分類</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="新分類名稱..."
              onKeyDown={e => e.key === "Enter" && handleAdd()} />
            <Button size="sm" onClick={handleAdd} disabled={createCat.isPending || !newName.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {(categories as any[]).map((cat: any) => (
              <div key={cat.id} className="flex items-center gap-2 p-2 rounded border bg-muted/20">
                {editingId === cat.id ? (
                  <>
                    <Input value={editingName} onChange={e => setEditingName(e.target.value)}
                      className="h-7 text-sm flex-1" onKeyDown={e => e.key === "Enter" && handleUpdate(cat.id)} />
                    <Button size="sm" variant="default" className="h-7 px-2" onClick={() => handleUpdate(cat.id)}>確定</Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingId(null)}>取消</Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm">{cat.name}</span>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                      onClick={() => { setEditingId(cat.id); setEditingName(cat.name); }}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                      onClick={() => handleDelete(cat.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            ))}
            {(categories as any[]).length === 0 && <p className="text-xs text-muted-foreground text-center py-4">尚未新增任何分類</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MerchantsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: merchants = [] } = useListExpenseMerchants();
  const createM = useCreateExpenseMerchant();
  const updateM = useUpdateExpenseMerchant();
  const deleteM = useDeleteExpenseMerchant();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const invalidate = () => qc.invalidateQueries({ queryKey: getListExpenseMerchantsQueryKey() });

  const handleAdd = () => {
    if (!newName.trim()) return;
    createM.mutate({ data: { name: newName.trim() } }, {
      onSuccess: () => { toast({ title: "已新增商戶" }); setNewName(""); invalidate(); },
      onError: () => toast({ variant: "destructive", title: "新增失敗" }),
    });
  };
  const handleUpdate = (id: number) => {
    if (!editingName.trim()) return;
    updateM.mutate({ merchantId: id, data: { name: editingName.trim() } }, {
      onSuccess: () => { toast({ title: "已更新" }); setEditingId(null); invalidate(); },
      onError: () => toast({ variant: "destructive", title: "更新失敗" }),
    });
  };
  const handleDelete = (id: number) => {
    deleteM.mutate({ merchantId: id }, {
      onSuccess: () => { toast({ title: "已刪除" }); invalidate(); },
      onError: () => toast({ variant: "destructive", title: "刪除失敗" }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>管理商戶名單</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="新商戶名稱..."
              onKeyDown={e => e.key === "Enter" && handleAdd()} />
            <Button size="sm" onClick={handleAdd} disabled={createM.isPending || !newName.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {(merchants as any[]).map((m: any) => (
              <div key={m.id} className="flex items-center gap-2 p-2 rounded border bg-muted/20">
                {editingId === m.id ? (
                  <>
                    <Input value={editingName} onChange={e => setEditingName(e.target.value)}
                      className="h-7 text-sm flex-1" onKeyDown={e => e.key === "Enter" && handleUpdate(m.id)} />
                    <Button size="sm" variant="default" className="h-7 px-2" onClick={() => handleUpdate(m.id)}>確定</Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingId(null)}>取消</Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm">{m.name}</span>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                      onClick={() => { setEditingId(m.id); setEditingName(m.name); }}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                      onClick={() => handleDelete(m.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            ))}
            {(merchants as any[]).length === 0 && <p className="text-xs text-muted-foreground text-center py-4">尚未新增任何商戶</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ExpenseForm({
  form, setForm, categories, merchants, isUploading, onUpload, fileInputRef,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  categories: any[];
  merchants: any[];
  isUploading: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>描述 *</Label>
        <Input value={form.description} onChange={set("description")} placeholder="例：購買鋼材、運輸費用..." />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>金額 (HK$) *</Label>
          <Input type="number" value={form.amount} onChange={set("amount")} placeholder="0" />
        </div>
        <div className="space-y-1">
          <Label>收據日期</Label>
          <Input type="date" value={form.receiptDate} onChange={set("receiptDate")} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>支出分類</Label>
          <Select value={form.category || "__none"} onValueChange={v => setForm(f => ({ ...f, category: v === "__none" ? "" : v }))}>
            <SelectTrigger><SelectValue placeholder="選擇分類..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">不分類</SelectItem>
              {categories.map((c: any) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>銀行賬戶</Label>
          <Select value={form.bank || "__none"} onValueChange={v => setForm(f => ({ ...f, bank: v === "__none" ? "" : v }))}>
            <SelectTrigger><SelectValue placeholder="選擇銀行..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">不指定</SelectItem>
              {BANKS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>商戶</Label>
          <Select value={form.merchant || "__none"} onValueChange={v => setForm(f => ({ ...f, merchant: v === "__none" ? "" : v }))}>
            <SelectTrigger><SelectValue placeholder="選擇商戶..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">不指定</SelectItem>
              {merchants.map((m: any) => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>關聯工程單號（選填）</Label>
          <Input value={form.projectId} onChange={set("projectId")} placeholder="例：Q018" />
        </div>
      </div>
      <div className="space-y-1">
        <Label>備註</Label>
        <Textarea value={form.notes} onChange={set("notes")} placeholder="額外說明..." rows={2} />
      </div>
      <div className="space-y-1">
        <Label>收據相片</Label>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden"
            onChange={onUpload} />
          <Button type="button" variant="outline" size="sm" className="gap-1.5"
            onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            <Paperclip className="h-3.5 w-3.5" />
            {isUploading ? "上傳中..." : "上傳相片"}
          </Button>
          {form.receiptUrl && (
            <div className="flex items-center gap-1">
              <a href={`/api/storage/objects${form.receiptUrl}`} target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-600 underline">已上傳</a>
              <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0"
                onClick={() => setForm(f => ({ ...f, receiptUrl: "" }))}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Expenses() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<string>("receiptDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const { data: expenses, isLoading } = useListExpenses({
    status: statusFilter !== "all" ? (statusFilter as "pending" | "approved" | "rejected") : undefined,
  });
  const { data: categories = [] } = useListExpenseCategories();
  const { data: merchants = [] } = useListExpenseMerchants();

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };
  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 opacity-30 inline ml-1" />;
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3 inline ml-1" /> : <ChevronDown className="h-3 w-3 inline ml-1" />;
  };
  const sortedExpenses = [...(expenses ?? [])].sort((a, b) => {
    const av = (a as any)[sortKey] ?? "";
    const bv = (b as any)[sortKey] ?? "";
    const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === "asc" ? cmp : -cmp;
  });

  const updateExpense = useUpdateExpense();
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { canWrite, canDelete } = useAuth();

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<{ id: number } | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; label: string } | null>(null);
  const [showCategories, setShowCategories] = useState(false);
  const [showMerchants, setShowMerchants] = useState(false);

  const createFileRef = useRef<HTMLInputElement>(null);
  const editFileRef = useRef<HTMLInputElement>(null);

  const { uploadFile: uploadCreate, isUploading: isUploadingCreate } = useUpload({
    onSuccess: (r: { objectPath: string }) => { setForm(f => ({ ...f, receiptUrl: r.objectPath })); toast({ title: "相片已上傳" }); },
    onError: () => toast({ variant: "destructive", title: "相片上傳失敗" }),
  });
  const { uploadFile: uploadEdit, isUploading: isUploadingEdit } = useUpload({
    onSuccess: (r: { objectPath: string }) => { setEditForm(f => ({ ...f, receiptUrl: r.objectPath })); toast({ title: "相片已上傳" }); },
    onError: () => toast({ variant: "destructive", title: "相片上傳失敗" }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });

  const handleStatusChange = (id: number, status: "approved" | "rejected") => {
    updateExpense.mutate({ expenseId: id, data: { status } }, {
      onSuccess: () => { toast({ title: `報銷單已${status === "approved" ? "批准" : "拒絕"}` }); invalidate(); },
      onError: () => toast({ variant: "destructive", title: "更新失敗" }),
    });
  };

  const handleCreate = () => {
    if (!form.description || !form.amount) {
      toast({ variant: "destructive", title: "請填寫描述及金額" }); return;
    }
    createExpense.mutate({
      data: {
        description: form.description,
        amount: parseFloat(form.amount),
        category: form.category || null,
        bank: form.bank || null,
        merchant: form.merchant || null,
        receiptUrl: form.receiptUrl || null,
        receiptDate: form.receiptDate || null,
        projectId: form.projectId || null,
        notes: form.notes || null,
      },
    }, {
      onSuccess: () => { toast({ title: "支出已新增" }); setShowCreate(false); setForm(EMPTY_FORM); invalidate(); },
      onError: () => toast({ variant: "destructive", title: "新增失敗" }),
    });
  };

  const handleEdit = (exp: any) => {
    setEditForm({
      description: exp.description,
      amount: String(exp.amount),
      category: exp.category || "",
      bank: exp.bank || "",
      merchant: exp.merchant || "",
      receiptUrl: exp.receiptUrl || "",
      receiptDate: exp.receiptDate || "",
      projectId: exp.projectId || "",
      notes: exp.notes || "",
    });
    setShowEdit({ id: exp.id });
  };

  const handleUpdate = () => {
    if (!showEdit) return;
    if (!editForm.description || !editForm.amount) {
      toast({ variant: "destructive", title: "請填寫描述及金額" }); return;
    }
    updateExpense.mutate({
      expenseId: showEdit.id,
      data: {
        description: editForm.description,
        amount: parseFloat(editForm.amount),
        category: editForm.category || null,
        bank: editForm.bank || null,
        merchant: editForm.merchant || null,
        receiptUrl: editForm.receiptUrl || null,
        receiptDate: editForm.receiptDate || null,
        projectId: editForm.projectId || null,
        notes: editForm.notes || null,
      },
    }, {
      onSuccess: () => { toast({ title: "已更新" }); setShowEdit(null); invalidate(); },
      onError: () => toast({ variant: "destructive", title: "更新失敗" }),
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteExpense.mutate({ expenseId: deleteTarget.id }, {
      onSuccess: () => { toast({ title: "已刪除" }); setDeleteTarget(null); invalidate(); },
      onError: () => toast({ variant: "destructive", title: "刪除失敗" }),
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">已批准</Badge>;
      case "rejected": return <Badge variant="destructive">已拒絕</Badge>;
      default: return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">待處理</Badge>;
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">支出報銷</h1>
          <p className="text-muted-foreground mt-1">管理工程及日常營運開支</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowCategories(true)}>
            <Tag className="h-3.5 w-3.5" /> 管理分類
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowMerchants(true)}>
            <Store className="h-3.5 w-3.5" /> 管理商戶
          </Button>
          {canWrite && (
            <Button size="sm" className="gap-1.5" onClick={() => { setForm(EMPTY_FORM); setShowCreate(true); }}>
              <Plus className="h-4 w-4" /> 新增支出
            </Button>
          )}
        </div>
      </div>

      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="p-4 border-b flex gap-4 items-center bg-muted/20">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="所有狀態" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有狀態</SelectItem>
              <SelectItem value="pending">待處理</SelectItem>
              <SelectItem value="approved">已批准</SelectItem>
              <SelectItem value="rejected">已拒絕</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
              <TableRow>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort("receiptDate")}>
                  日期<SortIcon col="receiptDate" />
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort("category")}>
                  分類<SortIcon col="category" />
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort("bank")}>
                  銀行<SortIcon col="bank" />
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort("merchant")}>
                  商戶<SortIcon col="merchant" />
                </TableHead>
                <TableHead className="w-[220px] cursor-pointer select-none" onClick={() => handleSort("description")}>
                  描述<SortIcon col="description" />
                </TableHead>
                <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort("amount")}>
                  金額<SortIcon col="amount" />
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort("status")}>
                  狀態<SortIcon col="status" />
                </TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    {Array(8).fill(0).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : sortedExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">沒有找到紀錄</TableCell>
                </TableRow>
              ) : (
                sortedExpenses.map((exp) => (
                  <TableRow key={exp.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="text-sm whitespace-nowrap">{formatDate((exp as any).receiptDate)}</TableCell>
                    <TableCell className="text-sm">{(exp as any).category || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-sm">{(exp as any).bank || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-sm">{(exp as any).merchant || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="max-w-[220px]">
                      <div className="truncate text-sm" title={exp.description}>{exp.description}</div>
                      {(exp as any).notes && <div className="text-xs text-muted-foreground truncate">{(exp as any).notes}</div>}
                      {(exp as any).receiptUrl && (
                        <a href={`/api/storage/objects${(exp as any).receiptUrl}`} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-500 inline-flex items-center gap-0.5 hover:underline">
                          <Paperclip className="h-2.5 w-2.5" /> 收據
                        </a>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold whitespace-nowrap">{formatHKD(exp.amount)}</TableCell>
                    <TableCell>{getStatusBadge(exp.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {exp.status === "pending" && canWrite && (
                          <>
                            <Button variant="outline" size="sm" className="h-7 text-xs text-green-600 border-green-200 hover:bg-green-50"
                              onClick={() => handleStatusChange(exp.id, "approved")}>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> 批准
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 text-xs text-destructive border-red-200 hover:bg-red-50"
                              onClick={() => handleStatusChange(exp.id, "rejected")}>
                              <XCircle className="h-3.5 w-3.5 mr-1" /> 拒絕
                            </Button>
                          </>
                        )}
                        {canWrite && (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700"
                            onClick={() => handleEdit(exp)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                            onClick={() => setDeleteTarget({ id: exp.id, label: exp.description })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>新增支出記錄</DialogTitle></DialogHeader>
          <ExpenseForm form={form} setForm={setForm} categories={categories as any[]} merchants={merchants as any[]}
            isUploading={isUploadingCreate} onUpload={e => { const f = e.target.files?.[0]; if (f) uploadCreate(f); }}
            fileInputRef={createFileRef} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={createExpense.isPending}>
              {createExpense.isPending ? "新增中..." : "新增支出"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!showEdit} onOpenChange={() => setShowEdit(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>編輯支出記錄</DialogTitle></DialogHeader>
          <ExpenseForm form={editForm} setForm={setEditForm} categories={categories as any[]} merchants={merchants as any[]}
            isUploading={isUploadingEdit} onUpload={e => { const f = e.target.files?.[0]; if (f) uploadEdit(f); }}
            fileInputRef={editFileRef} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(null)}>取消</Button>
            <Button onClick={handleUpdate} disabled={updateExpense.isPending}>
              {updateExpense.isPending ? "更新中..." : "儲存更新"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>確認刪除</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">確定刪除支出記錄「<strong>{deleteTarget?.label}</strong>」？</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteExpense.isPending}>刪除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CategoriesDialog open={showCategories} onClose={() => setShowCategories(false)} />
      <MerchantsDialog open={showMerchants} onClose={() => setShowMerchants(false)} />
    </div>
  );
}
