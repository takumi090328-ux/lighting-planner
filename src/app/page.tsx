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
  x: number; y: number; rotation: number; tilt: number;
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
  bg: "#1C1C1E",
  card: "#2C2C2E",
  cardHover: "#3A3A3C",
  accent: "#E8A849",
  accentSub: "#D4943D",
  accentSoft: "rgba(232,168,73,0.10)",
  text: "#F5F5F7",
  textSub: "#8E8E93",
  border: "#3A3A3C",
  floor: "#F7F5F0",
  side: "#E8E4DD",
  margin: "#D6D2CB",
  gridLine: "rgba(0,0,0,0.08)",
};
const G_CLR: Record<string, { dot: string; cone: string }> = {
  A: { dot: "#E8A849", cone: "rgba(232,168,73,0.18)" },
  B: { dot: "#64D2FF", cone: "rgba(100,210,255,0.18)" },
  C: { dot: "#B482FF", cone: "rgba(180,130,255,0.18)" },
};

/* ============================================================
   SVG アイコン
============================================================ */
const SvgInner: Record<string, string> = {
  camera: '<rect x="3" y="5" width="18" height="13" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="12" cy="11.5" r="3.5" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M7 5 L9 2 H15 L17 5" stroke="currentColor" stroke-width="1.5" fill="none"/>',
  "light-bowl": '<ellipse cx="12" cy="8" rx="7" ry="4" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="12" y1="12" x2="12" y2="22" stroke="currentColor" stroke-width="1.5"/><line x1="8" y1="22" x2="16" y2="22" stroke="currentColor" stroke-width="1.5"/>',
  "light-octa": '<polygon points="12,2 18.9,6 21,13 17,19.5 7,19.5 3,13 5.1,6" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="12" y1="19.5" x2="12" y2="22" stroke="currentColor" stroke-width="1.5"/>',
  "light-umbrella": '<path d="M4 14 Q12 0 20 14" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="12" y1="14" x2="12" y2="22" stroke="currentColor" stroke-width="1.5"/><line x1="8" y1="22" x2="16" y2="22" stroke="currentColor" stroke-width="1.5"/>',
  "light-square": '<rect x="4" y="3" width="16" height="14" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="12" y1="17" x2="12" y2="22" stroke="currentColor" stroke-width="1.5"/><line x1="8" y1="22" x2="16" y2="22" stroke="currentColor" stroke-width="1.5"/>',
  "ref-white": '<ellipse cx="12" cy="12" rx="9" ry="9" stroke="currentColor" stroke-width="1.5" fill="none"/><text x="12" y="16" text-anchor="middle" font-size="9" fill="currentColor">W</text>',
  "ref-black": '<ellipse cx="12" cy="12" rx="9" ry="9" stroke="currentColor" stroke-width="1.5" fill="none"/><text x="12" y="16" text-anchor="middle" font-size="9" fill="currentColor">B</text>',
  subject: '<circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M5 22 Q5 14 12 14 Q19 14 19 22" stroke="currentColor" stroke-width="1.5" fill="none"/>',
  background: '<rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M3 8 H21" stroke="currentColor" stroke-width="1" opacity="0.4"/>',
};
const Icon = ({ type, size = 24 }: { type: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ color: "currentColor" }} dangerouslySetInnerHTML={{ __html: SvgInner[type] || "" }} />
);

/* ============================================================
   メタ / 定数
============================================================ */
const TYPE_META: Record<EquipmentType, { defaultLabel: string; isLight: boolean }> = {
  camera: { defaultLabel: "カメラ", isLight: false },
  "light-bowl": { defaultLabel: "ボウル", isLight: true },
  "light-octa": { defaultLabel: "オクタ", isLight: true },
  "light-umbrella": { defaultLabel: "アンブレラ", isLight: true },
  "light-square": { defaultLabel: "スクエア", isLight: true },
  "ref-white": { defaultLabel: "白レフ", isLight: false },
  "ref-black": { defaultLabel: "黒レフ", isLight: false },
  subject: { defaultLabel: "被写体", isLight: false },
  background: { defaultLabel: "背景", isLight: false },
};
const ADDABLE: EquipmentType[] = ["camera", "light-bowl", "light-octa", "light-umbrella", "light-square", "ref-white", "ref-black", "subject", "background"];
const POWER_OPT = ["1/1", "1/2", "1/4", "1/8", "1/16", "1/32", "1/64", "1/128"];
const F_OPT = ["F1.4", "F2", "F2.8", "F4", "F5.6", "F8", "F11", "F16", "F22"];
const SS_OPT = ["1/60", "1/80", "1/100", "1/125", "1/160", "1/200", "1/250", "1/500"];
const ISO_OPT = ["100", "200", "400", "800", "1600", "3200"];
const GROUPS: StrobeGroup[] = ["A", "B", "C"];

