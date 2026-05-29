import { useState } from "react";
import {
  useGetDashboardSummary,
  useGetPendingBalance,
  useMarkProjectReceived,
  useListExpenses,
  useListProjects,
  useUpdateExpense,
  getGetPendingBalanceQueryKey,
  getGetDashboardSummaryQueryKey,
  getListExpensesQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatHKD, formatDate } from "@/lib/format";
import {
  Briefcase,
  Receipt,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  BarChart2,
  ArrowUpRight,
  ArrowDownRight,
  CheckCheck,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type ActiveTab = "active" | "expenses" | "completed" | "budget" | "pending";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("pending");

  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: pendingBalances, isLoading: loadingPending } = useGetPendingBalance();
  const { data: expenses, isLoading: loadingExpenses } = useListExpenses({ status: "pending" });
  const { data: allProjects, isLoading: loadingAll } = useListProjects();
  const markReceived = useMarkProjectReceived();
  const updateExpense = useUpdateExpense();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // 確認收款 state: { quoteId → { date, amount } }
  const [confirmMap, setConfirmMap] = useState<Record<string, { date: string; amount: string }>>({});

  const openConfirm = (p: { quoteId: string; quoteAmount: number }) => {
    setConfirmMap((prev) => ({
      ...prev,
      [p.quoteId]: { date: new Date().toISOString().split("T")[0]!, amount: String(p.quoteAmount) },
    }));
  };
  const closeConfirm = (quoteId: string) => {
    setConfirmMap((prev) => { const n = { ...prev }; delete n[quoteId]; return n; });
  };

  const handleMarkReceived = (projectId: string) => {
    const c = confirmMap[projectId];
    markReceived.mutate(
      {
        projectId,
        data: {
          receivedDate: c?.date || null,
          finalReceived: c?.amount ? parseFloat(c.amount) || null : null,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "已確認收款", description: "項目已標記為已完成" });
          closeConfirm(projectId);
          queryClient.invalidateQueries({ queryKey: getGetPendingBalanceQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        },
        onError: () => {
          toast({ variant: "destructive", title: "更新失敗", description: "請重試" });
        },
      }
    );
  };

  const handleExpenseAction = (expenseId: number, action: "approved" | "rejected") => {
    updateExpense.mutate(
      { expenseId, data: { status: action } },
      {
        onSuccess: () => {
          toast({
            title: action === "approved" ? "報銷已批核" : "報銷已拒絕",
            description: action === "approved" ? "款項將安排支付" : "已通知申請人",
          });
          queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        },
        onError: () => {
          toast({ variant: "destructive", title: "操作失敗", description: "請重試" });
        },
      }
    );
  };

  const pendingIncomeTotal =
    pendingBalances?.reduce((sum, p) => sum + (p.quoteAmount - p.finalReceived), 0) ?? 0;
  const pendingExpensesTotal = summary?.pendingExpensesTotal ?? 0;
  const netCashFlow = pendingIncomeTotal - pendingExpensesTotal;
  const pendingCount = summary?.pendingBalanceCount ?? 0;

  const assistantMessage =
    pendingCount > 0
      ? `老細，目前監控到有 ${pendingCount} 個已完工項目尚未收到尾數，涉及金額合計 ${formatHKD(pendingIncomeTotal)}。建議盡快跟進收款。`
      : "老細，目前所有已完工項目均已收齊款項。現金流狀況極佳！";

  const activeProjects = (allProjects ?? []).filter(
    (p) => p.status !== "已完成" && p.status !== "不成功" && p.status !== "報價中"
  );
  const completedProjects = (allProjects ?? []).filter((p) => p.status === "已完成");
  const budgetProjects = (allProjects ?? []).filter((p) => p.status === "報價中");

  const cardDef: {
    id: ActiveTab;
    label: string;
    topColor: string;
    activeRing: string;
    icon: React.ReactNode;
    value: React.ReactNode;
    sub: React.ReactNode;
  }[] = [
    {
      id: "active",
      label: "活躍工程",
      topColor: "border-t-blue-500",
      activeRing: "ring-blue-500",
      icon: <Briefcase className="h-4 w-4 text-blue-500" />,
      value: <span>{summary?.activeProjectsThisMonth ?? 0}</span>,
      sub: <span>施工中及待收款項目</span>,
    },
    {
      id: "expenses",
      label: "待批核報銷",
      topColor: "border-t-orange-500",
      activeRing: "ring-orange-500",
      icon: <Receipt className="h-4 w-4 text-orange-500" />,
      value: <span className="text-orange-500">{formatHKD(pendingExpensesTotal)}</span>,
      sub: <span className="text-orange-400">{expenses?.length ?? 0} 筆等待老闆審批</span>,
    },
    {
      id: "completed",
      label: "累計已完工",
      topColor: "border-t-green-500",
      activeRing: "ring-green-500",
      icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      value: <span className="text-green-600">{summary?.completedThisQuarter ?? 0}</span>,
      sub: <span>本季內結案總數</span>,
    },
    {
      id: "budget",
      label: "進行中報價",
      topColor: "border-t-blue-400",
      activeRing: "ring-blue-400",
      icon: <TrendingUp className="h-4 w-4 text-blue-400" />,
      value: <span>{summary?.activeQuotesCount ?? 0}</span>,
      sub: <span className="text-blue-500">預計值 {formatHKD(summary?.activeQuotesTotal ?? 0)}</span>,
    },
    {
      id: "pending",
      label: "待收尾數工程",
      topColor: pendingCount > 0 ? "border-t-red-500" : "border-t-gray-300",
      activeRing: "ring-red-500",
      icon: <AlertTriangle className={`h-4 w-4 ${pendingCount > 0 ? "text-red-500" : "text-gray-400"}`} />,
      value: (
        <span className={pendingCount > 0 ? "text-red-600" : ""}>{pendingCount}</span>
      ),
      sub: (
        <span className={pendingCount > 0 ? "text-red-400" : ""}>危險工程數量</span>
      ),
    },
  ];

  const emptyState = (msg = "暫無相關資料") => (
    <div className="px-6 py-10 text-center text-sm text-muted-foreground">
      <CheckCircle2 className="mx-auto h-8 w-8 text-green-400 mb-2" />
      {msg}
    </div>
  );

  const renderDynamicPanel = () => {
    if (activeTab === "pending") {
      return (
        <>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <span className="text-orange-500">$</span> 待追收尾數工程一覽表
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">顯示所有完工但未結清款項的項目</p>
              </div>
              <Badge variant="destructive" className="text-xs">緊急優先</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-[1fr_100px_100px_100px_90px] gap-2 px-6 py-2 border-b bg-muted/40 text-xs font-medium text-muted-foreground">
              <span>工程名稱 / 客戶</span>
              <span className="text-right">總金額</span>
              <span className="text-right text-red-500">待收尾數</span>
              <span className="text-right">預計收款日</span>
              <span className="text-center">操作</span>
            </div>
            {loadingPending ? (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">正在連接數據大腦...</div>
            ) : !pendingBalances?.length ? (
              emptyState("所有項目均已收齊款項")
            ) : (
              <div className="divide-y max-h-80 overflow-y-auto">
                {pendingBalances.map((p) => {
                  const remaining = Math.max(0, p.quoteAmount - p.finalReceived);
                  const expectedDate =
                    p.invoiceStatus && p.invoiceStatus !== "待開單"
                      ? formatDate(p.invoiceStatus)
                      : "-";
                  const isConfirming = !!confirmMap[p.quoteId];
                  return (
                    <div key={p.id} className="border-b last:border-0">
                      <div className="grid grid-cols-[1fr_100px_100px_100px_90px] gap-2 px-6 py-3 items-center hover:bg-muted/30 transition-colors">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{p.projectItem}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {p.quoteId} | {p.client}
                          </p>
                        </div>
                        <span className="text-sm text-right">{formatHKD(p.quoteAmount)}</span>
                        <span className="text-sm text-right font-semibold text-red-600">
                          {formatHKD(remaining)}
                        </span>
                        <span className="text-xs text-right text-muted-foreground">{expectedDate}</span>
                        <div className="flex justify-center">
                          {isConfirming ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs text-muted-foreground"
                              onClick={() => closeConfirm(p.quoteId)}
                            >
                              取消
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white h-7 px-2 text-xs"
                              onClick={() => openConfirm(p)}
                            >
                              <CheckCheck className="h-3 w-3 mr-1" />
                              確認收款
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* 確認收款展開區 */}
                      {isConfirming && (
                        <div className="mx-6 mb-3 p-3 rounded-lg bg-green-50 border border-green-200 space-y-2">
                          <p className="text-xs font-semibold text-green-800">確認收款資料</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] text-green-700 font-medium block mb-1">收款日期 ★</label>
                              <input
                                type="date"
                                value={confirmMap[p.quoteId]?.date ?? ""}
                                onChange={(e) =>
                                  setConfirmMap((prev) => ({
                                    ...prev,
                                    [p.quoteId]: { ...prev[p.quoteId]!, date: e.target.value },
                                  }))
                                }
                                className="w-full border border-green-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-green-500"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-green-700 font-medium block mb-1">實收金額 (HKD)</label>
                              <input
                                type="number"
                                min={0}
                                value={confirmMap[p.quoteId]?.amount ?? ""}
                                onChange={(e) =>
                                  setConfirmMap((prev) => ({
                                    ...prev,
                                    [p.quoteId]: { ...prev[p.quoteId]!, amount: e.target.value },
                                  }))
                                }
                                className="w-full border border-green-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-green-500"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => closeConfirm(p.quoteId)}
                            >
                              取消
                            </Button>
                            <Button
                              size="sm"
                              className="bg-green-700 hover:bg-green-800 text-white h-7 text-xs"
                              onClick={() => handleMarkReceived(p.quoteId)}
                              disabled={markReceived.isPending || !confirmMap[p.quoteId]?.date}
                            >
                              <CheckCheck className="h-3 w-3 mr-1" />
                              確定已收齊
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </>
      );
    }

    if (activeTab === "active") {
      return (
        <>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-blue-500" /> 活躍工程一覽表（未完工）
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">顯示所有目前處於進行中、未完工的工程項目</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-[1fr_120px_130px_110px] gap-2 px-6 py-2 border-b bg-muted/40 text-xs font-medium text-muted-foreground">
              <span>工程名稱 / 客戶</span>
              <span>工程進度</span>
              <span>施工地點</span>
              <span className="text-right">報價金額</span>
            </div>
            {loadingAll ? (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">載入中...</div>
            ) : !activeProjects.length ? (
              emptyState("目前沒有進行中的工程項目")
            ) : (
              <div className="divide-y max-h-80 overflow-y-auto">
                {activeProjects.map((p) => (
                  <div
                    key={p.id}
                    className="grid grid-cols-[1fr_120px_130px_110px] gap-2 px-6 py-3 items-center hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{p.projectItem}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.quoteId} | {p.client}</p>
                    </div>
                    <div>
                      <Badge
                        variant="outline"
                        className="text-xs border-blue-300 text-blue-600 bg-blue-50"
                      >
                        {p.status ?? "進行中"}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground truncate">{p.location ?? "-"}</span>
                    <span className="text-sm text-right font-semibold">{formatHKD(p.quoteAmount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </>
      );
    }

    if (activeTab === "expenses") {
      return (
        <>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-orange-500" /> 待批核報銷申請一覽表
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">以下報銷申請等待老闆批核</p>
              </div>
              {(expenses?.length ?? 0) > 0 && (
                <Badge className="bg-orange-100 text-orange-700 border-orange-300 text-xs">
                  {expenses?.length} 筆待審批
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-[1fr_100px_100px_90px_110px] gap-2 px-6 py-2 border-b bg-muted/40 text-xs font-medium text-muted-foreground">
              <span>申請人 / 報銷項目</span>
              <span className="text-right">金額</span>
              <span className="text-right">提交日期</span>
              <span>類別</span>
              <span className="text-center">操作</span>
            </div>
            {loadingExpenses ? (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">載入中...</div>
            ) : !expenses?.length ? (
              emptyState("所有報銷申請均已處理完畢")
            ) : (
              <div className="divide-y max-h-80 overflow-y-auto">
                {expenses.map((e) => (
                  <div
                    key={e.id}
                    className="grid grid-cols-[1fr_100px_100px_90px_110px] gap-2 px-6 py-3 items-center hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{e.description}</p>
                      <p className="text-xs text-muted-foreground truncate">{e.category ?? "報銷申請"}</p>
                    </div>
                    <span className="text-sm text-right font-semibold text-orange-600">
                      {formatHKD(Number(e.amount))}
                    </span>
                    <span className="text-xs text-right text-muted-foreground">
                      {e.submittedAt ? formatDate(e.submittedAt) : "-"}
                    </span>
                    <Badge variant="outline" className="text-xs w-fit">{e.category ?? "-"}</Badge>
                    <div className="flex justify-center gap-1">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white h-7 px-2 text-xs"
                        onClick={() => handleExpenseAction(e.id, "approved")}
                        disabled={updateExpense.isPending}
                      >
                        <ThumbsUp className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50 h-7 px-2 text-xs"
                        onClick={() => handleExpenseAction(e.id, "rejected")}
                        disabled={updateExpense.isPending}
                      >
                        <ThumbsDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </>
      );
    }

    if (activeTab === "completed") {
      return (
        <>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" /> 已完工工程歷史紀錄
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">所有已完工並結案的工程項目</p>
              </div>
              <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
                {completedProjects.length} 項已完工
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-[1fr_110px_100px_100px_90px] gap-2 px-6 py-2 border-b bg-muted/40 text-xs font-medium text-muted-foreground">
              <span>工程名稱 / 客戶</span>
              <span>完工日期</span>
              <span className="text-right">報價金額</span>
              <span className="text-right text-green-600">實收金額</span>
              <span className="text-center">結案狀態</span>
            </div>
            {loadingAll ? (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">載入中...</div>
            ) : !completedProjects.length ? (
              emptyState("暫無已完工工程紀錄")
            ) : (
              <div className="divide-y max-h-80 overflow-y-auto">
                {completedProjects.map((p) => {
                  const isFullyPaid = p.balanceStatus === "已收齊";
                  const isPending = p.balanceStatus === "待收尾數";
                  return (
                    <div
                      key={p.id}
                      className="grid grid-cols-[1fr_110px_100px_100px_90px] gap-2 px-6 py-3 items-center hover:bg-muted/30 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{p.projectItem}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.quoteId} | {p.client}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {p.endDate ? formatDate(p.endDate) : "-"}
                      </span>
                      <span className="text-sm text-right">{formatHKD(p.quoteAmount)}</span>
                      <span className="text-sm text-right font-semibold text-green-600">
                        {formatHKD(p.finalReceived)}
                      </span>
                      <div className="flex justify-center">
                        {isPending ? (
                          <button
                            className="text-xs bg-amber-100 text-amber-700 border border-amber-300 rounded px-2 py-0.5 hover:bg-amber-200 transition-colors cursor-pointer"
                            onClick={() => setActiveTab("pending")}
                            title="點擊前往待收尾數工程"
                          >
                            待收尾數 ›
                          </button>
                        ) : (
                          <Badge
                            className={
                              isFullyPaid
                                ? "bg-green-100 text-green-700 border-green-300 text-xs"
                                : "bg-gray-100 text-gray-500 border-gray-300 text-xs"
                            }
                          >
                            {isFullyPaid ? "已結清" : "未入賬"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </>
      );
    }

    if (activeTab === "budget") {
      return (
        <>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-400" /> 進行中工程預算與現金流監控
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">正在跑預算的工程項目與金額對比</p>
              </div>
              <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs">
                {budgetProjects.length} 項報價中
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-[1fr_110px_110px_1fr] gap-2 px-6 py-2 border-b bg-muted/40 text-xs font-medium text-muted-foreground">
              <span>工程名稱 / 客戶</span>
              <span className="text-right">報價金額</span>
              <span className="text-right">已收訂金</span>
              <span className="pl-2">預算健康度</span>
            </div>
            {loadingAll ? (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">載入中...</div>
            ) : !budgetProjects.length ? (
              emptyState("目前沒有進行中的報價項目")
            ) : (
              <div className="divide-y max-h-80 overflow-y-auto">
                {budgetProjects.map((p) => {
                  const depositPct =
                    p.quoteAmount > 0
                      ? Math.min(100, Math.round((p.finalReceived / p.quoteAmount) * 100))
                      : 0;
                  const healthColor =
                    depositPct === 0
                      ? "bg-gray-300"
                      : depositPct < 30
                      ? "bg-amber-400"
                      : "bg-green-500";
                  return (
                    <div
                      key={p.id}
                      className="grid grid-cols-[1fr_110px_110px_1fr] gap-2 px-6 py-3 items-center hover:bg-muted/30 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{p.projectItem}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.quoteId} | {p.client}</p>
                      </div>
                      <span className="text-sm text-right font-semibold">{formatHKD(p.quoteAmount)}</span>
                      <span className="text-sm text-right text-blue-600">{formatHKD(p.finalReceived)}</span>
                      <div className="pl-2 flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${healthColor}`}
                            style={{ width: `${depositPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right">{depositPct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      {/* ── KPI Cards ── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {loadingSummary ? (
          Array(5)
            .fill(0)
            .map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
        ) : (
          cardDef.map((card) => {
            const isActive = activeTab === card.id;
            return (
              <Card
                key={card.id}
                onClick={() => setActiveTab(card.id)}
                className={[
                  "border-t-4 cursor-pointer transition-all duration-150 select-none",
                  card.topColor,
                  isActive
                    ? `ring-2 ring-offset-2 ${card.activeRing} shadow-lg scale-[1.03]`
                    : "hover:shadow-md hover:scale-[1.01]",
                ].join(" ")}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    {card.label}
                  </CardTitle>
                  {card.icon}
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="text-3xl font-bold">{card.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* ── Main Content: Left + Right ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Dynamic Panel */}
        <Card className="lg:col-span-3 transition-all duration-200">
          {renderDynamicPanel()}
        </Card>

        {/* Right column */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* 智能營運助理 */}
          <Card className="bg-[#1a2744] text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                <BarChart2 className="h-4 w-4" />
                智能營運助理
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">{assistantMessage}</p>
              {pendingCount === 0 ? (
                <div className="flex items-center gap-2 bg-green-600/20 rounded-md px-3 py-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span className="text-xs text-green-300">現金流狀況極佳</span>
                </div>
              ) : (
                <div className="space-y-1">
                  {pendingBalances?.slice(0, 3).map((p) => (
                    <div key={p.id} className="flex items-center gap-2 text-xs text-slate-300">
                      <AlertTriangle className="h-3 w-3 text-amber-400 flex-shrink-0" />
                      <span className="truncate">{p.client} — {p.quoteId}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 本月現金流預期 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <span className="text-green-500">$</span> 本月現金流預期
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-2 text-sm">
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                  <span>預計收入 (待收尾數)</span>
                </div>
                <span className="font-semibold text-green-600">{formatHKD(pendingIncomeTotal)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-2 text-sm">
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                  <span>預計支出 (薪金+報銷)</span>
                </div>
                <span className="font-semibold text-red-600">{formatHKD(pendingExpensesTotal)}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-semibold">淨現金預期</span>
                <span className={`text-lg font-bold ${netCashFlow >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatHKD(netCashFlow)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
