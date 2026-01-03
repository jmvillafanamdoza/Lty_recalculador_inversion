import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import UsersPage from "./pages/UsersPage";
import InvestmentPage from "./pages/InvestmentPage";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="topbar">
          <div className="brand">Lty Recalculador</div>

          <nav className="nav">
            <NavLink
              to="/"
              className={({ isActive }) => (isActive ? "navlink active" : "navlink")}
              end
            >
              Recalculador
            </NavLink>

            <NavLink
              to="/usuarios"
              className={({ isActive }) => (isActive ? "navlink active" : "navlink")}
            >
              Usuarios 
            </NavLink>
          </nav>
        </header>

        <main className="main">
          <Routes>
            <Route path="/" element={<InvestmentPage />} />
            <Route path="/usuarios" element={<UsersPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