const PRESETS: StudioPreset[] = [
  { id: "1f-1", name: "1F-1", sideW: 1000, floorW: 3000, floorH: 3000, tile: 450, showTiles: false, floorColor: C.floor, sideColor: C.floor, marginH: 2000 },
  { id: "2f-1", name: "2F-1", sideW: 1250, floorW: 3150, floorH: 3150, tile: 450, showTiles: true, floorColor: C.floor, sideColor: C.side, marginH: 2000 },
  { id: "2f-2", name: "2F-2", sideW: 1250, floorW: 3150, floorH: 3150, tile: 450, showTiles: true, floorColor: C.floor, sideColor: C.side, marginH: 2000 },
];

/* ============================================================
   ヘルパー
============================================================ */
let _uid = 0;
const uid = () => `eq-${Date.now()}-${++_uid}`;
const S = 0.13;

const calc = (p: StudioPreset) => {
  const sidePx = p.sideW * S;
  const floorPx = p.floorW * S;
  const floorPxH = p.floorH * S;
  const marginPxH = p.marginH * S;
  const totalPx = sidePx + floorPx;          // ← 左サイドのみ
  const totalPxH = floorPxH + marginPxH;
  const tilePx = p.tile * S;
  return { s: S, totalPx, sidePx, floorPx, floorPxH, marginPxH, totalPxH, tilePx };
};

const makeInit = (p: StudioPreset): Equipment[] => {
  const l = calc(p);
  return [
    { id: uid(), type: "camera", label: "カメラ", x: l.sidePx + l.floorPx * 0.5, y: l.floorPxH * 0.85, rotation: 0, tilt: 0, power: "—", height: 150, group: null },
    { id: uid(), type: "light-bowl", label: "キー", x: l.sidePx + l.floorPx * 0.3, y: l.floorPxH * 0.3, rotation: 135, tilt: -15, power: "1/2", height: 220, group: "A" },
    { id: uid(), type: "light-bowl", label: "フィル", x: l.sidePx + l.floorPx * 0.7, y: l.floorPxH * 0.3, rotation: -135, tilt: -10, power: "1/4", height: 200, group: "B" },
    { id: uid(), type: "subject", label: "被写体", x: l.sidePx + l.floorPx * 0.5, y: l.floorPxH * 0.45, rotation: 0, tilt: 0, power: "—", height: 0, group: null },
    { id: uid(), type: "background", label: "背景", x: l.sidePx + l.floorPx * 0.5, y: 20, rotation: 0, tilt: 0, power: "—", height: 0, group: null },
  ];
};

/* ============================================================
   光の三角コーン（機材チップ内に配置）
============================================================ */
const Cone = ({ rotation, type, id }: { rotation: number; type: EquipmentType; id: string }) => {
  const meta = TYPE_META[type];
  if (!meta.isLight) return null;

  const len = 120;
  const half = 28;
  const rad = (rotation * Math.PI) / 180;
  const lRad = ((rotation - half) * Math.PI) / 180;
  const rRad = ((rotation + half) * Math.PI) / 180;
  const ox = 0, oy = 0;
  const lx = ox + Math.cos(lRad) * len;
  const ly = oy + Math.sin(lRad) * len;
  const rx = ox + Math.cos(rRad) * len;
  const ry = oy + Math.sin(rRad) * len;

  // Find the item's group to color the cone - we use a data attribute approach
  return (
    <svg
      className="absolute pointer-events-none"
      style={{ left: 0, top: 0, width: 1, height: 1, overflow: "visible", zIndex: 1 }}
      data-cone-for={id}
    >
      <polygon
        points={`${ox},${oy} ${lx},${ly} ${rx},${ry}`}
        fill="rgba(232,168,73,0.18)"
        stroke="none"
      />
    </svg>
  );
};

