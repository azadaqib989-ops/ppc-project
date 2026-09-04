import { useState, useEffect, useRef, useCallback } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router";
import { motion, AnimatePresence, useInView, useScroll, useSpring, useTransform } from "motion/react";
import {
  ArrowRight, Search, Sun, Droplets, Wind, TreePine, Snowflake,
  Waves, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Menu, X, MapPin,
  TrendingUp, Shield, Users, Globe, Mail, Phone, Twitter, Linkedin,
  Facebook, ExternalLink, BarChart3, Leaf, Eye, EyeOff, LogIn,
  UserPlus, Building2, Check, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "./components/ui/sonner";
import { useAuth, type Role } from "./lib/auth";
import { fetchFileDataUrl, getCatalogue, mapApiProjectToStore, signupInvestor } from "./lib/api";
import type { StoreProject } from "./lib/store";
import AdminDashboard from "./pages/AdminDashboard";
import InvestorDashboard from "./pages/InvestorDashboard";
import FocalDashboard from "./pages/FocalDashboard";

function roleHome(role: Role) {
  if (role === "admin" || role === "reviewer") return "/dashboard/admin";
  if (role === "focal") return "/dashboard/focal";
  return "/dashboard/investor";
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    const fn = () => setY(window.scrollY);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return y;
}

// ─── Scroll-driven effects ───────────────────────────────────────────────────

function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 24, restDelta: 0.001 });
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[3px] z-[70] origin-left bg-gradient-to-r from-[#17a4c2] via-[#1c2d7a] to-[#e8a020]"
      style={{ scaleX }}
    />
  );
}

function BackToTop({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.8 }}
          transition={{ duration: 0.25 }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full bg-[#1c2d7a] text-white shadow-lg flex items-center justify-center hover:bg-[#17a4c2] transition-colors"
          aria-label="Back to top"
        >
          <ChevronUp className="w-5 h-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

function useParallax(ref: React.RefObject<HTMLElement>, distance = 40) {
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  return useTransform(scrollYProgress, [0, 1], [-distance, distance]);
}

function useCountUp(target: number, duration = 1800, trigger = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!trigger) {
      setVal(0);
      return;
    }
    let t0: number | null = null;
    let raf = 0;
    const tick = (ts: number) => {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / duration, 1);
      setVal(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, trigger]);
  return val;
}

// ─── Data ────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: "About PCPP", href: "#about" },
  { label: "Project Pipeline", href: "#projects" },
  { label: "WEF Nexus", href: "#climate-finance" },
  { label: "Impact", href: "#our-impact" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Contact", href: "#contact" },
];

const HERO_SLIDES = [
  {
    img: "photo-1506905925346-21bda4d32df4",
    label: "National Project Pipeline",
    heading: "Making Pakistan's Climate Pipeline Investable",
    sub: "Explore a national catalogue of public-sector projects connecting provinces, ministries, investors and development partners.",
  },
  {
    img: "photo-1509391366360-2e959784a276",
    label: "Water - Energy - Food Nexus",
    heading: "One Pipeline. Three Connected Systems.",
    sub: "Understand how projects strengthen water security, energy access and food systems across Pakistan.",
  },
  {
    img: "photo-1466611653911-95081537e5b7",
    label: "Investment & Development",
    heading: "Find Projects Ready for Partnership",
    sub: "Filter by province, sector, funding gap and readiness to find opportunities that fit your mandate.",
  },
  {
    img: "photo-1448375240586-882707db888b",
    label: "National Overview",
    heading: "See Where Climate Action Is Needed Next",
    sub: "Use portfolio insights and geography to understand concentration, gaps and emerging opportunities.",
  },
  {
    img: "photo-1518020382113-a7e8fc38eac9",
    label: "Evidence & Impact",
    heading: "Projects With a Story You Can Trust",
    sub: "Review scale, location, beneficiaries, jobs, funding needs and implementation readiness in one clear view.",
  },
];

type HomeProject = {
  id: number | string;
  title: string;
  sector: string;
  location: string;
  investment: string;
  status: string;
  summary: string;
  img: string;
  coverImageUrl?: string;
  icon: React.ElementType;
  tag: string;
  updated?: string;
};

const PROJECTS: HomeProject[] = [
  { id: 1, title: "Climate-resilient irrigation modernization", sector: "Water Management", location: "Punjab", investment: "Funding gap available", status: "Published", summary: "A public-sector pipeline opportunity focused on efficient irrigation, resilient agriculture and stronger water security for farming communities.", img: "photo-1625246333195-78d9c38ad449", icon: Droplets, tag: "Water - Food" },
  { id: 2, title: "Solar energy for resilient public services", sector: "Clean Energy", location: "Sindh", investment: "Funding gap available", status: "Published", summary: "Clean energy infrastructure designed to improve reliable access, reduce operating pressure and support climate-resilient public services.", img: "photo-1509391366360-2e959784a276", icon: Sun, tag: "Energy" },
  { id: 3, title: "Community watershed restoration", sector: "Ecosystems", location: "Khyber Pakhtunkhwa", investment: "Seeking partners", status: "Published", summary: "Landscape restoration that protects watersheds, supports rural livelihoods and connects ecological outcomes with local development priorities.", img: "photo-1448375240586-882707db888b", icon: TreePine, tag: "Water - Food" },
  { id: 4, title: "Coastal livelihoods and mangrove resilience", sector: "Coastal Resilience", location: "Sindh", investment: "Seeking partners", status: "Published", summary: "An integrated coastal opportunity combining ecosystem protection, community livelihoods and resilience for vulnerable delta communities.", img: "photo-1518020382113-a7e8fc38eac9", icon: Waves, tag: "Water - Food" },
  { id: 5, title: "Mountain climate adaptation and early warning", sector: "Climate Adaptation", location: "Gilgit-Baltistan", investment: "In preparation", status: "Published", summary: "Adaptation measures for glacier-fed communities, including risk information, resilient infrastructure and local water security.", img: "photo-1506905925346-21bda4d32df4", icon: Snowflake, tag: "Water" },
  { id: 6, title: "Climate-smart food systems", sector: "Climate Agriculture", location: "Balochistan", investment: "Funding gap available", status: "Published", summary: "Projects supporting productive, climate-smart food systems through better resource use, stronger value chains and improved rural resilience.", img: "photo-1625246333195-78d9c38ad449", icon: Leaf, tag: "Food" },
];

