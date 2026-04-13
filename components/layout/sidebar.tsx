"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { logoutAction } from "@/src/actions/auth-actions"
import {
  Palette,
  Package,
  Wallet,
  Shirt,
  HelpCircle,
  LogOut,
  Bell,
  ChevronDown,
  ChevronRight,
  FileText,
  BarChart3,
  Table,
  BookOpen,
  TrendingUp,
  Calendar,
  Bot,
  Upload,
  Building2,
  Globe,
  Sparkles,
  SlidersHorizontal,
  LayoutDashboard,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getRoleLabel } from "@/src/lib/role-labels"

type SectionId = "design" | "inventory" | "advice" | "finance"

const navItems = [
  {
    id: "design" as SectionId,
    label: "デザインスタジオ",
    sublabel: "画像生成",
    basePath: "/design",
    icon: Palette,
    subItems: [
      { id: "design-pop", label: "POP作成", icon: FileText, href: "/design/pop" },
      { id: "design-history", label: "作成履歴", icon: BookOpen, href: "/design/history" },
    ],
  },
  {
    id: "inventory" as SectionId,
    label: "在庫関連データ",
    sublabel: "在庫・商品分析",
    basePath: "/inventory",
    icon: Package,
    subItems: [
      { id: "inventory-main", label: "仕入れ提案", icon: TrendingUp, href: "/inventory/procurement/suggestions" },
      { id: "inventory-procurement", label: "仕入れリスト", icon: Table, href: "/inventory/procurement/list" },
      { id: "inventory-insights", label: "在庫データ分析", icon: BarChart3, href: "/inventory/insights" },
      { id: "inventory-alerts", label: "在庫アラート分析", icon: Bell, href: "/inventory/alerts"  },
      { id: "inventory-catalog", label: "商品一覧", icon: BookOpen, href: "/inventory/catalog" },
      { id: "inventory-planning", label: "在庫計画早見表", icon: BarChart3, href: "/inventory/planning" },
      { id: "inventory-customer-matrix", label: "得意先4象限", icon: Building2, href: "/inventory/matrix/customer" },
      { id: "inventory-product-matrix", label: "商品4象限", icon: Shirt, href: "/inventory/matrix/product" },
    ],
  },
  {
    id: "advice" as SectionId,
    label: "AIアドバイス",
    sublabel: "経営判断支援",
    basePath: "/advice",
    icon: Bot,
    subItems: [
      { id: "advice-weekly-news", label: "週次ニュース", icon: Calendar, href: "/advice/news/weekly" },
      { id: "advice-business-news", label: "経営判断ニュース", icon: Globe, href: "/advice/news/business" },
      { id: "advice-action-candidates", label: "最適アクション候補", icon: Sparkles, href: "/advice/actions" },
      { id: "advice-report", label: "AIレポート作成", icon: FileText, href: "/advice/reports" },
    ],
  },
  {
    id: "finance" as SectionId,
    label: "ファイナンスフロー",
    sublabel: "予算管理",
    basePath: "/finance",
    icon: Wallet,
    subItems: [
      { id: "finance-overview", label: "ファイナンス・サマリー", icon: LayoutDashboard, href: "/finance/overview" },
      { id: "finance-cashflow", label: "入出金シミュレーション", icon: Calendar, href: "/finance/cashflow" },
    ],
  },
]

type UserInfo = { name: string; role: string }

