import { LayoutDashboard, Users, Image, Zap, Package, DollarSign, Megaphone, Settings, Camera, LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
{ title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
{ title: "Clientes", url: "/clientes", icon: Users },
{ title: "Pedidos", url: "/pedidos", icon: Package },
{ title: "Galerias", url: "/galerias", icon: Image },
{ title: "Prévia Rápida", url: "/previa-rapida", icon: Zap },
{ title: "Financeiro", url: "/financeiro", icon: DollarSign },
{ title: "Meta Ads", url: "/meta-ads", icon: Megaphone },
{ title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, signOut } = useAuth();

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-sidebar">
      <SidebarContent>
        <div className="p-4 flex items-center gap-2">
          <Camera className="h-6 w-6 text-primary shrink-0" />
          {!collapsed && (
            <span className="text-lg font-display font-bold text-primary">
              Foto Pronta
            </span>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="hover:bg-sidebar-accent/50 text-sidebar-foreground"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-2">
        {!collapsed && user?.email && (
          <div className="px-2 py-1 text-xs text-muted-foreground truncate" title={user.email}>
            {user.email}
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => signOut()} className="text-sidebar-foreground hover:bg-sidebar-accent/50">
              <LogOut className="mr-2 h-4 w-4 shrink-0" />
              {!collapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