const SECTORS = [
  { name: "Water Security", count: 486, icon: Droplets },
  { name: "Clean Energy", count: 372, icon: Sun },
  { name: "Food Systems", count: 318, icon: Leaf },
  { name: "Ecosystems & Land", count: 264, icon: TreePine },
  { name: "Climate Adaptation", count: 421, icon: Snowflake },
  { name: "Resilient Infrastructure", count: 739, icon: Building2 },
];

const PARTNERS = [
  { name: "Ministry of Climate Change & Environmental Coordination", short: "MoCC", domain: "mocc.gov.pk", palette: "from-[#0f4c81] via-[#1d6ed1] to-[#0d1b2a]" },
  { name: "Punjab Planning & Development Board", short: "P&D", domain: "pnd.punjab.gov.pk", palette: "from-[#0f766e] via-[#2bb7a6] to-[#0e2d2a]" },
  { name: "Government of Sindh", short: "GoS", domain: "sindh.gov.pk", palette: "from-[#1f6f5a] via-[#35b996] to-[#12352d]" },
  { name: "Government of Khyber Pakhtunkhwa", short: "KP", domain: "kp.gov.pk", palette: "from-[#203a8b] via-[#4e7ef6] to-[#0f172a]" },
  { name: "Government of Balochistan", short: "GoB", domain: "balochistan.gov.pk", palette: "from-[#20364f] via-[#5d7c97] to-[#101b29]" },
  { name: "AJK & Gilgit-Baltistan", short: "AJK", domain: "ajk.gov.pk", palette: "from-[#0067a1] via-[#36a5d9] to-[#0b1d2a]" },
  { name: "Development Partners", short: "DP", domain: "undp.org", palette: "from-[#0f5c52] via-[#39b7a4] to-[#0d1d1d]" },
  { name: "Project Implementing Agencies", short: "PIA", domain: "worldbank.org", palette: "from-[#0d3b66] via-[#25a0d7] to-[#101a31]" },
];

const REASONS = [
  { icon: TrendingUp, title: "A national view of opportunity", body: "Browse approximately 2,600 projects across federal and provincial development programs, organized for faster discovery." },
  { icon: Shield, title: "Clear project readiness", body: "See where each published project stands, what evidence is available and what support is needed to move forward." },
  { icon: Globe, title: "The WEF Nexus in context", body: "Understand projects through their connected impact on water security, energy access and food systems." },
  { icon: Users, title: "Built for collaboration", body: "Bring project owners, provincial focal points, ministries, investors and development partners into one transparent pipeline." },
];

const ANNOUNCEMENTS = [
  "PCPP · National pipeline · Approximately 2,600 climate and development projects",
  "WEF NEXUS · Explore connected water, energy and food system impacts",
  "INVESTOR ACCESS · Browse approved projects and express interest through the platform",
  "MINISTRY VIEW · Track pipeline concentration, funding gaps and project readiness",
];

// ─── Auth Modal ───────────────────────────────────────────────────────────────

type AuthMode = "login" | "signup" | null;

function InputField({
  label, type = "text", placeholder, icon: Icon, value, onChange, required,
}: {
  label: string; type?: string; placeholder: string; icon?: React.ElementType;
  value: string; onChange: (v: string) => void; required?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const isPassword = type === "password";
  const filled = value.length > 0;

  return (
    <div className="relative">
      <motion.label
        animate={{ y: focused || filled ? -22 : 0, scale: focused || filled ? 0.78 : 1, color: focused ? "#1c2d7a" : "#6b7280" }}
        transition={{ duration: 0.2 }}
        className="absolute left-3 top-3.5 text-sm font-medium pointer-events-none origin-left text-muted-foreground"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {label}{required && " *"}
      </motion.label>
      <input
        type={isPassword ? (showPw ? "text" : "password") : type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder=""
        className="w-full pt-5 pb-2 px-3 bg-[#f0f2fa] border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-[#1c2d7a] focus:ring-2 focus:ring-[#1c2d7a]/15 transition-all"
        style={{ fontFamily: "'Inter', sans-serif" }}
      />
      {isPassword && (
        <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground transition-colors">
          {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground mb-1.5 tracking-wide uppercase" style={{ fontFamily: "'Inter', sans-serif" }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 bg-[#f0f2fa] border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-[#1c2d7a] focus:ring-2 focus:ring-[#1c2d7a]/15 transition-all"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <option value="">Select…</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function AuthLoader({ label }: { label: string }) {
  return (
    <motion.div
      key="loading"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center py-10 gap-5"
    >
      <div className="relative w-16 h-16">
        <span className="absolute inset-0 rounded-full border-4 border-[#eef0f9]" />
        <motion.span
          className="absolute inset-0 rounded-full border-4 border-transparent"
          style={{ borderTopColor: "#1c2d7a", borderRightColor: "#17a4c2" }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
        />
        <motion.span
          className="absolute inset-2.5 rounded-full border-2 border-transparent"
          style={{ borderBottomColor: "#e8a020" }}
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 1.3, ease: "linear" }}
        />
        <motion.span
          className="absolute inset-0 flex items-center justify-center"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }}
        >
          <span className="w-2 h-2 rounded-full bg-[#1c2d7a]" />
        </motion.span>
      </div>
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[#1c2d7a]/70"
            animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15, ease: "easeInOut" }}
          />
        ))}
      </div>
      <p className="font-semibold text-[#1c2d7a] text-sm text-center" style={{ fontFamily: "'Inter', sans-serif" }}>{label}</p>
    </motion.div>
  );
}

type AuthPhase = "idle" | "loading" | "success";

