"use client";

import React, { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, MapPin, Weight, Ruler, Zap, ShieldCheck,
  AlertTriangle, Truck, Plane, TrendingDown,
  Navigation, CheckCircle2, ChevronRight, Activity,
  Users, UserPlus, Clock, ArrowRightLeft, CheckCircle, Search,
  BarChart3, PackageSearch, Bell, Star, Banknote, Layers,
  Crown, Sparkles, X, FileDown, Tag, ToggleLeft
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────
type CourierData = {
  id: string; name: string; cost: number; speedDays: number;
  reliabilityScore: number; delayRisk: number; score?: number;
  logo: string; method: "surface" | "air";
};

type PinInfo = { area: string; district: string; state: string } | null;

// ─── Hook: Pincode → Location (India Post free API) ───────────
function usePinLookup() {
  const [info, setInfo]     = useState<PinInfo>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const timerRef            = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lookup = useCallback((pin: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setInfo(null); setStatus("idle"); return;
    }
    setStatus("loading");
    timerRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await res.json();
        if (data[0]?.Status === "Success" && data[0].PostOffice?.length > 0) {
          const po = data[0].PostOffice[0];
          setInfo({ area: po.Name, district: po.District, state: po.State });
          setStatus("ok");
        } else {
          setInfo(null); setStatus("err");
        }
      } catch {
        setInfo(null); setStatus("err");
      }
    }, 400); // debounce 400 ms
  }, []);

  return { info, status, lookup };
}

// ─── Simulated Couriers API ───────────────────────────────────
const fetchCouriers = (chargeableWeight: number, distanceTier: number): CourierData[] => {
  const baseRates = { delhivery: 45, dtdc: 35, blueDart: 60, shadowfax: 38 };
  const dm = distanceTier * 15;
  const wm = chargeableWeight * 12;
  const raw: CourierData[] = [
    { id: "delhivery", name: "Delhivery Surface", cost: baseRates.delhivery + dm + wm, speedDays: 3 + distanceTier, reliabilityScore: 92, delayRisk: 15 + distanceTier * 5, logo: "🚚", method: "surface" },
    { id: "bluedart",  name: "Blue Dart Express", cost: baseRates.blueDart  + dm * 1.5 + wm * 1.5, speedDays: 1 + Math.floor(distanceTier / 2), reliabilityScore: 98, delayRisk: 5, logo: "✈️", method: "air" },
    { id: "shadowfax", name: "Shadowfax Fast",    cost: baseRates.shadowfax + dm + wm * 1.1, speedDays: 2 + distanceTier, reliabilityScore: 85, delayRisk: 30, logo: "🛵", method: "surface" },
    { id: "dtdc",      name: "DTDC Lite",         cost: baseRates.dtdc     + dm * 0.8 + wm * 0.9, speedDays: 5 + distanceTier, reliabilityScore: 80, delayRisk: 10 + distanceTier * 2, logo: "📦", method: "surface" },
  ];
  return raw.map(c => {
    const score = (0.4 * Math.max(0, 100 - c.cost / 20)) + (0.3 * Math.max(0, 100 - c.speedDays * 10)) + (0.2 * c.reliabilityScore) + (0.1 * (100 - c.delayRisk));
    return { ...c, score: Number(score.toFixed(1)) };
  }).sort((a, b) => (b.score || 0) - (a.score || 0));
};

// ─── Mock Data ────────────────────────────────────────────────
const SHIPMENTS = [
  { id: "SS-20240401", courier: "🚚 Delhivery", from: "Delhi (110001)", to: "Mumbai (400001)", status: "In Transit", eta: "Apr 13", cost: 320, risk: 12 },
  { id: "SS-20240389", courier: "✈️ Blue Dart",  from: "Bengaluru (560001)", to: "Chennai (600001)", status: "Delivered", eta: "Apr 9", cost: 540, risk: 0 },
  { id: "SS-20240371", courier: "🛵 Shadowfax",  from: "Pune (411001)", to: "Hyderabad (500001)", status: "Delayed ⚠️", eta: "Apr 15", cost: 210, risk: 85 },
  { id: "SS-20240360", courier: "📦 DTDC",       from: "Kolkata (700001)", to: "Jaipur (302001)", status: "Delivered", eta: "Apr 8", cost: 190, risk: 5 },
];

const DELAYED_PKGS = [
  { id: "PKG-9021", hub: "Delhivery Hub, Andheri", dest: "Bandra West, Mumbai", delay: "48h Delayed", reward: "₹120", dist: "4 km", status: "open" },
  { id: "PKG-8334", hub: "DTDC Center, Indiranagar", dest: "Koramangala, BLR",  delay: "72h Stuck",   reward: "₹180", dist: "6.5 km", status: "open" },
  { id: "PKG-1002", hub: "BlueDart Node, CP",       dest: "Vasant Kunj, DL",    delay: "24h Delayed", reward: "₹95",  dist: "12 km", status: "taken" },
];

const ANALYTICS = {
  totalSaved: 4820, avgDelivery: 2.8, delayPct: 8.4,
  monthly: [
    { month: "Nov", shipments: 34, saved: 620  },
    { month: "Dec", shipments: 52, saved: 940  },
    { month: "Jan", shipments: 41, saved: 780  },
    { month: "Feb", shipments: 63, saved: 1100 },
    { month: "Mar", shipments: 79, saved: 1380 },
  ],
};

type Tab = "book" | "track" | "partner" | "analytics" | "pricing";

