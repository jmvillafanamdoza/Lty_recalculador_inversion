import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import "../App.css";

const toNumber = (v) => (Number.isFinite(+v) ? +v : 0);
const nameRegex = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+$/;

function validateForm({ name, capital, maintenance }) {
  const e = {};

  const n = (name || "").trim();
  const c = String(capital ?? "").trim();
  const m = String(maintenance ?? "").trim();

  // 1) No permitir vacío en ninguno
  if (!n) e.name = "Ingrese el nombre del usuario.";
  if (!c) e.capital = "Ingrese el capital inicial.";
  if (!m) e.maintenance = "Ingrese el mantenimiento mensual.";

  // 2) Nombre solo letras y espacios
  if (n && !nameRegex.test(n)) {
    e.name = "Solo se permiten letras y espacios (sin números ni símbolos).";
  }

  // 3) Números enteros o decimales
  const capNum = Number(c);
  const maintNum = Number(m);

if (c && (!Number.isFinite(capNum) || capNum <= 0)) {
  e.capital = "Capital debe ser un número válido (entero o decimal) y mayor a 0.";
}

  if (m && (!Number.isFinite(maintNum) || maintNum < 0)) {
    e.maintenance =
      "Mantenimiento debe ser un número válido (entero o decimal) y >= 0.";
  }

  return e;
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState({});



  // Form nuevo usuario
  const [name, setName] = useState("");
  const [capital, setCapital] = useState(0);
  const [maintenance, setMaintenance] = useState(0);

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

async function createUser(e) {
  e.preventDefault();

  const formValues = { name, capital, maintenance };
  const eMap = validateForm(formValues);
  setErrors(eMap);

  if (Object.keys(eMap).length > 0) return; // 🚫 NO INSERTA

  const payload = {
    name: name.trim(),
    capital: Number(capital),
    maintenance: Number(maintenance),
    active: true,
  };

  const { data, error } = await supabase
    .from("users_investments")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error(error);
    return;
  }

  setUsers((prev) => [...prev, data]);
  setName("");
  setCapital("");
  setMaintenance("");
  setErrors({});
}

  async function updateUser(id, patch) {
    // Optimistic UI
    if (!isEditing) return; // ✅ bloquea lógica

    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));

    const { error } = await supabase
      .from("users_investments")
      .update(patch)
      .eq("id", id);

    if (error) {
      console.error(error);
      // si quieres: recargar para corregir
      // await loadUsers();
    }
  }

  async function hardDeleteUser(id) {
    // (opcional) borrado real
    const ok = confirm("¿Eliminar definitivamente este usuario?");
    if (!ok) return;

    const { error } = await supabase.from("users_investments").delete().eq("id", id);
    if (error) {
      console.error(error);
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }

  const activeCount = useMemo(() => users.filter((u) => u.active).length, [users]);

  if (loading) return <p className="loading">Cargando usuarios...</p>;

  return (
        <div className="card-panel">
            <div className="container">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div>
                    <h1>Usuarios </h1>
                    <p className="muted">Activos: {activeCount} | Total: {users.length}</p>
                  </div>
                 <button
                  className={`btn ${isEditing ? "ghost" : "navlink active"}`}
                  type="button"
                  onClick={() => setIsEditing((v) => !v)}
                  >
                  {isEditing ? "Bloquear" : "Editar"}
                </button>
              </div>
            <form className="new-user" onSubmit={createUser}>
                <div className="field">
                  <label>Nombre del usuario</label>
                  <input
                    disabled={!isEditing}
                    value={name}
                    placeholder="Ingresar nombre"
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "" || /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+$/.test(v)) setName(v);
                      setName(e.target.value);
                      if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
                    }}
                  />
                  {errors.name && <span className="error">{errors.name}</span>}
                </div>

                <div className="field">
                  <label>Capital inicial</label>
                  <input
                    disabled={!isEditing}
                    type="number"
                    step="0.01"
                    value={capital}
                    placeholder="Ej: 1500 o 1500.50"
                    onChange={(e) => {
                      setCapital(e.target.value);
                      if (errors.capital) setErrors((p) => ({ ...p, capital: undefined }));
                    }}
                  />
                  {errors.capital && <span className="error">{errors.capital}</span>}
                </div>

               <div className="field">
                <label>Mantenimiento mensual</label>
                <input
                  disabled={!isEditing}
                  type="number"
                  step="0.01"
                  value={maintenance}
                  placeholder="Ej: 50 o 50.25"
                  onChange={(e) => {                   
                    setMaintenance(e.target.value);
                    if (errors.maintenance) setErrors((p) => ({ ...p, maintenance: undefined }));
                  }}
                />
                {errors.maintenance && <span className="error">{errors.maintenance}</span>}
              </div>

                <button className="navlink active" type="submit" disabled={!isEditing}>
                    Crear
                </button>
            </form>


            <div className="table-wrap">
            <table className="table">
            <thead>
                <tr>
                <th>Nombre</th>
                <th>Capital</th>
                <th>Mantenimiento</th>
                <th>Estado</th>
                <th className="right">Acciones</th>
                </tr>
            </thead>

            <tbody>
                {users.map((u) => (
                <tr key={u.id} className={!u.active ? "row-inactive" : ""}>
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

                    <td>
                    <span className={u.active ? "badge ok" : "badge off"}>
                        {u.active ? "Activo" : "Inactivo"}
                    </span>
                    </td>

                    <td className="right">
                    {u.active ? (
                        <button
                        className="btn danger"
                        onClick={() => updateUser(u.id, { active: false })}
                        type="button"
                        >
                        Desactivar
                        </button>
                    ) : (
                        <button
                        className="btn success"
                        onClick={() => updateUser(u.id, { active: true })}
                        type="button"
                        >
                        Reactivar
                        </button>
                    )}

                    {/* <button
                        className="btn ghost"
                        onClick={() => hardDeleteUser(u.id)}
                        type="button"
                        title="Eliminar definitivo"
                    >
                        Borrar
                    </button> */}
                    </td>
                </tr>
                ))}

                {users.length === 0 && (
                <tr>
                    <td colSpan={5} style={{ padding: 16 }}>
                    No hay usuarios. Crea el primero arriba.
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