/* コーン色をグループに合わせる版 */
const ConeWithGroup = ({ rotation, type, group }: { rotation: number; type: EquipmentType; group: StrobeGroup }) => {
  if (!TYPE_META[type].isLight) return null;
  const len = 120, half = 28;
  const rad = (rotation * Math.PI) / 180;
  const lRad = ((rotation - half) * Math.PI) / 180;
  const rRad = ((rotation + half) * Math.PI) / 180;
  const ox = 0, oy = 0;
  const lx = ox + Math.cos(lRad) * len, ly = oy + Math.sin(lRad) * len;
  const rx = ox + Math.cos(rRad) * len, ry = oy + Math.sin(rRad) * len;
  const ex = ox + Math.cos(rad) * len, ey = oy + Math.sin(rad) * len;
  const gc = group ? G_CLR[group].cone : "rgba(232,168,73,0.18)";
  return (
    <svg className="absolute pointer-events-none" style={{ left: 0, top: 0, width: 1, height: 1, overflow: "visible", zIndex: 1 }}>
      <polygon points={`${ox},${oy} ${lx},${ly} ${rx},${ry}`} fill={gc} stroke="none" />
      <line x1={ox} y1={oy} x2={ex} y2={ey} stroke={gc} strokeWidth={1} opacity={0.5} />
    </svg>
  );
};

/* ============================================================
   タイルグリッド
============================================================ */
const Tiles = ({ layout: l, preset: p }: { layout: ReturnType<typeof calc>; preset: StudioPreset }) => {
  if (!p.showTiles) return null;
  const lines: React.ReactNode[] = [];
  const cols = Math.floor(p.floorW / p.tile);
  const rows = Math.floor(p.floorH / p.tile);
  for (let i = 0; i <= cols; i++) {
    const x = l.sidePx + i * l.tilePx;
    lines.push(<div key={`c${i}`} className="absolute" style={{ left: x, top: 0, width: 0.5, height: l.floorPxH, background: C.gridLine }} />);
  }
  for (let j = 0; j <= rows; j++) {
    const y = j * l.tilePx;
    lines.push(<div key={`r${j}`} className="absolute" style={{ left: l.sidePx, top: y, width: l.floorPx, height: 0.5, background: C.gridLine }} />);
  }
  return <>{lines}</>;
};

/* ============================================================
   Opts ボタン
============================================================ */
const Opts = ({ options, value, onChange, cols = 4 }: { options: string[]; value: string; onChange: (v: string) => void; cols?: number }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 4 }}>
    {options.map(o => (
      <button key={o} onClick={() => onChange(o)} style={{ padding: "4px 0", fontSize: 11, fontWeight: value === o ? 700 : 400, borderRadius: 6, border: "none", cursor: "pointer", background: value === o ? C.accent : C.card, color: value === o ? "#000" : C.textSub, transition: "all .15s" }}>{o}</button>
    ))}
  </div>
);

