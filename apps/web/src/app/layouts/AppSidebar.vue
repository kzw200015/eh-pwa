<script setup lang="ts">
import { watch } from "vue"
import { RouterLink, useRoute, useRouter } from "vue-router"

import { getNavigationItems } from "@/app/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { galleryListName, gallerySource } from "@/features/eh/navigation"

/*
 * 手机抽屉里的导航项放大到行高 44px、16px 字、20px 图标：shadcn 默认的 32px 是按鼠标设计的，手指点偏小。
 * 桌面保持官方尺寸。max-md 与 shadcn 判定手机的断点一致（768px），抽屉里也不会出现收起成图标栏的状态。
 */
const MENU_BUTTON_CLASS = "max-md:h-11 max-md:text-base max-md:[&_svg]:size-5"

const route = useRoute()
const items = getNavigationItems(useRouter())
const { setOpenMobile } = useSidebar()
/* 移动端选中目标页面后收起抽屉。 */
watch(
  () => route.fullPath,
  () => closeNavigation(),
)

function closeNavigation() {
  setOpenMobile(false)
}

/* 图集详情与评论不在侧栏里，高亮它们的来源列表 */
function isActive(name: string) {
  if (route.name === "gallery-detail" || route.name === "gallery-comments") {
    return name === galleryListName(gallerySource(route.query))
  }
  return route.name === name
}
</script>

<template>
  <Sidebar collapsible="icon">
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton as-child size="lg">
            <RouterLink to="/" @click="closeNavigation">
              <!-- 与浏览器标签页、PWA 用同一份图标；旁边已有站名，图片本身不再重复朗读 -->
              <img src="/favicon.svg" alt="" class="size-8 shrink-0" />
              <span class="truncate font-semibold">EH PWA</span>
            </RouterLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>导航</SidebarGroupLabel>
        <SidebarGroupContent>
          <!-- 菜单项默认紧贴，悬停与选中又同色，相邻两项会连成一块，留出一点间距。 -->
          <SidebarMenu class="gap-1">
            <SidebarMenuItem v-for="item in items" :key="item.name">
              <SidebarMenuButton
                as-child
                :class="MENU_BUTTON_CLASS"
                :is-active="isActive(item.name)"
                :tooltip="item.label"
              >
                <RouterLink :to="{ name: item.name }" @click="closeNavigation">
                  <component :is="item.icon" />
                  <span>{{ item.label }}</span>
                </RouterLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
    <SidebarRail />
  </Sidebar>
</template>
