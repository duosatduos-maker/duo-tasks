import { CheckSquare, Bell, Settings, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Screen = "tasks" | "alarms" | "settings";

interface BottomNavProps {
  activeScreen: Screen;
  onScreenChange: (screen: Screen) => void;
  onAddClick: () => void;
}

const BottomNav = ({ activeScreen, onScreenChange, onAddClick }: BottomNavProps) => {
  const navItems: { id: Screen; icon: typeof CheckSquare; label: string }[] = [
    { id: "tasks", icon: CheckSquare, label: "Tasks" },
    { id: "alarms", icon: Bell, label: "Alarms" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around px-4 py-2 max-w-md mx-auto relative">
        {navItems.map((item, index) => (
          <button
            key={item.id}
            onClick={() => onScreenChange(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 py-2 px-4 rounded-lg transition-all",
              activeScreen === item.id
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeScreen === item.id && (
              <div className="absolute top-0 w-8 h-0.5 bg-primary rounded-full" />
            )}
            <item.icon className={cn(
              "h-5 w-5 transition-transform",
              activeScreen === item.id && "scale-110"
            )} />
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}

        {/* Floating Action Button */}
        <button
          onClick={onAddClick}
          className="absolute -top-6 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          <Plus className="h-7 w-7" />
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;