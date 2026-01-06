import { useMemo, useState } from "react";
import "../App.css";

const pen = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const toNum = (v) => {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const clampInt = (v, min, max) => {
  const n = Math.trunc(toNum(v));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
};

export default function InvestmentDetailPage() {
  // ✅ Default: 10 años (cambia si quieres)
  const [years, setYears] = useState(10);
  const [annual, setAnnual] = useState(1000);

  // ✅ Tramos ejemplo: deben cubrir 1..years
  const [segments, setSegments] = useState([
    { id: 1, from: 1, to: 2, rate: 8 },
    { id: 2, from: 3, to: 5, rate: 10 },
    { id: 3, from: 6, to: 10, rate: 12 },
  ]);

  function normalizeSegments(raw, horizon) {
    const cleaned = raw
      .map((s) => ({
        ...s,
        from: s.from === "" ? "" : clampInt(s.from, 1, horizon),
        to: s.to === "" ? "" : clampInt(s.to, 1, horizon),
        rate: s.rate === "" ? "" : toNum(s.rate),
      }))
      .filter((s) => !(s.from === "" && s.to === "" && s.rate === ""));

    cleaned.sort((a, b) => (a.from || 0) - (b.from || 0));
    return cleaned;
  }

  function validate(horizon, annualAmount, segs) {
    const e = [];

    if (horizon < 1) e.push("El número de años debe ser mayor o igual a 1.");
    if (annualAmount <= 0) e.push("El capital anual debe ser mayor a 0.");

    if (segs.length === 0) {
      e.push("Agrega al menos 1 tramo con tasa de interés.");
      return e;
    }

    if (segs.length > 3) e.push("Máximo 3 tramos.");

    for (const s of segs) {
      if (s.from === "" || s.to === "" || s.rate === "") {
        e.push("Cada tramo debe tener: Desde, Hasta y % interés.");
        break;
      }
      if (s.from < 1 || s.to < 1) e.push("Los años deben iniciar desde 1.");
      if (s.from > s.to)
        e.push(
          `Tramo inválido: "Desde" no puede ser mayor que "Hasta" (Tramo ${s.id}).`
        );
      if (s.rate < 0) e.push(`El interés no puede ser negativo (Tramo ${s.id}).`);
    }

    // Correlación y cobertura 1..horizon
    if (e.length === 0) {
      const first = segs[0];
      if (first.from !== 1) e.push("El primer tramo debe comenzar en el año 1.");

      for (let i = 1; i < segs.length; i++) {
        const prev = segs[i - 1];
        const cur = segs[i];
        if (cur.from !== prev.to + 1) {
          e.push("Los tramos deben ser correlativos sin huecos (ej: 1-2, 3-5, 6-15).");
          break;
        }
      }

      const last = segs[segs.length - 1];
      if (last.to !== horizon) {
        e.push(`El último tramo debe terminar en el año ${horizon}.`);
      }
    }

    return e;
  }

  function setSegment(id, patch) {
    setSegments((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function addSegment() {
    setSegments((prev) => {
      if (prev.length >= 3) return prev;

      const nextId = prev.length + 1;
      const last = prev[prev.length - 1];

      const from =
        last?.to !== "" && last?.to != null ? clampInt(last.to, 1, years) + 1 : 1;

      const seg = {
        id: nextId,
        from,
        to: years, // 👈 nuevo tramo sugiere terminar en years
        rate: "",
      };

      return [...prev, seg];
    });
  }

  function removeLastSegment() {
    setSegments((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }

  // ✅ Cuando cambias años, último tramo SIEMPRE termina en N
  function onChangeYears(v) {
    const n = clampInt(v, 1, 80);
    setYears(n);

    setSegments((prev) => {
      if (!prev.length) return prev;

      return prev.map((s, i) => {
        const isLast = i === prev.length - 1;

        return {
          ...s,
          from: s.from === "" ? "" : clampInt(s.from, 1, n),
          to: isLast ? n : s.to === "" ? "" : clampInt(s.to, 1, n),
        };
      });
    });
  }

  const model = useMemo(() => {
    const horizon = clampInt(years, 1, 80);
    const annualAmount = toNum(annual);

    const segs = normalizeSegments(segments, horizon);

    // ✅ fuerza que el último tramo termine en horizon (si hay tramos)
    if (segs.length) {
      segs[0].from = 1;
      segs[segs.length - 1].to = horizon;
    }

    const errors = validate(horizon, annualAmount, segs);

    if (errors.length > 0) {
      return {
        ok: false,
        errors,
        rows: [],
        totals: { contributed: 0, interest: 0, final: 0 },
      };
    }

    // Construir mapa año -> tasa
    const rateByYear = new Map();
    for (const s of segs) {
      for (let y = s.from; y <= s.to; y++) rateByYear.set(y, s.rate / 100);
    }

let balance = 0;
let contributed = 0;     // total aportado
let principal = 0;       // ✅ capital acumulado SIN interés
let interestTotal = 0;

const rows = [];
for (let y = 1; y <= horizon; y++) {
  const rate = rateByYear.get(y) ?? 0;

  const aporte = annualAmount;



  // saldo con interés
  balance += aporte;
  contributed += aporte;

  const interest = balance * rate;
  balance += interest;
  interestTotal += interest;
    // ✅ capital sin interés (solo aportes)
  principal += aporte;

  rows.push({
    year: y,
    ratePct: rate * 100,
    aporte,
    principal,     // ✅ nuevo
    interest,
    balance,
  });
}


    return {
      ok: true,
      errors: [],
      rows,
      totals: { contributed, interest: interestTotal, final: balance },
    };
  }, [years, annual, segments]);

  return (
    <div className="page-center">
      <div className="card-panel wide90">
        <div className="inv-header">
          <div>
            <h1>Inversión</h1>
            <p className="muted">
              Simulación por tramos de interés (hasta 3 entradas) correlativos año a año.
            </p>
          </div>
        </div>

        {/* TOP INPUTS */}
        <div className="investment-top">
          <div className="investment-inputs">
            <div className="field">
              <label>Horizonte (años)</label>
              <input
                className="input-sm"
                type="number"
                min="1"
                max="80"
                value={years}
                onChange={(e) => onChangeYears(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Capital anual a invertir</label>
              <input
                className="input-sm"
                type="number"
                step="0.01"
                value={annual}
                onChange={(e) => setAnnual(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Número de tramos</label>
              <input
                className="input-sm"
                type="number"
                disabled
                value={segments.length}
              />
            </div>
          </div>

          <div className="inv-actions">
            <button className="btn ghost" type="button" onClick={removeLastSegment}>
              Quitar tramo
            </button>
            <button className="btn primary" type="button" onClick={addSegment}>
              Agregar tramo
            </button>
          </div>
        </div>

        <h3 style={{ marginTop: 18 }}>Tramos de interés (máx. 3)</h3>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Tramo</th>
                <th>Desde (año)</th>
                <th>Hasta (año)</th>
                <th>% interés anual</th>
              </tr>
            </thead>

            <tbody>
              {segments.map((s, idx) => {
                const isLast = idx === segments.length - 1;

                return (
                  <tr key={s.id}>
                    <td>Entrada {s.id}</td>

                    <td>
                      <input
                        type="number"
                        className="input-sm"
                        min="1"
                        max={years}
                        value={s.from}
                        onChange={(e) => setSegment(s.id, { from: e.target.value })}
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        className="input-sm"
                        min="1"
                        max={years}
                        value={isLast ? years : s.to}
                        disabled={isLast} // 🔒 el último "Hasta" lo controla years
                        onChange={(e) => setSegment(s.id, { to: e.target.value })}
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        className="input-sm"
                        step="0.01"
                        value={s.rate}
                        onChange={(e) => setSegment(s.id, { rate: e.target.value })}
                        placeholder="Ej: 12"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {model.errors.length > 0 && (
          <div className="inv-errors">
            <b>Corrige esto:</b>
            <ul>
              {model.errors.map((m, idx) => (
                <li key={idx}>{m}</li>
              ))}
            </ul>
          </div>
        )}

        {model.ok && (
          <>
            <div className="summary" style={{ marginTop: 18 }}>
              <div className="card">
                <div className="card-label">Total aportado</div>
                <div className="card-value">{pen.format(model.totals.contributed)}</div>
              </div>
              <div className="card">
                <div className="card-label">Total interés ganado</div>
                <div className="card-value">{pen.format(model.totals.interest)}</div>
              </div>
              <div className="card">
                <div className="card-label">Saldo final</div>
                <div className="card-value">{pen.format(model.totals.final)}</div>
              </div>
            </div>

            <h3>Detalle por año</h3>
            <div className="table-wrap">
              <table className="table year-table">
                <thead>
                  <tr>
                    <th>Año</th>
                    <th className="right">Tasa</th>
                    <th className="right">Aporte</th>
                    <th className="right">Capital acumulado</th>
                    <th className="right">Interés del año</th>
                    <th className="right">Saldo acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {model.rows.map((r) => (
                    <tr key={r.year}>
                      <td>{r.year}</td>
                      <td className="right">{r.ratePct.toFixed(2)}%</td>
                      <td className="right">{pen.format(r.aporte)}</td>
                      <td className="right">{pen.format(r.principal)}</td>
                      <td className="right">{pen.format(r.interest)}</td>
                      <td className="right">{pen.format(r.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