/* ============================================================
   メインコンポーネント
============================================================ */
export default function Home() {
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const preset = PRESETS.find(p => p.id === presetId) || PRESETS[0];
  const layout = calc(preset);

  const [itemsMap, setItemsMap] = useState<Record<string, Equipment[]>>(() => {
    const m: Record<string, Equipment[]> = {};
    PRESETS.forEach(p => (m[p.id] = makeInit(p)));
    return m;
  });
  const items = itemsMap[presetId] || [];
  const setItems = useCallback(
    (fn: (prev: Equipment[]) => Equipment[]) => setItemsMap(m => ({ ...m, [presetId]: fn(m[presetId] || []) })),
    [presetId]
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"studio" | "settings">("studio");
  const sel = items.find(i => i.id === selectedId) || null;
  const [cam, setCam] = useState<CameraSettings>({ aperture: "F5.6", shutter: "1/125", iso: "100" });

  const stuRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; ox: number; oy: number } | null>(null);

  /* --- ドラッグ（元のコードと同じ方式：stuRef内イベント） --- */
  const startDrag = useCallback((id: string, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const pt = "touches" in e ? e.touches[0] : e;
    dragRef.current = { id, ox: pt.clientX, oy: pt.clientY };
  }, []);

  const onMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!dragRef.current) return;
    const pt = "touches" in e ? e.touches[0] : e;
    const dx = pt.clientX - dragRef.current.ox;
    const dy = pt.clientY - dragRef.current.oy;
    dragRef.current.ox = pt.clientX;
    dragRef.current.oy = pt.clientY;
    const did = dragRef.current.id;
    setItems(prev => prev.map(i => (i.id === did ? { ...i, x: i.x + dx, y: i.y + dy } : i)));
  }, [setItems]);

  const stopDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  /* --- CRUD --- */
  const addItem = (type: EquipmentType) => {
    const meta = TYPE_META[type];
    const item: Equipment = {
      id: uid(), type, label: meta.defaultLabel,
      x: layout.sidePx + layout.floorPx * 0.5, y: layout.floorPxH * 0.5,
      rotation: 0, tilt: 0,
      power: meta.isLight ? "1/4" : "—",
      height: meta.isLight ? 200 : 0,
      group: meta.isLight ? "A" : null,
    };
    setItems(prev => [...prev, item]);
    setSelectedId(item.id);
  };
  const removeItem = (id: string) => { setItems(prev => prev.filter(i => i.id !== id)); if (selectedId === id) setSelectedId(null); };
  const updateItem = (id: string, patch: Partial<Equipment>) => { setItems(prev => prev.map(i => (i.id === id ? { ...i, ...patch } : i))); };

  /* --- 保存/読込 --- */
  const saveData = () => { localStorage.setItem("lighting-planner", JSON.stringify({ itemsMap, cam, presetId })); alert("保存しました"); };
  const loadData = () => {
    const raw = localStorage.getItem("lighting-planner");
    if (!raw) { alert("データがありません"); return; }
    try { const d = JSON.parse(raw); if (d.itemsMap) setItemsMap(d.itemsMap); if (d.cam) setCam(d.cam); if (d.presetId) setPresetId(d.presetId); alert("読み込みました"); } catch { alert("読み込み失敗"); }
  };

  /* --- PDF出力 --- */
  const printPDF = () => {
    const marginEl = document.querySelector("[data-print-margin]") as HTMLElement | null;
    const marginLabel = document.querySelector("[data-print-margin-label]") as HTMLElement | null;
    const studioEl = document.querySelector("[data-studio]") as HTMLElement | null;
    const origH = studioEl?.style.height || "";
    if (marginEl) marginEl.style.display = "none";
    if (marginLabel) marginLabel.style.display = "none";
    if (studioEl) studioEl.style.height = layout.floorPxH + "px";

    const lightItems = items.filter(i => TYPE_META[i.type].isLight);
    const strobeRows = lightItems.map(it => {
      const tLabel = TYPE_META[it.type].defaultLabel;
      const gC = it.group ? G_CLR[it.group].dot : "#888";
      const tiltStr = it.tilt !== 0 ? `${it.tilt > 0 ? "↑" : "↓"}${Math.abs(it.tilt)}°` : "";
      return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #E8E4DD;">
        <div style="width:10px;height:10px;border-radius:50%;background:${gC};flex-shrink:0;"></div>
        <div style="flex:1;"><div style="font-size:12px;font-weight:700;color:#2C2C2E;">${it.label}</div><div style="font-size:9px;color:#8E8E93;">${tLabel}</div></div>
        <div style="font-size:12px;font-weight:700;color:#2C2C2E;">${it.power}</div>
        ${tiltStr ? `<div style="font-size:10px;color:#8E8E93;">${tiltStr}</div>` : ""}
        <div style="font-size:10px;font-weight:700;color:${gC};">${it.group || "—"}</div>
      </div>`;
    }).join("");

    const clone = studioEl ? studioEl.cloneNode(true) as HTMLElement : null;
    const overlay = document.createElement("div");
    overlay.id = "print-overlay";
    overlay.style.cssText = "display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background:white;z-index:99999;padding:16px;box-sizing:border-box;";
    overlay.innerHTML = `
      <div style="display:flex;gap:16px;height:100%;align-items:flex-start;">
        <div id="print-studio-slot" style="flex:1;overflow:hidden;padding:12px;"></div>
        <div style="width:280px;flex-shrink:0;background:#F7F5F0;border-left:2px solid #E8E4DD;padding:20px 16px;border-radius:0 16px 16px 0;height:100%;box-sizing:border-box;overflow:auto;">
          <div style="margin-bottom:16px;"><div style="font-size:18px;font-weight:800;color:#2C2C2E;">${preset.name}</div><div style="font-size:10px;color:#8E8E93;margin-top:2px;">${new Date().toLocaleDateString("ja-JP")} ｜ ${preset.floorW}×${preset.floorH}mm</div></div>
          <div style="font-size:10px;font-weight:700;color:#8E8E93;letter-spacing:0.08em;margin-bottom:8px;">CAMERA</div>
          <div style="background:white;border-radius:16px;padding:16px 20px;box-shadow:0 1px 4px rgba(0,0,0,0.04);">
            <div style="display:flex;justify-content:space-around;margin-bottom:10px;">
              <div style="text-align:center;flex:1;"><div style="font-size:9px;font-weight:700;color:#8E8E93;margin-bottom:2px;">F</div><div style="font-size:26px;font-weight:800;color:#E8A849;line-height:1.1;">${cam.aperture}</div></div>
              <div style="width:1px;background:#E8E4DD;"></div>
              <div style="text-align:center;flex:1;"><div style="font-size:9px;font-weight:700;color:#8E8E93;margin-bottom:2px;">SS</div><div style="font-size:26px;font-weight:800;color:#E8A849;line-height:1.1;">${cam.shutter}</div></div>
            </div>
            <div style="border-top:1px solid #E8E4DD;padding-top:10px;text-align:center;">
              <div style="font-size:9px;font-weight:700;color:#8E8E93;margin-bottom:2px;">ISO</div>
              <div style="font-size:26px;font-weight:800;color:#E8A849;line-height:1.1;">${cam.iso}</div>
            </div>
          </div>
          ${lightItems.length > 0 ? `<div style="margin-top:20px;"><div style="font-size:10px;font-weight:700;color:#8E8E93;letter-spacing:0.08em;margin-bottom:8px;">STROBE (${lightItems.length})</div><div>${strobeRows}</div></div>` : ""}
        </div>
      </div>`;

    document.body.appendChild(overlay);
    if (clone) { clone.style.transform = "scale(0.95)"; clone.style.transformOrigin = "top left"; const slot = document.getElementById("print-studio-slot"); if (slot) slot.appendChild(clone); }
    window.print();
    document.body.removeChild(overlay);
    if (marginEl) marginEl.style.display = "";
    if (marginLabel) marginLabel.style.display = "";
    if (studioEl) studioEl.style.height = origH;
  };

  const switchPreset = (id: string) => { setPresetId(id); setSelectedId(null); };
  const isLight = sel ? TYPE_META[sel.type].isLight : false;

  /* ============================================================
     JSX
  ============================================================ */
  return (
    <div className="flex flex-col h-screen" style={{ background: C.bg, color: C.text, fontFamily: "'Inter','Noto Sans JP',sans-serif" }}>
      {/* ヘッダー */}
      <header className="print:hidden flex items-center justify-between px-4 py-2 border-b" style={{ background: C.card, borderColor: C.border }}>
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 18, fontWeight: 800, color: C.accent }}>Lighting Planner</span>
          <div className="hidden sm:flex gap-1 ml-4">
            {PRESETS.map(p => (<button key={p.id} onClick={() => switchPreset(p.id)} style={{ padding: "4px 12px", fontSize: 12, fontWeight: presetId === p.id ? 700 : 400, borderRadius: 8, border: "none", cursor: "pointer", background: presetId === p.id ? C.accent : "transparent", color: presetId === p.id ? "#000" : C.textSub }}>{p.name}</button>))}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={saveData} style={{ padding: "4px 12px", fontSize: 12, borderRadius: 8, border: "none", cursor: "pointer", background: C.cardHover, color: C.text }}>保存</button>
          <button onClick={loadData} style={{ padding: "4px 12px", fontSize: 12, borderRadius: 8, border: "none", cursor: "pointer", background: C.cardHover, color: C.text }}>読込</button>
          <button onClick={printPDF} style={{ padding: "4px 12px", fontSize: 12, borderRadius: 8, border: "none", cursor: "pointer", background: C.accent, color: "#000", fontWeight: 700 }}>PDF</button>
        </div>
      </header>

      {/* モバイルタブ */}
      <div className="sm:hidden flex border-b print:hidden" style={{ borderColor: C.border }}>
        {(["studio", "settings"] as const).map(tab => (<button key={tab} onClick={() => setMobileTab(tab)} style={{ flex: 1, padding: "8px 0", fontSize: 13, fontWeight: mobileTab === tab ? 700 : 400, background: mobileTab === tab ? C.card : "transparent", color: mobileTab === tab ? C.accent : C.textSub, border: "none", cursor: "pointer", borderBottom: mobileTab === tab ? `2px solid ${C.accent}` : "2px solid transparent" }}>{tab === "studio" ? "配置図" : "設定"}</button>))}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 左サイドバー */}
        <aside className="hidden sm:block print:hidden overflow-y-auto" style={{ width: 208, background: C.card, borderRight: `1px solid ${C.border}`, padding: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.textSub, letterSpacing: "0.08em", marginBottom: 8 }}>機材追加</div>
          <div className="grid grid-cols-2 gap-1">
            {ADDABLE.map(t => (<button key={t} onClick={() => addItem(t)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "6px 0", fontSize: 9, borderRadius: 8, border: "none", cursor: "pointer", background: "transparent", color: C.textSub, transition: "background .15s" }} onMouseEnter={e => (e.currentTarget.style.background = C.cardHover)} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}><Icon type={t} size={20} /><span>{TYPE_META[t].defaultLabel}</span></button>))}
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.textSub, letterSpacing: "0.08em", marginTop: 16, marginBottom: 8 }}>配置済み</div>
          <div className="space-y-1">
            {items.map(it => (<div key={it.id} onClick={() => setSelectedId(it.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 6px", fontSize: 11, borderRadius: 6, cursor: "pointer", background: selectedId === it.id ? C.accent + "22" : "transparent", color: selectedId === it.id ? C.accent : C.text }}><Icon type={it.type} size={16} /><span style={{ flex: 1 }}>{it.label}</span><button onClick={e => { e.stopPropagation(); removeItem(it.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: C.textSub, fontSize: 14, lineHeight: 1 }}>×</button></div>))}
          </div>
        </aside>

        {/* ===== スタジオ ===== */}
        <main className={`flex-1 overflow-auto flex items-start justify-center p-4 ${mobileTab !== "studio" ? "hidden sm:flex" : ""}`}>
          <div className="rounded-2xl" style={{ background: C.card, padding: 12, boxShadow: "0 2px 20px rgba(0,0,0,0.06)" }}>
            <div
              ref={stuRef}
              className="relative overflow-visible"
              data-studio
              style={{ width: layout.totalPx, height: layout.totalPxH }}
              onMouseMove={onMove}
              onMouseUp={stopDrag}
              onMouseLeave={stopDrag}
              onTouchMove={onMove}
              onTouchEnd={stopDrag}
            >
              {/* 機材エリア（左サイド） */}
              <div className="absolute top-0 left-0" style={{ width: layout.sidePx, height: layout.floorPxH, background: preset.sideColor, borderRadius: "12px 0 0 0" }} />
              {/* 撮影エリア */}
              <div className="absolute top-0" style={{ left: layout.sidePx, width: layout.floorPx, height: layout.floorPxH, background: preset.floorColor, borderRadius: "0 12px 0 0" }} />
              {/* 余白エリア */}
              <div data-print-margin className="absolute" style={{ left: 0, top: layout.floorPxH, width: layout.totalPx, height: layout.marginPxH, background: C.margin, borderRadius: "0 0 12px 12px" }} />

              {/* 境界線 */}
              <div className="absolute top-0" style={{ left: layout.sidePx - 0.5, width: 1, height: layout.floorPxH, background: "#A09888", opacity: 0.5 }} />
              <div className="absolute" style={{ left: 0, top: layout.floorPxH - 0.5, width: layout.totalPx, height: 1, background: "#A09888", opacity: 0.5 }} />

              {/* エリアラベル */}
              <div className="absolute" style={{ left: 8, top: 8, fontSize: 9, fontWeight: 700, color: "#A09888" }}>機材エリア</div>
              <div className="absolute" style={{ left: layout.sidePx + 8, top: 8, fontSize: 9, fontWeight: 700, color: "#A09888" }}>撮影エリア</div>
              <div data-print-margin-label className="absolute" style={{ left: 8, top: layout.floorPxH + 8, fontSize: 9, fontWeight: 700, color: "#A09888" }}>余白</div>

              {/* タイルグリッド */}
              <Tiles layout={layout} preset={preset} />

              {/* 機材チップ */}
              {items.map(item => {
                const isSel = selectedId === item.id;
                const isRef = item.type === "ref-white" || item.type === "ref-black";
                const tiltStr = TYPE_META[item.type].isLight && item.tilt !== 0 ? ` ${item.tilt > 0 ? "↑" : "↓"}${Math.abs(item.tilt)}°` : "";
                return (
                  <div key={item.id} className="absolute z-10" style={{ left: item.x, top: item.y, width: "max-content", minWidth: "max-content" }}>
                    {/* 光コーン */}
                    <ConeWithGroup rotation={item.rotation} type={item.type} group={item.group} />
                    {/* チップ本体 */}
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
                        ...(isRef ? { transform: `rotate(${item.rotation}deg)`, transformOrigin: "center center" } : {}),
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span style={{ color: isSel ? C.accent : C.textSub }}><Icon type={item.type} size={20} /></span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: isSel ? C.text : C.textSub }}>
                          {item.label}{tiltStr}
                        </span>
                        {item.group && (
                          <span style={{
                            width: 8, height: 8, borderRadius: "50%",
                            background: G_CLR[item.group].dot,
                            boxShadow: `0 0 6px ${G_CLR[item.group].dot}55`,
                          }} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>

        {/* ===== 右パネル ===== */}
        <aside className={`overflow-y-auto print:hidden ${mobileTab !== "settings" ? "hidden sm:block" : "w-full sm:w-auto"}`} style={{ width: mobileTab === "settings" ? "100%" : 220, minWidth: 220, background: C.card, borderLeft: `1px solid ${C.border}`, padding: 16 }}>
          {/* モバイル用 */}
          <div className="sm:hidden" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.textSub, letterSpacing: "0.08em", marginBottom: 6 }}>スタジオ</div>
            <div className="flex gap-1 mb-3">{PRESETS.map(p => (<button key={p.id} onClick={() => switchPreset(p.id)} style={{ padding: "4px 12px", fontSize: 12, fontWeight: presetId === p.id ? 700 : 400, borderRadius: 8, border: "none", cursor: "pointer", background: presetId === p.id ? C.accent : C.cardHover, color: presetId === p.id ? "#000" : C.textSub }}>{p.name}</button>))}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.textSub, letterSpacing: "0.08em", marginBottom: 6 }}>機材追加</div>
            <div className="flex flex-wrap gap-1 mb-3">{ADDABLE.map(t => (<button key={t} onClick={() => addItem(t)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", fontSize: 10, borderRadius: 6, border: "none", cursor: "pointer", background: C.cardHover, color: C.textSub }}><Icon type={t} size={14} />{TYPE_META[t].defaultLabel}</button>))}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.textSub, letterSpacing: "0.08em", marginBottom: 6 }}>配置済み</div>
            <div className="space-y-1 mb-4">{items.map(it => (<div key={it.id} onClick={() => { setSelectedId(it.id); setMobileTab("settings"); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 6px", fontSize: 11, borderRadius: 6, cursor: "pointer", background: selectedId === it.id ? C.accent + "22" : "transparent", color: selectedId === it.id ? C.accent : C.text }}><Icon type={it.type} size={16} /><span style={{ flex: 1 }}>{it.label}</span><button onClick={e => { e.stopPropagation(); removeItem(it.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: C.textSub, fontSize: 14, lineHeight: 1 }}>×</button></div>))}</div>
          </div>

          {/* カメラ設定 */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.textSub, letterSpacing: "0.08em", marginBottom: 8 }}>CAMERA</div>
            <div className="space-y-3">
              <div><div style={{ fontSize: 10, color: C.textSub, marginBottom: 4 }}>絞り</div><Opts options={F_OPT} value={cam.aperture} onChange={v => setCam(c => ({ ...c, aperture: v }))} cols={5} /></div>
              <div><div style={{ fontSize: 10, color: C.textSub, marginBottom: 4 }}>SS</div><Opts options={SS_OPT} value={cam.shutter} onChange={v => setCam(c => ({ ...c, shutter: v }))} cols={5} /></div>
              <div><div style={{ fontSize: 10, color: C.textSub, marginBottom: 4 }}>ISO</div><Opts options={ISO_OPT} value={cam.iso} onChange={v => setCam(c => ({ ...c, iso: v }))} cols={3} /></div>
            </div>
          </div>

          {/* 選択中の機材 */}
          {sel ? (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textSub, letterSpacing: "0.08em", marginBottom: 8 }}>{isLight ? "STROBE" : "EQUIPMENT"}</div>
              <div style={{ marginBottom: 12 }}><div style={{ fontSize: 10, color: C.textSub, marginBottom: 4 }}>ラベル</div><input value={sel.label} onChange={e => updateItem(sel.id, { label: e.target.value })} style={{ width: "100%", padding: "4px 8px", fontSize: 12, borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, outline: "none" }} /></div>
              {isLight && (<>
                <div style={{ marginBottom: 12 }}><div style={{ fontSize: 10, color: C.textSub, marginBottom: 4 }}>向き ({sel.rotation}°)</div><input type="range" min={-180} max={180} value={sel.rotation} onChange={e => updateItem(sel.id, { rotation: Number(e.target.value) })} style={{ width: "100%", accentColor: C.accent }} /></div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: C.textSub, marginBottom: 4 }}>上下 ({sel.tilt > 0 ? "↑" : sel.tilt < 0 ? "↓" : ""}{sel.tilt !== 0 ? `${Math.abs(sel.tilt)}°` : "0°"})</div>
                  <input type="range" min={-90} max={90} value={sel.tilt} onChange={e => updateItem(sel.id, { tilt: Number(e.target.value) })} style={{ width: "100%", accentColor: C.accent }} />
                  <div style={{ marginTop: 6, height: 30, position: "relative", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                    <div style={{ width: 60, height: 1, background: C.textSub, position: "absolute", bottom: 4 }} />
                    <div style={{ width: 2, height: 24, background: C.accent, transformOrigin: "bottom center", transform: `rotate(${-sel.tilt}deg)`, position: "absolute", bottom: 4, borderRadius: 1 }} />
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}><div style={{ fontSize: 10, color: C.textSub, marginBottom: 4 }}>パワー</div><Opts options={POWER_OPT} value={sel.power} onChange={v => updateItem(sel.id, { power: v })} cols={4} /></div>
                <div style={{ marginBottom: 12 }}><div style={{ fontSize: 10, color: C.textSub, marginBottom: 4 }}>グループ</div><div className="flex gap-1">{GROUPS.map(g => (<button key={g || "none"} onClick={() => updateItem(sel.id, { group: g })} style={{ flex: 1, padding: "4px 0", fontSize: 12, fontWeight: sel.group === g ? 700 : 400, borderRadius: 6, border: "none", cursor: "pointer", background: sel.group === g ? (g ? G_CLR[g].dot : C.textSub) : C.bg, color: sel.group === g ? "#000" : C.textSub }}>{g || "—"}</button>))}</div></div>
              </>)}
              <button onClick={() => removeItem(sel.id)} style={{ width: "100%", padding: "8px 0", fontSize: 12, fontWeight: 700, borderRadius: 8, border: "none", cursor: "pointer", background: "#FF453A22", color: "#FF453A", marginTop: 8 }}>削除</button>
            </div>
          ) : (<div style={{ fontSize: 12, color: C.textSub, textAlign: "center", marginTop: 20 }}>機材を選択してください</div>)}
        </aside>
      </div>
    </div>
  );
}
