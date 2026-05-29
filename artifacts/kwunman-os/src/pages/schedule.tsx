import { useState } from "react";
import {
  useListSchedules,
  useListUsers,
  useCreateSchedule,
  useDeleteSchedule,
  useUpdateSchedule,
  useListProjects,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Calendar,
  Plus,
  Trash2,
  Users,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS = ["日", "一", "二", "三", "四", "五", "六"];
const MONTHS_ZH = [
  "一月","二月","三月","四月","五月","六月",
  "七月","八月","九月","十月","十一月","十二月",
];

type Schedule = {
  id: number;
  employeeId: number;
  workDate: string;
  location?: string | null;
  projectId?: string | null;
  notes?: string | null;
};

function ScheduleDialog({
  mode,
  schedule,
  defaultDate,
  onClose,
}: {
  mode: "create" | "edit";
  schedule?: Schedule;
  defaultDate?: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: users = [] } = useListUsers();
  const { data: projects = [] } = useListProjects({});

  const [employeeId, setEmployeeId] = useState<string>(
    schedule ? String(schedule.employeeId) : ""
  );
  const [workDate, setWorkDate] = useState(schedule?.workDate ?? defaultDate ?? "");
  const [location, setLocation] = useState(schedule?.location ?? "");
  const [projectId, setProjectId] = useState(schedule?.projectId ?? "none");
  const [notes, setNotes] = useState(schedule?.notes ?? "");
  const [error, setError] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });

  const { mutate: create, isPending: isCreating } = useCreateSchedule({
    mutation: {
      onSuccess: () => { invalidate(); onClose(); },
      onError: () => setError("新增失敗，請重試"),
    },
  });

  const { mutate: update, isPending: isUpdating } = useUpdateSchedule({
    mutation: {
      onSuccess: () => { invalidate(); onClose(); },
      onError: () => setError("更新失敗，請重試"),
    },
  });

  const handleProjectChange = (qid: string) => {
    setProjectId(qid);
    if (qid !== "none") {
      const proj = (projects as any[]).find((p) => p.quoteId === qid);
      if (proj?.location) setLocation(proj.location);
    }
  };

  const handleSubmit = () => {
    if (mode === "create" && !employeeId) { setError("請選擇員工"); return; }
    if (!workDate) { setError("請填寫日期"); return; }
    setError("");
    const data = {
      workDate,
      location: location.trim() || null,
      projectId: projectId !== "none" ? projectId : null,
      notes: notes.trim() || null,
    };
    if (mode === "create") {
      create({ data: { employeeId: Number(employeeId), ...data } });
    } else {
      update({ scheduleId: schedule!.id, data });
    }
  };

  const isPending = isCreating || isUpdating;
  const activeUsers = (users as any[]).filter((u) => u.isActive !== false);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "新增排班" : "編輯排班"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          {mode === "create" ? (
            <div>
              <Label className="text-sm mb-1.5 block">
                員工 <span className="text-red-500">*</span>
              </Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇員工..." />
                </SelectTrigger>
                <SelectContent>
                  {activeUsers.map((u: any) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.fullName}
                      <span className="text-muted-foreground ml-2 text-xs">{u.role}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground bg-muted/40 rounded px-3 py-2">
              員工：<span className="font-semibold text-foreground">
                {activeUsers.find((u: any) => u.id === schedule?.employeeId)?.fullName ?? `#${schedule?.employeeId}`}
              </span>（不可更改）
            </div>
          )}
          <div>
            <Label className="text-sm mb-1.5 block">
              日期 <span className="text-red-500">*</span>
            </Label>
            <Input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-sm mb-1.5 block">關聯工程（可選）</Label>
            <Select value={projectId} onValueChange={handleProjectChange}>
              <SelectTrigger><SelectValue placeholder="選擇工程..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">不關聯工程</SelectItem>
                {(projects as any[])
                  .filter((p) => p.status === "進行中" || p.status === "報價中" || p.status === "施工中")
                  .map((p: any) => (
                    <SelectItem key={p.quoteId} value={p.quoteId}>
                      {p.quoteId} — {p.location || p.projectItem}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm mb-1.5 block">地點</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="例: 港華醫院" />
          </div>
          <div>
            <Label className="text-sm mb-1.5 block">備註</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="例: 早更 07:00" />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>取消</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? (mode === "create" ? "新增中..." : "更新中...") : (mode === "create" ? "確認新增" : "儲存更改")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Schedule() {
  const { user, isEmployee } = useAuth();
  const today = new Date();
  const [viewDate, setViewDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [addDialog, setAddDialog] = useState<{ open: boolean; date?: string }>({ open: false });
  const [editTarget, setEditTarget] = useState<Schedule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Schedule | null>(null);
  const [viewEmployeeId, setViewEmployeeId] = useState<string>("all");

  const queryClient = useQueryClient();
  const monthStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}`;

  const { data: schedules = [], isLoading } = useListSchedules({ month: monthStr });
  const { data: users = [] } = useListUsers();

  const { mutate: del, isPending: isDeleting } = useDeleteSchedule({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
        setDeleteTarget(null);
      },
    },
  });

  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();

  const getUserName = (id: number) =>
    (users as any[]).find((u) => u.id === id)?.fullName ?? `員工 #${id}`;

  const displaySchedules = (schedules as Schedule[]).filter((s) => {
    if (isEmployee) return s.employeeId === user?.id;
    if (viewEmployeeId === "all") return true;
    return s.employeeId === Number(viewEmployeeId);
  });

  const scheduleMap = new Map<string, Schedule[]>();
  displaySchedules.forEach((s) => {
    const arr = scheduleMap.get(s.workDate) ?? [];
    arr.push(s);
    scheduleMap.set(s.workDate, arr);
  });

  const totalWorkDays = isEmployee
    ? new Set(displaySchedules.map((s) => s.workDate)).size
    : displaySchedules.length;

  const activeUsers = (users as any[]).filter((u) => u.isActive !== false && u.role === "員工");

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">本月排班次數</p>
            <p className="text-2xl font-bold text-blue-600">{totalWorkDays}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">查閱月份</p>
            <p className="text-2xl font-bold">{MONTHS_ZH[viewDate.getMonth()]}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">今日日期</p>
            <p className="text-2xl font-bold">{today.getMonth() + 1}/{today.getDate()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {isEmployee ? "我的更表" : "員工排班表"}
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {!isEmployee && activeUsers.length > 0 && (
                <Select value={viewEmployeeId} onValueChange={setViewEmployeeId}>
                  <SelectTrigger className="h-8 text-xs w-[120px]">
                    <Users className="h-3 w-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部員工</SelectItem>
                    {activeUsers.map((u: any) => (
                      <SelectItem key={u.id} value={String(u.id)}>{u.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {!isEmployee && (
                <Button size="sm" className="h-8 text-xs gap-1" onClick={() => setAddDialog({ open: true })}>
                  <Plus className="h-3.5 w-3.5" /> 新增排班
                </Button>
              )}
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-24 text-center">
                  {viewDate.getFullYear()}年 {MONTHS_ZH[viewDate.getMonth()]}
                </span>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">載入更表中...</div>
          ) : (
            <div>
              <div className="grid grid-cols-7 mb-1">
                {DAYS.map((d, i) => (
                  <div key={d} className={cn(
                    "text-center text-xs font-medium py-1",
                    i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-muted-foreground"
                  )}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const daySchedules = scheduleMap.get(dateStr) ?? [];
                  const isToday =
                    today.getFullYear() === viewDate.getFullYear() &&
                    today.getMonth() === viewDate.getMonth() &&
                    today.getDate() === day;
                  const dayOfWeek = new Date(viewDate.getFullYear(), viewDate.getMonth(), day).getDay();
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                  return (
                    <div
                      key={day}
                      className={cn(
                        "min-h-16 p-1 rounded border text-xs cursor-pointer group/cell",
                        isToday ? "border-blue-400 bg-blue-50"
                          : "border-border hover:border-primary/40",
                        isWeekend && !isToday ? "bg-muted/30" : "",
                        daySchedules.length > 0 && !isToday ? "bg-green-50 border-green-200" : ""
                      )}
                      onClick={() => !isEmployee && setAddDialog({ open: true, date: dateStr })}
                    >
                      <div className={cn(
                        "text-right font-medium mb-0.5",
                        isToday ? "text-blue-600" : isWeekend ? "text-muted-foreground" : ""
                      )}>{day}</div>
                      {daySchedules.slice(0, 2).map((s, idx) => (
                        <div key={idx} className="leading-tight mb-0.5">
                          {!isEmployee && (
                            <p className="font-medium text-green-700 truncate">{getUserName(s.employeeId)}</p>
                          )}
                          {s.location && (
                            <p className="text-muted-foreground flex items-center gap-0.5 truncate">
                              <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                              {s.location}
                            </p>
                          )}
                        </div>
                      ))}
                      {daySchedules.length > 2 && (
                        <p className="text-muted-foreground text-[10px]">+{daySchedules.length - 2} 更</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule list with edit */}
      {displaySchedules.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">本月排班詳情</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-80 overflow-y-auto">
              {displaySchedules
                .slice()
                .sort((a, b) => a.workDate.localeCompare(b.workDate))
                .map((s) => (
                  <div key={s.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 group">
                    <div className="w-16 text-sm font-medium text-blue-600 flex-shrink-0">
                      {s.workDate.slice(5)}
                    </div>
                    {!isEmployee && (
                      <div className="w-20 text-sm font-medium flex-shrink-0">
                        {getUserName(s.employeeId)}
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-sm text-muted-foreground flex-1 min-w-0">
                      {s.location && (
                        <>
                          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">{s.location}</span>
                        </>
                      )}
                    </div>
                    {s.projectId && (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 flex-shrink-0">
                        {s.projectId}
                      </Badge>
                    )}
                    {s.notes && (
                      <Badge variant="outline" className="text-xs flex-shrink-0">{s.notes}</Badge>
                    )}
                    {!isEmployee && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <Button
                          size="icon" variant="ghost"
                          className="h-7 w-7 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                          onClick={(e) => { e.stopPropagation(); setEditTarget(s); }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon" variant="ghost"
                          className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(s); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {displaySchedules.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            <Calendar className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
            本月暫無排班記錄
            {!isEmployee && (
              <div className="mt-2">
                <Button variant="outline" size="sm" className="gap-1" onClick={() => setAddDialog({ open: true })}>
                  <Plus className="h-3.5 w-3.5" /> 新增排班
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {addDialog.open && (
        <ScheduleDialog mode="create" defaultDate={addDialog.date} onClose={() => setAddDialog({ open: false })} />
      )}

      {editTarget && (
        <ScheduleDialog mode="edit" schedule={editTarget} onClose={() => setEditTarget(null)} />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除排班</AlertDialogTitle>
            <AlertDialogDescription>
              確定要刪除{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget ? getUserName(deleteTarget.employeeId) : ""}
              </span>{" "}
              於{" "}
              <span className="font-semibold text-foreground">{deleteTarget?.workDate}</span>{" "}
              的排班記錄？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTarget && del({ scheduleId: deleteTarget.id })}
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