export function Sidebar({ user }: { user: UserInfo }) {
  const router = useRouter()
  const pathname = usePathname()

  // パスベースのアクティブ判定
  const activeSectionItem = navItems.find((item) => pathname.startsWith(item.basePath))
  const activeSection = activeSectionItem?.id
  const activeSubItem = navItems.flatMap((i) => i.subItems).find((sub) =>
    pathname.startsWith(sub.href)
  )
  const isDataMainActive = pathname === "/data"
  const isDataImportActive = pathname.startsWith("/data/import")

  const [expandedSections, setExpandedSections] = useState<SectionId[]>(
    activeSection ? [activeSection] : []
  )
  const [isHovering, setIsHovering] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const toggleExpand = (section: SectionId) => {
    setExpandedSections((prev) => (prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]))
  }

  const handleMainClick = (item: (typeof navItems)[0]) => {
    toggleExpand(item.id)
    router.push(item.subItems[0].href)
  }

  const handleSubClick = (href: string) => {
    router.push(href)
  }

  const handleCalculationRulesNavigation = () => {
    router.push("/rules")
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const result = await logoutAction()
      if (result.success) {
        router.push("/login")
        router.refresh() // セッション情報をクリア
      } else {
        console.error("ログアウト失敗:", result.error)
        // エラー時は最低限ログインページへ遷移
        router.push("/login")
      }
    } catch (error) {
      console.error("ログアウト処理でエラー:", error)
      router.push("/login")
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <aside
        className="group/sidebar w-24.5 hover:w-89.5 transition-[width] duration-300 ease-in-out bg-sidebar text-sidebar-foreground flex flex-col h-full overflow-hidden relative z-20 shadow-[4px_0_16px_rgba(0,0,0,0.08)] border-r border-sidebar-border"
        onMouseEnter={() => {
          setIsHovering(true)
          setExpandedSections(activeSection ? [activeSection] : [])
        }}
        onMouseLeave={() => {
          setIsHovering(false)
          setExpandedSections([])
        }}
      >
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3 min-h-13">
            <div className="w-10 h-10 bg-[#345fe1] rounded-lg flex items-center justify-center shrink-0">
              <Shirt className="w-6 h-6 text-white" />
            </div>
            <div className="space-y-0.5 overflow-hidden w-0 group-hover/sidebar:w-40 opacity-0 group-hover/sidebar:opacity-100 whitespace-nowrap pointer-events-none transition-[width,opacity] duration-200 ease-in-out delay-75 min-h-10.5">
              <h1 className="font-bold text-lg">Longs</h1>
              <p className="text-xs text-sidebar-foreground/60">Business Management</p>
            </div>
          </div>
        </div>

        {/* Main Menu */}
        <div className="p-2 lg:p-4 flex-1 overflow-y-auto">
          <p className="text-[11px] font-medium text-sidebar-foreground/50 mb-3 px-2 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150 delay-150">
            メインメニュー
          </p>
          <nav>
            <ul className="space-y-1 pt-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = activeSection === item.id
                const isExpanded = expandedSections.includes(item.id)
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => handleMainClick(item)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-3 rounded-lg transition-colors text-left min-h-13",
                        isActive ? "bg-[#345fe1] text-white" : "text-sidebar-foreground/80 hover:bg-sidebar-accent",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5" />
                        <div className="overflow-hidden w-0 group-hover/sidebar:w-45 opacity-0 group-hover/sidebar:opacity-100 whitespace-nowrap pointer-events-none transition-[width,opacity] duration-200 ease-in-out delay-75">
                          <p className="font-medium text-sm">{item.label}</p>
                          <p className={cn("text-xs", isActive ? "text-white/70" : "text-sidebar-foreground/50")}>
                            {item.sublabel}
                          </p>
                        </div>
                      </div>
                      <div className="opacity-0 group-hover/sidebar:opacity-100 transition-[opacity,width] duration-150 delay-75 w-0 group-hover/sidebar:w-9 flex justify-end">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-md flex items-center justify-center shrink-0",
                            isActive ? "bg-white/10 text-white" : "bg-sidebar-accent text-sidebar-foreground/60",
                          )}
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                      </div>
                    </button>
                    {isExpanded && (
                      <ul
                        className={cn(
                          "mt-1 ml-2 space-y-1 overflow-hidden transition-[max-height] duration-200 delay-100",
                          isHovering ? "max-h-150" : "max-h-0",
                        )}
                      >
                        {item.subItems.map((subItem) => {
                          const SubIcon = subItem.icon
                          const isSubActive = activeSubItem?.id === subItem.id
                          return (
                            <li key={subItem.id}>
                              <button
                                onClick={() => handleSubClick(subItem.href)}
                                className={cn(
                                  "w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-left text-sm min-h-11",
                                  isSubActive
                                    ? "bg-[#345fe1]/10 text-[#345fe1] font-medium"
                                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent",
                                )}
                              >
                                <SubIcon className="w-4 h-4" />
                                <span className="overflow-hidden w-0 group-hover/sidebar:w-42.5 opacity-0 group-hover/sidebar:opacity-100 whitespace-nowrap pointer-events-none transition-[width,opacity] duration-200 ease-in-out delay-75">
                                  {subItem.label}
                                </span>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>

        {/* Preferences */}
        <div className="p-3 lg:p-4">
          <p className="text-xs font-medium text-sidebar-foreground/50 mb-3 px-2 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150 delay-150">
            全般
          </p>
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => router.push("/data")}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left",
                  isDataMainActive
                    ? "bg-[#345fe1]/10 text-[#345fe1] font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent"
                )}
              >
                <Table className="w-5 h-5" />
                <span className="text-sm overflow-hidden w-0 group-hover/sidebar:w-30 opacity-0 group-hover/sidebar:opacity-100 whitespace-nowrap pointer-events-none transition-[width,opacity] duration-200 ease-in-out delay-75">
                  データ一覧
                </span>
              </button>
            </li>
            <li>
              <button
                onClick={() => router.push("/data/import")}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left",
                  isDataImportActive
                    ? "bg-[#345fe1]/10 text-[#345fe1] font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent"
                )}
              >
                <Upload className="w-5 h-5" />
                <span className="text-sm overflow-hidden w-0 group-hover/sidebar:w-30 opacity-0 group-hover/sidebar:opacity-100 whitespace-nowrap pointer-events-none transition-[width,opacity] duration-200 ease-in-out delay-75">
                  データ登録
                </span>
              </button>
            </li>
            <li>
              <button
                onClick={handleCalculationRulesNavigation}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent transition-colors text-left"
              >
                <SlidersHorizontal className="w-5 h-5" />
                <span className="text-sm overflow-hidden w-0 group-hover/sidebar:w-30 opacity-0 group-hover/sidebar:opacity-100 whitespace-nowrap pointer-events-none transition-[width,opacity] duration-200 ease-in-out delay-75">
                  ルール管理
                </span>
              </button>
            </li>
            <li>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent transition-colors text-left">
                <HelpCircle className="w-5 h-5" />
                <span className="text-sm overflow-hidden w-0 group-hover/sidebar:w-30 opacity-0 group-hover/sidebar:opacity-100 whitespace-nowrap pointer-events-none transition-[width,opacity] duration-200 ease-in-out delay-75">
                  ヘルプ
                </span>
              </button>
            </li>
          </ul>
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#345fe1] rounded-full flex items-center justify-center shrink-0 text-white font-medium text-sm">
                {user.name ? user.name.charAt(0) : "?"}
              </div>
              <div className="text-sm overflow-hidden w-0 group-hover/sidebar:w-35 opacity-0 group-hover/sidebar:opacity-100 whitespace-nowrap pointer-events-none transition-[width,opacity] duration-200 ease-in-out delay-75">
                <p className="font-medium">{user.name || "（名前未設定）"}</p>
                <p className="text-xs text-sidebar-foreground/50">{getRoleLabel(user.role)}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={cn(
                "p-2 rounded-lg transition-colors hidden group-hover/sidebar:inline-flex",
                isLoggingOut
                  ? "bg-sidebar-accent/50 cursor-not-allowed"
                  : "hover:bg-sidebar-accent"
              )}
            >
              <LogOut className={cn(
                "w-4 h-4",
                isLoggingOut ? "text-sidebar-foreground/30" : "text-sidebar-foreground/60"
              )} />
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}
