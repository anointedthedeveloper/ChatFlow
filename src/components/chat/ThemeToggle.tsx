import { Moon, Sun } from "lucide-react";
import { useThemeContext } from "@/context/ThemeContext";

const ThemeToggle = () => {
  const { mode, setMode } = useThemeContext();
  return (
    <button
      onClick={() => setMode(mode === "dark" ? "light" : "dark")}
      className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-sidebar-accent transition-colors text-muted-foreground hover:text-sidebar-foreground"
      title={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
    >
      {mode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
};

export default ThemeToggle;
