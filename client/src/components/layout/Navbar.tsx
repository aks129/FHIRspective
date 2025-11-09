import { Link, useLocation } from "react-router-dom";
import { HelpCircle, Settings, LayoutDashboard, BarChart3, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const location = useLocation();

  const navLinks = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/assessments/new", label: "New Assessment", icon: Plus },
    { path: "/analytics", label: "Analytics", icon: BarChart3 },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-2.5 fixed w-full z-20 top-0 left-0 shadow-sm">
      <div className="flex flex-wrap justify-between items-center">
        <div className="flex items-center">
          <Link to="/" className="flex items-center">
            <svg className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              <path d="M12 3v14m-3-7h6" />
            </svg>
            <span className="self-center text-xl font-semibold whitespace-nowrap ml-2">FHIRSpective</span>
            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded">v2</span>
          </Link>
          <div className="hidden md:flex items-center ml-8 gap-1">
            {navLinks.map(({ path, label, icon: Icon }) => (
              <Link key={path} to={path}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "gap-2",
                    location.pathname === path && "bg-accent"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="text-gray-700 hover:text-primary mr-1">
            <HelpCircle className="h-6 w-6" />
          </Button>
          <Link to="/settings">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "text-gray-700 hover:text-primary",
                location.pathname === "/settings" && "bg-accent"
              )}
            >
              <Settings className="h-6 w-6" />
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
