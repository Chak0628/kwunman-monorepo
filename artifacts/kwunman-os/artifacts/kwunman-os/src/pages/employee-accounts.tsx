import { useState } from "react";
import {
  useListUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  getListUsersQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { UserPlus, Pencil, Trash2, ShieldCheck, UserCog, User, Eye, EyeOff } from "lucide-react";
import { formatHKD } from "@/lib/format";

const ROLE_CONFIG = {
  管理者: { label: "管理者", color: "bg-red-100 text-red-700 border-red-300", icon: ShieldCheck },
  參與者: { label: "參與者", color: "bg-blue-100 text-blue-700 border-blue-300", icon: UserCog },
  員工: { label: "員工", color: "bg-slate-100 text-slate-700 border-slate-300", icon: User },
};

export default function EmployeeAccounts() {
  const { canDelete, canWrite, user: me, isAdmin } = useAuth();
  const { data: users, isLoading } = useListUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [showCreatePwd, setShowCreatePwd] = useState(false);
  const [showEditPwd, setShowEditPwd] = useState(false);
  const [editTarget, setEditTarget] = useState<{
    id: number;
    username: string;
    fullName: string;
    role: string;
    phone: string;
    isActive: boolean;
    defaultDailyRate: number | null;
    defaultMonthlyRate: number | null;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; fullName: string } | null>(null);

  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "員工",
    fullName: "",
    phone: "",
    defaultDailyRate: "",
    defaultMonthlyRate: "",
  });
  const [editForm, setEditForm] = useState({
    username: "",
    fullName: "",
    role: "",
    phone: "",
    isActive: true,
    password: "",
    defaultDailyRate: "",
    defaultMonthlyRate: "",
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: getListUsersQueryKey() });

  const handleCreate = () => {
    if (!form.username || !form.password || !form.fullName) {
      toast({ variant: "destructive", title: "請填寫所有必填欄位" });
      return;
    }
    createUser.mutate(
      {
        data: {
          username: form.username,
          password: form.password,
          role: form.role as "管理者" | "參與者" | "員工",
          fullName: form.fullName,
          phone: form.phone || null,
        },
      },
      {
        onSuccess: (newUser) => {
          const hasRates = form.defaultDailyRate || form.defaultMonthlyRate;
          if (hasRates) {
            updateUser.mutate({
              userId: newUser.id,
              data: {
                defaultDailyRate: form.defaultDailyRate ? parseFloat(form.defaultDailyRate) : null,
                defaultMonthlyRate: form.defaultMonthlyRate ? parseFloat(form.defaultMonthlyRate) : null,
              } as any,
            });
          }
          toast({ title: "帳戶已建立" });
          setShowCreate(false);
          setForm({ username: "", password: "", role: "員工", fullName: "", phone: "", defaultDailyRate: "", defaultMonthlyRate: "" });
          invalidate();
        },
        onError: () => toast({ variant: "destructive", title: "建立失敗，用戶名可能已存在" }),
      }
    );
  };

  const handleEdit = () => {
    if (!editTarget) return;
    const data: Record<string, unknown> = {
      username: editForm.username || undefined,
      fullName: editForm.fullName,
      role: editForm.role,
      phone: editForm.phone || null,
      isActive: editForm.isActive,
      defaultDailyRate: editForm.defaultDailyRate ? parseFloat(editForm.defaultDailyRate) : null,
      defaultMonthlyRate: editForm.defaultMonthlyRate ? parseFloat(editForm.defaultMonthlyRate) : null,
    };
    if (editForm.password) data.password = editForm.password;
    updateUser.mutate(
      { userId: editTarget.id, data },
      {
        onSuccess: () => {
          toast({ title: "帳戶已更新" });
          setEditTarget(null);
          invalidate();
        },
        onError: (e) => toast({ variant: "destructive", title: "更新失敗", description: String(e) }),
      }
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteUser.mutate(
      { userId: deleteTarget.id },
      {
        onSuccess: () => {
          toast({ title: "帳戶已刪除" });
          setDeleteTarget(null);
          invalidate();
        },
        onError: () => toast({ variant: "destructive", title: "刪除失敗" }),
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isAdmin ? "管理所有系統用戶帳戶及存取權限" : "新增員工帳戶"}
        </p>
        {(isAdmin || canWrite) && (
          <Button onClick={() => setShowCreate(true)} size="sm" className="gap-2">
            <UserPlus className="h-4 w-4" /> 新增帳戶
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">用戶帳戶一覽表</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-[1fr_100px_120px_120px_120px_80px_100px] gap-2 px-6 py-2 border-b bg-muted/40 text-xs font-medium text-muted-foreground">
            <span>姓名 / 用戶名</span>
            <span>角色</span>
            <span>聯絡電話</span>
            <span className="text-right">預設日薪</span>
            <span className="text-right">預設月薪</span>
            <span>狀態</span>
            <span className="text-center">操作</span>
          </div>
          {isLoading ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">載入中...</div>
          ) : !users?.length ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">暫無帳戶</div>
          ) : (
            <div className="divide-y">
              {users.map((u) => {
                const rc = ROLE_CONFIG[u.role as keyof typeof ROLE_CONFIG] ?? ROLE_CONFIG["員工"];
                const RoleIcon = rc.icon;
                return (
                  <div key={u.id} className="grid grid-cols-[1fr_100px_120px_120px_120px_80px_100px] gap-2 px-6 py-3 items-center hover:bg-muted/30">
                    <div>
                      <p className="font-medium text-sm">{u.fullName}</p>
                      <p className="text-xs text-muted-foreground">@{u.username}{u.id === me?.id ? " (你)" : ""}</p>
                    </div>
                    <div>
                      <Badge className={`text-xs ${rc.color} gap-1`}>
                        <RoleIcon className="h-3 w-3" />{rc.label}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">{u.phone ?? "-"}</span>
                    <span className="text-sm text-right font-mono">
                      {(u as any).defaultDailyRate != null ? formatHKD((u as any).defaultDailyRate) : <span className="text-muted-foreground">—</span>}
                    </span>
                    <span className="text-sm text-right font-mono">
                      {(u as any).defaultMonthlyRate != null ? formatHKD((u as any).defaultMonthlyRate) : <span className="text-muted-foreground">—</span>}
                    </span>
                    <Badge variant={u.isActive ? "default" : "secondary"} className="text-xs w-fit">
                      {u.isActive ? "啟用" : "停用"}
                    </Badge>
                    <div className="flex gap-1 justify-center">
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setShowEditPwd(false);
                            setEditTarget({
                              id: u.id,
                              username: u.username,
                              fullName: u.fullName,
                              role: u.role,
                              phone: u.phone ?? "",
                              isActive: u.isActive,
                              defaultDailyRate: (u as any).defaultDailyRate ?? null,
                              defaultMonthlyRate: (u as any).defaultMonthlyRate ?? null,
                            });
                            setEditForm({
                              username: u.username,
                              fullName: u.fullName,
                              role: u.role,
                              phone: u.phone ?? "",
                              isActive: u.isActive,
                              password: "",
                              defaultDailyRate: (u as any).defaultDailyRate != null ? String((u as any).defaultDailyRate) : "",
                              defaultMonthlyRate: (u as any).defaultMonthlyRate != null ? String((u as any).defaultMonthlyRate) : "",
                            });
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {canDelete && u.id !== me?.id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                          onClick={() => setDeleteTarget({ id: u.id, fullName: u.fullName })}
                        >
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

      {/* Create User Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>新增用戶帳戶</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>姓名 *</Label>
                <Input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="真實姓名" />
              </div>
              <div className="space-y-1">
                <Label>用戶名 *</Label>
                <Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="登入用戶名" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>密碼 *</Label>
                <div className="relative">
                  <Input
                    type={showCreatePwd ? "text" : "password"}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="登入密碼"
                    className="pr-9"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full w-9 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowCreatePwd(v => !v)}
                    tabIndex={-1}
                  >
                    {showCreatePwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label>聯絡電話</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="手機號碼" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>角色</Label>
              {isAdmin ? (
                <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="管理者">管理者（最高權限）</SelectItem>
                    <SelectItem value="參與者">參與者（不可刪除）</SelectItem>
                    <SelectItem value="員工">員工（只看個人）</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center h-9 px-3 rounded-md border bg-muted text-sm text-muted-foreground">
                  員工（只看個人）
                </div>
              )}
            </div>
            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground mb-2">薪資設定（選填，可日後再設定）</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>預設日薪 (HK$)</Label>
                  <Input
                    type="number"
                    value={form.defaultDailyRate}
                    onChange={e => setForm(f => ({ ...f, defaultDailyRate: e.target.value }))}
                    placeholder="例：800"
                  />
                </div>
                <div className="space-y-1">
                  <Label>預設月薪 (HK$)</Label>
                  <Input
                    type="number"
                    value={form.defaultMonthlyRate}
                    onChange={e => setForm(f => ({ ...f, defaultMonthlyRate: e.target.value }))}
                    placeholder="例：18000"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={createUser.isPending}>建立帳戶</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>編輯用戶 — {editTarget?.fullName}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>姓名</Label>
                <Input value={editForm.fullName} onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>用戶名</Label>
                <Input value={editForm.username} onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))} placeholder="登入用戶名" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>聯絡電話</Label>
                <Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>帳戶狀態</Label>
                <Select value={editForm.isActive ? "active" : "inactive"} onValueChange={v => setEditForm(f => ({ ...f, isActive: v === "active" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">啟用</SelectItem>
                    <SelectItem value="inactive">停用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>角色</Label>
              <Select value={editForm.role} onValueChange={v => setEditForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="管理者">管理者</SelectItem>
                  <SelectItem value="參與者">參與者</SelectItem>
                  <SelectItem value="員工">員工</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>新密碼（留空不更改）</Label>
              <div className="relative">
                <Input
                  type={showEditPwd ? "text" : "password"}
                  value={editForm.password}
                  onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="輸入新密碼..."
                  className="pr-9"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full w-9 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowEditPwd(v => !v)}
                  tabIndex={-1}
                >
                  {showEditPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground mb-2">薪資設定</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>預設日薪 (HK$)</Label>
                  <Input
                    type="number"
                    value={editForm.defaultDailyRate}
                    onChange={e => setEditForm(f => ({ ...f, defaultDailyRate: e.target.value }))}
                    placeholder="例：800"
                  />
                </div>
                <div className="space-y-1">
                  <Label>預設月薪 (HK$)</Label>
                  <Input
                    type="number"
                    value={editForm.defaultMonthlyRate}
                    onChange={e => setEditForm(f => ({ ...f, defaultMonthlyRate: e.target.value }))}
                    placeholder="例：18000"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>取消</Button>
            <Button onClick={handleEdit} disabled={updateUser.isPending}>儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>確認刪除帳戶</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            確定要永久刪除 <strong>{deleteTarget?.fullName}</strong> 的帳戶？此操作無法撤銷。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteUser.isPending}>刪除帳戶</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
