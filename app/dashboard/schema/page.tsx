"use client";

import { useState, useCallback, useRef, useEffect } from "react";

// ─── Schema Data ────────────────────────────────────────────────────────────

interface Column {
  name: string;
  type: string;
  pk?: boolean;
  fk?: boolean;
  unique?: boolean;
  optional?: boolean;
  enumValues?: string[];
}

interface Table {
  name: string;
  columns: Column[];
}

interface Relation {
  from: string;
  fromCol: string;
  to: string;
  toCol: string;
  label: string;
}

const tables: Table[] = [
  {
    name: "User",
    columns: [
      { name: "id", type: "String", pk: true },
      { name: "email", type: "String", unique: true },
      { name: "grade", type: "Int" },
      { name: "createdAt", type: "DateTime" },
    ],
  },
  {
    name: "Subject",
    columns: [
      { name: "id", type: "String", pk: true },
      { name: "userId", type: "String", fk: true },
      { name: "name", type: "String" },
      { name: "createdAt", type: "DateTime" },
    ],
  },
  {
    name: "Theme",
    columns: [
      { name: "id", type: "String", pk: true },
      { name: "subjectId", type: "String", fk: true },
      { name: "name", type: "String" },
      { name: "createdAt", type: "DateTime" },
    ],
  },
  {
    name: "Material",
    columns: [
      { name: "id", type: "String", pk: true },
      { name: "themeId", type: "String", fk: true },
      { name: "type", type: "MaterialType", enumValues: ["SUMMARY", "FLASHCARD", "TEST"] },
      { name: "content", type: "Json" },
      { name: "createdAt", type: "DateTime" },
    ],
  },
  {
    name: "Flashcard",
    columns: [
      { name: "id", type: "String", pk: true },
      { name: "materialId", type: "String", fk: true },
      { name: "front", type: "String" },
      { name: "back", type: "String" },
    ],
  },
  {
    name: "TestQuestion",
    columns: [
      { name: "id", type: "String", pk: true },
      { name: "materialId", type: "String", fk: true },
      { name: "question", type: "String" },
      { name: "options", type: "String[]" },
      { name: "correctAnswer", type: "String" },
      { name: "explanation", type: "String", optional: true },
    ],
  },
  {
    name: "TestAttempt",
    columns: [
      { name: "id", type: "String", pk: true },
      { name: "materialId", type: "String", fk: true },
      { name: "userId", type: "String", fk: true },
      { name: "score", type: "Int" },
      { name: "answers", type: "Json" },
      { name: "completedAt", type: "DateTime" },
    ],
  },
  {
    name: "UploadedFile",
    columns: [
      { name: "id", type: "String", pk: true },
      { name: "userId", type: "String", fk: true },
      { name: "themeId", type: "String", fk: true, optional: true },
      { name: "filename", type: "String" },
      { name: "url", type: "String" },
      { name: "mimeType", type: "String" },
      { name: "sizeBytes", type: "Int" },
      { name: "createdAt", type: "DateTime" },
    ],
  },
];

const relations: Relation[] = [
  { from: "Subject", fromCol: "userId", to: "User", toCol: "id", label: "1 : N" },
  { from: "Theme", fromCol: "subjectId", to: "Subject", toCol: "id", label: "1 : N" },
  { from: "Material", fromCol: "themeId", to: "Theme", toCol: "id", label: "1 : N" },
  { from: "Flashcard", fromCol: "materialId", to: "Material", toCol: "id", label: "1 : N" },
  { from: "TestQuestion", fromCol: "materialId", to: "Material", toCol: "id", label: "1 : N" },
  { from: "TestAttempt", fromCol: "materialId", to: "Material", toCol: "id", label: "1 : N" },
  { from: "TestAttempt", fromCol: "userId", to: "User", toCol: "id", label: "1 : N" },
  { from: "UploadedFile", fromCol: "userId", to: "User", toCol: "id", label: "1 : N" },
  { from: "UploadedFile", fromCol: "themeId", to: "Theme", toCol: "id", label: "1 : N" },
];

// ─── Initial Positions (hierarchical layout) ───────────────────────────────

const CARD_W = 260;
const CARD_GAP_X = 100;
const CARD_GAP_Y = 80;

