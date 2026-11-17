import React, { useState } from 'react';
import type { DiagramId } from '../types/arora';

interface ScientificDiagramProps {
  diagramId: DiagramId;
  caption?: string;
}

export const ScientificDiagram: React.FC<ScientificDiagramProps> = ({ diagramId, caption }) => {
  const [paramA, setParamA] = useState(50);
  const [paramB, setParamB] = useState(50);

  const renderDiagram = () => {
    switch (diagramId) {
      case 'gauss_electric_field': {
        const radiusPx = 34 + (paramA / 100) * 44;
        const rCm = (2 + (paramA / 100) * 8).toFixed(1);
        const lambda = (1 + (paramB / 100) * 9).toFixed(1);
        const eField = ((18 * Number(lambda)) / Number(rCm)).toFixed(1);
        return (
          <div className="space-y-3">
            <svg viewBox="0 0 360 190" className="w-full h-48 rounded-xl bg-slate-950/90 border border-cyan-500/20">
              <line x1="24" y1="95" x2="336" y2="95" stroke="#22D3EE" strokeWidth="3" />
              {[70, 120, 170, 220, 270].map((x) => (
                <g key={x}>
                  <text x={x} y="92" fill="#A5F3FC" fontSize="11" textAnchor="middle">+</text>
                  <line x1={x} y1="95" x2={x} y2={95 - radiusPx - 14} stroke="#8B5CF6" strokeWidth="1.2" strokeDasharray="3 2" />
                  <line x1={x} y1="95" x2={x} y2={95 + radiusPx + 14} stroke="#8B5CF6" strokeWidth="1.2" strokeDasharray="3 2" />
                </g>
              ))}
              <rect
                x="80"
                y={95 - radiusPx}
                width="200"
                height={radiusPx * 2}
                rx="12"
                fill="rgba(6, 182, 212, 0.12)"
                stroke="#06B6D4"
                strokeWidth="1.8"
                strokeDasharray="6 4"
              />
              <ellipse cx="80" cy="95" rx="10" ry={radiusPx} fill="rgba(139, 92, 246, 0.16)" stroke="#22D3EE" strokeWidth="1.5" />
              <ellipse cx="280" cy="95" rx="10" ry={radiusPx} fill="rgba(139, 92, 246, 0.16)" stroke="#22D3EE" strokeWidth="1.5" />
              <text x="180" y="24" fill="#E2E8F0" fontSize="11" textAnchor="middle">
                Gaussian Cylinder (r = {rCm} cm, λ = {lambda} μC/m) → E = {eField} × 10⁵ N/C
              </text>
            </svg>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label className="flex flex-col gap-1 text-slate-600 dark:text-slate-300">
                <span>Gaussian Radius r: <strong className="font-mono">{rCm} cm</strong></span>
                <input type="range" min={10} max={100} value={paramA} onChange={(e) => setParamA(Number(e.target.value))} className="accent-cyan-500" />
              </label>
              <label className="flex flex-col gap-1 text-slate-600 dark:text-slate-300">
                <span>Charge Density λ: <strong className="font-mono">{lambda} μC/m</strong></span>
                <input type="range" min={10} max={100} value={paramB} onChange={(e) => setParamB(Number(e.target.value))} className="accent-violet-500" />
              </label>
            </div>
          </div>
        );
      }

      case 'lcr_resonance': {
        const resX = 110 + (paramA / 100) * 140;
        const peakHeight = 45 + (100 - paramB) * 0.75;
        const f0 = (120 + paramA * 2.4).toFixed(0);
        const rOhm = (10 + Math.round(paramB * 0.9)).toFixed(0);
        const points = Array.from({ length: 35 }, (_, i) => {
          const x = 30 + i * 9;
          const dist = (x - resX) / (18 + paramB * 0.35);
          const y = 155 - peakHeight / (1 + dist * dist);
          return `${x},${y.toFixed(1)}`;
        }).join(' ');
        return (
          <div className="space-y-3">
            <svg viewBox="0 0 360 190" className="w-full h-48 rounded-xl bg-slate-950/90 border border-cyan-500/20">
              <line x1="30" y1="155" x2="340" y2="155" stroke="#475569" strokeWidth="1.5" />
              <line x1="30" y1="25" x2="30" y2="155" stroke="#475569" strokeWidth="1.5" />
              <polyline fill="none" stroke="#22D3EE" strokeWidth="2.5" points={points} />
              <line x1={resX} y1="30" x2={resX} y2="155" stroke="#8B5CF6" strokeDasharray="4 4" strokeWidth="1.5" />
              <circle cx={resX} cy={155 - peakHeight} r="4.5" fill="#A78BFA" />
              <text x="190" y="22" fill="#E2E8F0" fontSize="11" textAnchor="middle">
                Resonant f₀ = {f0} Hz · Resistance R = {rOhm} Ω (Sharpness shifts with R)
              </text>
              <text x="330" y="172" fill="#94A3B8" fontSize="10" textAnchor="end">Frequency ω</text>
              <text x="16" y="34" fill="#94A3B8" fontSize="10">I</text>
            </svg>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label className="flex flex-col gap-1 text-slate-600 dark:text-slate-300">
                <span>Tuning L·C Shift (f₀): <strong className="font-mono">{f0} Hz</strong></span>
                <input type="range" min={5} max={95} value={paramA} onChange={(e) => setParamA(Number(e.target.value))} className="accent-cyan-500" />
              </label>
              <label className="flex flex-col gap-1 text-slate-600 dark:text-slate-300">
                <span>Damping Resistance R: <strong className="font-mono">{rOhm} Ω</strong></span>
                <input type="range" min={10} max={95} value={paramB} onChange={(e) => setParamB(Number(e.target.value))} className="accent-violet-500" />
              </label>
            </div>
          </div>
        );
      }

      case 'prism_refraction': {
        const nVal = (1.35 + (paramA / 100) * 0.5).toFixed(2);
        const incDeg = Math.round(30 + (paramB / 100) * 35);
        const devShift = Math.round((Number(nVal) - 1) * 44);
        return (
          <div className="space-y-3">
            <svg viewBox="0 0 360 190" className="w-full h-48 rounded-xl bg-slate-950/90 border border-cyan-500/20">
              <polygon points="180,35 105,155 255,155" fill="rgba(6, 182, 212, 0.14)" stroke="#22D3EE" strokeWidth="2" />
              <line x1="40" y1={130 - (incDeg - 30) * 0.7} x2="142" y2="95" stroke="#FACC15" strokeWidth="2.4" />
              <line x1="142" y1="95" x2="218" y2={95 + devShift * 0.15} stroke="#38BDF8" strokeWidth="2.2" />
              <line x1="218" y1={95 + devShift * 0.15} x2="320" y2={115 + devShift} stroke="#C084FC" strokeWidth="2.4" />
              <text x="180" y="22" fill="#E2E8F0" fontSize="11" textAnchor="middle">
                Prism A = 60° · n = {nVal} · Incidence i = {incDeg}° · Deviation δ ≈ {devShift + 14}°
              </text>
            </svg>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label className="flex flex-col gap-1 text-slate-600 dark:text-slate-300">
                <span>Refractive Index n: <strong className="font-mono">{nVal}</strong></span>
                <input type="range" min={5} max={100} value={paramA} onChange={(e) => setParamA(Number(e.target.value))} className="accent-cyan-500" />
              </label>
              <label className="flex flex-col gap-1 text-slate-600 dark:text-slate-300">
                <span>Angle of Incidence i: <strong className="font-mono">{incDeg}°</strong></span>
                <input type="range" min={0} max={100} value={paramB} onChange={(e) => setParamB(Number(e.target.value))} className="accent-violet-500" />
              </label>
            </div>
          </div>
        );
      }

      case 'bohr_hydrogen_levels': {
        const nUpper = Math.min(5, Math.max(2, Math.round(2 + (paramA / 100) * 3)));
        const nLower = Math.min(nUpper - 1, Math.max(1, Math.round(1 + (paramB / 100) * 2)));
        const eUpper = -13.6 / (nUpper * nUpper);
        const eLower = -13.6 / (nLower * nLower);
        const deltaE = (eUpper - eLower).toFixed(2);
        const levels = [
          { n: 1, y: 158, e: '-13.6 eV' },
          { n: 2, y: 118, e: '-3.40 eV' },
          { n: 3, y: 88, e: '-1.51 eV' },
          { n: 4, y: 64, e: '-0.85 eV' },
          { n: 5, y: 45, e: '-0.54 eV' },
        ];
        const yFrom = levels.find((l) => l.n === nUpper)?.y || 64;
        const yTo = levels.find((l) => l.n === nLower)?.y || 118;
        return (
          <div className="space-y-3">
            <svg viewBox="0 0 360 190" className="w-full h-48 rounded-xl bg-slate-950/90 border border-cyan-500/20">
              {levels.map((l) => (
                <g key={l.n}>
                  <line x1="56" y1={l.y} x2="290" y2={l.y} stroke={l.n === nUpper || l.n === nLower ? '#22D3EE' : '#334155'} strokeWidth={l.n === nUpper || l.n === nLower ? 2 : 1.2} />
                  <text x="44" y={l.y + 4} fill="#94A3B8" fontSize="10" textAnchor="end">n={l.n}</text>
                  <text x="300" y={l.y + 4} fill="#CBD5E1" fontSize="10">{l.e}</text>
                </g>
              ))}
              <line x1="173" y1={yFrom} x2="173" y2={yTo - 4} stroke="#A78BFA" strokeWidth="2.6" />
              <polygon points={`168,${yTo - 6} 178,${yTo - 6} 173,${yTo}`} fill="#A78BFA" />
              <text x="180" y="22" fill="#E2E8F0" fontSize="11" textAnchor="middle">
                Transition n={nUpper} → n={nLower} ({nLower === 1 ? 'Lyman' : nLower === 2 ? 'Balmer' : 'Paschen'}) · ΔE = {deltaE} eV
              </text>
            </svg>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label className="flex flex-col gap-1 text-slate-600 dark:text-slate-300">
                <span>Upper Orbit n_i: <strong className="font-mono">n = {nUpper}</strong></span>
                <input type="range" min={10} max={100} value={paramA} onChange={(e) => setParamA(Number(e.target.value))} className="accent-cyan-500" />
              </label>
              <label className="flex flex-col gap-1 text-slate-600 dark:text-slate-300">
                <span>Lower Orbit n_f: <strong className="font-mono">n = {nLower}</strong></span>
                <input type="range" min={0} max={100} value={paramB} onChange={(e) => setParamB(Number(e.target.value))} className="accent-violet-500" />
              </label>
            </div>
          </div>
        );
      }

      case 'electrochemical_cell': {
        const znConc = (0.01 + (paramA / 100) * 1.99).toFixed(2);
        const cuConc = (0.01 + (paramB / 100) * 1.99).toFixed(2);
        const eCell = (1.1 - 0.0295 * Math.log10(Number(znConc) / Number(cuConc))).toFixed(3);
        return (
          <div className="space-y-3">
            <svg viewBox="0 0 360 190" className="w-full h-48 rounded-xl bg-slate-950/90 border border-cyan-500/20">
              <rect x="44" y="65" width="90" height="95" rx="6" fill="rgba(56,189,248,0.12)" stroke="#38BDF8" strokeWidth="1.5" />
              <rect x="226" y="65" width="90" height="95" rx="6" fill="rgba(6,182,212,0.22)" stroke="#22D3EE" strokeWidth="1.5" />
              <rect x="74" y="45" width="16" height="88" fill="#94A3B8" />
              <rect x="270" y="45" width="16" height="88" fill="#F59E0B" />
              <path d="M120 90 V50 H240 V90" fill="none" stroke="#A78BFA" strokeWidth="8" strokeLinecap="round" />
              <polyline points="82,45 82,28 278,28 278,45" fill="none" stroke="#22D3EE" strokeWidth="2" />
              <rect x="150" y="16" width="60" height="22" rx="6" fill="#0F172A" stroke="#22D3EE" />
              <text x="180" y="31" fill="#67E8F9" fontSize="10" textAnchor="middle">{eCell} V</text>
              <text x="89" y="176" fill="#CBD5E1" fontSize="10" textAnchor="middle">Zn | Zn²⁺ ({znConc} M)</text>
              <text x="271" y="176" fill="#CBD5E1" fontSize="10" textAnchor="middle">Cu²⁺ ({cuConc} M) | Cu</text>
            </svg>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label className="flex flex-col gap-1 text-slate-600 dark:text-slate-300">
                <span>[Zn²⁺] Anode: <strong className="font-mono">{znConc} M</strong></span>
                <input type="range" min={1} max={100} value={paramA} onChange={(e) => setParamA(Number(e.target.value))} className="accent-cyan-500" />
              </label>
              <label className="flex flex-col gap-1 text-slate-600 dark:text-slate-300">
                <span>[Cu²⁺] Cathode: <strong className="font-mono">{cuConc} M</strong></span>
                <input type="range" min={1} max={100} value={paramB} onChange={(e) => setParamB(Number(e.target.value))} className="accent-violet-500" />
              </label>
            </div>
          </div>
        );
      }

      case 'calculus_derivative_tangent': {
        const xVal = -0.5 + (paramA / 100) * 5;
        const yVal = xVal * xVal - 4 * xVal + 6;
        const slope = 2 * xVal - 4;
        const mapX = (x: number) => 60 + ((x + 1) / 6) * 240;
        const mapY = (y: number) => 160 - (y / 12) * 120;
        const curvePts = Array.from({ length: 30 }, (_, i) => {
          const x = -0.8 + i * 0.2;
          const y = x * x - 4 * x + 6;
          return `${mapX(x).toFixed(1)},${mapY(y).toFixed(1)}`;
        }).join(' ');
        const px = mapX(xVal);
        const py = mapY(yVal);
        const tx1 = xVal - 1.1;
        const ty1 = yVal + slope * -1.1;
        const tx2 = xVal + 1.1;
        const ty2 = yVal + slope * 1.1;
        return (
          <div className="space-y-3">
            <svg viewBox="0 0 360 190" className="w-full h-48 rounded-xl bg-slate-950/90 border border-cyan-500/20">
              <line x1="40" y1="160" x2="320" y2="160" stroke="#475569" strokeWidth="1.2" />
              <line x1="100" y1="25" x2="100" y2="165" stroke="#475569" strokeWidth="1.2" />
              <polyline fill="none" stroke="#22D3EE" strokeWidth="2.4" points={curvePts} />
              <line x1={mapX(tx1)} y1={mapY(ty1)} x2={mapX(tx2)} y2={mapY(ty2)} stroke="#A78BFA" strokeWidth="2" />
              <circle cx={px} cy={py} r="5" fill="#FACC15" />
              <text x="180" y="22" fill="#E2E8F0" fontSize="11" textAnchor="middle">
                f(x) = x² - 4x + 6 · At x = {xVal.toFixed(1)}, Slope f&apos;(x) = {slope.toFixed(1)} {Math.abs(slope) < 0.2 ? '(Local Min!)' : ''}
              </text>
            </svg>
            <label className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-300">
              <span>Inspect Point x₀: <strong className="font-mono">x₀ = {xVal.toFixed(1)}</strong></span>
              <input type="range" min={0} max={100} value={paramA} onChange={(e) => setParamA(Number(e.target.value))} className="accent-cyan-500" />
            </label>
          </div>
        );
      }

      case 'dna_replication_fork': {
        const unzipProgress = 120 + (paramA / 100) * 140;
        return (
          <div className="space-y-3">
            <svg viewBox="0 0 360 190" className="w-full h-48 rounded-xl bg-slate-950/90 border border-cyan-500/20">
              <path d={`M 30 75 L ${unzipProgress} 75 Q ${unzipProgress + 35} 75 330 42`} fill="none" stroke="#22D3EE" strokeWidth="2.5" />
              <path d={`M 30 115 L ${unzipProgress} 115 Q ${unzipProgress + 35} 115 330 148`} fill="none" stroke="#8B5CF6" strokeWidth="2.5" />
              <line x1={unzipProgress + 10} y1="62" x2="325" y2="54" stroke="#10B981" strokeWidth="2.5" />
              <line x1={unzipProgress + 20} y1="126" x2={unzipProgress + 65} y2="132" stroke="#F59E0B" strokeWidth="2.5" strokeDasharray="16 6" />
              <circle cx={unzipProgress} cy="95" r="11" fill="rgba(244, 63, 94, 0.3)" stroke="#FB7185" strokeWidth="1.8" />
              <text x={unzipProgress} y="99" fill="#FFE4E6" fontSize="8" textAnchor="middle">Hel</text>
              <text x="180" y="22" fill="#E2E8F0" fontSize="11" textAnchor="middle">
                Helicase Unwinding · Continuous Leading (5&apos;→3&apos;) · Okazaki Lagging Fragments
              </text>
            </svg>
            <label className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-300">
              <span>Replication Fork Progression: <strong className="font-mono">{paramA}%</strong></span>
              <input type="range" min={10} max={95} value={paramA} onChange={(e) => setParamA(Number(e.target.value))} className="accent-cyan-500" />
            </label>
          </div>
        );
      }

      case 'pn_junction_diode': {
        const biasV = -5 + (paramA / 100) * 6.2;
        const depletionW = Math.max(8, 36 - biasV * 7);
        const currentMa = biasV > 0.7 ? ((biasV - 0.7) * 45).toFixed(1) : biasV < 0 ? '-0.02' : '0.1';
        return (
          <div className="space-y-3">
            <svg viewBox="0 0 360 190" className="w-full h-48 rounded-xl bg-slate-950/90 border border-cyan-500/20">
              <rect x="45" y="55" width="135" height="80" fill="rgba(139, 92, 246, 0.22)" stroke="#8B5CF6" />
              <rect x="180" y="55" width="135" height="80" fill="rgba(6, 182, 212, 0.22)" stroke="#22D3EE" />
              <rect x={180 - depletionW / 2} y="55" width={depletionW} height="80" fill="rgba(250, 204, 21, 0.25)" stroke="#FACC15" strokeDasharray="3 3" />
              <text x="105" y="99" fill="#DDD6FE" fontSize="13" textAnchor="middle">p-type (+)</text>
              <text x="255" y="99" fill="#CFFAFE" fontSize="13" textAnchor="middle">n-type (-)</text>
              <text x="180" y="24" fill="#E2E8F0" fontSize="11" textAnchor="middle">
                Applied Bias: {biasV.toFixed(2)} V ({biasV >= 0 ? 'Forward Bias' : 'Reverse Bias'}) · Current I ≈ {currentMa} mA
              </text>
              <text x="180" y="160" fill="#FDE047" fontSize="10" textAnchor="middle">
                Depletion Layer Width: {depletionW.toFixed(0)} μm
              </text>
            </svg>
            <label className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-300">
              <span>Bias Voltage V: <strong className="font-mono">{biasV.toFixed(2)} V</strong></span>
              <input type="range" min={0} max={100} value={paramA} onChange={(e) => setParamA(Number(e.target.value))} className="accent-cyan-500" />
            </label>
          </div>
        );
      }

      case 'logic_gates_sql_schema':
      default: {
        const minMarks = Math.round(50 + (paramA / 100) * 45);
        const rows = [
          { id: 101, name: 'Aarav', dept: 'CSE', marks: 94 },
          { id: 102, name: 'Kavya', dept: 'CSE', marks: 88 },
          { id: 103, name: 'Diya', dept: 'BIO', marks: 76 },
          { id: 104, name: 'Vikram', dept: 'PHY', marks: 62 },
        ];
        const filtered = rows.filter((r) => r.marks >= minMarks);
        return (
          <div className="space-y-3">
            <div className="rounded-xl bg-slate-950/95 border border-cyan-500/20 p-3 text-xs font-mono text-slate-200">
              <div className="text-cyan-300 mb-2">
                SELECT Dept, COUNT(*), AVG(Marks) FROM STUDENTS WHERE Marks &gt;= {minMarks} GROUP BY Dept;
              </div>
              <div className="grid grid-cols-4 gap-2 text-slate-400 border-b border-slate-800 pb-1">
                <span>AdmNo</span><span>Name</span><span>Dept</span><span>Marks</span>
              </div>
              {filtered.length > 0 ? (
                filtered.map((r) => (
                  <div key={r.id} className="grid grid-cols-4 gap-2 py-1 text-slate-100 tabular-nums">
                    <span>{r.id}</span><span>{r.name}</span><span>{r.dept}</span><span className="text-cyan-300">{r.marks}</span>
                  </div>
                ))
              ) : (
                <div className="py-2 text-amber-300">Empty Set (0 rows satisfy WHERE Marks &gt;= {minMarks})</div>
              )}
            </div>
            <label className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-300">
              <span>SQL WHERE Threshold: <strong className="font-mono">Marks &gt;= {minMarks}</strong></span>
              <input type="range" min={0} max={100} value={paramA} onChange={(e) => setParamA(Number(e.target.value))} className="accent-cyan-500" />
            </label>
          </div>
        );
      }
    }
  };

  return (
    <div className="glass-subcard p-4">
      {renderDiagram()}
      {caption && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{caption}</p>
      )}
    </div>
  );
};
