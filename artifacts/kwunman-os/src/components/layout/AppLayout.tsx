import React from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  FolderKanban,
  FilePlus2,
  Users,
  ReceiptText,
  BarChart3,
  DollarSign,
  FileOutput,
  Settings,
  UserCog,
  Calendar,
  Wallet,
  LogOut,
  TrendingUp,
  PlusCircle,
  ClipboardList,
  WalletCards,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const ADMIN_NAV_GROUPS = [
  {
    label: "總覽",
    items: [
      { href: "/", label: "管理總覽", icon: LayoutDashboard },
    ],
  },
  {
    label: "工程",
    items: [
      { href: "/projects", label: "工程項目", icon: FolderKanban },
      { href: "/new-quote", label: "智能報價", icon: FilePlus2 },
      { href: "/clients", label: "客戶資料庫", icon: Users },
      { href: "/documents", label: "單據生成", icon: FileOutput },
    ],
  },
  {
    label: "財務",
    items: [
      { href: "/profit", label: "成本利潤分析", icon: BarChart3 },
      { href: "/cashflow", label: "現金流總覽", icon: TrendingUp },
      { href: "/expenses", label: "支出記錄", icon: ReceiptText },
      { href: "/chem-forms", label: "個人墊支申請", icon: WalletCards },
      { href: "/new-expense", label: "新增支出", icon: PlusCircle },
    ],
  },
  {
    label: "人事",
    items: [
      { href: "/schedule", label: "更表管理", icon: Calendar },
      { href: "/payroll", label: "薪資總覽", icon: DollarSign },
      { href: "/payslips-admin", label: "糧單管理", icon: ClipboardList },
    ],
  },
  {
    label: "系統",
    items: [
      { href: "/settings", label: "系統設定", icon: Settings },
      { href: "/users", label: "員工帳戶管理", icon: UserCog },
    ],
  },
];

const EMPLOYEE_NAV = [
  { href: "/", label: "更表", icon: Calendar },
  { href: "/payslips", label: "糧單", icon: Wallet },
  { href: "/chem-forms", label: "個人墊支申請", icon: WalletCards },
  { href: "/settings", label: "設定", icon: Settings },
];

const ROLE_BADGE = {
  管理者: { label: "管理者", className: "bg-red-100 text-red-700 border-red-200" },
  參與者: { label: "參與者", className: "bg-blue-100 text-blue-700 border-blue-200" },
  員工: { label: "員工", className: "bg-slate-100 text-slate-700 border-slate-200" },
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout, isEmployee } = useAuth();

  const allAdminItems = ADMIN_NAV_GROUPS.flatMap(g => g.items);
  const currentLabel = isEmployee
    ? EMPLOYEE_NAV.find(i => i.href === location)?.label ?? ""
    : allAdminItems.find(i => i.href === location)?.label ?? "";
  const roleBadge = ROLE_BADGE[user?.role ?? "員工"];

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <Sidebar className="border-r border-sidebar-border shadow-sm">
          <SidebarHeader className="h-16 flex items-center px-4 gap-3 border-b border-sidebar-border/50">
            <span className="w-8 h-8 rounded bg-primary-foreground text-primary flex items-center justify-center font-black text-sm flex-shrink-0">KM</span>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-sidebar-foreground truncate leading-tight">冠文鋼結構管理</h1>
              <p className="text-xs text-sidebar-foreground/50 truncate">KWUNMAN OS</p>
            </div>
          </SidebarHeader>

          <SidebarContent className="px-2 py-2">
            {isEmployee ? (
              <SidebarMenu>
                {EMPLOYEE_NAV.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.href}
                      tooltip={item.label}
                      className="font-medium text-sidebar-foreground/80 hover:text-sidebar-foreground"
                    >
                      <Link href={item.href} className="flex items-center gap-3 w-full">
                        <item.icon className="h-4 w-4" />
                        <span className="text-sm">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            ) : (
              ADMIN_NAV_GROUPS.map((group) => (
                <SidebarGroup key={group.label} className="py-1">
                  <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 px-2 pb-1">
                    {group.label}
                  </SidebarGroupLabel>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.href + item.label}>
                        <SidebarMenuButton
                          asChild
                          isActive={location === item.href}
                          tooltip={item.label}
                          className="font-medium text-sidebar-foreground/80 hover:text-sidebar-foreground transition-all duration-150"
                        >
                          <Link href={item.href} className="flex items-center gap-3 w-full">
                            <item.icon className="h-4 w-4" />
                            <span className="text-sm">{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroup>
              ))
            )}
          </SidebarContent>

          <SidebarFooter className="border-t border-sidebar-border/50 p-3">
            <div className="flex items-center gap-2 px-1 py-1">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                {user?.fullName?.slice(0, 1) ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.fullName}</p>
                <Badge className={`text-[10px] px-1.5 py-0 h-4 mt-0.5 ${roleBadge.className}`}>{roleBadge.label}</Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-sidebar-foreground/50 hover:text-red-500"
                onClick={logout}
                title="登出"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <header className="h-14 border-b bg-card flex items-center px-4 md:px-6 shadow-sm z-10 shrink-0">
            <SidebarTrigger className="mr-4" />
            <div className="flex-1 font-semibold text-base text-foreground">
              {currentLabel}
            </div>
          </header>
          <main className="flex-1 overflow-auto bg-muted/30 p-4 md:p-6">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
