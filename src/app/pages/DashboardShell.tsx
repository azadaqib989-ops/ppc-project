import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Menu, X, LogOut, Bell, RotateCcw, KeyRound, AlertCircle } from "lucide-react";
import { useAuth } from "../lib/auth";
import { resetDemoData } from "../lib/store";
import { getNotifications as getApiNotifications, markAllNotificationsRead, changePasswordApi } from "../lib/api";
import type { ApiNotification } from "../lib/api";

export interface NavItem {
  key: string;
  label: string;
  icon: React.ElementType;
}

function ChangePasswordModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }
    setSaving(true);
    try {
      await changePasswordApi(userId, oldPassword, newPassword, confirmPassword);
      toast.success("Password changed successfully.");
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not change your password.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-bold text-[#1c2d7a]">Change password</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Current password</label>
            <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">New password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Confirm new password</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={8} className="w-full text-[12.5px] border border-border rounded-lg p-2.5 bg-[#f4f7fb]" />
          </div>
          {error && (
            <div className="flex items-start gap-1.5 text-[12px] text-[#c0455f] bg-[#fbe9ec] rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}
          <button type="submit" disabled={saving} className="w-full bg-[#1c2d7a] text-white font-bold text-sm py-2.5 rounded-lg hover:bg-[#17a4c2] transition-colors disabled:opacity-50">
            {saving ? "Changing password..." : "Change password"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function DashboardShell({
  navItems, active, onNavigate, title, subtitle, children,
}: {
  navItems: NavItem[];
  active: string;
  onNavigate: (key: string) => void;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifs, setNotifs] = useState<ApiNotification[]>([]);
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    getApiNotifications({ page: 1, pageSize: 50 })
      .then(page => setNotifs(page.data))
      .catch(() => setNotifs([]));
  }, [user]);

  const unread = notifs.filter(n => !n.isRead).length;

  const handleOpenNotifs = () => {
    setShowNotifs(s => !s);
    if (!showNotifs && user) {
      void markAllNotificationsRead();
      setNotifs(ns => ns.map(n => ({ ...n, isRead: true })));
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleReset = () => {
    if (confirm("Reset all demo data (projects, users, interests, saved items) back to the original seed?")) {
      resetDemoData();
      window.location.reload();
    }
  };

  return (
    <div className="dashboard-app min-h-screen bg-[#f4f7fb] flex" style={{ fontFamily: "Arial, sans-serif" }}>
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-[#0c1840] text-white flex flex-col transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex items-center gap-2.5 px-6 h-[70px] border-b border-white/10">
          <div className="flex flex-col gap-[3px]">
            {[0, 1].map(row => (
              <div key={row} className="flex gap-[3px]" style={{ transform: `translateX(${row * 3}px)` }}>
                {[0, 1, 2].map(col => (
                  <div key={col} className="w-[7px] h-[7px] rounded-sm" style={{ background: col === 0 ? "#edf4ff" : col === 1 ? "#17a4c2" : "#e8a020" }} />
                ))}
              </div>
            ))}
          </div>
          <div>
            <div className="font-bold text-[13px] leading-none">PCPP</div>
            <div className="text-[9px] text-white/45 tracking-[0.16em] uppercase mt-0.5">Platform</div>
          </div>
          <button className="ml-auto lg:hidden text-white/60" onClick={() => setMobileOpen(false)}><X className="w-4 h-4" /></button>
        </div>

        <nav className="flex-1 py-5 px-3 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = active === item.key;
            return (
              <button
                key={item.key}
                onClick={() => { onNavigate(item.key); setMobileOpen(false); }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${isActive ? "bg-[#17a4c2] text-white" : "text-white/60 hover:bg-white/5 hover:text-white"}`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" /> {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-2.5 mb-3 px-1">
            <div className="w-8 h-8 rounded-full bg-[#17a4c2] flex items-center justify-center text-xs font-bold flex-shrink-0">
              {user?.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
            </div>
            <div className="min-w-0">
              <div className="text-[12.5px] font-semibold truncate">{user?.name}</div>
              <div className="text-[10.5px] text-white/40 truncate">{user?.title}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 justify-center text-[12.5px] font-semibold text-white/70 hover:text-white border border-white/15 hover:bg-white/5 rounded-lg py-2 transition-colors">
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
          <button onClick={() => setShowChangePassword(true)} className="w-full flex items-center gap-2 justify-center text-[12px] font-semibold text-white/60 hover:text-white mt-2 py-2 transition-colors">
            <KeyRound className="w-3.5 h-3.5" /> Change password
          </button>
          <button onClick={handleReset} className="w-full flex items-center gap-2 justify-center text-[11px] font-medium text-white/35 hover:text-white/70 mt-2 py-1.5 transition-colors">
            <RotateCcw className="w-3 h-3" /> Reset demo data
          </button>
        </div>
      </aside>

      {showChangePassword && user && <ChangePasswordModal userId={user.id} onClose={() => setShowChangePassword(false)} />}

      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-[70px] bg-white border-b border-border flex items-center gap-4 px-5 lg:px-8 sticky top-0 z-20">
          <button className="lg:hidden text-[#0f172a]" onClick={() => setMobileOpen(true)}><Menu className="w-5 h-5" /></button>
          <div className="min-w-0">
            <h1 className="text-[16px] lg:text-lg font-bold text-[#1c2d7a] truncate">{title}</h1>
            <p className="text-[11.5px] text-muted-foreground truncate">{subtitle}</p>
          </div>
          <div className="ml-auto flex items-center gap-3 relative">
            <button onClick={handleOpenNotifs} className="relative p-2 rounded-full hover:bg-slate-100 text-[#0f172a]">
              <Bell className="w-4.5 h-4.5" />
              {unread > 0 && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#c0455f]" />}
            </button>
            {showNotifs && (
              <div className="absolute right-0 top-11 w-80 bg-white border border-border rounded-xl shadow-xl p-3 z-30">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground px-1.5 pb-2">Recent activity</p>
                <div className="space-y-1 max-h-80 overflow-y-auto">
                  {notifs.length === 0 && <p className="text-[12px] text-muted-foreground px-2 py-3">No notifications yet.</p>}
                  {notifs.map(n => (
                    <div key={n.id} className="px-2 py-2 rounded-lg hover:bg-slate-50">
                      <p className="text-[12.5px] text-[#0f172a] leading-snug">{n.text}</p>
                      <p className="text-[10.5px] text-muted-foreground mt-0.5">{n.createdAt.slice(0, 10)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 p-5 lg:p-8 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
