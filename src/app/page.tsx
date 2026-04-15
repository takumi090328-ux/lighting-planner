"use client";

import { useState, useRef, useCallback, useEffect } from "react";

/* ============================================================
   型定義
============================================================ */
type EquipmentType =
  | "camera" | "light-bowl" | "light-octa" | "light-umbrella" | "light-square"
  | "ref-white" | "ref-black" | "subject" | "background";
type StrobeGroup = "A" | "B" | "C" | null;

interface Equipment {
  id: string; type: EquipmentType; label: string;
  x: number; y: number; rotation: number;
    tilt: number; 
  power: string; height: number; group: StrobeGroup;
}
interface CameraSettings { aperture: string; shutter: string; iso: string; }
interface StudioPreset {
  id: string; name: string; sideW: number; floorW: number; floorH: number;
  tile: number; showTiles: boolean; floorColor: string; sideColor: string; marginH: number;
}

/* ============================================================
   デザイントークン
============================================================ */
const C = {
  bg: "#F7F5F0",
  card: "#FFFFFF",
  border: "#E8E4DD",
  borderStrong: "#D4D0C8",
  text: "#2C2C2E",
  textSub: "#8E8E93",
  accent: "#E8A849",
  accentSoft: "#FDF6EC",
  floor: "#D6D2C9",
  side: "#E2D4BE",
  margin: "#E8E4DB",
} as const;

const G_CLR: Record<string, { dot: string; bg: string; text: string }> = {
  A: { dot: "#EF4444", bg: "#FEF2F2", text: "#DC2626" },
  B: { dot: "#3B82F6", bg: "#EFF6FF", text: "#2563EB" },
  C: { dot: "#22C55E", bg: "#F0FDF4", text: "#16A34A" },
};