function initialPositions(): Record<string, { x: number; y: number }> {
  // Layer 0: User
  // Layer 1: Subject, UploadedFile, TestAttempt
  // Layer 2: Theme
  // Layer 3: Material
  // Layer 4: Flashcard, TestQuestion
  const layers: string[][] = [
    ["User"],
    ["Subject", "TestAttempt", "UploadedFile"],
    ["Theme"],
    ["Material"],
    ["Flashcard", "TestQuestion"],
  ];

  const positions: Record<string, { x: number; y: number }> = {};
  layers.forEach((layer, li) => {
    const totalWidth = layer.length * CARD_W + (layer.length - 1) * CARD_GAP_X;
    const startX = (1400 - totalWidth) / 2;
    layer.forEach((name, i) => {
      positions[name] = {
        x: startX + i * (CARD_W + CARD_GAP_X),
        y: 40 + li * (200 + CARD_GAP_Y),
      };
    });
  });
  return positions;
}

// ─── Badge Component ────────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
  const colors: Record<string, string> = {
    amber: "bg-amber-100 text-amber-800 border-amber-300",
    blue: "bg-blue-100 text-blue-800 border-blue-300",
    green: "bg-green-100 text-green-800 border-green-300",
    gray: "bg-gray-100 text-gray-500 border-gray-300",
  };
  return (
    <span
      className={`inline-block px-1.5 py-0.5 text-[10px] font-semibold leading-none rounded border ${colors[color] ?? colors.gray}`}
    >
      {label}
    </span>
  );
}

// ─── Enum Tooltip ───────────────────────────────────────────────────────────