// ─── Component ───────────────────────────────────────────────
export default function CourierIQ() {
  const [tab, setTab] = useState<Tab>("book");

  // Book tab state
  const [pickup, setPickup]       = useState("110001");
  const [delivery, setDelivery]   = useState("400001");
  const [weight, setWeight]       = useState(2.5);
  const [dims, setDims]           = useState({ l: 20, w: 15, h: 10 });
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults]     = useState<CourierData[] | null>(null);
  const [chargeW, setChargeW]     = useState(0);
  const [bookModal, setBookModal] = useState<CourierData | null>(null);
  const [bookForm, setBookForm]   = useState({ name: "", phone: "" });
  const [bookSuccess, setBookSuccess] = useState(false);

  // PIN lookup hooks
  const pickupPin  = usePinLookup();
  const deliveryPin = usePinLookup();

  // Partner tab state
  const [agentName, setAgentName]       = useState("");
  const [agentMobile, setAgentMobile]   = useState("");
  const [agentZone, setAgentZone]       = useState("");
  const [agentVehicle, setAgentVehicle] = useState("🛵 2-Wheeler (Bike / Scooter)");
  const [registered, setRegistered]     = useState(false);
  const [accepted, setAccepted]         = useState<string[]>([]);

  // Pricing tab state
  const [annual, setAnnual]         = useState(false);
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [proModal, setProModal]     = useState(false);

  // Track tab state
  const [trackId, setTrackId]     = useState("");
  const [tracked, setTracked]     = useState<typeof SHIPMENTS[0] | null>(null);
  const [trackErr, setTrackErr]   = useState(false);

  const findRates = () => {
    setIsLoading(true); setResults(null);
    const vol = ((dims.l || 1) * (dims.w || 1) * (dims.h || 1)) / 5000;
    const fw  = Math.max(weight || 0, vol);
    setChargeW(Number(fw.toFixed(2)));
    setTimeout(() => {
      const tier = Math.abs(parseInt(pickup[0] || "1") - parseInt(delivery[0] || "1")) + 1;
      const data = fetchCouriers(fw, tier);
      if (data.length > 2) { data[2].delayRisk = 85; data[2].reliabilityScore = 60; }
      setResults(data); setIsLoading(false);
    }, 1500);
  };

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    const found = SHIPMENTS.find(s => s.id.toLowerCase() === trackId.trim().toLowerCase());
    if (found) { setTracked(found); setTrackErr(false); }
    else        { setTracked(null); setTrackErr(true);  }
  };

  const best    = results?.[0];
  const highRisk= results?.find(c => c.delayRisk > 75);

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "book",      label: "Book Shipment",   icon: <Navigation className="w-4 h-4" /> },
    { id: "track",     label: "Track Parcel",    icon: <PackageSearch className="w-4 h-4" /> },
    { id: "partner",   label: "Partner Network", icon: <Users className="w-4 h-4" /> },
    { id: "analytics", label: "Analytics",       icon: <BarChart3 className="w-4 h-4" /> },
    { id: "pricing",   label: "Pricing",         icon: <Crown className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen text-slate-200 font-sans pb-32">

      {/* ─── NAV ─────────────────────────── */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-lg border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                Courier<span className="text-blue-400">IQ</span>
              </span>
            </div>
          </div>

          {/* Tabs */}
          <nav className="hidden md:flex items-center bg-slate-900/60 rounded-xl p-1 border border-slate-700/40 gap-1">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                tab === t.id
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/20"
                  : "text-slate-400 hover:text-white"
              )}>
                {t.icon}{t.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5 text-sm text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
              <Activity className="w-3.5 h-3.5 animate-pulse" /><span className="text-xs">Network Live</span>
            </div>
            <img src="https://i.pravatar.cc/100?img=33" alt="user" className="w-9 h-9 rounded-full border-2 border-slate-700" />
          </div>
        </div>
        {/* Mobile tabs */}
        <div className="md:hidden flex overflow-x-auto gap-1 px-4 pb-3">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0",
              tab === t.id ? "bg-blue-600 text-white" : "text-slate-400 bg-slate-800"
            )}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 pt-8">

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
            TAB 1 — BOOK SHIPMENT
        â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {tab === "book" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Input */}
            <section className="lg:col-span-4 space-y-5">
              <div className="glass-card p-6 border-t-4 border-t-blue-500">
                <h2 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-blue-400" /> Shipment Details
                </h2>
                <div className="space-y-4 text-sm">
                  {/* ── Pickup PIN ── */}
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wider mb-1.5 block">Pickup PIN</label>
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      {pickupPin.status === "loading" && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                      )}
                      <input
                        type="text" maxLength={6} value={pickup}
                        onChange={e => { setPickup(e.target.value); pickupPin.lookup(e.target.value); }}
                        placeholder="e.g. 110001"
                        className="w-full bg-slate-900/80 border border-slate-700 rounded-lg pl-8 pr-8 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <AnimatePresence>
                      {pickupPin.status === "ok" && pickupPin.info && (
                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1.5">
                          <CheckCircle className="w-3 h-3 shrink-0" />
                          <span className="font-medium">{pickupPin.info.area}</span>
                          <span className="text-slate-400">Â· {pickupPin.info.district}, {pickupPin.info.state}</span>
                        </motion.div>
                      )}
                      {pickupPin.status === "err" && (
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="mt-1.5 text-xs text-rose-400 pl-1">Invalid PIN code</motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* ── Delivery PIN ── */}
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wider mb-1.5 block">Delivery PIN</label>
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      {deliveryPin.status === "loading" && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                      )}
                      <input
                        type="text" maxLength={6} value={delivery}
                        onChange={e => { setDelivery(e.target.value); deliveryPin.lookup(e.target.value); }}
                        placeholder="e.g. 400001"
                        className="w-full bg-slate-900/80 border border-slate-700 rounded-lg pl-8 pr-8 py-2.5 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                      />
                    </div>
                    <AnimatePresence>
                      {deliveryPin.status === "ok" && deliveryPin.info && (
                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="mt-1.5 flex items-center gap-1.5 text-xs text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded-lg px-2.5 py-1.5">
                          <CheckCircle className="w-3 h-3 shrink-0" />
                          <span className="font-medium">{deliveryPin.info.area}</span>
                          <span className="text-slate-400">Â· {deliveryPin.info.district}, {deliveryPin.info.state}</span>
                        </motion.div>
                      )}
                      {deliveryPin.status === "err" && (
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="mt-1.5 text-xs text-rose-400 pl-1">Invalid PIN code</motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wider mb-1.5 block">Weight (kg)</label>
                    <div className="relative">
                      <Weight className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input type="number" value={weight} onChange={e => setWeight(parseFloat(e.target.value))}
                        className="w-full bg-slate-900/80 border border-slate-700 rounded-lg pl-8 pr-2 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wider mb-1.5 block">Dimensions L × W × H (cm)</label>
                    <div className="flex bg-slate-900/80 border border-slate-700 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                      <div className="pl-3 flex items-center text-slate-500"><Ruler className="w-3.5 h-3.5" /></div>
                      {(["l","w","h"] as const).map((k, i) => (
                        <input key={k} type="number" placeholder={k.toUpperCase()} value={dims[k]}
                          onChange={e => setDims({ ...dims, [k]: parseFloat(e.target.value) })}
                          className={`flex-1 w-0 min-w-0 bg-transparent text-center py-2.5 outline-none ${i < 2 ? "border-r border-slate-700" : ""}`} />
                      ))}
                    </div>
                  </div>

                  <button onClick={findRates} disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium py-3 rounded-lg shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-60 mt-2">
                    {isLoading
                      ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Zap className="w-5 h-5 text-yellow-300" /></motion.div>
                      : <><Zap className="w-5 h-5 text-yellow-300 group-hover:scale-110 transition-transform" /><span>Optimize & Compare</span></>
                    }
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {results && (
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-5 border-l-4 border-l-purple-500 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Chargeable</p>
                      <p className="text-xl font-bold text-white">{chargeW} <span className="text-xs font-normal text-slate-500">kg</span></p>
                    </div>
                    <div className="w-px h-10 bg-slate-700/50" />
                    <div className="text-right">
                      <p className="text-xs text-slate-400 mb-1">AI Cost Saved</p>
                      <p className="text-xl font-bold text-emerald-400 flex items-center gap-1 justify-end">
                        ₹{Math.max(0, Math.floor((Math.max(...results.map(r => r.cost)) * 1.45) - results[0].cost))}
                        <TrendingDown className="w-4 h-4" />
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* Results */}
            <section className="lg:col-span-8 space-y-5">
              {!results && !isLoading && (
                <div className="min-h-[400px] glass-card flex flex-col items-center justify-center text-center p-10">
                  <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4 }}
                    className="w-20 h-20 mb-5 rounded-3xl bg-slate-800/50 flex items-center justify-center border border-slate-700/50">
                    <ShieldCheck className="w-10 h-10 text-slate-500" />
                  </motion.div>
                  <h3 className="text-lg font-medium text-white mb-2">AI Logistics Engine Ready</h3>
                  <p className="text-slate-400 text-sm max-w-sm">Enter shipment details to get real-time courier rates, AI scores, and delay risk predictions.</p>
                </div>
              )}

              {isLoading && (
                <div className="min-h-[400px] glass-card flex flex-col items-center justify-center text-center p-10">
                  <div className="relative mb-6">
                    <div className="w-14 h-14 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center"><Zap className="w-5 h-5 text-blue-500 animate-pulse" /></div>
                  </div>
                  <p className="text-blue-400 font-medium animate-pulse">Running AI Scoring Matrixâ€¦</p>
                  <p className="text-slate-500 text-xs mt-1">Fetching live rates Â· Analysing delay vectors</p>
                </div>
              )}

              {results && best && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">

                  {/* Best Courier Card */}
                  <div className="glass-card relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      {best.method === "air" ? <Plane className="w-36 h-36 text-blue-400" /> : <Truck className="w-36 h-36 text-blue-400" />}
                    </div>
                    <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-blue-400 to-emerald-400" />
                    <div className="p-6 relative z-10 flex flex-col md:flex-row gap-6 justify-between">
                      <div className="flex-1">
                        <div className="inline-flex items-center gap-1.5 bg-blue-500/20 text-blue-300 px-2.5 py-1 rounded-full text-xs font-semibold mb-3 border border-blue-500/30">
                          <CheckCircle2 className="w-3 h-3" /> AI RECOMMENDED Â· Score {best.score}
                        </div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">{best.logo} {best.name}</h2>
                        <p className="text-sm text-slate-400 mt-2 max-w-md">Best balance of cost, speed and reliability. Delay risk only <span className={cn("font-semibold", best.delayRisk < 20 ? "text-emerald-400" : "text-amber-400")}>{best.delayRisk}%</span>.</p>
                      </div>
                      <div className="glass-panel p-4 flex gap-5 items-center shrink-0">
                        <div>
                          <p className="text-xs text-slate-400">Cost</p>
                          <p className="text-2xl font-bold text-white">₹{best.cost.toFixed(0)}</p>
                        </div>
                        <div className="w-px h-10 bg-slate-700/50" />
                        <div>
                          <p className="text-xs text-slate-400">ETA</p>
                          <p className="text-xl font-bold text-white">{best.speedDays}d</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-blue-600/10 border-t border-blue-500/20 px-6 py-3 flex justify-between items-center relative z-10">
                      <span className="text-xs text-blue-300 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Real-time API rate</span>
                      <button onClick={() => setBookModal(best)} className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-1.5">
                        Book Now <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Delay Alert → links to partner tab */}
                  <AnimatePresence>
                    {highRisk && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                        className="glass-card border-none bg-gradient-to-r from-rose-900/40 to-orange-900/30 relative overflow-hidden">
                        <div className="absolute left-0 top-0 w-1 h-full bg-rose-500" />
                        <div className="p-5 flex gap-4 items-start">
                          <div className="p-2.5 bg-rose-500/20 rounded-full"><AlertTriangle className="w-5 h-5 text-rose-400" /></div>
                          <div className="flex-1">
                            <p className="font-semibold text-rose-300 mb-1 flex flex-wrap gap-2 items-center">
                              Delay Risk Detected — {highRisk.name}
                              <span className="text-xs bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded border border-rose-500/30">{highRisk.delayRisk}% probability</span>
                            </p>
                            <p className="text-sm text-rose-200/70 mb-3">
                              Our AI detected routing congestion. If delayed, CourierIQ&apos;s Multi-Partner Network steps in for seamless handover to a local agent.
                            </p>
                            <button onClick={() => setTab("partner")} className="text-xs font-medium bg-rose-500/20 text-rose-300 px-3 py-1.5 rounded-lg border border-rose-500/30 hover:bg-rose-500/30 transition-colors flex items-center gap-1.5 w-fit">
                              View Delayed Parcel Pickup Board <ArrowRightLeft className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Rate Card Table */}
                  <div className="glass-card overflow-hidden">
                    <div className="px-6 py-3 border-b border-slate-700/50 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium text-white">Complete Rate Comparison</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-slate-900/60 text-slate-400 text-xs uppercase">
                          <tr>
                            {["Courier","Cost (₹)","ETA","Reliability","Delay Risk","Score", "Action"].map(h => (
                              <th key={h} className="px-5 py-3 font-medium">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/30">
                          {results.map((c, i) => (
                            <motion.tr key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.07 }}
                              className={cn("transition-colors", i === 0 ? "bg-blue-500/5" : "hover:bg-slate-800/40")}>
                              <td className="px-5 py-3 font-medium text-slate-200">{c.logo} {c.name} {i === 0 && <span className="ml-2 text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">Best</span>}</td>
                              <td className="px-5 py-3 font-bold text-white">₹{c.cost.toFixed(0)}</td>
                              <td className="px-5 py-3 text-slate-300">{c.speedDays}d</td>
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div className={cn("h-full rounded-full", c.reliabilityScore > 90 ? "bg-emerald-500" : c.reliabilityScore > 80 ? "bg-blue-500" : "bg-amber-500")} style={{ width: `${c.reliabilityScore}%` }} />
                                  </div>
                                  <span className="text-slate-400 text-xs">{c.reliabilityScore}%</span>
                                </div>
                              </td>
                              <td className="px-5 py-3">
                                <span className={cn("text-xs px-2 py-0.5 rounded-full border", c.delayRisk > 70 ? "bg-rose-500/20 text-rose-400 border-rose-500/30" : c.delayRisk > 30 ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30")}>
                                  {c.delayRisk}%
                                </span>
                              </td>
                              <td className="px-5 py-3">
                                <span className={cn("px-2.5 py-1 rounded-md text-xs font-semibold border", i === 0 ? "bg-blue-500/20 text-blue-300 border-blue-500/30" : "bg-slate-800 text-slate-400 border-slate-700")}>{c.score}</span>
                              </td>
                              <td className="px-5 py-3">
                                <button onClick={() => setBookModal(c)} className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 px-3 py-1.5 rounded-lg text-xs transition-colors">
                                  Book
                                </button>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}
            </section>
            
            {/* ─── Booking Modal ─── */}
            <AnimatePresence>
              {bookModal && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                  onClick={() => { setBookModal(null); setBookSuccess(false); }}>
                  <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
                    onClick={e => e.stopPropagation()}
                    className="glass-card max-w-sm w-full p-6 relative border border-blue-500/30 shadow-2xl shadow-blue-500/10">
                    
                    <button onClick={() => { setBookModal(null); setBookSuccess(false); }} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
                      <X className="w-5 h-5" />
                    </button>

                    {!bookSuccess ? (
                      <>
                        <div className="flex items-center gap-3 mb-5">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30 text-xl">
                            {bookModal.logo}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white">Register Details</h3>
                            <p className="text-blue-400 text-xs">Booking {bookModal.name}</p>
                          </div>
                        </div>

                        <div className="bg-slate-900/50 rounded-lg p-3 mb-5 border border-slate-800 flex justify-between items-center text-sm">
                          <span className="text-slate-400">Total Cost</span>
                          <span className="font-bold text-white">₹{bookModal.cost.toFixed(0)}</span>
                        </div>

                        <form onSubmit={e => { e.preventDefault(); if (bookForm.name && bookForm.phone) setBookSuccess(true); }} className="space-y-4">
                          <div>
                            <label className="text-xs text-slate-400 block mb-1">Sender Full Name *</label>
                            <input required type="text" value={bookForm.name} onChange={e => setBookForm({...bookForm, name: e.target.value})} placeholder="John Doe"
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none transition-all" />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400 block mb-1">Contact Number *</label>
                            <input required type="tel" value={bookForm.phone} onChange={e => setBookForm({...bookForm, phone: e.target.value})} placeholder="+91 9876543210"
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none transition-all" />
                          </div>
                          <button type="submit" className="w-full mt-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium py-2.5 rounded-lg shadow-lg shadow-blue-500/20 transition-all text-sm flex items-center justify-center gap-2">
                            Confirm Booking <CheckCircle2 className="w-4 h-4" />
                          </button>
                        </form>
                      </>
                    ) : (
                      <div className="text-center py-6">
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                          <CheckCircle className="w-8 h-8 text-emerald-400" />
                        </motion.div>
                        <h3 className="text-xl font-bold text-white mb-2">Booking Confirmed!</h3>
                        <p className="text-slate-400 text-sm mb-6">Your tracking ID has been generated: <span className="font-mono text-emerald-400">SS-{Math.floor(1000 + Math.random() * 9000)}</span></p>
                        <button onClick={() => { setBookModal(null); setBookSuccess(false); }} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-2 border border-slate-700 rounded-lg transition-colors text-sm">
                          Close
                        </button>
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        )}

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
            TAB 2 — TRACK PARCEL
        â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {tab === "track" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="max-w-xl mx-auto">
              <h2 className="text-2xl font-bold text-white mb-1 text-center">Parcel Tracker</h2>
              <p className="text-slate-400 text-sm text-center mb-6">Enter your CourierIQ order ID to get live status.</p>
              <form onSubmit={handleTrack} className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type="text" value={trackId} onChange={e => setTrackId(e.target.value)} placeholder="e.g. SS-20240401"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-500/20">
                  Track
                </button>
              </form>
              {trackErr && <p className="text-rose-400 text-sm mt-3 text-center">Order ID not found. Try SS-20240401.</p>}
            </div>

            {/* Tracked result */}
            <AnimatePresence>
              {tracked && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto glass-card overflow-hidden">
                  <div className={cn("px-6 py-4 border-b border-slate-700/50 flex justify-between items-center", tracked.status.includes("Delayed") ? "bg-rose-900/20" : tracked.status === "Delivered" ? "bg-emerald-900/20" : "bg-blue-900/20")}>
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Shipment ID</p>
                      <p className="text-xl font-bold text-white">{tracked.id}</p>
                    </div>
                    <span className={cn("text-sm font-semibold px-3 py-1.5 rounded-full border", tracked.status.includes("Delayed") ? "bg-rose-500/20 text-rose-400 border-rose-500/30" : tracked.status === "Delivered" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-blue-500/20 text-blue-400 border-blue-500/30")}>
                      {tracked.status}
                    </span>
                  </div>

                  <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-5 text-sm">
                    {[
                      { label: "Courier",   value: tracked.courier },
                      { label: "From",      value: tracked.from },
                      { label: "To",        value: tracked.to },
                      { label: "ETA",       value: tracked.eta },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-xs text-slate-400 mb-1">{label}</p>
                        <p className="font-medium text-slate-200">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Timeline */}
                  <div className="px-6 pb-6">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-4">Shipment Timeline</p>
                    <div className="relative pl-5 space-y-5">
                      <div className="absolute left-[7px] top-1 bottom-1 w-px bg-slate-700" />
                      {[
                        { label: "Order Picked Up", done: true },
                        { label: "In Transit — Origin Hub", done: true },
                        { label: tracked.status.includes("Delayed") ? "âš ï¸ Delayed at Mid-Hub" : "In Transit — Regional Hub", done: !tracked.status.includes("Delayed"), warn: tracked.status.includes("Delayed") },
                        { label: "Out for Delivery", done: tracked.status === "Delivered" },
                        { label: "Delivered", done: tracked.status === "Delivered" },
                      ].map((s, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className={cn("w-3.5 h-3.5 rounded-full border-2 mt-0.5 shrink-0 z-10", s.warn ? "border-rose-500 bg-rose-900" : s.done ? "border-emerald-500 bg-emerald-500" : "border-slate-600 bg-slate-900")} />
                          <p className={cn("text-sm", s.warn ? "text-rose-400 font-medium" : s.done ? "text-slate-200" : "text-slate-500")}>{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {tracked.status.includes("Delayed") && (
                    <div className="mx-6 mb-6 p-4 bg-rose-900/30 border border-rose-500/20 rounded-xl flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex-1 text-sm text-rose-200/80">
                        <Bell className="w-4 h-4 inline mr-1 text-rose-400" />
                        <strong>CourierIQ detected a delay.</strong> Activating Partner Network handover — a local agent will be assigned within 2h.
                      </div>
                      <button onClick={() => setTab("partner")} className="text-xs font-medium border border-orange-500/30 text-orange-300 bg-orange-500/10 px-3 py-1.5 rounded-lg hover:bg-orange-500/20 transition-colors shrink-0">
                        View Recovery Board →
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* All shipments */}
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-4">Recent Shipments</p>
              <div className="grid gap-3">
                {SHIPMENTS.map(s => (
                  <div key={s.id} className={cn("glass-card p-4 flex flex-col md:flex-row md:items-center gap-4 border-l-4 cursor-pointer hover:brightness-110 transition-all", s.status.includes("Delayed") ? "border-l-rose-500" : s.status === "Delivered" ? "border-l-emerald-500" : "border-l-blue-500")}
                    onClick={() => { setTrackId(s.id); setTracked(s); setTrackErr(false); }}>
                    <div className="flex-1 flex flex-wrap gap-4 items-center text-sm">
                      <span className="font-bold text-white">{s.id}</span>
                      <span className="text-slate-400">{s.courier}</span>
                      <span className="text-slate-400">{s.from} → {s.to}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn("text-xs px-2.5 py-1 rounded-full border",
                        s.status.includes("Delayed") ? "bg-rose-500/20 text-rose-400 border-rose-500/30" : s.status === "Delivered" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-blue-500/20 text-blue-400 border-blue-500/30")}>
                        {s.status}
                      </span>
                      <span className="text-slate-400 text-xs">ETA {s.eta}</span>
                      <span className="text-white font-semibold text-sm">₹{s.cost}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
            TAB 3 — PARTNER NETWORK
        â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {tab === "partner" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            {/* Hero Banner */}
            <div className="glass-card p-8 text-center bg-gradient-to-br from-slate-900/80 to-orange-900/20 border-orange-500/20 relative overflow-hidden">
              <div className="absolute inset-0 opacity-5"><div className="w-full h-full" style={{backgroundImage:"repeating-linear-gradient(45deg,#f97316 0,#f97316 1px,transparent 0,transparent 50%)",backgroundSize:"20px 20px"}} /></div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-orange-500/30">
                  <ArrowRightLeft className="w-7 h-7 text-orange-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Delayed Parcel Support Network</h2>
                <p className="text-slate-400 text-sm max-w-xl mx-auto">
                  If your parcel experiences delays, CourierIQ&apos;s multi-company network lets verified local delivery partners step in and complete the last mile.
                  Earn bounties. Keep shipments moving.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Registration */}
              <div className="glass-card p-6 h-fit border-t-4 border-t-orange-500">
                <div className="flex items-center gap-2 mb-5">
                  <div className="p-2 bg-orange-500/20 rounded-lg"><UserPlus className="w-4 h-4 text-orange-400" /></div>
                  <h3 className="text-base font-semibold text-white">Agent Registration</h3>
                </div>

                {!registered ? (
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      if (agentName.trim() && agentMobile.trim() && agentZone.trim()) setRegistered(true);
                    }}
                    className="space-y-4 text-sm"
                  >
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Full Name *</label>
                      <input required type="text" value={agentName} placeholder="John Doe"
                        onChange={e => setAgentName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 focus:border-orange-500 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Mobile Number *</label>
                      <input required type="tel" value={agentMobile} placeholder="+91 9876543210"
                        onChange={e => setAgentMobile(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 focus:border-orange-500 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Operating Zone PIN *</label>
                      <input required type="text" value={agentZone} placeholder="e.g. 400001" maxLength={6}
                        onChange={e => setAgentZone(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 focus:border-orange-500 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Vehicle Type</label>
                      <select value={agentVehicle} onChange={e => setAgentVehicle(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500 transition-all">
                        <option>🛵 2-Wheeler (Bike / Scooter)</option>
                        <option>ðŸ›º 3-Wheeler (Auto / Load)</option>
                        <option>ðŸš Mini Truck</option>
                      </select>
                    </div>
                    <button type="submit"
                      className="w-full bg-orange-600 hover:bg-orange-500 text-white font-medium py-2.5 rounded-lg shadow-lg shadow-orange-500/20 transition-all text-sm">
                      Register as Partner
                    </button>
                  </form>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                      <CheckCircle className="w-7 h-7 text-emerald-400" />
                    </div>
                    <p className="text-white font-semibold text-lg">Verified Partner</p>
                    <p className="text-emerald-400 text-sm mt-1">Welcome, {agentName}!</p>
                    <p className="text-slate-400 text-xs mt-3">You can now accept handover jobs from the board.</p>
                  </div>
                )}
              </div>

              {/* Pickup Board */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-white flex items-center gap-2"><Layers className="w-4 h-4 text-orange-400" /> Live Recovery Board</h3>
                  <span className="text-xs animate-pulse text-rose-400 bg-rose-500/20 px-2 py-1 rounded border border-rose-500/30">
                    {DELAYED_PKGS.filter(p => p.status === "open").length} Open Jobs
                  </span>
                </div>

                {DELAYED_PKGS.map(pkg => {
                  const isAccepted = accepted.includes(pkg.id);
                  const isTaken    = pkg.status === "taken" && !isAccepted;
                  return (
                    <div key={pkg.id} className={cn("glass-card p-5 border-l-4 transition-all", isAccepted ? "border-l-emerald-500 bg-emerald-900/10" : isTaken ? "border-l-slate-600 opacity-50" : "border-l-rose-500 hover:brightness-110")}>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="font-bold text-white text-sm">{pkg.id}</span>
                            {!isAccepted && !isTaken && <span className="text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full flex items-center gap-1"><Clock className="w-3 h-3" />{pkg.delay}</span>}
                            {isAccepted && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3" />Accepted</span>}
                            {isTaken && <span className="text-[10px] bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">Assigned</span>}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-300 flex-wrap">
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-orange-400" />{pkg.hub}</span>
                            <ArrowRightLeft className="w-3 h-3 text-slate-600" />
                            <span className="flex items-center gap-1"><Navigation className="w-3 h-3 text-blue-400" />{pkg.dest}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1.5">Distance: {pkg.dist}</p>
                        </div>

                        <div className="flex md:flex-col gap-4 md:gap-2 items-center md:items-end border-t md:border-t-0 md:border-l border-slate-700/40 pt-4 md:pt-0 md:pl-5 shrink-0">
                          <div className="text-right">
                            <p className="text-xs text-slate-400">Bounty</p>
                            <p className="text-lg font-bold text-emerald-400">{pkg.reward}</p>
                          </div>
                          {!isAccepted && !isTaken && (
                            <button onClick={() => { if (!registered) { alert("Register as a partner first!"); return; } setAccepted([...accepted, pkg.id]); }}
                              className="text-xs font-semibold border border-orange-500/40 text-orange-400 bg-orange-500/10 hover:bg-orange-500 hover:text-white px-4 py-1.5 rounded-lg transition-all">
                              Accept Handover
                            </button>
                          )}
                          {isAccepted && <span className="text-xs font-semibold border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 px-4 py-1.5 rounded-lg">Mapping Routeâ€¦</span>}
                          {isTaken && <span className="text-xs text-slate-500 border border-slate-700 px-4 py-1.5 rounded-lg">Unavailable</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
            TAB 4 — ANALYTICS
        â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {tab === "analytics" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <h2 className="text-2xl font-bold text-white">Shipping Analytics</h2>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                { label: "Total Cost Saved", value: `₹${ANALYTICS.totalSaved.toLocaleString()}`, sub: "vs. non-AI booking", icon: <Banknote className="w-5 h-5" />, color: "emerald" },
                { label: "Avg Delivery Time", value: `${ANALYTICS.avgDelivery} Days`, sub: "across all couriers", icon: <Clock className="w-5 h-5" />, color: "blue" },
                { label: "Delay Rate", value: `${ANALYTICS.delayPct}%`, sub: "industry avg 18%", icon: <AlertTriangle className="w-5 h-5" />, color: "amber" },
              ].map(k => (
                <div key={k.label} className={cn("glass-card p-6 border-l-4", `border-l-${k.color}-500`)}>
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", `bg-${k.color}-500/20 text-${k.color}-400`)}>{k.icon}</div>
                  <p className="text-2xl font-bold text-white mb-1">{k.value}</p>
                  <p className="text-xs text-slate-400">{k.label}</p>
                  <p className="text-xs text-slate-500 mt-1">{k.sub}</p>
                </div>
              ))}
            </div>

            {/* Monthly Chart */}
            <div className="glass-card p-6">
              <h3 className="text-base font-semibold text-white mb-6 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-400" /> Monthly Shipments & Savings</h3>
              <div className="flex items-end gap-3 h-40">
                {ANALYTICS.monthly.map((m, i) => {
                  const maxShip = Math.max(...ANALYTICS.monthly.map(x => x.shipments));
                  const pct = (m.shipments / maxShip) * 100;
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-2 group cursor-default">
                      <div className="relative w-full flex items-end" style={{ height: "120px" }}>
                        <motion.div
                          initial={{ height: 0 }} animate={{ height: `${pct}%` }}
                          transition={{ delay: i * 0.1, duration: 0.6, ease: "easeOut" }}
                          className="w-full rounded-t-md bg-gradient-to-t from-blue-600 to-purple-500 opacity-80 group-hover:opacity-100 transition-opacity"
                        />
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-white bg-slate-800 rounded px-1.5 py-0.5 whitespace-nowrap border border-slate-700 pointer-events-none">
                          {m.shipments} Â· ₹{m.saved}
                        </div>
                      </div>
                      <span className="text-xs text-slate-400">{m.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Courier Breakdown */}
            <div className="glass-card p-6">
              <h3 className="text-base font-semibold text-white mb-5 flex items-center gap-2"><Star className="w-4 h-4 text-amber-400" /> Courier Performance</h3>
              <div className="space-y-4">
                {[
                  { name: "âœˆï¸ Blue Dart Express", score: 98, savings: 1840, color: "blue" },
                  { name: "🚚 Delhivery Surface",  score: 92, savings: 1420, color: "purple" },
                  { name: "🛵 Shadowfax Fast",     score: 85, savings:  980, color: "amber" },
                  { name: "📦 DTDC Lite",          score: 80, savings:  580, color: "slate" },
                ].map(c => (
                  <div key={c.name} className="flex items-center gap-4">
                    <span className="text-sm text-slate-300 w-44 shrink-0">{c.name}</span>
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${c.score}%` }} transition={{ duration: 0.8, ease: "easeOut" }}
                        className={cn("h-full rounded-full", c.color === "blue" ? "bg-blue-500" : c.color === "purple" ? "bg-purple-500" : c.color === "amber" ? "bg-amber-500" : "bg-slate-500")} />
                    </div>
                    <span className="text-xs text-slate-400 w-10">{c.score}%</span>
                    <span className="text-xs text-emerald-400 w-16 text-right">₹{c.savings.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Delayed shipment alerts */}
            <div className="glass-card p-6">
              <h3 className="text-base font-semibold text-white mb-5 flex items-center gap-2"><Bell className="w-4 h-4 text-rose-400" /> Active Delay Alerts</h3>
              <div className="space-y-3">
                {SHIPMENTS.filter(s => s.status.includes("Delayed")).map(s => (
                  <div key={s.id} className="flex items-center justify-between bg-rose-900/20 border border-rose-500/20 rounded-xl px-5 py-3 text-sm">
                    <span className="font-bold text-white">{s.id}</span>
                    <span className="text-slate-400">{s.from} → {s.to}</span>
                    <span className="text-rose-400 font-medium">{s.status}</span>
                    <button onClick={() => setTab("partner")} className="text-xs text-orange-400 border border-orange-500/30 bg-orange-500/10 px-3 py-1 rounded-lg hover:bg-orange-500/20 transition-colors">
                      Resolve →
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </motion.div>
        )}

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
            TAB 5 — PRICING
        â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {tab === "pricing" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-12 pb-8">

            {/* Header */}
            <div className="text-center max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                <Crown className="w-3.5 h-3.5" /> B2B SaaS Pricing
              </div>
              <h2 className="text-4xl font-bold text-white mb-3">Simple, Transparent Plans</h2>
              <p className="text-slate-400 text-sm">Start free. Scale as you grow. No hidden fees.</p>

              {/* Monthly / Annual toggle */}
              <div className="flex items-center justify-center gap-3 mt-6">
                <span className={cn("text-sm font-medium", !annual ? "text-white" : "text-slate-400")}>Monthly</span>
                <button onClick={() => setAnnual(!annual)}
                  className={cn("relative w-12 h-6 rounded-full transition-colors", annual ? "bg-purple-600" : "bg-slate-700")}>
                  <motion.div layout className={cn("absolute top-1 w-4 h-4 rounded-full bg-white shadow", annual ? "left-7" : "left-1")} />
                </button>
                <span className={cn("text-sm font-medium", annual ? "text-white" : "text-slate-400")}>
                  Annual
                  <span className="ml-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">Save 20%</span>
                </span>
              </div>
            </div>

            {/* Plan Cards */}
            {(() => {
              const plans = [
                {
                  id: "free",
                  name: "Free",
                  price: 0,
                  annualPrice: 0,
                  icon: "🆓",
                  color: "slate",
                  badge: null,
                  desc: "Perfect to explore CourierIQ",
                  features: [
                    "5 rate comparisons / month",
                    "Basic AI recommendations",
                    "Pincode location detection",
                    "1 courier integration",
                    "Email support",
                  ],
                  locked: ["Delay Recovery Network", "CSV Export", "Contract Rates", "Analytics Dashboard"],
                  cta: "Get Started Free",
                },
                {
                  id: "starter",
                  name: "Starter",
                  price: 999,
                  annualPrice: 799,
                  icon: "🚀",
                  color: "blue",
                  badge: null,
                  desc: "For growing e-commerce sellers",
                  features: [
                    "100 rate comparisons / month",
                    "Full AI scoring engine",
                    "4 courier integrations",
                    "Shipment tracking panel",
                    "Analytics dashboard",
                    "Priority email support",
                  ],
                  locked: ["Delay Recovery Network", "Contract Rates", "CSV Export"],
                  cta: "Start Free Trial",
                },
                {
                  id: "pro",
                  name: "Pro",
                  price: 2999,
                  annualPrice: 2399,
                  icon: "👑",
                  color: "purple",
                  badge: "Most Popular",
                  desc: "Full logistics intelligence suite",
                  features: [
                    "Unlimited comparisons",
                    "All courier integrations",
                    "Smart Delay Recovery Network",
                    "Cross-courier handover automation",
                    "Contract rate discounts (up to 18%)",
                    "CSV / Excel export",
                    "Invoice overcharge detection",
                    "Dedicated account manager",
                    "API access",
                  ],
                  locked: [],
                  cta: "Upgrade to Pro",
                },
                {
                  id: "enterprise",
                  name: "Enterprise",
                  price: -1,
                  annualPrice: -1,
                  icon: "🏢",
                  color: "amber",
                  badge: null,
                  desc: "Custom solutions for large teams",
                  features: [
                    "Custom volume pricing",
                    "White-label platform",
                    "Dedicated Partner Network hub",
                    "SLA guarantee (99.9% uptime)",
                    "Custom API integrations",
                    "Onboarding + training",
                  ],
                  locked: [],
                  cta: "Contact Sales",
                },
              ];

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                  {plans.map(plan => {
                    const displayPrice = plan.price === -1 ? null : (annual ? plan.annualPrice : plan.price);
                    const isActive = activePlan === plan.id;
                    const isPro = plan.id === "pro";

                    return (
                      <motion.div key={plan.id} whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 400 }}
                        className={cn("glass-card flex flex-col overflow-hidden relative transition-all",
                          isPro ? "border-purple-500/50 shadow-xl shadow-purple-500/10 ring-1 ring-purple-500/30" : "",
                          isActive ? "ring-2 ring-emerald-500/50" : ""
                        )}>

                        {/* Badge */}
                        {plan.badge && (
                          <div className="absolute top-0 left-0 right-0 text-center py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-semibold tracking-wide">
                            ⭐ {plan.badge}
                          </div>
                        )}

                        <div className={cn("p-6 flex flex-col flex-1", plan.badge ? "pt-10" : "")}>
                          {/* Plan header */}
                          <div className="mb-5">
                            <span className="text-2xl">{plan.icon}</span>
                            <h3 className="text-lg font-bold text-white mt-2">{plan.name}</h3>
                            <p className="text-xs text-slate-400 mt-1">{plan.desc}</p>
                          </div>

                          {/* Price */}
                          <div className="mb-6">
                            {displayPrice === null ? (
                              <p className="text-2xl font-bold text-white">Custom</p>
                            ) : displayPrice === 0 ? (
                              <p className="text-3xl font-bold text-white">Free</p>
                            ) : (
                              <div className="flex items-end gap-1">
                                <span className="text-slate-400 text-sm">₹</span>
                                <span className="text-3xl font-bold text-white">{displayPrice.toLocaleString()}</span>
                                <span className="text-slate-400 text-xs mb-1">/mo</span>
                              </div>
                            )}
                            {annual && displayPrice !== null && displayPrice > 0 && (
                              <p className="text-xs text-emerald-400 mt-1">≈ ₹{(displayPrice * 12).toLocaleString()} billed annually</p>
                            )}
                          </div>

                          {/* Features */}
                          <ul className="space-y-2 text-sm flex-1 mb-6">
                            {plan.features.map(f => (
                              <li key={f} className="flex items-start gap-2 text-slate-300">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                                <span>{f}</span>
                              </li>
                            ))}
                            {plan.locked.map(f => (
                              <li key={f} className="flex items-start gap-2 text-slate-600">
                                <X className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                <span className="line-through">{f}</span>
                              </li>
                            ))}
                          </ul>

                          {/* CTA */}
                          <button
                            onClick={() => {
                              setActivePlan(plan.id);
                              if (isPro) setProModal(true);
                            }}
                            className={cn(
                              "w-full py-2.5 rounded-xl text-sm font-semibold transition-all",
                              isPro
                                ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/20 hover:from-purple-500 hover:to-blue-500"
                                : plan.id === "enterprise"
                                ? "bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
                                : isActive
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                            )}>
                            {isActive && plan.id !== "pro" ? "✓ Current Plan" : plan.cta}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Pro Value Banner - shown after clicking Pro */}
            {activePlan === "pro" && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 border border-purple-500/30 bg-gradient-to-r from-purple-900/30 to-blue-900/20">
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                  <div>
                    <h4 className="text-white font-semibold text-lg mb-1 flex items-center gap-2">
                      <Crown className="w-5 h-5 text-purple-400" /> Pro Plan Unlocked
                    </h4>
                    <p className="text-slate-400 text-sm">These features are now active on your account:</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-2 rounded-lg text-xs font-medium">
                      <Tag className="w-3.5 h-3.5" /> Contract Rate: <strong>−18%</strong> off all bookings
                    </div>
                    <button className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 px-3 py-2 rounded-lg text-xs font-medium transition-colors">
                      <FileDown className="w-3.5 h-3.5" /> Export Shipments CSV
                    </button>
                    <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 px-3 py-2 rounded-lg text-xs font-medium">
                      <Sparkles className="w-3.5 h-3.5" /> Delay Auto-Recovery: Active
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ─── Pro Feature Modal ─────────────────────────────── */}
        <AnimatePresence>
          {proModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={() => setProModal(false)}>
              <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="glass-card max-w-lg w-full p-8 relative border border-purple-500/30 shadow-2xl shadow-purple-500/10">

                {/* Close */}
                <button onClick={() => setProModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">CourierIQ Pro</h3>
                    <p className="text-purple-400 text-sm">Everything in Starter, plus:</p>
                  </div>
                </div>

                {/* Feature List */}
                <ul className="space-y-4 mb-8">
                  {[
                    { icon: <Tag className="w-4 h-4 text-emerald-400" />, title: "Contract Rate Discounts — up to 18%", desc: "We negotiate bulk rates with Delhivery, Blue Dart & Shadowfax on your behalf. Every booking is cheaper." },
                    { icon: <FileDown className="w-4 h-4 text-blue-400" />, title: "CSV / Excel Export", desc: "Download full shipment history, cost breakdowns, and AI scores in one click. Perfect for accounting & ops." },
                    { icon: <ArrowRightLeft className="w-4 h-4 text-orange-400" />, title: "Smart Delay Auto-Recovery", desc: "When a courier flags delays, our Partner Network automatically assigns a local agent — zero manual effort." },
                    { icon: <Sparkles className="w-4 h-4 text-purple-400" />, title: "Invoice Overcharge Detection", desc: "AI compares billed weight vs. actual weight across all couriers and alerts you to overcharges instantly." },
                    { icon: <Bell className="w-4 h-4 text-amber-400" />, title: "Real-time Delay Alerts + SLA Tracking", desc: "Push notifications for every delay, with SLA breach predictions 12h before they happen." },
                  ].map(f => (
                    <li key={f.title} className="flex items-start gap-3">
                      <div className="p-2 bg-slate-800/80 rounded-lg mt-0.5 shrink-0">{f.icon}</div>
                      <div>
                        <p className="text-white text-sm font-semibold">{f.title}</p>
                        <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{f.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button onClick={() => { setProModal(false); }}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-purple-500/20 transition-all text-sm">
                  Activate Pro — ₹{annual ? "2,399" : "2,999"}/mo
                </button>
                <p className="text-center text-slate-500 text-xs mt-3">14-day free trial Â· No credit card required</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}