/* ============================================================
   SVG アイコン（共通ストロボ + 個別）
============================================================ */
function SvgInner({ type }: { type: EquipmentType }) {
  switch (type) {
    case "camera":
      return (<><rect x="4" y="12" width="32" height="22" rx="3" fill="none" stroke="currentColor" strokeWidth="2"/><rect x="12" y="6" width="16" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="20" cy="23" r="7" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="20" cy="23" r="3" fill="none" stroke="currentColor" strokeWidth="1.5"/></>);
    case "light-bowl":
    case "light-octa":
    case "light-umbrella":
    case "light-square":
      return (<><circle cx="20" cy="14" r="10" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M22 9 L18 15 L22 15 L18 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><line x1="20" y1="24" x2="20" y2="36" stroke="currentColor" strokeWidth="2"/><line x1="14" y1="36" x2="26" y2="36" stroke="currentColor" strokeWidth="2"/></>);
    case "ref-white":
      return (<><rect x="6" y="2" width="28" height="36" rx="1" fill="none" stroke="currentColor" strokeWidth="2"/><text x="20" y="24" textAnchor="middle" fontSize="10" fill="currentColor" fontWeight="bold">W</text></>);
    case "ref-black":
      return (<><rect x="6" y="2" width="28" height="36" rx="1" fill="none" stroke="currentColor" strokeWidth="2"/><text x="20" y="24" textAnchor="middle" fontSize="10" fill="currentColor" fontWeight="bold">B</text></>);
    case "subject":
      return (<><circle cx="20" cy="10" r="6" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M10 38 L14 20 L26 20 L30 38" fill="none" stroke="currentColor" strokeWidth="2"/></>);
    case "background":
      return (<><line x1="6" y1="2" x2="6" y2="38" stroke="currentColor" strokeWidth="2"/><line x1="34" y1="2" x2="34" y2="38" stroke="currentColor" strokeWidth="2"/><line x1="6" y1="4" x2="34" y2="4" stroke="currentColor" strokeWidth="2"/><path d="M6 4 Q20 10 34 4 L34 38 L6 38 Z" fill="none" stroke="currentColor" strokeWidth="1"/></>);
    default:
      return <circle cx="20" cy="20" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>;
  }
}

function Icon({ type, size = 24 }: { type: EquipmentType; size?: number }) {
  return (
    <svg viewBox="0 0 40 40" style={{ width: size, height: size, minWidth: size, minHeight: size, display: "block" }}>
      <SvgInner type={type} />
    </svg>
  );
}

/* ============================================================
   定数
============================================================ */
const TYPE_META: Record<EquipmentType, { defaultLabel: string; isLight: boolean }> = {
  camera:          { defaultLabel: "カメラ",     isLight: false },
  "light-bowl":    { defaultLabel: "おわん",     isLight: true },
  "light-octa":    { defaultLabel: "オクタ",     isLight: true },
  "light-umbrella":{ defaultLabel: "傘",         isLight: true },
  "light-square":  { defaultLabel: "角型",       isLight: true },
  "ref-white":     { defaultLabel: "白カポック", isLight: false },
  "ref-black":     { defaultLabel: "黒カポック", isLight: false },
  subject:         { defaultLabel: "被写体",     isLight: false },
  background:      { defaultLabel: "背景",       isLight: false },
};

const ADDABLE: EquipmentType[] = ["camera","light-bowl","light-octa","light-umbrella","light-square","ref-white","ref-black","subject","background"];
const POWER_OPT = ["1/1","1/2","1/4","1/8","1/16","1/32","1/64","1/128"];
const F_OPT = ["F1.4","F2","F2.8","F4","F5.6","F8","F11","F16","F22"];
const SS_OPT = ["1/60","1/80","1/100","1/125","1/160","1/200","1/250","1/500","1/1000"];
const ISO_OPT = ["100","200","400","800","1600","3200"];
const GROUPS: ("A"|"B"|"C")[] = ["A","B","C"];

const PRESETS: StudioPreset[] = [
  { id:"1f-1", name:"1F-1", sideW:1000, floorW:3000, floorH:3000, tile:450, showTiles:false, floorColor:C.floor, sideColor:C.floor, marginH:2000 },
  { id:"2f-1", name:"2F-1", sideW:1250, floorW:3150, floorH:3150, tile:450, showTiles:true,  floorColor:C.floor, sideColor:C.side,  marginH:2000 },
  { id:"2f-2", name:"2F-2", sideW:1250, floorW:3150, floorH:3150, tile:450, showTiles:true,  floorColor:C.floor, sideColor:C.side,  marginH:2000 },
];
const PX_W = 700;

/* ============================================================
   ヘルパー
============================================================ */
let _id = 0;
const uid = () => `e${Date.now()}-${++_id}`;

function calc(p: StudioPreset) {
  const totalMm = p.sideW + p.floorW;
  const s = PX_W / totalMm;
  return {
    s, totalPx: PX_W,
    sidePx: p.sideW * s, floorPx: p.floorW * s,
    floorPxH: p.floorH * s, marginPxH: p.marginH * s,
    totalPxH: (p.floorH + p.marginH) * s, tilePx: p.tile * s,
  };
}

function makeInit(p: StudioPreset): Equipment[] {
  const l = calc(p);
  return [
    { id:uid(), type:"camera",     label:"カメラ",   x:l.sidePx+l.floorPx*0.5, y:l.floorPxH*0.78, rotation:0,    power:"—",   height:150, group:null },
    { id:uid(), type:"light-bowl", label:"キー",     x:l.sidePx+l.floorPx*0.3, y:l.floorPxH*0.3,  rotation:135,  power:"1/2", height:220, group:"A" },
    { id:uid(), type:"light-bowl", label:"フィル",   x:l.sidePx+l.floorPx*0.7, y:l.floorPxH*0.35, rotation:-135, power:"1/4", height:200, group:"B" },
    { id:uid(), type:"subject",    label:"モデル",   x:l.sidePx+l.floorPx*0.5, y:l.floorPxH*0.45, rotation:0,    power:"—",   height:0,   group:null },
    { id:uid(), type:"background", label:"背景紙",   x:l.sidePx+l.floorPx*0.5, y:8,               rotation:0,    power:"—",   height:0,   group:null },
  ];
}

const toMm = (px: number, s: number) => Math.round(px / s);

/* ============================================================
   LightCone — 向きの扇形表示
============================================================ */
function Cone({ rotation, type, id }: { rotation: number; type: EquipmentType; id: string }) {
  if (!TYPE_META[type].isLight && type !== "camera") return null;
  const len = type === "camera" ? 80 : 160;
  const half = (type === "camera" ? 40 : 55) / 2;
  const rad = (r: number) => (r - 90) * (Math.PI / 180);
  const x1 = Math.cos(rad(rotation - half)) * len;
  const y1 = Math.sin(rad(rotation - half)) * len;
  const x2 = Math.cos(rad(rotation + half)) * len;
  const y2 = Math.sin(rad(rotation + half)) * len;
  const cx2 = Math.cos(rad(rotation)) * len;
  const cy2 = Math.sin(rad(rotation)) * len;
  const isC = type === "camera";
  const fill = isC ? "120,150,200" : "220,160,50";
  const stroke = isC ? "#7090C0" : "#D4A030";
  const gid = `g-${id}`;
  const sz = len * 2 + 20;
  return (
    <svg width={sz} height={sz} className="absolute pointer-events-none" style={{ left: -(sz / 2) + 12, top: -(sz / 2) + 12 }}>
      <defs>
        <radialGradient id={gid} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={`rgba(${fill},0.40)`} />
          <stop offset="40%" stopColor={`rgba(${fill},0.20)`} />
          <stop offset="100%" stopColor={`rgba(${fill},0)`} />
        </radialGradient>
      </defs>
      <g transform={`translate(${sz / 2},${sz / 2})`}>
        <path d={`M0,0 L${x1},${y1} A${len},${len} 0 0,1 ${x2},${y2} Z`} fill={`url(#${gid})`} />
        <line x1={0} y1={0} x2={x1} y2={y1} stroke={stroke} strokeWidth={1.5} opacity={0.5} />
        <line x1={0} y1={0} x2={x2} y2={y2} stroke={stroke} strokeWidth={1.5} opacity={0.5} />
        <path d={`M${x1},${y1} A${len},${len} 0 0,1 ${x2},${y2}`} fill="none" stroke={stroke} strokeWidth={1.5} opacity={0.4} />
        <line x1={0} y1={0} x2={cx2} y2={cy2} stroke={stroke} strokeWidth={2} opacity={0.7} strokeDasharray="6 4" />
        <circle cx={cx2} cy={cy2} r={3.5} fill={stroke} opacity={0.7} />
      </g>
    </svg>
  );
}

/* ============================================================
   タイルグリッド
============================================================ */
function Tiles({ layout, preset }: { layout: ReturnType<typeof calc>; preset: StudioPreset }) {
  if (!preset.showTiles) return null;
  const cols = Math.ceil(preset.floorW / preset.tile);
  const rows = Math.ceil(preset.floorH / preset.tile);
  const ls: React.ReactNode[] = [];
  for (let i = 0; i <= cols; i++)
    ls.push(<line key={`v${i}`} x1={layout.sidePx + i * layout.tilePx} y1={0} x2={layout.sidePx + i * layout.tilePx} y2={layout.floorPxH} stroke="#C4BFB4" strokeWidth={0.7} />);
  for (let j = 0; j <= rows; j++)
    ls.push(<line key={`h${j}`} x1={layout.sidePx} y1={j * layout.tilePx} x2={layout.totalPx} y2={j * layout.tilePx} stroke="#C4BFB4" strokeWidth={0.7} />);
  return <svg className="absolute inset-0 pointer-events-none z-[1]" width={layout.totalPx} height={layout.floorPxH}>{ls}</svg>;
}

/* ============================================================
   オプションボタン
============================================================ */
function Opts({ options, value, onChange, cols = 4 }: { options: string[]; value: string; onChange: (v: string) => void; cols?: number }) {
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols},1fr)` }}>
      {options.map(opt => (
        <button key={opt} onClick={() => onChange(opt)}
          className="rounded-lg text-center font-bold transition-all"
          style={{
            padding: "4px 2px", fontSize: 11,
            background: value === opt ? C.accent : C.bg,
            color: value === opt ? "#fff" : C.textSub,
            border: `1px solid ${value === opt ? C.accent : C.border}`,
          }}>
          {opt}
        </button>
      ))}
    </div>
  );
}

/* ============================================================
   メインコンポーネント
============================================================ */
export default function Home() {
  const [activeId, setActiveId] = useState(PRESETS[1].id);
  const preset = PRESETS.find(p => p.id === activeId) || PRESETS[1];
  const layout = calc(preset);

  const [itemsMap, setItemsMap] = useState<Record<string, Equipment[]>>(() => {
    const m: Record<string, Equipment[]> = {};
    PRESETS.forEach(p => { m[p.id] = makeInit(p); });
    return m;
  });
  const items = itemsMap[activeId] || [];
  const setItems = (v: Equipment[]) => setItemsMap(p => ({ ...p, [activeId]: v }));

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"studio" | "settings">("studio");

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOff = useRef({ x: 0, y: 0 });
  const stuRef = useRef<HTMLDivElement>(null);

  const [cam, setCam] = useState<CameraSettings>({ aperture: "F5.6", shutter: "1/125", iso: "100" });

  const sel = items.find(i => i.id === selectedId) || null;

  /* --- CRUD --- */
  const addItem = (type: EquipmentType) => {
    const meta = TYPE_META[type];
    const item: Equipment = {
      id: uid(), type, label: meta.defaultLabel,
      x: layout.sidePx + 30 + Math.random() * (layout.floorPx - 60),
      y: 30 + Math.random() * (layout.floorPxH - 60),
      rotation: 0, power: meta.isLight ? "1/4" : "—",
      height: meta.isLight ? 200 : 0, group: meta.isLight ? "A" : null,
    };
    setItems([...items, item]);
    setSelectedId(item.id);
  };
  const removeItem = (id: string) => { setItems(items.filter(i => i.id !== id)); if (selectedId === id) setSelectedId(null); };
  const updateItem = useCallback((id: string, patch: Partial<Equipment>) => {
    setItemsMap(prev => ({ ...prev, [activeId]: (prev[activeId] || []).map(i => i.id === id ? { ...i, ...patch } : i) }));
  }, [activeId]);

  /* --- Drag --- */
  const startDrag = (id: string, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!stuRef.current) return;
    const rect = stuRef.current.getBoundingClientRect();
    const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
    const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
    const item = items.find(i => i.id === id);
    if (!item) return;
    dragOff.current = { x: cx - rect.left - item.x, y: cy - rect.top - item.y };
    setDraggingId(id); setSelectedId(id);
  };
  const onMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!draggingId || !stuRef.current) return;
    const rect = stuRef.current.getBoundingClientRect();
    const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
    const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
    updateItem(draggingId, { x: cx - rect.left - dragOff.current.x, y: cy - rect.top - dragOff.current.y });
  }, [draggingId, updateItem]);
  const stopDrag = useCallback(() => setDraggingId(null), []);

  /* --- Save / Load --- */
  const save = () => {
    localStorage.setItem("lighting-planner", JSON.stringify({ itemsMap, cam, activeId, ts: Date.now() }));
    alert("保存しました");
  };
  const load = () => {
    try {
      const d = JSON.parse(localStorage.getItem("lighting-planner") || "");
      if (d.itemsMap) setItemsMap(d.itemsMap);
      if (d.cam) setCam(d.cam);
      if (d.activeId) setActiveId(d.activeId);
      setSelectedId(null);
      alert("読み込みました");
    } catch { alert("保存データがありません"); }
  };
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem("lighting-planner") || "");
      if (d.itemsMap) setItemsMap(d.itemsMap);
      if (d.cam) setCam(d.cam);
      if (d.activeId) setActiveId(d.activeId);
    } catch { /* no saved data */ }
  }, []);

  /* --- PDF --- */
const printPDF = () => {
  // 余白エリアを一時非表示
  const studio = stuRef.current;
  const marginEl = studio?.querySelector('[data-print-margin]') as HTMLElement | null;
  const marginLabelEl = studio?.querySelector('[data-print-margin-label]') as HTMLElement | null;
  const origH = studio?.style.height || "";
  if (marginEl) marginEl.style.display = "none";
  if (marginLabelEl) marginLabelEl.style.display = "none";
  if (studio) studio.style.height = layout.floorPxH + "px";

  // スタジオのHTMLをクローン
  const studioCard = document.querySelector('[data-studio]');
  const studioClone = studioCard ? studioCard.cloneNode(true) as HTMLElement : null;

  // ストロボ一覧
  const lightItems = items.filter(i => TYPE_META[i.type].isLight);
  const eqRows = lightItems.map(i => {
    const gC = i.group ? G_CLR[i.group].dot : "#AEAEB2";
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(232,228,221,0.6);">
        <div style="width:10px;height:10px;border-radius:50%;background:${gC};flex-shrink:0;box-shadow:0 0 6px ${gC}44;"></div>
        <div style="flex:1;font-size:13px;font-weight:700;color:#2C2C2E;">${i.label}</div>
        <div style="font-size:11px;color:#8E8E93;font-weight:500;">${TYPE_META[i.type].defaultLabel}</div>
        <div style="font-size:15px;font-weight:800;color:#E8A849;min-width:44px;text-align:right;">${i.power}</div>
        <div style="font-size:13px;font-weight:700;color:${gC};min-width:22px;text-align:center;">${i.group || "—"}</div>
      </div>`;
  }).join("");

  // 印刷用オーバーレイ
  const overlay = document.createElement("div");
  overlay.id = "print-overlay";
  overlay.innerHTML = `
    <div style="
      position:fixed; top:0; left:0; width:100vw; height:100vh;
      background:white;
      display:flex;
      box-sizing:border-box;
      font-family:'Noto Sans JP',Inter,sans-serif;
      z-index:99999;
    ">
      <!-- 左：配置図（枠なし、そのまま） -->
      <div style="
        flex:1;
        overflow:hidden;
        display:flex;
        align-items:flex-start;
        justify-content:flex-start;
        background:white;
        position:relative;
      ">
        <div id="print-studio-slot" style="transform:scale(0.95);transform-origin:top left;"></div>
      </div>

      <!-- 右：設定パネル -->
      <div style="
        width:280px;
        flex-shrink:0;
        background:#F7F5F0;
        padding:28px 22px;
        display:flex;
        flex-direction:column;
        box-sizing:border-box;
        border-left:1px solid #E8E4DD;
      ">
        <!-- ヘッダー -->
        <div style="margin-bottom:24px;">
          <div style="font-size:24px;font-weight:800;color:#2C2C2E;letter-spacing:-0.02em;">${preset.name}</div>
          <div style="font-size:10px;color:#8E8E93;margin-top:4px;">
            ${new Date().toLocaleDateString("ja-JP")} ／ ${preset.floorW}×${preset.floorH}mm
          </div>
        </div>

        <!-- カメラ設定 -->
 <div style="background:white;border-radius:16px;padding:16px 20px;box-shadow:0 1px 4px rgba(0,0,0,0.04);">
  <div style="display:flex;justify-content:space-around;margin-bottom:10px;">
    <div style="text-align:center;flex:1;">
      <div style="font-size:9px;font-weight:700;color:#8E8E93;margin-bottom:2px;">F</div>
      <div style="font-size:26px;font-weight:800;color:#E8A849;line-height:1.1;">${cam.aperture}</div>
    </div>
    <div style="width:1px;background:#E8E4DD;"></div>
    <div style="text-align:center;flex:1;">
      <div style="font-size:9px;font-weight:700;color:#8E8E93;margin-bottom:2px;">SS</div>
      <div style="font-size:26px;font-weight:800;color:#E8A849;line-height:1.1;">${cam.shutter}</div>
    </div>
  </div>
  <div style="border-top:1px solid #E8E4DD;padding-top:10px;text-align:center;">
    <div style="font-size:9px;font-weight:700;color:#8E8E93;margin-bottom:2px;">ISO</div>
    <div style="font-size:26px;font-weight:800;color:#E8A849;line-height:1.1;">${cam.iso}</div>
  </div>
</div>



        <!-- ストロボ一覧 -->
        ${lightItems.length > 0 ? `
        <div style="flex:1;">
          <div style="font-size:10px;font-weight:700;color:#8E8E93;letter-spacing:0.12em;margin-bottom:10px;">STROBE (${lightItems.length})</div>
          <div style="background:white;border-radius:16px;padding:4px 16px;box-shadow:0 1px 4px rgba(0,0,0,0.04);">
            <div style="font-size:8px;color:#8E8E93;display:flex;gap:10px;padding:8px 0 6px 20px;border-bottom:1px solid #E8E4DD;">
              <div style="flex:1;">名前</div><div>種類</div><div style="min-width:44px;text-align:right;">光量</div><div style="min-width:22px;text-align:center;">Grp</div>
            </div>
            ${eqRows}
          </div>
        </div>` : ""}
      </div>
    </div>`;

  document.body.appendChild(overlay);

  // スタジオのクローンを挿入
  const slot = document.getElementById("print-studio-slot");
  if (slot && studioClone) {
    slot.appendChild(studioClone);
  }

  window.print();
  document.body.removeChild(overlay);

  // 元に戻す
  if (marginEl) marginEl.style.display = "";
  if (marginLabelEl) marginLabelEl.style.display = "";
  if (studio) studio.style.height = origH;
};



  /* --- Switch studio --- */
  const switchStudio = (id: string) => { setActiveId(id); setSelectedId(null); setDraggingId(null); };

  /* ============================================================
     JSX
  ============================================================ */
 return (
  <div className="flex flex-col h-screen select-none" style={{ background: C.bg, color: C.text, fontFamily: "'Noto Sans JP', Inter, sans-serif" }}>

    {/* ===== ヘッダー ===== */}
    <header className="print:hidden flex items-center justify-between px-3 sm:px-5 py-2" style={{ background: C.card, borderBottom: `1px solid ${C.border}` }}>
      <div className="flex items-center gap-2 sm:gap-3">
        <h1 style={{ fontSize: 16, fontWeight: 800, color: C.accent }}>LP</h1>
        <span className="hidden sm:inline" style={{ fontSize: 12, fontWeight: 600, color: C.textSub }}>Lighting Planner</span>
      </div>
      <div className="flex gap-1">
        {PRESETS.map(p => (
          <button key={p.id} onClick={() => switchStudio(p.id)}
            className="rounded-lg transition-all"
            style={{ padding: "4px 10px", fontSize: 10, fontWeight: 700, background: activeId === p.id ? C.accent : C.bg, color: activeId === p.id ? "#fff" : C.textSub, border: `1px solid ${activeId === p.id ? C.accent : C.border}` }}>
            {p.name}
          </button>
        ))}
      </div>
      <div className="flex gap-1 sm:gap-2">
        <button onClick={load} className="rounded-lg" style={{ padding: "4px 8px", fontSize: 10, fontWeight: 600, background: C.bg, color: C.textSub, border: `1px solid ${C.border}` }}>読込</button>
        <button onClick={save} className="rounded-lg" style={{ padding: "4px 8px", fontSize: 10, fontWeight: 600, background: C.bg, color: C.textSub, border: `1px solid ${C.border}` }}>保存</button>
        <button onClick={printPDF} className="rounded-lg" style={{ padding: "4px 8px", fontSize: 10, fontWeight: 600, background: C.accent, color: "#fff", border: `1px solid ${C.accent}` }}>PDF</button>
      </div>
    </header>

    {/* ===== モバイルタブ ===== */}
    <div className="sm:hidden print:hidden flex border-b" style={{ background: C.card, borderColor: C.border }}>
      {(["studio", "settings"] as const).map(tab => (
        <button key={tab} onClick={() => setMobileTab(tab)}
          className="flex-1 py-2 text-center transition-all"
          style={{ fontSize: 12, fontWeight: 700, color: mobileTab === tab ? C.accent : C.textSub, borderBottom: mobileTab === tab ? `2px solid ${C.accent}` : "2px solid transparent" }}>
          {tab === "studio" ? "配置図" : "設定"}
        </button>
      ))}
    </div>

    {/* ===== メインレイアウト ===== */}
    <div className="flex flex-1 overflow-hidden">

      {/* ===== 左サイドバー（PC のみ） ===== */}
      <aside className="print:hidden hidden sm:block flex-shrink-0 overflow-y-auto p-3 space-y-3" style={{ width: 180, background: "#1C1C1E", borderRight: "1px solid #333" }}>
        {/* 機材追加 */}
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#888", letterSpacing: "0.1em", marginBottom: 6 }}>機材追加</div>
          <div className="grid grid-cols-3 gap-1">
            {ADDABLE.map(type => (
              <button key={type} onClick={() => addItem(type)}
                className="flex flex-col items-center gap-0.5 rounded-lg transition-all"
                style={{ padding: "6px 2px", background: "#2A2A2E", border: "1px solid #3A3A3E", color: "#ccc", fontSize: 9 }}>
                <Icon type={type} size={22} />
                <span>{TYPE_META[type].defaultLabel}</span>
              </button>
            ))}
          </div>
        </div>
        {/* 配置済み */}
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#888", letterSpacing: "0.1em", marginBottom: 6 }}>配置済み ({items.length})</div>
          <div className="space-y-1">
            {items.map(item => (
              <div key={item.id} onClick={() => setSelectedId(item.id)}
                className="flex items-center justify-between rounded-lg cursor-pointer transition-all"
                style={{ padding: "4px 8px", background: selectedId === item.id ? "#3A3A3E" : "#2A2A2E", border: `1px solid ${selectedId === item.id ? C.accent : "#3A3A3E"}`, color: "#ddd" }}>
                <div className="flex items-center gap-2 overflow-hidden">
                  <Icon type={item.type} size={18} />
                  <span style={{ fontSize: 11, fontWeight: 600 }} className="truncate">{item.label}</span>
                  {item.group && <span style={{ width: 8, height: 8, borderRadius: "50%", background: G_CLR[item.group].dot, flexShrink: 0 }} />}
                </div>
                <button onClick={e => { e.stopPropagation(); removeItem(item.id); }} style={{ color: "#666", fontSize: 14 }}>×</button>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ===== スタジオ（PC: 常時表示 / モバイル: タブ切り替え） ===== */}
      <main className={`flex-1 overflow-auto flex items-start justify-center p-2 sm:p-4 ${mobileTab !== "studio" ? "hidden sm:flex" : ""}`}>

        {/* モバイル用：機材追加ボタン */}
        <div className="sm:hidden fixed bottom-4 left-4 right-4 z-50 flex gap-1 overflow-x-auto p-2 rounded-2xl" style={{ background: "#1C1C1E" }}>
          {ADDABLE.map(type => (
            <button key={type} onClick={() => addItem(type)}
              className="flex flex-col items-center gap-0.5 rounded-lg flex-shrink-0"
              style={{ padding: "6px 8px", background: "#2A2A2E", border: "1px solid #3A3A3E", color: "#ccc", fontSize: 8, minWidth: 52 }}>
              <Icon type={type} size={18} />
              <span>{TYPE_META[type].defaultLabel}</span>
            </button>
          ))}
        </div>

        <div className="rounded-2xl" style={{ background: C.card, padding: 8, boxShadow: "0 2px 20px rgba(0,0,0,0.06)" }}>
          <div ref={stuRef} className="relative overflow-visible"
            data-studio
            style={{ width: layout.totalPx, height: layout.totalPxH, maxWidth: "calc(100vw - 32px)" }}
            onMouseMove={onMove} onMouseUp={stopDrag} onMouseLeave={stopDrag}
            onTouchMove={onMove} onTouchEnd={stopDrag}>

            {/* エリア */}
            <div className="absolute top-0 left-0" style={{ width: layout.sidePx, height: layout.floorPxH, background: preset.sideColor, borderRadius: "12px 0 0 0" }} />
            <div className="absolute top-0" style={{ left: layout.sidePx, width: layout.floorPx, height: layout.floorPxH, background: preset.floorColor, borderRadius: "0 12px 0 0" }} />
            <div data-print-margin className="absolute" style={{ left: 0, top: layout.floorPxH, width: layout.totalPx, height: layout.marginPxH, background: C.margin, borderRadius: "0 0 12px 12px" }} />

            {/* 境界線 */}
            <div className="absolute top-0" style={{ left: layout.sidePx - 0.5, width: 1, height: layout.floorPxH, background: "#A09888", opacity: 0.5 }} />
            <div className="absolute" style={{ left: 0, top: layout.floorPxH - 0.5, width: layout.totalPx, height: 1, background: "#A09888", opacity: 0.5 }} />

            {/* エリアラベル */}
            <div className="absolute" style={{ left: 8, top: 8, fontSize: 9, fontWeight: 700, color: "#A09888" }}>機材エリア</div>
            <div className="absolute" style={{ left: layout.sidePx + 8, top: 8, fontSize: 9, fontWeight: 700, color: "#A09888" }}>撮影エリア</div>
            <div data-print-margin-label className="absolute" style={{ left: 8, top: layout.floorPxH + 8, fontSize: 9, fontWeight: 700, color: "#A09888" }}>余白</div>

            {/* タイル */}
            <Tiles layout={layout} preset={preset} />

            {/* 機材 */}
            {items.map(item => {
              const isSel = selectedId === item.id;
              const isK = item.type === "ref-white" || item.type === "ref-black";
              return (
                <div key={item.id} className="absolute z-10" style={{ left: item.x, top: item.y, width: "max-content", minWidth: "max-content" }}>
                  <Cone rotation={item.rotation} type={item.type} id={item.id} />
                  <div
                    onMouseDown={e => startDrag(item.id, e)}
                    onTouchStart={e => startDrag(item.id, e)}
                    onClick={() => setSelectedId(item.id)}
                    className="relative z-10 cursor-move select-none rounded-xl"
                    style={{
                      whiteSpace: "nowrap", padding: "5px 10px",
                      background: isSel ? C.accentSoft : C.card,
                      border: `1.5px solid ${isSel ? C.accent : C.border}`,
                      boxShadow: isSel ? `0 2px 12px ${C.accent}33` : "0 1px 4px rgba(0,0,0,0.06)",
                      ...(isK ? { transform: `rotate(${item.rotation}deg)`, transformOrigin: "center center" } : {}),
                    }}>
                    <div className="flex items-center gap-2">
                      <span style={{ color: isSel ? C.accent : C.textSub }}><Icon type={item.type} size={20} /></span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: isSel ? C.text : C.textSub }}>{item.label}</span>
                      {item.group && <span style={{ width: 8, height: 8, borderRadius: "50%", background: G_CLR[item.group].dot, boxShadow: `0 0 6px ${G_CLR[item.group].dot}55` }} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* ===== 右パネル（PC: 常時表示 / モバイル: タブ切り替え） ===== */}
      <aside className={`print:hidden flex-shrink-0 overflow-y-auto p-4 space-y-5 ${mobileTab !== "settings" ? "hidden sm:block" : "w-full sm:w-auto"}`} style={{ width: undefined, maxWidth: "100%", background: C.card, borderLeft: `1px solid ${C.border}` }}>
        <div className="sm:hidden">
          {/* モバイル用：配置済みリスト */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.textSub, letterSpacing: "0.08em", marginBottom: 8 }}>配置済み ({items.length})</div>
            <div className="space-y-1">
              {items.map(item => (
                <div key={item.id} onClick={() => setSelectedId(item.id)}
                  className="flex items-center justify-between rounded-lg cursor-pointer"
                  style={{ padding: "6px 10px", background: selectedId === item.id ? C.accentSoft : C.bg, border: `1px solid ${selectedId === item.id ? C.accent : C.border}` }}>
                  <div className="flex items-center gap-2">
                    <Icon type={item.type} size={20} />
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{item.label}</span>
                    {item.group && <span style={{ width: 8, height: 8, borderRadius: "50%", background: G_CLR[item.group].dot }} />}
                  </div>
                  <button onClick={e => { e.stopPropagation(); removeItem(item.id); }} style={{ color: C.textSub, fontSize: 16 }}>×</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* カメラ設定 */}
        <div className="sm:w-52">
          <div style={{ fontSize: 10, fontWeight: 700, color: C.textSub, letterSpacing: "0.08em", marginBottom: 8 }}>CAMERA</div>
          <div className="space-y-3">
            <div>
              <div style={{ fontSize: 10, color: C.textSub, marginBottom: 4 }}>絞り</div>
              <Opts options={F_OPT} value={cam.aperture} onChange={v => setCam(c => ({ ...c, aperture: v }))} cols={5} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: C.textSub, marginBottom: 4 }}>シャッタースピード</div>
              <Opts options={SS_OPT} value={cam.shutter} onChange={v => setCam(c => ({ ...c, shutter: v }))} cols={5} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: C.textSub, marginBottom: 4 }}>ISO</div>
              <Opts options={ISO_OPT} value={cam.iso} onChange={v => setCam(c => ({ ...c, iso: v }))} cols={3} />
            </div>
          </div>
        </div>

        {/* ストロボ設定 */}
        {sel && TYPE_META[sel.type].isLight && (
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.textSub, letterSpacing: "0.08em", marginBottom: 8 }}>
              STROBE — {sel.label}
            </div>
            <div className="space-y-3">
              <div>
                <div style={{ fontSize: 10, color: C.textSub, marginBottom: 4 }}>ラベル</div>
                <input value={sel.label} onChange={e => updateItem(sel.id, { label: e.target.value })}
                  className="w-full rounded-lg"
                  style={{ padding: "5px 8px", fontSize: 12, border: `1px solid ${C.border}`, background: C.bg, outline: "none" }} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: C.textSub, marginBottom: 4 }}>光量</div>
                <Opts options={POWER_OPT} value={sel.power} onChange={v => updateItem(sel.id, { power: v })} cols={4} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: C.textSub, marginBottom: 4 }}>向き ({sel.rotation}°)</div>
                <input type="range" min={-180} max={180} value={sel.rotation}
                  onChange={e => updateItem(sel.id, { rotation: Number(e.target.value) })}
                  className="w-full" style={{ accentColor: C.accent }} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: C.textSub, marginBottom: 4 }}>グループ</div>
                <div className="flex gap-1">
                  {GROUPS.map(g => (
                    <button key={g} onClick={() => updateItem(sel.id, { group: g })}
                      className="flex-1 rounded-lg text-center font-bold transition-all"
                      style={{
                        padding: "5px 0", fontSize: 12,
                        background: sel.group === g ? G_CLR[g].bg : C.bg,
                        color: sel.group === g ? G_CLR[g].text : C.textSub,
                        border: `1.5px solid ${sel.group === g ? G_CLR[g].dot : C.border}`,
                      }}>
                      {g}
                    </button>
                  ))}
                  <button onClick={() => updateItem(sel.id, { group: null })}
                    className="flex-1 rounded-lg text-center font-bold transition-all"
                    style={{
                      padding: "5px 0", fontSize: 11,
                      background: sel.group === null ? C.text : C.bg,
                      color: sel.group === null ? "#fff" : C.textSub,
                      border: `1.5px solid ${sel.group === null ? C.text : C.border}`,
                    }}>
                    なし
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {sel && !TYPE_META[sel.type].isLight && (
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.textSub, letterSpacing: "0.08em", marginBottom: 8 }}>
              {TYPE_META[sel.type].defaultLabel} — {sel.label}
            </div>
            <div>
              <div style={{ fontSize: 10, color: C.textSub, marginBottom: 4 }}>ラベル</div>
              <input value={sel.label} onChange={e => updateItem(sel.id, { label: e.target.value })}
                className="w-full rounded-lg"
                style={{ padding: "5px 8px", fontSize: 12, border: `1px solid ${C.border}`, background: C.bg, outline: "none" }} />
            </div>
          </div>
        )}

        {!sel && (
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: C.textSub }}>機材を選択してください</div>
          </div>
        )}
      </aside>
    </div>
  </div>
);

}