function EnumChip({ values }: { values: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="inline-block px-1.5 py-0.5 text-[10px] font-semibold leading-none rounded border bg-purple-100 text-purple-800 border-purple-300 cursor-pointer"
      >
        enum ▾
      </button>
      {open && (
        <span className="absolute left-0 top-5 z-50 rounded border border-purple-300 bg-white shadow-lg px-2 py-1.5 text-[11px] text-purple-900 whitespace-nowrap">
          {values.join(" | ")}
        </span>
      )}
    </span>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function SchemaPage() {
  const [positions, setPositions] = useState(initialPositions);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hoveredRel, setHoveredRel] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // ── Drag handlers ──
  const onCardMouseDown = useCallback(
    (tableName: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const pos = positions[tableName];
      setDragging(tableName);
      setDragOffset({ x: e.clientX / zoom - pos.x, y: e.clientY / zoom - pos.y });
    },
    [positions, zoom]
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (dragging) {
        setPositions((prev) => ({
          ...prev,
          [dragging]: {
            x: e.clientX / zoom - dragOffset.x,
            y: e.clientY / zoom - dragOffset.y,
          },
        }));
      } else if (panning) {
        setPan((prev) => ({
          x: prev.x + e.clientX - panStart.x,
          y: prev.y + e.clientY - panStart.y,
        }));
        setPanStart({ x: e.clientX, y: e.clientY });
      }
    },
    [dragging, dragOffset, zoom, panning, panStart]
  );

  const onMouseUp = useCallback(() => {
    setDragging(null);
    setPanning(false);
  }, []);

  // ── Pan (background drag) ──
  const onBgMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === "svg") {
      setPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, []);

  // ── Zoom ──
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(2, Math.max(0.3, z - e.deltaY * 0.001)));
  }, []);

  // attach non-passive wheel listener
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => Math.min(2, Math.max(0.3, z - e.deltaY * 0.001)));
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  // ── Compute line endpoints ──
  function getRowCenter(tableName: string, colName: string, side: "left" | "right") {
    const key = `${tableName}.${colName}`;
    const el = rowRefs.current[key];
    const canvas = canvasRef.current;
    if (!el || !canvas) return { x: 0, y: 0 };

    const pos = positions[tableName];
    const cardEl = el.closest("[data-table]") as HTMLElement | null;
    if (!cardEl) return { x: 0, y: 0 };

    const rowRect = el.getBoundingClientRect();
    const cardRect = cardEl.getBoundingClientRect();

    const relY = (rowRect.top - cardRect.top + rowRect.height / 2) / zoom;
    const x = side === "right" ? pos.x + CARD_W : pos.x;
    const y = pos.y + relY;
    return { x, y };
  }

  // force re-render for SVG lines after mount
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => forceUpdate((n) => n + 1), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden" style={{ background: "var(--color-cream)" }}>
      {/* Header */}
      <div
        className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-3"
        style={{
          background: "var(--color-card)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div>
          <h1
            className="text-xl font-semibold"
            style={{ fontFamily: "var(--font-lora), 'Lora', serif", color: "var(--color-text-primary)" }}
          >
            Database Schema
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
            {tables.length} tables &middot; {relations.length} relationships &middot; Drag to
            rearrange &middot; Scroll to zoom
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom((z) => Math.min(2, z + 0.15))}
            className="w-8 h-8 rounded flex items-center justify-center text-sm font-bold cursor-pointer"
            style={{
              background: "var(--color-btn-primary)",
              color: "var(--color-btn-text)",
            }}
          >
            +
          </button>
          <span className="text-xs w-12 text-center" style={{ color: "var(--color-text-secondary)" }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.max(0.3, z - 0.15))}
            className="w-8 h-8 rounded flex items-center justify-center text-sm font-bold cursor-pointer"
            style={{
              background: "var(--color-btn-primary)",
              color: "var(--color-btn-text)",
            }}
          >
            −
          </button>
          <button
            onClick={() => {
              setPositions(initialPositions());
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="ml-2 px-3 py-1.5 rounded text-xs font-medium cursor-pointer"
            style={{
              border: "1px solid var(--color-border)",
              color: "var(--color-text-secondary)",
              background: "transparent",
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="absolute inset-0 pt-14 cursor-grab active:cursor-grabbing"
        onMouseDown={onBgMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ userSelect: "none" }}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            position: "relative",
            width: "3000px",
            height: "2000px",
          }}
        >
          {/* SVG relationship lines */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width="3000"
            height="2000"
            style={{ zIndex: 0 }}
          >
            {relations.map((rel, ri) => {
              const fromPos = positions[rel.from];
              const toPos = positions[rel.to];
              if (!fromPos || !toPos) return null;

              const isHighlighted = hoveredRel === ri;

              // Determine which side to connect from
              const fromRight = fromPos.x < toPos.x;
              const from = getRowCenter(rel.from, rel.fromCol, fromRight ? "right" : "left");
              const to = getRowCenter(rel.to, rel.toCol, fromRight ? "left" : "right");

              if (from.x === 0 && from.y === 0) {
                // fallback before refs are ready
                const fCenter = { x: fromPos.x + CARD_W / 2, y: fromPos.y + 60 };
                const tCenter = { x: toPos.x + CARD_W / 2, y: toPos.y + 20 };
                const mx = (fCenter.x + tCenter.x) / 2;
                return (
                  <g key={ri}>
                    <path
                      d={`M${fCenter.x},${fCenter.y} C${mx},${fCenter.y} ${mx},${tCenter.y} ${tCenter.x},${tCenter.y}`}
                      fill="none"
                      stroke={isHighlighted ? "#a08050" : "rgba(160,130,80,0.35)"}
                      strokeWidth={isHighlighted ? 2.5 : 1.5}
                    />
                  </g>
                );
              }

              const dx = to.x - from.x;
              const cpOffset = Math.min(Math.abs(dx) * 0.5, 120);
              const cp1x = from.x + (fromRight ? cpOffset : -cpOffset);
              const cp2x = to.x + (fromRight ? -cpOffset : cpOffset);

              const midX = (from.x + to.x) / 2;
              const midY = (from.y + to.y) / 2;

              return (
                <g key={ri}>
                  <path
                    d={`M${from.x},${from.y} C${cp1x},${from.y} ${cp2x},${to.y} ${to.x},${to.y}`}
                    fill="none"
                    stroke={isHighlighted ? "#a08050" : "rgba(160,130,80,0.3)"}
                    strokeWidth={isHighlighted ? 2.5 : 1.5}
                    strokeDasharray={isHighlighted ? "none" : "none"}
                  />
                  {/* Cardinality label */}
                  <rect
                    x={midX - 18}
                    y={midY - 9}
                    width="36"
                    height="18"
                    rx="4"
                    fill={isHighlighted ? "#a08050" : "rgba(160,130,80,0.12)"}
                    stroke={isHighlighted ? "#a08050" : "rgba(160,130,80,0.3)"}
                    strokeWidth="0.5"
                  />
                  <text
                    x={midX}
                    y={midY + 4}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="600"
                    fill={isHighlighted ? "#fff" : "#8a7560"}
                  >
                    {rel.label}
                  </text>
                  {/* "1" side marker (the target/parent) */}
                  <circle
                    cx={to.x}
                    cy={to.y}
                    r={3}
                    fill={isHighlighted ? "#a08050" : "rgba(160,130,80,0.5)"}
                  />
                  {/* "N" side marker (the child FK) */}
                  {/* crow's foot: three short lines */}
                  {(() => {
                    const angle = Math.atan2(from.y - to.y, from.x - to.x);
                    const len = 8;
                    const spread = Math.PI / 6;
                    const color = isHighlighted ? "#a08050" : "rgba(160,130,80,0.5)";
                    return (
                      <>
                        <line
                          x1={from.x}
                          y1={from.y}
                          x2={from.x + len * Math.cos(angle + spread)}
                          y2={from.y + len * Math.sin(angle + spread)}
                          stroke={color}
                          strokeWidth="1.5"
                        />
                        <line
                          x1={from.x}
                          y1={from.y}
                          x2={from.x + len * Math.cos(angle)}
                          y2={from.y + len * Math.sin(angle)}
                          stroke={color}
                          strokeWidth="1.5"
                        />
                        <line
                          x1={from.x}
                          y1={from.y}
                          x2={from.x + len * Math.cos(angle - spread)}
                          y2={from.y + len * Math.sin(angle - spread)}
                          stroke={color}
                          strokeWidth="1.5"
                        />
                      </>
                    );
                  })()}
                </g>
              );
            })}
          </svg>

          {/* Table cards */}
          {tables.map((table) => {
            const pos = positions[table.name];
            if (!pos) return null;

            return (
              <div
                key={table.name}
                data-table={table.name}
                className="absolute rounded shadow-md select-none"
                style={{
                  left: pos.x,
                  top: pos.y,
                  width: CARD_W,
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  zIndex: dragging === table.name ? 20 : 10,
                  cursor: dragging === table.name ? "grabbing" : "grab",
                  boxShadow:
                    dragging === table.name
                      ? "0 8px 32px rgba(100,80,40,0.18)"
                      : "0 1px 4px rgba(100,80,40,0.08)",
                  transition: dragging === table.name ? "none" : "box-shadow 0.2s",
                }}
                onMouseDown={(e) => onCardMouseDown(table.name, e)}
              >
                {/* Table header */}
                <div
                  className="px-3 py-2 rounded-t flex items-center gap-2"
                  style={{
                    background: "var(--color-btn-primary)",
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400 opacity-80" />
                  <span
                    className="text-sm font-semibold tracking-wide"
                    style={{
                      fontFamily: "var(--font-lora), 'Lora', serif",
                      color: "var(--color-btn-text)",
                    }}
                  >
                    {table.name}
                  </span>
                </div>

                {/* Columns */}
                <div className="divide-y" style={{ borderColor: "rgba(180,160,120,0.15)" }}>
                  {table.columns.map((col) => {
                    // Find if this column is an FK in any relation
                    const relIndex = relations.findIndex(
                      (r) => r.from === table.name && r.fromCol === col.name
                    );
                    // Also check if this is a target PK
                    const targetRelIndex = relations.findIndex(
                      (r) => r.to === table.name && r.toCol === col.name
                    );
                    const isHovered = hoveredRel !== null && (hoveredRel === relIndex || hoveredRel === targetRelIndex);

                    return (
                      <div
                        key={col.name}
                        ref={(el) => {
                          rowRefs.current[`${table.name}.${col.name}`] = el;
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors duration-150"
                        style={{
                          color: "var(--color-text-primary)",
                          background: isHovered ? "rgba(160,128,80,0.1)" : "transparent",
                          borderBottom: "1px solid rgba(180,160,120,0.1)",
                        }}
                        onMouseEnter={() => {
                          if (relIndex >= 0) setHoveredRel(relIndex);
                          else if (targetRelIndex >= 0) setHoveredRel(targetRelIndex);
                        }}
                        onMouseLeave={() => setHoveredRel(null)}
                      >
                        <span className="font-medium flex-1 truncate">{col.name}</span>
                        <span
                          className="text-[10px] flex-shrink-0"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          {col.enumValues ? "" : col.type}
                        </span>
                        <span className="flex gap-0.5 flex-shrink-0">
                          {col.pk && <Badge label="PK" color="amber" />}
                          {col.fk && <Badge label="FK" color="blue" />}
                          {col.unique && <Badge label="UQ" color="green" />}
                          {col.optional && <Badge label="?" color="gray" />}
                          {col.enumValues && <EnumChip values={col.enumValues} />}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div
        className="absolute bottom-4 left-4 z-20 rounded px-4 py-3 flex gap-4 items-center text-[11px]"
        style={{
          background: "var(--color-card)",
          border: "1px solid var(--color-border)",
          color: "var(--color-text-secondary)",
          boxShadow: "0 2px 8px rgba(100,80,40,0.1)",
        }}
      >
        <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Legend:
        </span>
        <span className="flex items-center gap-1">
          <Badge label="PK" color="amber" /> Primary Key
        </span>
        <span className="flex items-center gap-1">
          <Badge label="FK" color="blue" /> Foreign Key
        </span>
        <span className="flex items-center gap-1">
          <Badge label="UQ" color="green" /> Unique
        </span>
        <span className="flex items-center gap-1">
          <Badge label="?" color="gray" /> Optional
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold leading-none rounded border bg-purple-100 text-purple-800 border-purple-300">
            enum
          </span>
          Enum
        </span>
      </div>
    </div>
  );
}
