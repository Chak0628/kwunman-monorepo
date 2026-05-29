import { useState } from "react";
import {
  useListClients,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  Building2,
  Phone,
  Mail,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Smartphone,
  PhoneCall,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";

type Client = {
  id: number;
  clientId: string;
  company: string;
  contactPerson?: string | null;
  department?: string | null;
  companyPhone?: string | null;
  mobilePhone?: string | null;
  privatePhone?: string | null;
  email?: string | null;
  address?: string | null;
  contactInfo?: string | null;
  notes?: string | null;
};

const EMPTY_FORM = {
  clientId: "",
  company: "",
  contactPerson: "",
  department: "",
  companyPhone: "",
  mobilePhone: "",
  privatePhone: "",
  email: "",
  address: "",
  notes: "",
};

function ClientFormDialog({
  mode,
  client,
  onClose,
}: {
  mode: "create" | "edit";
  client?: Client;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    clientId: client?.clientId ?? "",
    company: client?.company ?? "",
    contactPerson: client?.contactPerson ?? "",
    department: client?.department ?? "",
    companyPhone: client?.companyPhone ?? "",
    mobilePhone: client?.mobilePhone ?? "",
    privatePhone: client?.privatePhone ?? "",
    email: client?.email ?? "",
    address: client?.address ?? "",
    notes: client?.notes ?? "",
  });
  const [error, setError] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["/api/clients"] });

  const { mutate: create, isPending: isCreating } = useCreateClient({
    mutation: {
      onSuccess: () => { invalidate(); onClose(); },
      onError: () => setError("建立失敗，客戶編號可能已存在"),
    },
  });

  const { mutate: update, isPending: isUpdating } = useUpdateClient({
    mutation: {
      onSuccess: () => { invalidate(); onClose(); },
      onError: () => setError("更新失敗，請重試"),
    },
  });

  const handleSubmit = () => {
    if (!form.company.trim()) { setError("請填寫公司名稱"); return; }
    if (mode === "create" && !form.clientId.trim()) { setError("請填寫客戶編號"); return; }
    setError("");
    const data = {
      company: form.company.trim(),
      contactPerson: form.contactPerson.trim() || null,
      department: form.department.trim() || null,
      companyPhone: form.companyPhone.trim() || null,
      mobilePhone: form.mobilePhone.trim() || null,
      privatePhone: form.privatePhone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
    };
    if (mode === "create") {
      create({ data: { clientId: form.clientId.trim(), ...data } });
    } else {
      update({ clientId: client!.clientId, data });
    }
  };

  const isPending = isCreating || isUpdating;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "新增客戶" : "編輯客戶資料"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          {mode === "create" && (
            <div>
              <Label className="text-sm mb-1.5 block">
                客戶編號 <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.clientId}
                onChange={set("clientId")}
                placeholder="例: A001-1"
              />
            </div>
          )}
          {mode === "edit" && (
            <div className="text-xs text-muted-foreground bg-muted/40 rounded px-3 py-2">
              客戶編號：<span className="font-mono font-semibold text-foreground">{client?.clientId}</span>（不可更改）
            </div>
          )}

          <div>
            <Label className="text-sm mb-1.5 block">
              公司名稱 <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.company}
              onChange={set("company")}
              placeholder="例: Draeger Hong Kong Limited"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm mb-1.5 block">聯絡人</Label>
              <Input
                value={form.contactPerson}
                onChange={set("contactPerson")}
                placeholder="例: 王大文"
              />
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">部門</Label>
              <Input
                value={form.department}
                onChange={set("department")}
                placeholder="例: 採購部"
              />
            </div>
          </div>

          <div className="rounded-lg border p-3 space-y-3 bg-muted/20">
            <div className="text-xs font-medium text-muted-foreground">聯絡方式</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block text-muted-foreground">公司電話</Label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={form.companyPhone}
                    onChange={set("companyPhone")}
                    placeholder="2XXX XXXX"
                    className="pl-8 h-9 text-sm"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1 block text-muted-foreground">手提電話</Label>
                <div className="relative">
                  <Smartphone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={form.mobilePhone}
                    onChange={set("mobilePhone")}
                    placeholder="9XXX XXXX"
                    className="pl-8 h-9 text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block text-muted-foreground">私人電話</Label>
                <div className="relative">
                  <PhoneCall className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={form.privatePhone}
                    onChange={set("privatePhone")}
                    placeholder="6XXX XXXX"
                    className="pl-8 h-9 text-sm"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1 block text-muted-foreground">電郵</Label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={form.email}
                    onChange={set("email")}
                    placeholder="example@company.com"
                    className="pl-8 h-9 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm mb-1.5 block">地址</Label>
            <Input
              value={form.address}
              onChange={set("address")}
              placeholder="公司地址"
            />
          </div>

          <div>
            <Label className="text-sm mb-1.5 block">其他備註</Label>
            <Textarea
              value={form.notes}
              onChange={set("notes")}
              placeholder="特殊說明、合作條款、注意事項..."
              rows={3}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "處理中..." : mode === "create" ? "建立客戶" : "儲存更改"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Clients() {
  const { canDelete } = useAuth();
  const queryClient = useQueryClient();
  const { data: clients, isLoading } = useListClients();
  const [search, setSearch] = useState("");
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<Client | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);

  const { mutate: del, isPending: isDeleting } = useDeleteClient({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
        setDeleteTarget(null);
      },
    },
  });

  const [sortKey, setSortKey] = useState<"clientId" | "company" | "contactPerson">("clientId");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleSort = (key: "clientId" | "company" | "contactPerson") => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 opacity-30 inline ml-1" />;
    return sortDir === "asc"
      ? <ChevronUp className="h-3 w-3 inline ml-1" />
      : <ChevronDown className="h-3 w-3 inline ml-1" />;
  };

  const filteredClients = [...(clients?.filter(
    (c) =>
      (c.company ?? "").toLowerCase().includes(search.toLowerCase()) ||
      c.clientId.toLowerCase().includes(search.toLowerCase()) ||
      (c.contactPerson ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? "").toLowerCase().includes(search.toLowerCase())
  ) ?? [])].sort((a, b) => {
    const av = (a as any)[sortKey] ?? "";
    const bv = (b as any)[sortKey] ?? "";
    const cmp = String(av).localeCompare(String(bv), "zh-Hant");
    return sortDir === "asc" ? cmp : -cmp;
  });

  const openEdit = (c: Client) => {
    setEditTarget(c);
    setDialogMode("edit");
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">客戶資料庫</h1>
          <p className="text-muted-foreground mt-1">管理公司客戶聯絡方式</p>
        </div>
        <Button
          className="gap-2"
          onClick={() => { setEditTarget(null); setDialogMode("create"); }}
        >
          <Plus className="h-4 w-4" />
          新增客戶
        </Button>
      </div>

      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="p-4 border-b flex gap-4 items-center bg-muted/20">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜尋客戶名稱、編號、聯絡人或電郵..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap ml-auto">
            共 {filteredClients.length} 個客戶
          </span>
        </div>

        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-[110px] cursor-pointer select-none" onClick={() => handleSort("clientId")}>
                  客戶編號<SortIcon col="clientId" />
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort("company")}>
                  公司名稱<SortIcon col="company" />
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort("contactPerson")}>
                  聯絡人 / 部門<SortIcon col="contactPerson" />
                </TableHead>
                <TableHead>電話</TableHead>
                <TableHead>電郵</TableHead>
                <TableHead>地址</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(6).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    {Array(7).fill(0).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    沒有找到符合條件的客戶
                  </TableCell>
                </TableRow>
              ) : (
                filteredClients.map((client) => (
                  <TableRow
                    key={client.id}
                    className="hover:bg-muted/50 transition-colors group"
                  >
                    <TableCell className="font-mono text-sm font-medium text-primary">
                      {client.clientId}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium">{client.company}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{client.contactPerson || "—"}</div>
                      {client.department && (
                        <div className="text-xs text-muted-foreground">{client.department}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        {client.companyPhone && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span>{client.companyPhone}</span>
                          </div>
                        )}
                        {client.mobilePhone && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Smartphone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span>{client.mobilePhone}</span>
                          </div>
                        )}
                        {client.privatePhone && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <PhoneCall className="h-3 w-3 flex-shrink-0" />
                            <span>{client.privatePhone}</span>
                          </div>
                        )}
                        {!client.companyPhone && !client.mobilePhone && !client.privatePhone && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.email ? (
                        <div className="flex items-center gap-1.5 text-xs">
                          <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="truncate max-w-[160px]">{client.email}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {client.address ? (
                        <div className="flex items-start gap-1.5 text-xs">
                          <MapPin className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{client.address}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => openEdit(client as Client)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {canDelete && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setDeleteTarget(client as Client)}
                          >
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

      {dialogMode && (
        <ClientFormDialog
          mode={dialogMode}
          client={editTarget ?? undefined}
          onClose={() => { setDialogMode(null); setEditTarget(null); }}
        />
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除客戶</AlertDialogTitle>
            <AlertDialogDescription>
              確定要刪除{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget?.company}
              </span>{" "}
              ({deleteTarget?.clientId})？此操作不可還原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() =>
                deleteTarget && del({ clientId: deleteTarget.clientId })
              }
              disabled={isDeleting}
            >
              {isDeleting ? "刪除中..." : "確認刪除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
