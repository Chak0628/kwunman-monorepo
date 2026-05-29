import { useState, useRef } from "react";
import { useLocation } from "wouter";
import {
  useCreateExpense,
  useListProjects,
  useListExpenseCategories,
  useListExpenseMerchants,
  getListExpensesQueryKey,
} from "@workspace/api-client-react";
import { useUpload } from "@workspace/object-storage-web";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ReceiptText, ArrowLeft, Paperclip, X } from "lucide-react";

const BANKS = ["大新銀行", "恒生銀行"];

const EMPTY = {
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

export default function NewExpense() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const createExpense = useCreateExpense();
  const { data: projects = [] } = useListProjects({});
  const { data: categories = [] } = useListExpenseCategories();
  const { data: merchants = [] } = useListExpenseMerchants();

  const [form, setForm] = useState(EMPTY);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadFile, isUploading } = useUpload({
    onSuccess: (r: { objectPath: string }) => { setForm(f => ({ ...f, receiptUrl: r.objectPath })); toast({ title: "相片已上傳" }); },
    onError: () => toast({ variant: "destructive", title: "相片上傳失敗" }),
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const activeProjects = (projects as any[]).filter(p =>
    p.status === "施工中" || p.status === "報價中" || p.status === "進行中"
  );

  const handleSubmit = () => {
    if (!form.description.trim()) { toast({ variant: "destructive", title: "請填寫描述" }); return; }
    if (!form.amount || isNaN(parseFloat(form.amount))) { toast({ variant: "destructive", title: "請填寫有效金額" }); return; }

    createExpense.mutate({
      data: {
        description: form.description.trim(),
        amount: parseFloat(form.amount),
        category: form.category || null,
        bank: form.bank || null,
        merchant: form.merchant || null,
        receiptUrl: form.receiptUrl || null,
        receiptDate: form.receiptDate || null,
        projectId: form.projectId || null,
        notes: form.notes.trim() || null,
      },
    }, {
      onSuccess: () => {
        toast({ title: "支出記錄已新增" });
        qc.invalidateQueries({ queryKey: getListExpensesQueryKey() });
        setLocation("/expenses");
      },
      onError: () => toast({ variant: "destructive", title: "新增失敗，請重試" }),
    });
  };

  return (
    <div className="max-w-xl space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setLocation("/expenses")}>
          <ArrowLeft className="h-4 w-4" /> 返回支出記錄
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ReceiptText className="h-4 w-4" /> 新增支出記錄
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>描述 <span className="text-red-500">*</span></Label>
            <Input value={form.description} onChange={set("description")} placeholder="例：購買鋼材、運輸費用..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>金額 (HK$) <span className="text-red-500">*</span></Label>
              <Input type="number" value={form.amount} onChange={set("amount")} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>收據日期</Label>
              <Input type="date" value={form.receiptDate} onChange={set("receiptDate")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>支出分類</Label>
              <Select value={form.category || "__none"} onValueChange={v => setForm(f => ({ ...f, category: v === "__none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="選擇分類..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">不分類</SelectItem>
                  {(categories as any[]).map((c: any) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
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
            <div className="space-y-1.5">
              <Label>商戶</Label>
              <Select value={form.merchant || "__none"} onValueChange={v => setForm(f => ({ ...f, merchant: v === "__none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="選擇商戶..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">不指定</SelectItem>
                  {(merchants as any[]).map((m: any) => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>關聯工程（選填）</Label>
              <Select value={form.projectId || "none"} onValueChange={v => setForm(f => ({ ...f, projectId: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="不關聯" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">不關聯工程</SelectItem>
                  {activeProjects.map((p: any) => (
                    <SelectItem key={p.quoteId} value={p.quoteId}>
                      {p.quoteId} — {p.projectItem}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>備註</Label>
            <Textarea value={form.notes} onChange={set("notes")} placeholder="額外說明..." rows={2} />
          </div>

          <div className="space-y-1.5">
            <Label>收據相片</Label>
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} />
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

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setLocation("/expenses")}>取消</Button>
            <Button onClick={handleSubmit} disabled={createExpense.isPending || isUploading}>
              {createExpense.isPending ? "新增中..." : "確認新增"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
