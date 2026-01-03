import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import "../App.css";

const pen = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const toNumber = (v) => (Number.isFinite(+v) ? +v : 0);


export default function InvestmentPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);


  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    const { data, error } = await supabase
      .from("users_investments")
      .select("*")
      .order("code", { ascending: true });

    if (error) console.error(error);
    setUsers(data || []);
    setLoading(false);
  }

  async function updateUser(id, patch) {
    if (!isEditing) return; // ✅ bloquea lógica

    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
    const { error } = await supabase
      .from("users_investments")
      .update(patch)
      .eq("id", id);
    if (error) console.error(error);
  }

  const activeUsers = useMemo(() => users.filter((u) => u.active), [users]);

  const totals = useMemo(() => {
        const capital = activeUsers.reduce(
            (a, u) => a + toNumber(u.capital),
            0
        );

        const maintenance = activeUsers.reduce(
            (a, u) => a + toNumber(u.maintenance),
            0
        );

        return {
            capital,
            maintenance,
            total: capital + maintenance, // si aún lo necesitas
        };
    }, [activeUsers]);

  if (loading) return <p className="loading">Cargando...</p>;

  return (
        <div className="card-panel">
            <div className="container">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div>
                    <h1>Recalculador</h1>
                    <p className="muted">
                        Aquí solo participan los <b>usuarios activos</b>.
                    </p>
                  </div>

                    <button
                        className={`btn ${isEditing ? "navlink" : "navlink active"}`}
                        type="button"
                        onClick={() => setIsEditing((v) => !v)}
                        >
                        {isEditing ? "Bloquear" : "Editar"}
                    </button>
               </div>
 
            <div className="summary">
                <div className="card">
                <div className="card-label">Total capital</div>
                <div className="card-value">{pen.format(totals.capital)}</div>
                </div>
                <div className="card">
                <div className="card-label">Total mantenimiento</div>
                <div className="card-value">{pen.format(totals.maintenance)}</div>
                </div>
                <div className="card">
                <div className="card-label">Total acumulado</div>
                <div className="card-value">{pen.format(totals.total)}</div>
                </div>
            </div>

            <div className="table-wrap">
                <table className="table">
                <thead>
                    <tr>
                    <th>Usuario</th>
                    <th>Capital</th>
                    <th>Mantenimiento</th>
                    <th className="right">Aporte total</th>
                    <th className="right">% participación</th>
                    <th className="right">Acción</th>
                    </tr>
                </thead>

                <tbody>
                    {activeUsers.map((u) => {
                    const capital = toNumber(u.capital);
                        const pct = totals.capital > 0 ? (capital / totals.capital) * 100  : 0;
                    return (
                        <tr key={u.id}>
                        <td>
                            <input
                            disabled={!isEditing}
                            value={u.name || ""}
                            onChange={(e) => updateUser(u.id, { name: e.target.value })}
                            placeholder="Nombre"
                            />
                        </td>

                        <td>
                            <input
                            disabled={!isEditing}
                            type="number"
                            value={u.capital ?? 0}
                            onChange={(e) =>
                                updateUser(u.id, { capital: toNumber(e.target.value) })
                            }
                            />
                        </td>

                        <td>
                            <input
                            disabled={!isEditing}
                            type="number"
                            value={u.maintenance ?? 0}
                            onChange={(e) =>
                                updateUser(u.id, { maintenance: toNumber(e.target.value) })
                            }
                            />
                        </td>

                        <td className="right">{pen.format(capital )}</td>
                        <td className="right">{pct.toFixed(2)}%</td>

                        <td className="right">
                            <button
                            className="btn danger"
                            onClick={() => updateUser(u.id, { active: false })}
                            type="button"
                            disabled={!isEditing}

                            >
                            Desactivar
                            </button>
                        </td>
                        </tr>
                    );
                    })}

                    {activeUsers.length === 0 && (
                    <tr>
                        <td colSpan={6} style={{ padding: 16 }}>
                        No hay usuarios activos. Ve a “Usuarios (CRUD)” para crear o reactivar.
                        </td>
                    </tr>
                    )}
                </tbody>
                </table>
            </div>
            </div>

        </div>    
  );
}
