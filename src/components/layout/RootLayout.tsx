import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { Home, LayoutDashboard, MessageSquare, LayoutGrid, Settings, LogOut, PanelLeftClose, PanelLeftOpen, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useThemeContext } from "@/context/ThemeContext";
import AvatarBubble from "@/components/chat/AvatarBubble";
import ThemeToggle from "@/components/chat/ThemeToggle";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const RootLayout = () => {
  const { user, profile, signOut } = useAuth();
  const { mode } = useThemeContext();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isMobile) {
      setIsCollapsed(true);
    }
  }, [isMobile]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: MessageSquare, label: "Chat", path: "/chat" },
    { icon: LayoutGrid, label: "Workspace", path: "/workspace" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  // Don't show layout on landing page or for unauthenticated users
  if (!user || location.pathname === "/") return <Outlet />;

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Mobile Menu Toggle */}
      {isMobile && (
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="fixed bottom-6 right-6 z-[60] h-14 w-14 rounded-full gradient-primary shadow-2xl flex items-center justify-center text-white lg:hidden"
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      )}

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isMobile && isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ 
          width: isMobile ? (isMobileMenuOpen ? "280px" : "0px") : (isCollapsed ? "72px" : "260px"),
          x: isMobile && !isMobileMenuOpen ? -20 : 0,
          opacity: isMobile && !isMobileMenuOpen ? 0 : 1
        }}
        className={cn(
          "h-full border-r border-border/50 bg-card/30 backdrop-blur-xl flex flex-col shrink-0 z-50 overflow-hidden shadow-[1px_0_0_0_rgba(0,0,0,0.05)]",
          isMobile ? "fixed left-0 top-0 bottom-0 border-r-0 shadow-2xl" : "relative"
        )}
      >
        {/* Header/Logo */}
        <div className="p-4 flex items-center gap-3 border-b border-border/40">
          <div 
            onClick={() => navigate("/")}
            className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20 cursor-pointer hover:scale-105 active:scale-95 transition-transform"
          >
            <MessageSquare className="h-5 w-5 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col min-w-0"
            >
              <span className="text-sm font-bold tracking-tight text-foreground truncate">RepoRoom</span>
              <span className="text-[10px] text-muted-foreground font-medium truncate">Developer Hub</span>
            </motion.div>
          )}
          {isMobile && (
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="ml-auto p-2 rounded-xl hover:bg-muted text-muted-foreground lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative",
                isActive 
                  ? "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(var(--primary),0.1)]" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn("h-5 w-5 shrink-0 transition-transform group-active:scale-90", isActive ? "text-primary" : "")} />
                  {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
                  {isActive && isCollapsed && (
                    <motion.div 
                      layoutId="active-indicator"
                      className="absolute left-0 w-1 h-5 bg-primary rounded-r-full" 
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-border/40 space-y-3">
          <div className="flex flex-col gap-1">
            <ThemeToggle />
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-9 w-full flex items-center gap-3 px-3 rounded-xl hover:bg-muted text-muted-foreground transition-all group"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="h-4 w-4 shrink-0 mx-auto" />
              ) : (
                <>
                  <PanelLeftClose className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-medium">Collapse</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-3 p-1.5 rounded-xl bg-muted/40 border border-border/30">
            <AvatarBubble
              letter={profile?.username?.[0]?.toUpperCase() || "U"}
              imageUrl={profile?.avatar_url}
              size="sm"
            />
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-foreground truncate">{profile?.display_name || profile?.username || "User"}</p>
                <button 
                  onClick={() => signOut()}
                  className="text-[9px] text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
                >
                  <LogOut className="h-3 w-3" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 relative overflow-hidden bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.03),transparent_25%),radial-gradient(circle_at_bottom_left,hsl(var(--accent)/0.03),transparent_25%)]">
        <Outlet />
      </main>
    </div>
  );
};

export default RootLayout;
