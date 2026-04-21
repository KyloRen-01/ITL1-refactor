import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SessionUser } from "@/lib/db";
import {
  Menu,
  X,
  LogIn,
  LogOut,
  LayoutDashboard,
  Home,
  PenSquare,
  Newspaper,
  UserCircle,
} from "lucide-react";

interface HeaderProps {
  user: SessionUser | null;
  userAvatarUrl?: string | null;
  currentPage: string;
  onNavigate: (page: string) => void;
  onAuthClick: () => void;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({
  user,
  userAvatarUrl,
  currentPage,
  onNavigate,
  onAuthClick,
  onLogout,
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled
          ? "bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 shadow-lg shadow-black/10"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => onNavigate("home")}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Newspaper className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
              ITL<span className="text-blue-400">1</span>
            </span>
          </button>

          {/* Desktop nav */}
          <nav
            className={`hidden md:flex items-center gap-4 justify-center ${
              user ? "lg:ml-44" : "flex-1 lg:ml-4"
            }`}
          >
            <button
              onClick={() => onNavigate("home")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                currentPage === "home"
                  ? "text-blue-400 bg-blue-500/10"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Home className="h-4 w-4" />
              Home
            </button>

            {user && (
              <>
                <button
                  onClick={() => onNavigate("dashboard")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    currentPage === "dashboard"
                      ? "text-blue-400 bg-blue-500/10"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </button>
                <button
                  onClick={() => onNavigate("editor")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    currentPage === "editor"
                      ? "text-blue-400 bg-blue-500/10"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <PenSquare className="h-4 w-4" />
                  New Post
                </button>
              </>
            )}
          </nav>

          {/* Auth */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onNavigate("profile")}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-600/50 transition-all cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                    {userAvatarUrl ? (
                      <img
                        src={userAvatarUrl}
                        alt={user.email || "User avatar"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      user.email?.[0]?.toUpperCase() || "A"
                    )}
                  </div>
                  <span className="text-sm text-slate-300 max-w-[120px] truncate">
                    {user.email}
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLogout}
                  className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                onClick={onAuthClick}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/20"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900/98 backdrop-blur-md border-b border-slate-800 px-4 pb-4">
          <nav className="space-y-1">
            <button
              onClick={() => {
                onNavigate("home");
                setMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium ${
                currentPage === "home"
                  ? "text-blue-400 bg-blue-500/10"
                  : "text-slate-400"
              }`}
            >
              <Home className="h-4 w-4" />
              Home
            </button>
            {user && (
              <>
                <button
                  onClick={() => {
                    onNavigate("dashboard");
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium ${
                    currentPage === "dashboard"
                      ? "text-blue-400 bg-blue-500/10"
                      : "text-slate-400"
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </button>
                <button
                  onClick={() => {
                    onNavigate("editor");
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium ${
                    currentPage === "editor"
                      ? "text-blue-400 bg-blue-500/10"
                      : "text-slate-400"
                  }`}
                >
                  <PenSquare className="h-4 w-4" />
                  New Post
                </button>
              </>
            )}
            <div className="pt-2 border-t border-slate-800">
              {user ? (
                <>
                  <button
                    onClick={() => {
                      onNavigate("profile");
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium ${
                      currentPage === "profile"
                        ? "text-blue-400 bg-blue-500/10"
                        : "text-slate-400"
                    }`}
                  >
                    <UserCircle className="h-4 w-4" />
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      onLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-red-400"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    onAuthClick();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-blue-400"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </button>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
