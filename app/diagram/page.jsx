"use client";

import { useState, useCallback, useRef } from "react";

const T = {
  pk: "#E11D48",
  fk: "#2563EB",
  field: "#334155",
  type: "#64748B",
  head: "#0F172A",
  headBg: "#F1F5F9",
  border: "#CBD5E1",
  bg: "#FFFFFF",
  line: "#64748B",
  enum: "#7C3AED",
  enumBg: "#F5F3FF",
  dragBorder: "#3B82F6",
};

const ROW_H = 22;
const HEADER_H = 30;
const TABLE_W = 220;

function tableH(fieldCount) {
  return HEADER_H + fieldCount * ROW_H + 8;
}

function DraggableTable({ x, y, name, fields, onDrag }) {
  const h = tableH(fields.length);
  const dragRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const svg = e.currentTarget.closest("svg");
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
    dragRef.current = { offX: svgP.x - x, offY: svgP.y - y };
    setDragging(true);

    const onMove = (ev) => {
      const p2 = svg.createSVGPoint();
      p2.x = ev.clientX;
      p2.y = ev.clientY;
      const sp = p2.matrixTransform(svg.getScreenCTM().inverse());
      onDrag(name, sp.x - dragRef.current.offX, sp.y - dragRef.current.offY);
    };

    const onUp = () => {
      setDragging(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <g onPointerDown={onPointerDown} style={{ cursor: "grab" }}>
      <rect
        x={x}
        y={y}
        width={TABLE_W}
        height={h}
        rx={6}
        fill={T.bg}
        stroke={dragging ? T.dragBorder : T.border}
        strokeWidth={dragging ? 2 : 1.5}
        filter={dragging ? "drop-shadow(0 4px 8px rgba(0,0,0,0.15))" : undefined}
      />
      <rect x={x} y={y} width={TABLE_W} height={HEADER_H} rx={6} fill={T.headBg} stroke={dragging ? T.dragBorder : T.border} strokeWidth={dragging ? 2 : 1.5} />
      <rect x={x} y={y + HEADER_H - 2} width={TABLE_W} height={4} fill={T.headBg} />
      <text x={x + TABLE_W / 2} y={y + 20} textAnchor="middle" fontWeight="700" fontSize={13} fill={T.head}>
        {name}
      </text>
      {fields.map((f, i) => {
        const fy = y + HEADER_H + i * ROW_H + 16;
        return (
          <g key={i}>
            {f.pk && <text x={x + 10} y={fy} fontSize={9} fontWeight="700" fill={T.pk}>PK</text>}
            {f.fk && <text x={x + 10} y={fy} fontSize={9} fontWeight="700" fill={T.fk}>FK</text>}
            <text x={x + 30} y={fy} fontSize={11} fill={T.field}>{f.name}</text>
            <text x={x + TABLE_W - 10} y={fy} textAnchor="end" fontSize={10} fill={T.type}>{f.type}</text>
          </g>
        );
      })}
    </g>
  );
}

function DraggableEnum({ x, y, name, values, onDrag }) {
  const w = 150;
  const h = 28 + values.length * 18 + 6;
  const dragRef = useRef(null);

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const svg = e.currentTarget.closest("svg");
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
    dragRef.current = { offX: svgP.x - x, offY: svgP.y - y };

    const onMove = (ev) => {
      const p2 = svg.createSVGPoint();
      p2.x = ev.clientX;
      p2.y = ev.clientY;
      const sp = p2.matrixTransform(svg.getScreenCTM().inverse());
      onDrag(name, sp.x - dragRef.current.offX, sp.y - dragRef.current.offY);
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <g onPointerDown={onPointerDown} style={{ cursor: "grab" }}>
      <rect x={x} y={y} width={w} height={h} rx={6} fill={T.enumBg} stroke={T.enum} strokeWidth={1.5} strokeDasharray="4,3" />
      <text x={x + w / 2} y={y + 18} textAnchor="middle" fontWeight="700" fontSize={11} fill={T.enum}>
        «enum» {name}
      </text>
      {values.map((v, i) => (
        <text key={i} x={x + w / 2} y={y + 36 + i * 18} textAnchor="middle" fontSize={10} fill={T.field}>{v}</text>
      ))}
    </g>
  );
}

function crowsFoot(x, y, dir) {
  const s = 8;
  if (dir === "left") {
    return (
      <g>
        <line x1={x} y1={y} x2={x + s} y2={y - s} stroke={T.line} strokeWidth={1.5} />
        <line x1={x} y1={y} x2={x + s} y2={y + s} stroke={T.line} strokeWidth={1.5} />
        <line x1={x} y1={y} x2={x + s} y2={y} stroke={T.line} strokeWidth={1.5} />
      </g>
    );
  }
  if (dir === "right") {
    return (
      <g>
        <line x1={x} y1={y} x2={x - s} y2={y - s} stroke={T.line} strokeWidth={1.5} />
        <line x1={x} y1={y} x2={x - s} y2={y + s} stroke={T.line} strokeWidth={1.5} />
        <line x1={x} y1={y} x2={x - s} y2={y} stroke={T.line} strokeWidth={1.5} />
      </g>
    );
  }
  if (dir === "up") {
    return (
      <g>
        <line x1={x} y1={y} x2={x - s} y2={y + s} stroke={T.line} strokeWidth={1.5} />
        <line x1={x} y1={y} x2={x + s} y2={y + s} stroke={T.line} strokeWidth={1.5} />
        <line x1={x} y1={y} x2={x} y2={y + s} stroke={T.line} strokeWidth={1.5} />
      </g>
    );
  }
  // down
  return (
    <g>
      <line x1={x} y1={y} x2={x - s} y2={y - s} stroke={T.line} strokeWidth={1.5} />
      <line x1={x} y1={y} x2={x + s} y2={y - s} stroke={T.line} strokeWidth={1.5} />
      <line x1={x} y1={y} x2={x} y2={y - s} stroke={T.line} strokeWidth={1.5} />
    </g>
  );
}

function onePip(x, y, dir) {
  const s = 6;
  if (dir === "left" || dir === "right") {
    return <line x1={x} y1={y - s} x2={x} y2={y + s} stroke={T.line} strokeWidth={2} />;
  }
  return <line x1={x - s} y1={y} x2={x + s} y2={y} stroke={T.line} strokeWidth={2} />;
}

function getRowY(pos, fieldIndex) {
  return pos.y + HEADER_H + fieldIndex * ROW_H + ROW_H / 2;
}

function getAnchor(pos, fieldIndex, side) {
  const ry = getRowY(pos, fieldIndex);
  switch (side) {
    case "right":  return { x: pos.x + TABLE_W, y: ry };
    case "left":   return { x: pos.x, y: ry };
    default:       return { x: pos.x + TABLE_W / 2, y: ry };
  }
}

function Relation({ from, to, fromSide, toSide, fromRow, toRow, label }) {
  const a = getAnchor(from, fromRow, fromSide);
  const b = getAnchor(to, toRow, toSide);

  const gap = Math.abs(a.x - b.x) * 0.4;
  let path;
  if (fromSide === "right" && toSide === "left") {
    path = `M ${a.x} ${a.y} C ${a.x + gap} ${a.y}, ${b.x - gap} ${b.y}, ${b.x} ${b.y}`;
  } else if (fromSide === "left" && toSide === "right") {
    path = `M ${a.x} ${a.y} C ${a.x - gap} ${a.y}, ${b.x + gap} ${b.y}, ${b.x} ${b.y}`;
  } else {
    const my = (a.y + b.y) / 2;
    path = `M ${a.x} ${a.y} C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`;
  }

  const oneDir = fromSide === "right" ? "right" : fromSide === "left" ? "left" : fromSide === "bottom" ? "down" : "up";
  const manyDir = toSide === "left" ? "left" : toSide === "right" ? "right" : toSide === "top" ? "up" : "down";

  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const isVLine = Math.abs(a.x - b.x) < 30;
  const labelOffX = isVLine ? 14 : 0;
  const labelOffY = isVLine ? 0 : -10;

  return (
    <g>
      <path d={path} fill="none" stroke={T.line} strokeWidth={1.5} />
      {onePip(a.x, a.y, oneDir)}
      {crowsFoot(b.x, b.y, manyDir)}
      {label && (
        <g>
          <rect
            x={mx + labelOffX - 16}
            y={my + labelOffY - 10}
            width={32}
            height={16}
            rx={4}
            fill="#fff"
            stroke={T.line}
            strokeWidth={0.8}
          />
          <text
            x={mx + labelOffX}
            y={my + labelOffY + 2}
            textAnchor="middle"
            fontSize={9}
            fontWeight="700"
            fill={T.line}
          >
            {label}
          </text>
        </g>
      )}
    </g>
  );
}

const TABLES = {
  User:         { fields: [
    { name: "id", type: "String", pk: true },
    { name: "email", type: "String (unique)" },
    { name: "grade", type: "Int" },
    { name: "createdAt", type: "DateTime" },
  ]},
  Subject:      { fields: [
    { name: "id", type: "String", pk: true },
    { name: "userId", type: "String", fk: true },
    { name: "name", type: "String" },
    { name: "createdAt", type: "DateTime" },
  ]},
  Theme:        { fields: [
    { name: "id", type: "String", pk: true },
    { name: "subjectId", type: "String", fk: true },
    { name: "name", type: "String" },
    { name: "createdAt", type: "DateTime" },
  ]},
  Material:     { fields: [
    { name: "id", type: "String", pk: true },
    { name: "themeId", type: "String", fk: true },
    { name: "type", type: "MaterialType" },
    { name: "content", type: "Json" },
    { name: "createdAt", type: "DateTime" },
  ]},
  Flashcard:    { fields: [
    { name: "id", type: "String", pk: true },
    { name: "materialId", type: "String", fk: true },
    { name: "front", type: "String" },
    { name: "back", type: "String" },
  ]},
  TestQuestion: { fields: [
    { name: "id", type: "String", pk: true },
    { name: "materialId", type: "String", fk: true },
    { name: "question", type: "String" },
    { name: "options", type: "String[]" },
    { name: "correctAnswer", type: "String" },
    { name: "explanation", type: "String?" },
  ]},
  TestAttempt:  { fields: [
    { name: "id", type: "String", pk: true },
    { name: "materialId", type: "String", fk: true },
    { name: "userId", type: "String", fk: true },
    { name: "score", type: "Int" },
    { name: "answers", type: "Json" },
    { name: "completedAt", type: "DateTime" },
  ]},
  UploadedFile: { fields: [
    { name: "id", type: "String", pk: true },
    { name: "userId", type: "String", fk: true },
    { name: "themeId", type: "String?", fk: true },
    { name: "filename", type: "String" },
    { name: "url", type: "String" },
    { name: "mimeType", type: "String" },
    { name: "sizeBytes", type: "Int" },
    { name: "status", type: "FileStatus" },
    { name: "statusError", type: "String?" },
    { name: "createdAt", type: "DateTime" },
  ]},
  FileChunk:    { fields: [
    { name: "id", type: "String", pk: true },
    { name: "fileId", type: "String", fk: true },
    { name: "themeId", type: "String", fk: true },
    { name: "userId", type: "String" },
    { name: "chunkIndex", type: "Int" },
    { name: "content", type: "String" },
    { name: "embedding", type: "vector(1536)" },
    { name: "createdAt", type: "DateTime" },
  ]},
};

// fromRow = index of PK "id" field (0), toRow = index of the FK field in the target table
const RELATIONS = [
  { from: "User",         to: "Subject",       fromSide: "right", toSide: "left",  fromRow: 0, toRow: 1, label: "1 : N" },  // User.id → Subject.userId
  { from: "User",         to: "UploadedFile",  fromSide: "right", toSide: "left",  fromRow: 0, toRow: 1, label: "1 : N" },  // User.id → UploadedFile.userId
  { from: "User",         to: "TestAttempt",   fromSide: "right", toSide: "left",  fromRow: 0, toRow: 2, label: "1 : N" },  // User.id → TestAttempt.userId
  { from: "Subject",      to: "Theme",         fromSide: "right", toSide: "left",  fromRow: 0, toRow: 1, label: "1 : N" },  // Subject.id → Theme.subjectId
  { from: "Theme",        to: "Material",      fromSide: "right", toSide: "left",  fromRow: 0, toRow: 1, label: "1 : N" },  // Theme.id → Material.themeId
  { from: "Theme",        to: "UploadedFile",  fromSide: "right", toSide: "left",  fromRow: 0, toRow: 2, label: "1 : N" },  // Theme.id → UploadedFile.themeId
  { from: "Theme",        to: "FileChunk",     fromSide: "right", toSide: "left",  fromRow: 0, toRow: 2, label: "1 : N" },  // Theme.id → FileChunk.themeId
  { from: "Material",     to: "Flashcard",     fromSide: "right", toSide: "left",  fromRow: 0, toRow: 1, label: "1 : N" },  // Material.id → Flashcard.materialId
  { from: "Material",     to: "TestQuestion",  fromSide: "right", toSide: "left",  fromRow: 0, toRow: 1, label: "1 : N" },  // Material.id → TestQuestion.materialId
  { from: "Material",     to: "TestAttempt",   fromSide: "right", toSide: "left",  fromRow: 0, toRow: 1, label: "1 : N" },  // Material.id → TestAttempt.materialId
  { from: "UploadedFile", to: "FileChunk",     fromSide: "right", toSide: "left",  fromRow: 0, toRow: 1, label: "1 : N" },  // UploadedFile.id → FileChunk.fileId
];

const INIT_POS = {
  User:         { x: 40,  y: 60 },
  Subject:      { x: 340, y: 10 },
  Theme:        { x: 640, y: 10 },
  Material:     { x: 640, y: 240 },
  Flashcard:    { x: 940, y: 10 },
  TestQuestion: { x: 940, y: 160 },
  TestAttempt:  { x: 940, y: 380 },
  UploadedFile: { x: 340, y: 240 },
  FileChunk:    { x: 640, y: 480 },
};

const ENUM_INIT = {
  MaterialType: { x: 940, y: 570 },
  FileStatus:   { x: 340, y: 530 },
};

export default function DBDiagram() {
  const [positions, setPositions] = useState(INIT_POS);
  const [enumPos, setEnumPos] = useState(ENUM_INIT);
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const panRef = useRef(null);
  const svgRef = useRef(null);

  const handleDrag = useCallback((name, x, y) => {
    setPositions((prev) => ({ ...prev, [name]: { x, y } }));
  }, []);

  const handleEnumDrag = useCallback((name, x, y) => {
    setEnumPos((prev) => ({ ...prev, [name]: { x, y } }));
  }, []);

  const onWheel = useCallback((e) => {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setView((prev) => {
      const newZoom = Math.min(3, Math.max(0.3, prev.zoom * factor));
      const ratio = newZoom / prev.zoom;
      return {
        zoom: newZoom,
        x: mx - (mx - prev.x) * ratio,
        y: my - (my - prev.y) * ratio,
      };
    });
  }, []);

  const onBgPointerDown = useCallback((e) => {
    if (e.target !== svgRef.current && e.target.tagName !== "pattern" && e.target.tagName !== "rect") return;
    if (e.target.closest("g")) return;
    e.preventDefault();
    panRef.current = { startX: e.clientX - view.x, startY: e.clientY - view.y };

    const onMove = (ev) => {
      if (!panRef.current) return;
      setView((prev) => ({
        ...prev,
        x: ev.clientX - panRef.current.startX,
        y: ev.clientY - panRef.current.startY,
      }));
    };

    const onUp = () => {
      panRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [view.x, view.y]);

  const resetView = useCallback(() => {
    setView({ x: 0, y: 0, zoom: 1 });
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", fontFamily: "system-ui, sans-serif", position: "relative", background: "#FAFBFC" }}>

      {/* Top bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 20px", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)",
        borderBottom: "1px solid #E2E8F0",
      }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>TutorFlow Database Schema</h2>
          <p style={{ fontSize: 11, color: "#64748B", margin: 0 }}>
            PostgreSQL + pgvector &middot; Prisma ORM
          </p>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 16, alignItems: "center", fontSize: 11, color: "#64748B" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ color: T.pk, fontWeight: 700, fontSize: 10 }}>PK</span> Primary Key
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ color: T.fk, fontWeight: 700, fontSize: 10 }}>FK</span> Foreign Key
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <svg width="20" height="14"><line x1="0" y1="7" x2="14" y2="7" stroke={T.line} strokeWidth={2} /><line x1="14" y1="7" x2="14" y2="2" stroke={T.line} strokeWidth={1.5} /></svg>
            One (1)
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <svg width="20" height="14">
              <line x1="0" y1="7" x2="10" y2="7" stroke={T.line} strokeWidth={1.5} />
              <line x1="10" y1="7" x2="18" y2="2" stroke={T.line} strokeWidth={1.5} />
              <line x1="10" y1="7" x2="18" y2="12" stroke={T.line} strokeWidth={1.5} />
              <line x1="10" y1="7" x2="18" y2="7" stroke={T.line} strokeWidth={1.5} />
            </svg>
            Many (N)
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 12, height: 12, borderRadius: 2, border: `1.5px dashed ${T.enum}`, background: T.enumBg, display: "inline-block" }} />
            Enum
          </span>
        </div>
      </div>

      {/* Zoom controls */}
      <div style={{
        position: "absolute", bottom: 20, right: 20, zIndex: 10,
        display: "flex", gap: 4, background: "#fff", borderRadius: 8,
        border: "1px solid #E2E8F0", padding: 4, boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}>
        <button onClick={() => setView((v) => ({ ...v, zoom: Math.min(3, v.zoom * 1.2) }))}
          style={{ width: 32, height: 32, border: "none", background: "none", cursor: "pointer", fontSize: 16, borderRadius: 4 }}
          onMouseOver={(e) => e.target.style.background = "#F1F5F9"} onMouseOut={(e) => e.target.style.background = "none"}>+</button>
        <button onClick={() => setView((v) => ({ ...v, zoom: Math.max(0.3, v.zoom * 0.8) }))}
          style={{ width: 32, height: 32, border: "none", background: "none", cursor: "pointer", fontSize: 16, borderRadius: 4 }}
          onMouseOver={(e) => e.target.style.background = "#F1F5F9"} onMouseOut={(e) => e.target.style.background = "none"}>−</button>
        <div style={{ width: 1, background: "#E2E8F0" }} />
        <button onClick={resetView}
          style={{ height: 32, border: "none", background: "none", cursor: "pointer", fontSize: 11, padding: "0 8px", borderRadius: 4, color: "#64748B" }}
          onMouseOver={(e) => e.target.style.background = "#F1F5F9"} onMouseOut={(e) => e.target.style.background = "none"}>Reset</button>
        <span style={{ display: "flex", alignItems: "center", fontSize: 10, color: "#94A3B8", padding: "0 6px" }}>
          {Math.round(view.zoom * 100)}%
        </span>
      </div>

      {/* Help hint */}
      <div style={{
        position: "absolute", bottom: 20, left: 20, zIndex: 10,
        fontSize: 10, color: "#94A3B8", background: "rgba(255,255,255,0.8)", padding: "6px 10px", borderRadius: 6,
      }}>
        Scroll to zoom &middot; Drag background to pan &middot; Drag tables to move
      </div>

      {/* Canvas */}
      <svg
        ref={svgRef}
        style={{ width: "100%", height: "100%", cursor: panRef.current ? "grabbing" : "default" }}
        onWheel={onWheel}
        onPointerDown={onBgPointerDown}
      >
        {/* Grid pattern */}
        <defs>
          <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse"
            patternTransform={`translate(${view.x},${view.y}) scale(${view.zoom})`}>
            <circle cx="15" cy="15" r="0.5" fill="#CBD5E1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        <g transform={`translate(${view.x}, ${view.y + 60}) scale(${view.zoom})`}>
          {/* Relations drawn first (behind tables) */}
          {RELATIONS.map((r, i) => (
            <Relation
              key={i}
              from={positions[r.from]}
              to={positions[r.to]}
              fromSide={r.fromSide}
              toSide={r.toSide}
              fromRow={r.fromRow}
              toRow={r.toRow}
              label={r.label}
            />
          ))}

          {/* Tables */}
          {Object.entries(TABLES).map(([name, { fields }]) => (
            <DraggableTable
              key={name}
              x={positions[name].x}
              y={positions[name].y}
              name={name}
              fields={fields}
              onDrag={handleDrag}
            />
          ))}

          {/* Enums */}
          <DraggableEnum x={enumPos.MaterialType.x} y={enumPos.MaterialType.y} name="MaterialType" values={["SUMMARY", "FLASHCARD", "TEST"]} onDrag={handleEnumDrag} />
          <DraggableEnum x={enumPos.FileStatus.x} y={enumPos.FileStatus.y} name="FileStatus" values={["PENDING", "PROCESSING", "READY", "FAILED"]} onDrag={handleEnumDrag} />
        </g>
      </svg>
    </div>
  );
}
