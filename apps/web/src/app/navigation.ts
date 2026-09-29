import { HistoryIcon, SearchIcon, SettingsIcon, type LucideIcon } from "@lucide/vue"
import type { Router } from "vue-router"

/* 侧边栏导航项：只声明展示哪些路由及其图标，名称与路径均取自路由表 */
interface NavigationItem {
  /* 对应路由记录的 name */
  name: string
  icon: LucideIcon
}

/* 数组顺序即侧边栏展示顺序；侧栏只有一级，不分组 */
const navigationItems: NavigationItem[] = [
  { name: "gallery-list", icon: SearchIcon },
  { name: "gallery-history", icon: HistoryIcon },
  { name: "settings", icon: SettingsIcon },
]

export function getNavigationItems(router: Router) {
  return navigationItems.map((item) => ({ ...item, label: router.resolve({ name: item.name }).meta.title }))
}
