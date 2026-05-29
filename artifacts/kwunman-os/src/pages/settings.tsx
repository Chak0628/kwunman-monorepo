import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  useListNoteTemplates,
  useCreateNoteTemplate,
  useUpdateNoteTemplate,
  useDeleteNoteTemplate,
  getListNoteTemplatesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Info, FileText, Plus, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const EMPTY_TPL = { code: "", title: "", content: "", sortOrder: "0" };

export default function Settings() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isAdmin = user?.role === "管理者";

  // Note templates
  const { data: templates = [], isLoading: tplLoading } = useListNoteTemplates();
  const createTemplate = useCreateNoteTemplate();
  const updateTemplate = useUpdateNoteTemplate();
  const deleteTemplate = useDeleteNoteTemplate();

  const [tplDialog, setTplDialog] = useState<{ open: boolean; editing: number | null }>({ open: false, editing: null });
  const [tplForm, setTplForm] = useState(EMPTY_TPL);
  const [deleteTpl, setDeleteTpl] = useState<{ id: number; title: string } | null>(null);

  const openCreate = () => {
    setTplForm(EMPTY_TPL);
    setTplDialog({ open: true, editing: null });
  };

  const openEdit = (t: (typeof templates)[0]) => {
    setTplForm({ code: t.code, title: t.title, content: t.content, sortOrder: String(t.sortOrder) });
    setTplDialog({ open: true, editing: t.id });
  };

  const invalidateTpl = () => qc.invalidateQueries({ queryKey: getListNoteTemplatesQueryKey() });

  const saveTpl = () => {
    if (!tplForm.code || !tplForm.title || !tplForm.content) {
      toast({ variant: "destructive", title: "請填寫代碼、標題及內容" });
      return;
    }
    const payload = {
      code: tplForm.code.toUpperCase().trim(),
      title: tplForm.title.trim(),
      content: tplForm.content,
      sortOrder: parseInt(tplForm.sortOrder || "0", 10),
    };
    if (tplDialog.editing === null) {
      createTemplate.mutate({ data: payload }, {
        onSuccess: () => {
          toast({ title: "範本已新增" });
          setTplDialog({ open: false, editing: null });
          invalidateTpl();
        },
        onError: () => toast({ variant: "destructive", title: "新增失敗，代碼可能重複" }),
      });
    } else {
      updateTemplate.mutate({ templateId: tplDialog.editing, data: payload }, {
        onSuccess: () => {
          toast({ title: "範本已更新" });
          setTplDialog({ open: false, editing: null });
          invalidateTpl();
        },
        onError: () => toast({ variant: "destructive", title: "更新失敗" }),
      });
    }
  };

  const handleDeleteTpl = () => {
    if (!deleteTpl) return;
    deleteTemplate.mutate({ templateId: deleteTpl.id }, {
      onSuccess: () => {
        toast({ title: "範本已刪除" });
        setDeleteTpl(null);
        invalidateTpl();
      },
    });
  };

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Note Templates — admin only */}
      {isAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" /> 備註範本管理
              </CardTitle>
              <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5" /> 新增範本
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {tplLoading ? (
              <div className="px-5 py-6 text-sm text-muted-foreground text-center">載入中...</div>
            ) : templates.length === 0 ? (
              <div className="px-5 py-8 text-sm text-muted-foreground text-center">
                暫無範本。點擊「新增範本」建立第一個備註範本。
              </div>
            ) : (
              <div className="divide-y">
                {templates.map(t => (
                  <div key={t.id} className="px-5 py-3 flex gap-4 items-start hover:bg-muted/30">
                    <div className="flex-shrink-0 pt-0.5">
                      <Badge variant="outline" className="font-mono text-xs">{t.code}</Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{t.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t.content}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(t)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                        onClick={() => setDeleteTpl({ id: t.id, title: t.title })}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" /> 公司資料
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">公司名稱：</span>冠文鋼結構工程有限公司</div>
            <div><span className="text-muted-foreground">系統版本：</span>KwunMan OS v1.0</div>
            <div><span className="text-muted-foreground">業務地區：</span>香港</div>
            <div><span className="text-muted-foreground">貨幣：</span>港元 (HKD)</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4" /> 關於系統
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>冠文鋼結構管理系統 (KwunMan OS) 是一套專為冠文鋼結構工程有限公司打造的全域 ERP 管理平台。</p>
            <p className="mt-2">功能涵蓋工程管理、報價、客戶管理、支出報銷、薪資管理及多角色存取控制。</p>
          </div>
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={logout} className="text-red-600 border-red-200 hover:bg-red-50">
              登出系統
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Template Create/Edit Dialog */}
      <Dialog open={tplDialog.open} onOpenChange={o => !o && setTplDialog({ open: false, editing: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{tplDialog.editing === null ? "新增備註範本" : "編輯備註範本"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>代碼 * <span className="text-muted-foreground font-normal text-xs">（英文大寫，唯一）</span></Label>
                <Input
                  value={tplForm.code}
                  onChange={e => setTplForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="例：STD / MAINT / STEEL"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label>排序</Label>
                <Input type="number" value={tplForm.sortOrder}
                  onChange={e => setTplForm(f => ({ ...f, sortOrder: e.target.value }))} placeholder="0" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>標題 *</Label>
              <Input value={tplForm.title} onChange={e => setTplForm(f => ({ ...f, title: e.target.value }))}
                placeholder="例：標準報價備註、保養條款..." />
            </div>
            <div className="space-y-1">
              <Label>內容 *</Label>
              <Textarea value={tplForm.content} onChange={e => setTplForm(f => ({ ...f, content: e.target.value }))}
                placeholder="輸入備註範本內容..." rows={5} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTplDialog({ open: false, editing: null })}>取消</Button>
            <Button onClick={saveTpl} disabled={createTemplate.isPending || updateTemplate.isPending}>
              {tplDialog.editing === null ? "新增" : "儲存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Template Confirm */}
      <Dialog open={!!deleteTpl} onOpenChange={() => setDeleteTpl(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>確認刪除範本</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">確定刪除範本「<strong>{deleteTpl?.title}</strong>」？</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTpl(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDeleteTpl} disabled={deleteTemplate.isPending}>刪除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