function LoginForm({ onSwitch, onClose }: { onSwitch: () => void; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phase, setPhase] = useState<AuthPhase>("idle");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPhase("loading");
    try {
      const user = await login(email, password);
      toast.success("Signed in successfully!");
      setPhase("success");
      setTimeout(() => {
        onClose();
        navigate(roleHome(user.role));
      }, 900);
    } catch (err: any) {
      const message = err?.message || "Invalid email or password.";
      toast.error(message);
      setError(message);
      setPhase("idle");
    }
  };

  return (
    <motion.div
      key="login"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="w-full"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#1c2d7a] flex items-center justify-center">
          <LogIn className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#1c2d7a]" style={{ fontFamily: "'Playfair Display', serif" }}>Welcome back</h2>
          <p className="text-xs text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>Sign in to your PCPP workspace</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {phase === "loading" ? (
          <AuthLoader label="Verifying your credentials…" />
        ) : phase === "success" ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center py-10 gap-3"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 16 }}
              className="w-14 h-14 rounded-full bg-[#eef0f9] flex items-center justify-center"
            >
              <Check className="w-7 h-7 text-[#1c2d7a]" />
            </motion.div>
            <p className="font-semibold text-[#1c2d7a] text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>Signed in successfully! Redirecting…</p>
          </motion.div>
        ) : (
          <motion.form key="form" onSubmit={handleSubmit} className="space-y-4">
            <InputField label="Email address" type="email" placeholder="" value={email} onChange={setEmail} required />
            <InputField label="Password" type="password" placeholder="" value={password} onChange={setPassword} required />

            {error && (
              <div className="flex items-start gap-1.5 text-[12px] text-[#c0455f] bg-[#fbe9ec] rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {error}
              </div>
            )}

            <div className="flex justify-end">
              <button type="button" className="text-xs text-[#17a4c2] hover:underline font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              className="w-full bg-[#1c2d7a] text-white font-bold text-sm py-3 rounded-lg hover:bg-[#17a4c2] transition-colors duration-200 flex items-center justify-center gap-2"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Sign In <ArrowRight className="w-4 h-4" />
            </button>

            <p className="text-center text-xs text-muted-foreground pt-1" style={{ fontFamily: "'Inter', sans-serif" }}>
              Don't have an account?{" "}
              <button type="button" onClick={onSwitch} className="text-[#1c2d7a] font-bold hover:underline">
                Create account
              </button>
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
}


function SignupForm({ onSwitch, onClose }: { onSwitch: () => void; onClose: () => void }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("");
  const [phase, setPhase] = useState<AuthPhase>("idle");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    setPhase("loading");
    try {
      await signupInvestor({ name, email: email.trim(), password, organization: org, country });
      // Signup doesn't return a token, so log in immediately after to start a real session.
      const user = await login(email.trim(), password);
      toast.success(`Account created for ${email.trim()}.`);
      setPhase("success");
      setTimeout(() => {
        onClose();
        navigate(roleHome(user.role));
      }, 900);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not create your account.";
      setError(message);
      toast.error(message);
      setPhase("idle");
    }
  };

  return (
    <motion.div
      key="signup"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="w-full"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#17a4c2] flex items-center justify-center">
          <UserPlus className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#1c2d7a]" style={{ fontFamily: "'Playfair Display', serif" }}>Create account</h2>
          <p className="text-xs text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>Join the PCPP project and investment community</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {phase === "loading" ? (
          <AuthLoader label="Creating your investor workspace…" />
        ) : phase === "success" ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center py-10 gap-3"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 16 }}
              className="w-14 h-14 rounded-full bg-[#eef0f9] flex items-center justify-center"
            >
              <Check className="w-7 h-7 text-[#1c2d7a]" />
            </motion.div>
            <p className="font-semibold text-[#1c2d7a] text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>Account created! Redirecting to your investor workspace…</p>
          </motion.div>
        ) : (
          <motion.form key="form" onSubmit={handleSubmit} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <InputField label="Full Name" placeholder="" value={name} onChange={setName} required />
              <InputField label="Organization" placeholder="" value={org} onChange={setOrg} />
            </div>
            <InputField label="Email address" type="email" placeholder="" value={email} onChange={setEmail} required />
            <InputField label="Password" type="password" placeholder="" value={password} onChange={setPassword} required />
            <SelectField
              label="Country"
              value={country}
              onChange={setCountry}
              options={["Pakistan", "United States", "United Kingdom", "UAE", "Saudi Arabia", "Germany", "Japan", "China", "Other"]}
            />

            {/* Mini checklist */}
            <div className="bg-[#eef0f9] rounded-lg px-4 py-3 space-y-1.5">
              {["Approved project catalogue", "Province and sector access", "Transparent project status"].map(f => (
                <div key={f} className="flex items-center gap-2 text-xs text-[#1c2d7a]" style={{ fontFamily: "'Inter', sans-serif" }}>
                  <Check className="w-3.5 h-3.5 text-[#17a4c2] flex-shrink-0" /> {f}
                </div>
              ))}
            </div>

            {error && (
              <div className="flex items-start gap-1.5 text-[12px] text-[#c0455f] bg-[#fbe9ec] rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-[#17a4c2] text-white font-bold text-sm py-3 rounded-lg hover:bg-[#1c2d7a] transition-colors duration-200 flex items-center justify-center gap-2"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Create Account <ArrowRight className="w-4 h-4" />
            </button>

            <p className="text-center text-xs text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
              Already have an account?{" "}
              <button type="button" onClick={onSwitch} className="text-[#1c2d7a] font-bold hover:underline">Sign in</button>
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AuthModal({ mode, onClose }: { mode: AuthMode; onClose: () => void }) {
  const [current, setCurrent] = useState<"login" | "signup">(mode || "login");

  useEffect(() => { if (mode) setCurrent(mode); }, [mode]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      {mode && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Top accent bar */}
              <div className="h-1 w-full bg-gradient-to-r from-[#1c2d7a] via-[#17a4c2] to-[#1c2d7a]" />

              {/* Tab switcher */}
              <div className="flex border-b border-border">
                {(["login", "signup"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setCurrent(tab)}
                    className={`flex-1 py-3.5 text-sm font-semibold transition-colors duration-200 relative ${current === tab ? "text-[#1c2d7a]" : "text-muted-foreground hover:text-foreground"}`}
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {tab === "login" ? "Sign In" : "Sign Up"}
                    {current === tab && (
                      <motion.div layoutId="auth-tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1c2d7a]" />
                    )}
                  </button>
                ))}
              </div>

              {/* Close */}
              <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>

              {/* Form area */}
              <div className="p-7 overflow-y-auto max-h-[80vh]">
                <AnimatePresence mode="wait">
                  {current === "login" ? (
                    <LoginForm key="login" onSwitch={() => setCurrent("signup")} onClose={onClose} />
                  ) : (
                    <SignupForm key="signup" onSwitch={() => setCurrent("login")} onClose={onClose} />
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Announcement Ticker ──────────────────────────────────────────────────────

function AnnouncementTicker() {
  const [idx, setIdx] = useState(0);
  const [show, setShow] = useState(true);
  useEffect(() => {
    const iv = setInterval(() => {
      setShow(false);
      setTimeout(() => { setIdx(i => (i + 1) % ANNOUNCEMENTS.length); setShow(true); }, 300);
    }, 4000);
    return () => clearInterval(iv);
  }, []);
  return (
    <div className="bg-[#0f172a] text-white text-xs py-2 px-6 z-40 relative -mt-[5px]">
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        <span className="bg-[#dfeaf8] text-[#0f172a] font-bold px-2.5 py-0.5 rounded text-[10px] tracking-widest uppercase flex-shrink-0">LIVE</span>
        <motion.span
          key={idx}
          animate={{ opacity: show ? 1 : 0, y: show ? 0 : -4 }}
          transition={{ duration: 0.28 }}
          className="font-medium truncate text-slate-100"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {ANNOUNCEMENTS[idx]}
        </motion.span>
        <button className="ml-auto flex-shrink-0 flex items-center gap-1 text-[#dfeaf8] font-semibold hover:underline">
          View all <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar({ scrollY, onAuth }: { scrollY: number; onAuth: (m: AuthMode) => void }) {
  const [open, setOpen] = useState(false);
  const solid = scrollY > 40;

  return (
    <nav className={`fixed top-7 left-0 right-0 z-40 transition-all duration-400 ${solid ? "bg-white shadow-sm border-b border-border" : "bg-white"}`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 flex items-center justify-between h-[70px]">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2.5 flex-shrink-0">
          <div className="flex flex-col gap-[3px]">
            {[0, 1].map(row => (
              <div key={row} className="flex gap-[3px]" style={{ transform: `translateX(${row * 3}px)` }}>
                {[0, 1, 2].map(col => (
                  <div key={col} className="w-[7px] h-[7px] rounded-sm"
                    style={{ background: col === 0 ? "#1c2d7a" : col === 1 ? "#17a4c2" : "#e8a020" }} />
                ))}
              </div>
            ))}
          </div>
          <div>
            <div className="text-[#1c2d7a] font-bold text-[15px] leading-none tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>PAKISTAN</div>
            <div className="text-[#17a4c2] text-[9px] font-bold tracking-[0.18em] uppercase leading-none mt-0.5" style={{ fontFamily: "'Inter', sans-serif" }}>Project Pipeline</div>
          </div>
        </a>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-5">
          {NAV_LINKS.map(link => (
            <a key={link.label} href={link.href}
              className="text-[12.5px] font-medium text-[#0f1a3a] hover:text-[#1c2d7a] transition-colors duration-200"
              style={{ fontFamily: "'Inter', sans-serif" }}>
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-2">
          <button className="p-2 text-[#0f172a] hover:bg-slate-100 rounded-full transition-colors">
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={() => onAuth("login")}
            className="text-[13px] font-semibold text-[#0f172a] border border-slate-300 px-4 py-2 rounded hover:bg-slate-100 transition-colors duration-200"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Login
          </button>
          <button
            onClick={() => onAuth("signup")}
            className="text-[13px] font-semibold text-white bg-[#0f172a] px-4 py-2 rounded hover:bg-slate-700 transition-colors duration-200"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Sign Up
          </button>
        </div>

        <button onClick={() => setOpen(!open)} className="lg:hidden p-2 text-[#1c2d7a]">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden bg-white border-t border-border px-6 py-4 space-y-3">
          {NAV_LINKS.map(link => (
            <a key={link.label} href={link.href} className="block text-sm text-foreground hover:text-primary py-1.5" onClick={() => setOpen(false)}>{link.label}</a>
          ))}
          <div className="flex gap-3 pt-2">
            <button onClick={() => { onAuth("login"); setOpen(false); }}
              className="flex-1 border border-[#1c2d7a] text-[#1c2d7a] text-sm font-semibold py-2.5 rounded text-center">
              Login
            </button>
            <button onClick={() => { onAuth("signup"); setOpen(false); }}
              className="flex-1 bg-[#1c2d7a] text-white text-sm font-semibold py-2.5 rounded text-center">
              Sign Up
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

// ─── Hero Slider ──────────────────────────────────────────────────────────────

function Hero({ onAuth, recentProject }: { onAuth: (m: AuthMode) => void; recentProject?: HomeProject }) {
  const [slide, setSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const total = HERO_SLIDES.length;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback((next: number, dir: number) => {
    setDirection(dir);
    setSlide(next);
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDirection(1);
      setSlide(s => (s + 1) % total);
    }, 5500);
  }, [total]);

  useEffect(() => { startTimer(); return () => { if (timerRef.current) clearTimeout(timerRef.current); }; }, [slide, startTimer]);

  const prev = () => { const n = (slide - 1 + total) % total; goTo(n, -1); };
  const next = () => { const n = (slide + 1) % total; goTo(n, 1); };

  const s = HERO_SLIDES[slide];
  const isProjectSlide = slide === 0 && recentProject;
  const heroImage = isProjectSlide ? recentProject.coverImageUrl : undefined;

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ marginTop: "calc(28px + 70px)", height: "calc(100vh - 98px)", minHeight: 520 }}
    >
      {/* Slides */}
      <AnimatePresence mode="sync" initial={false} custom={direction}>
        <motion.div
          key={slide}
          custom={direction}
          variants={{
            enter: (d: number) => ({ x: d > 0 ? "8%" : "-8%", opacity: 0 }),
            center: { x: 0, opacity: 1 },
            exit: (d: number) => ({ x: d > 0 ? "-8%" : "8%", opacity: 0 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.75, ease: [0.32, 0, 0.67, 0] }}
          className="absolute inset-0"
        >
          <img
            src={heroImage || `https://images.unsplash.com/${s.img}?w=1800&h=900&fit=crop&auto=format`}
            alt={isProjectSlide ? recentProject.title : s.label}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a]/88 via-[#101b2e]/75 to-[#0a1e25]/45" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(167,199,233,0.18),transparent_28%)]" />
        </motion.div>
      </AnimatePresence>

      {/* Text overlay */}
      <div className="absolute inset-y-0 left-0 flex flex-col justify-center px-10 lg:px-20" style={{ width: "min(600px, 62%)" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={slide}
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded px-3 py-1 mb-5 w-fit backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#dfeaf8] animate-pulse" />
              <span className="text-white/80 text-[10px] font-bold tracking-widest uppercase" style={{ fontFamily: "'Inter', sans-serif" }}>
                {isProjectSlide ? `Top recent project · ${recentProject.location}` : `${s.label} · PCPP`}
              </span>
            </div>

            <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              {isProjectSlide ? recentProject.title : s.heading}
            </h1>

            <p className="text-white/75 text-[15px] leading-relaxed mb-8 max-w-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
              {isProjectSlide ? recentProject.summary : s.sub}
            </p>

            <div className="flex flex-wrap gap-3">
              <a href="#projects" className="inline-flex items-center gap-2 bg-[#edf4ff] text-[#0f172a] font-semibold text-sm px-6 py-2.5 rounded hover:bg-white transition-colors">
                Explore Projects <ArrowRight className="w-4 h-4" />
              </a>
              <button onClick={() => onAuth("signup")}
                className="inline-flex items-center gap-2 border border-white/30 text-white font-medium text-sm px-6 py-2.5 rounded hover:bg-white/10 transition-colors">
                Join the Platform
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Slide controls */}
      <div className="absolute bottom-28 left-10 lg:left-20 flex items-center gap-3">
        {HERO_SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i, i > slide ? 1 : -1)}
            className={`transition-all duration-300 rounded-full ${i === slide ? "w-7 h-2 bg-[#edf4ff]" : "w-2 h-2 bg-white/35 hover:bg-white/60"}`}
          />
        ))}
      </div>

      <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 border border-white/20 flex items-center justify-center text-white hover:bg-white/25 transition-colors backdrop-blur-sm">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 border border-white/20 flex items-center justify-center text-white hover:bg-white/25 transition-colors backdrop-blur-sm">
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Slide counter */}
      <div className="absolute bottom-28 right-6 text-white/40 text-xs font-mono" style={{ fontFamily: "'Inter', sans-serif" }}>
        {String(slide + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
        <motion.div
          key={slide}
          className="h-full bg-[#edf4ff]"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 5.5, ease: "linear" }}
        />
      </div>

      {/* Stats strip */}
      <div className="absolute bottom-0.5 left-0 right-0 bg-[#0b1628]/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
          {[
            { v: "2,600+", l: "Projects in the national pipeline" },
            { v: "6", l: "Provinces and regions represented" },
            { v: "3", l: "Water - Energy - Food dimensions" },
            { v: "1", l: "Shared source of project intelligence" },
          ].map((s, i) => (
            <div key={i} className="py-4 px-5 text-center">
              <div className="text-xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>{s.v}</div>
              <div className="text-[10px] text-white/50 font-medium tracking-wide uppercase mt-0.5" style={{ fontFamily: "'Inter', sans-serif" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ projects }: { projects: HomeProject[] }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: false, amount: 0.4 });
  const provinces = new Set(projects.map(project => project.location)).size;
  const p1 = useCountUp(projects.length, 1800, inView);
  const p2 = useCountUp(provinces, 1800, inView);
  const p3 = useCountUp(new Set(projects.flatMap(project => project.tag.split(" - "))).size, 1800, inView);
  const p4 = useCountUp(1, 1800, inView);

  return (
    <div ref={ref} className="bg-[#eef0f9] border-y border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 grid grid-cols-2 lg:grid-cols-4 divide-x divide-border">
        {[
          { v: p1, suf: "+", l: "Projects in the national pipeline", pre: "" },
          { v: p2, suf: "", l: "Provinces and regions represented", pre: "" },
          { v: p3, suf: "", l: "Water - Energy - Food dimensions", pre: "" },
          { v: p4, suf: "", l: "Shared platform for stakeholders", pre: "" },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 14 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: i * 0.1 }} className="py-8 px-6 text-center">
            <div className="text-3xl lg:text-4xl font-bold text-[#1c2d7a] mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>{s.pre}{s.v}{s.suf}</div>
            <div className="text-[12px] text-muted-foreground font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>{s.l}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Projects ─────────────────────────────────────────────────────────────────

function ProjectDetails({ project, onClose, onInvest }: { project: HomeProject; onClose: () => void; onInvest: () => void }) {
  const Icon = project.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-[#0f172a]/65 backdrop-blur-sm p-4 flex items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="project-detail-title"
          onClick={event => event.stopPropagation()}
        >
          <img src={project.coverImageUrl || `https://images.unsplash.com/${project.img}?w=1200&h=420&fit=crop&auto=format`} alt={project.title} className="w-full h-48 sm:h-56 object-cover" />
          <button onClick={onClose} aria-label="Close project details" className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/90 text-[#0f172a] flex items-center justify-center shadow hover:bg-white transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide font-bold text-[#1c2d7a] bg-[#eef0f9] px-2.5 py-1 rounded"><Icon className="w-3.5 h-3.5" /> {project.tag}</span>
              <span className="text-[11px] font-semibold text-[#17a4c2]">{project.status}</span>
            </div>
            <h2 id="project-detail-title" className="text-2xl sm:text-3xl font-bold text-[#1c2d7a] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>{project.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6" style={{ fontFamily: "'Inter', sans-serif" }}>{project.summary}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
              {[{ label: "Location", value: project.location }, { label: "Sector", value: project.sector }, { label: "Funding", value: project.investment }, { label: "Lens", value: project.tag }].map(item => (
                <div key={item.label} className="bg-[#f4f7fb] rounded-lg p-3">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{item.label}</div>
                  <div className="text-xs font-bold text-[#1c2d7a] leading-snug">{item.value}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={onInvest} className="flex-1 inline-flex items-center justify-center gap-2 bg-[#17a4c2] text-white font-bold text-sm py-3 rounded hover:bg-[#1c2d7a] transition-colors">
                Try to Invest <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={onClose} className="sm:w-36 border border-slate-300 text-[#1c2d7a] font-semibold text-sm py-3 rounded hover:bg-slate-50 transition-colors">Back to projects</button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ProjectCard({ p, i, onView }: { p: HomeProject; i: number; onView: (project: HomeProject) => void }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: false, margin: "-50px", amount: 0.25 });
  const Icon = p.icon;
  return (
    <motion.article ref={ref} initial={{ opacity: 0, y: 28 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.55, delay: (i % 3) * 0.1 }}
      className="group bg-white border border-border rounded-lg overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
      <div className="relative h-44 overflow-hidden bg-muted">
        <img src={p.coverImageUrl || `https://images.unsplash.com/${p.img}?w=600&h=280&fit=crop&auto=format`} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <span className="absolute top-3 left-3 bg-[#1c2d7a] text-white text-[10px] font-bold px-2.5 py-1 rounded tracking-wide uppercase" style={{ fontFamily: "'Inter', sans-serif" }}>{p.tag}</span>
        <span className="absolute bottom-3 right-3 bg-white text-[#1c2d7a] text-xs font-bold px-2.5 py-1 rounded" style={{ fontFamily: "'Inter', sans-serif" }}>{p.investment}</span>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start gap-2.5 mb-2">
          <div className="bg-slate-100 p-1.5 rounded mt-0.5 flex-shrink-0"><Icon className="w-3.5 h-3.5 text-[#0f172a]" /></div>
          <h3 className="font-bold text-[15px] text-slate-800 leading-snug" style={{ fontFamily: "'Playfair Display', serif" }}>{p.title}</h3>
        </div>
        <p className="text-[13px] text-muted-foreground leading-relaxed flex-1 mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>{p.summary}</p>
        <div className="flex items-center justify-between pt-3 border-t border-border text-[12px]">
          <span className="flex items-center gap-1 text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}><MapPin className="w-3 h-3" /> {p.location}</span>
          <span className="flex items-center gap-1.5 text-slate-700 font-semibold" style={{ fontFamily: "'Inter', sans-serif" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#7db4e8] animate-pulse" />{p.status}
          </span>
        </div>
      </div>
      <div className="px-5 pb-5">
        <button onClick={() => onView(p)} className="w-full flex items-center justify-center gap-2 bg-slate-100 text-[#0f172a] text-sm font-semibold py-2.5 rounded hover:bg-[#0f172a] hover:text-white transition-all duration-200">
          View Details <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.article>
  );
}

function ProjectsSection({ projects, onView }: { projects: HomeProject[]; onView: (project: HomeProject) => void }) {
  return (
    <section id="projects" className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex items-end justify-between mb-10 border-b-2 border-[#1c2d7a] pb-4">
          <div>
            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} exit={{ opacity: 0 }} viewport={{ once: false, amount: 0.5 }} className="text-[11px] font-bold tracking-widest text-[#17a4c2] uppercase mb-1" style={{ fontFamily: "'Inter', sans-serif" }}>Open Investment Opportunities</motion.p>
            <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.5 }} transition={{ delay: 0.1 }} className="text-3xl lg:text-4xl font-bold text-[#1c2d7a]" style={{ fontFamily: "'Playfair Display', serif" }}>Featured Climate Projects</motion.h2>
          </div>
          <a href="#" className="hidden md:inline-flex items-center gap-1.5 text-sm font-semibold text-[#17a4c2] hover:underline" style={{ fontFamily: "'Inter', sans-serif" }}>
            View all {projects.length.toLocaleString()} projects <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.slice(0, 6).map((p, i) => <ProjectCard key={p.id} p={p} i={i} onView={onView} />)}
        </div>
      </div>
    </section>
  );
}

// ─── Sectors ──────────────────────────────────────────────────────────────────

function SectorsSection({ projects }: { projects: HomeProject[] }) {
  return (
    <section id="climate-finance" className="py-20 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="border-b-2 border-[#1c2d7a] pb-4 mb-10">
          <p className="text-[11px] font-bold tracking-widest text-[#17a4c2] uppercase mb-1" style={{ fontFamily: "'Inter', sans-serif" }}>Investment Sectors</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-[#1c2d7a]" style={{ fontFamily: "'Playfair Display', serif" }}>See the Pipeline Through the WEF Nexus</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {SECTORS.map((s, i) => {
            const count = projects.filter(project => project.sector === s.name || project.tag.includes(s.name.split(" ")[0])).length;
            const Icon = s.icon;
            return (
              <motion.a href="#projects" key={s.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.4 }} transition={{ delay: i * 0.07 }}
                className="group cursor-pointer bg-[#eef0f9] rounded-lg p-5 text-center hover:bg-[#1c2d7a] hover:shadow-lg transition-all duration-300">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white mb-3 group-hover:bg-white/15">
                  <Icon className="w-5 h-5 text-[#1c2d7a] group-hover:text-white transition-colors" />
                </div>
                <div className="font-bold text-xs text-[#1c2d7a] group-hover:text-white mb-0.5 transition-colors" style={{ fontFamily: "'Inter', sans-serif" }}>{s.name}</div>
                <div className="text-[11px] text-muted-foreground group-hover:text-white/60 transition-colors" style={{ fontFamily: "'Inter', sans-serif" }}>{count} projects</div>
              </motion.a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Why Pakistan ─────────────────────────────────────────────────────────────

function WhySection() {
  const imgRef = useRef<HTMLDivElement>(null);
  const parallaxY = useParallax(imgRef, 30);

  return (
    <section id="about" className="py-20 lg:py-28 bg-[#eef0f9] overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: false, amount: 0.5 }} className="text-[11px] font-bold tracking-widest text-[#17a4c2] uppercase mb-2" style={{ fontFamily: "'Inter', sans-serif" }}>Investment Case</motion.p>
            <motion.h2 initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.5 }} transition={{ delay: 0.1 }} className="text-3xl lg:text-4xl font-bold text-[#1c2d7a] mb-5" style={{ fontFamily: "'Playfair Display', serif" }}>A Clearer View of National Climate Action</motion.h2>
            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: false, amount: 0.5 }} transition={{ delay: 0.2 }} className="text-[14px] text-muted-foreground leading-relaxed mb-8" style={{ fontFamily: "'Inter', sans-serif" }}>
              Pakistan ranks among the top-10 most climate-vulnerable nations yet contributes less than 1% of global emissions. Vast natural capital, strong policy alignment, and urgent transformation need combine with competitive returns and sovereign protections.
            </motion.p>
            <div className="space-y-5">
              {REASONS.map((r, i) => {
                const Icon = r.icon;
                return (
                  <motion.div key={r.title} initial={{ opacity: 0, x: -18 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: false, amount: 0.5 }} transition={{ delay: 0.1 + i * 0.1 }} className="flex gap-4">
                    <div className="bg-[#1c2d7a] text-white p-2.5 rounded-lg flex-shrink-0 h-fit"><Icon className="w-4 h-4" /></div>
                    <div>
                      <h4 className="font-bold text-[14px] text-[#1c2d7a] mb-0.5" style={{ fontFamily: "'Inter', sans-serif" }}>{r.title}</h4>
                      <p className="text-[13px] text-muted-foreground leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>{r.body}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
          <motion.div ref={imgRef} initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: false, amount: 0.4 }} transition={{ duration: 0.7 }} className="relative" style={{ y: parallaxY }}>
            <div className="rounded-xl overflow-hidden">
              <img src="https://images.unsplash.com/photo-1509391366360-2e959784a276?w=700&h=600&fit=crop&auto=format" alt="Solar project Pakistan" className="w-full h-[460px] object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1c2d7a]/30 to-transparent rounded-xl" />
            </div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.4 }} transition={{ delay: 0.5 }} className="absolute -bottom-5 -left-5 bg-white rounded-xl shadow-xl p-4 border border-border flex items-center gap-3">
              <div className="bg-[#eef0f9] p-2.5 rounded-lg"><BarChart3 className="w-5 h-5 text-[#1c2d7a]" /></div>
              <div>
                <div className="text-xl font-bold text-[#1c2d7a]" style={{ fontFamily: "'Playfair Display', serif" }}>2,600+</div>
                <div className="text-[11px] text-muted-foreground font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>Projects represented</div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: -16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.4 }} transition={{ delay: 0.6 }} className="absolute -top-5 -right-5 bg-[#1c2d7a] text-white rounded-xl shadow-xl p-4">
              <div className="text-xl font-bold mb-0.5" style={{ fontFamily: "'Playfair Display', serif" }}>WEF</div>
              <div className="text-[11px] text-white/65 font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>Nexus lens</div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── Partners ─────────────────────────────────────────────────────────────────

function PartnersSection() {
  return (
    <section id="our-impact" className="py-16 bg-[#f4f7fb]">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <p className="text-center text-slate-600 text-[11px] font-bold tracking-widest uppercase mb-8" style={{ fontFamily: "'Inter', sans-serif" }}>Institutions across the pipeline</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {PARTNERS.map((p, i) => (
            <motion.div key={p.name} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.4 }} transition={{ delay: i * 0.06 }}
              className="bg-white border border-slate-200 rounded-xl px-4 py-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
              <div className="flex items-center gap-3">
                <div className={`relative flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${p.palette} text-[11px] font-black text-white tracking-[0.12em] overflow-hidden`}>
                  <span>{p.short}</span>
                  <img src={`https://www.google.com/s2/favicons?domain=${p.domain}&sz=128`} alt="" className="absolute inset-1 w-8 h-8 rounded object-contain bg-white" />
                </div>
                <span className="text-[12.5px] font-semibold text-slate-700 text-left leading-tight" style={{ fontFamily: "'Inter', sans-serif" }}>{p.name}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Process ──────────────────────────────────────────────────────────────────

function ProcessSection() {
  const steps = [
    { n: "01", title: "Create your workspace", body: "Register as an investor, development partner, provincial focal point or ministry user." },
    { n: "02", title: "Browse & Compare", body: "Filter approved projects by province, sector, funding gap, readiness and Water - Energy - Food impact." },
    { n: "03", title: "Express Interest", body: "Share your interest with the relevant project owner and keep the conversation connected to the pipeline." },
    { n: "04", title: "Track Progress", body: "Follow review decisions, project updates and next steps through a transparent shared workflow." },
  ];
  return (
    <section id="how-it-works" className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="border-b-2 border-[#1c2d7a] pb-4 mb-10">
          <p className="text-[11px] font-bold tracking-widest text-[#17a4c2] uppercase mb-1" style={{ fontFamily: "'Inter', sans-serif" }}>How PCPP works</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-[#1c2d7a]" style={{ fontFamily: "'Playfair Display', serif" }}>A Shared Path From Idea to Impact</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((s, i) => (
            <motion.div key={s.n} initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.4 }} transition={{ delay: i * 0.11 }}
              className="bg-[#eef0f9] rounded-lg p-6 hover:bg-[#1c2d7a] group transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              <div className="text-5xl font-bold text-[#1c2d7a]/15 group-hover:text-white/15 mb-4 transition-colors" style={{ fontFamily: "'Playfair Display', serif" }}>{s.n}</div>
              <h4 className="font-bold text-[14px] text-[#1c2d7a] group-hover:text-white mb-2 transition-colors" style={{ fontFamily: "'Inter', sans-serif" }}>{s.title}</h4>
              <p className="text-[13px] text-muted-foreground group-hover:text-white/70 leading-relaxed transition-colors" style={{ fontFamily: "'Inter', sans-serif" }}>{s.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

function CtaSection({ onAuth }: { onAuth: (m: AuthMode) => void }) {
  return (
    <section className="relative py-20 lg:py-28 overflow-hidden">
      <img src="https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=1800&h=600&fit=crop&auto=format" alt="Wind turbines" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-[#1c2d7a]/88" />
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 70% 50%, #17a4c2 0%, transparent 60%)" }} />
      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        <motion.h2 initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.5 }} className="text-4xl lg:text-5xl font-bold text-white mb-5" style={{ fontFamily: "'Playfair Display', serif" }}>
          Ready to Finance Pakistan's Green Future?
        </motion.h2>
        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: false, amount: 0.5 }} transition={{ delay: 0.2 }} className="text-[15px] text-white/70 mb-9 max-w-xl mx-auto leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
          Connect with our investment facilitation team for a curated portfolio of projects matched to your mandate, timeline, and return expectations.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.5 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={() => onAuth("login")} className="border border-white/30 text-white font-semibold text-sm px-8 py-3 rounded hover:bg-white/10 transition-colors" style={{ fontFamily: "'Inter', sans-serif" }}>
            Sign In
          </button>
          <button onClick={() => onAuth("signup")} className="bg-[#17a4c2] text-white font-bold text-sm px-8 py-3 rounded hover:bg-[#139ab8] transition-colors" style={{ fontFamily: "'Inter', sans-serif" }}>
            Create Investor Account
          </button>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer id="contact" className="bg-[#0c1840] text-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-14 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded bg-[#1c2d7a] flex items-center justify-center"><Leaf className="w-3.5 h-3.5 text-white" /></div>
              <div>
                <div className="font-bold text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>Pakistan Climate</div>
                <div className="text-[10px] text-white/45 tracking-widest uppercase">Investment Platform</div>
              </div>
            </div>
            <p className="text-[13px] text-white/50 leading-relaxed mb-5" style={{ fontFamily: "'Inter', sans-serif" }}>Pakistan's climate project pipeline, connecting public-sector developers, provinces, ministries, investors and development partners.</p>
            <div className="flex gap-2.5">
              {[Twitter, Linkedin, Facebook].map((Icon, i) => (
                <button key={i} className="w-8 h-8 rounded bg-white/10 flex items-center justify-center hover:bg-[#17a4c2] transition-colors"><Icon className="w-3.5 h-3.5 text-white/70" /></button>
              ))}
            </div>
          </div>
          <div>
            <h5 className="font-bold text-sm mb-4 text-white/75" style={{ fontFamily: "'Inter', sans-serif" }}>Platform</h5>
            <ul className="space-y-2.5">{["All Projects", "WEF Nexus", "Project Readiness", "Impact Analytics", "Investor Workspace"].map(l => (<li key={l}><a href="#" className="text-[13px] text-white/45 hover:text-white transition-colors">{l}</a></li>))}</ul>
          </div>
          <div>
            <h5 className="font-bold text-sm mb-4 text-white/75" style={{ fontFamily: "'Inter', sans-serif" }}>Resources</h5>
            <ul className="space-y-2.5">{["National Pipeline", "Provincial Programs", "Funding Gaps", "Impact Indicators", "About PCPP"].map(l => (<li key={l}><a href="#" className="text-[13px] text-white/45 hover:text-white transition-colors">{l}</a></li>))}</ul>
          </div>
          <div>
            <h5 className="font-bold text-sm mb-4 text-white/75" style={{ fontFamily: "'Inter', sans-serif" }}>Contact</h5>
            <ul className="space-y-3">
              <li className="flex items-center gap-2.5 text-[13px] text-white/50"><Mail className="w-3.5 h-3.5 text-[#17a4c2] flex-shrink-0" /> invest@climatepakistan.gov.pk</li>
              <li className="flex items-center gap-2.5 text-[13px] text-white/50"><Phone className="w-3.5 h-3.5 text-[#17a4c2] flex-shrink-0" /> +92 51 920 1170</li>
              <li className="flex items-start gap-2.5 text-[13px] text-white/50"><MapPin className="w-3.5 h-3.5 text-[#17a4c2] flex-shrink-0 mt-0.5" /> Ministry of Climate Change, Constitution Ave, Islamabad</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 pt-7 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-white/30">© 2025 Government of Pakistan — Ministry of Climate Change. All rights reserved.</p>
          <div className="flex gap-5">{["Privacy Policy", "Legal Disclaimer", "Accessibility"].map(l => (<a key={l} href="#" className="text-[12px] text-white/30 hover:text-white/60 transition-colors">{l}</a>))}</div>
        </div>
      </div>
    </footer>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

function RequireRole({ role, children }: { role: Role | Role[]; children: React.ReactElement }) {
  const { user, initializing } = useAuth();
  const allowed = Array.isArray(role) ? role : [role];
  if (initializing) return null; // wait for session restore before deciding
  if (!user) return <Navigate to="/" replace />;
  if (!allowed.includes(user.role)) return <Navigate to={roleHome(user.role)} replace />;
  return children;
}

function toHomeProject(project: StoreProject, index: number): HomeProject {
  const fallbackImage = PROJECTS[index % PROJECTS.length].img;
  const tag = project.wef.length ? project.wef.join(" - ") : project.sector;
  const uploadedImage = project.coverImageUrl || project.imageUrl || project.attachments.find(attachment => attachment.type.startsWith("image/"))?.dataUrl;
  return {
    id: project.id,
    title: project.title,
    sector: project.sector,
    location: project.province,
    investment: project.fundingGapUSD > 0 ? "Funding gap available" : "Seeking partners",
    status: project.status === "Approved" ? "Published" : project.status,
    summary: project.summary,
    img: fallbackImage,
    coverImageUrl: uploadedImage,
    icon: PROJECTS[index % PROJECTS.length].icon,
    tag,
    updated: project.updated,
  };
}

async function hydrateHomeProjectCover(project: HomeProject): Promise<HomeProject> {
  if (!project.coverImageUrl?.includes("/files/")) return project;
  try {
    return { ...project, coverImageUrl: await fetchFileDataUrl(project.coverImageUrl.split("/files/").pop()?.split("/")[0] || "") };
  } catch { return { ...project, coverImageUrl: undefined }; }
}

function Landing() {
  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const [projects, setProjects] = useState<HomeProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<HomeProject | null>(null);
  const scrollY = useScrollY();

  useEffect(() => {
    getCatalogue({ pageSize: 100 }).then(async page => {
      const apiProjects = await Promise.all(page.data.map((project, index) => {
        const mapped = toHomeProject(mapApiProjectToStore(project, index + 1), index);
        return hydrateHomeProjectCover(mapped);
      }));
      setProjects(apiProjects);
    }).catch(() => setProjects([]));
  }, []);

  const recentProject = projects
    .filter(project => Boolean(project.coverImageUrl))
    .sort((a, b) => String(b.updated ?? "").localeCompare(String(a.updated ?? "")))[0];

  const openAuth = (m: AuthMode) => setAuthMode(m);
  const closeAuth = () => setAuthMode(null);
  const openInvestment = () => {
    setSelectedProject(null);
    setAuthMode("signup");
  };

  return (
    <div className="min-h-screen bg-background">
      <ScrollProgressBar />
      <div className="fixed top-0 left-0 right-0 z-50">
        <AnnouncementTicker />
        <Navbar scrollY={scrollY} onAuth={openAuth} />
      </div>
      <Hero onAuth={openAuth} recentProject={recentProject} />
      <StatsBar projects={projects} />
      <ProjectsSection projects={projects} onView={setSelectedProject} />
      <SectorsSection projects={projects} />
      <WhySection />
      <PartnersSection />
      <ProcessSection />
      <CtaSection onAuth={openAuth} />
      <Footer />
      {selectedProject && <ProjectDetails project={selectedProject} onClose={() => setSelectedProject(null)} onInvest={openInvestment} />}
      <AuthModal mode={authMode} onClose={closeAuth} />
      <BackToTop visible={scrollY > 600} />
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard/admin" element={<RequireRole role={["admin", "reviewer"]}><AdminDashboard /></RequireRole>} />
      <Route path="/dashboard/focal" element={<RequireRole role="focal"><FocalDashboard /></RequireRole>} />
      <Route path="/dashboard/investor" element={<RequireRole role="investor"><InvestorDashboard /></RequireRole>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
