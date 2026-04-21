import { useState } from "react";
import AdminLogin from "./AdminLogin";
import AdminReservationList from "./AdminReservationList";

type AdminView = "login" | "list";

const STORAGE_KEY = "adminToken";

export default function AdminPage() {
  const storedToken = sessionStorage.getItem(STORAGE_KEY);
  const [adminToken, setAdminToken] = useState<string | null>(storedToken);
  const [view, setView] = useState<AdminView>(storedToken ? "list" : "login");

  if (view === "login" || !adminToken) {
    return (
      <AdminLogin
        onSuccess={(token) => {
          sessionStorage.setItem(STORAGE_KEY, token);
          setAdminToken(token);
          setView("list");
        }}
      />
    );
  }

  return (
    <AdminReservationList
      token={adminToken}
      onLogout={() => {
        sessionStorage.removeItem(STORAGE_KEY);
        setAdminToken(null);
        setView("login");
      }}
    />
  );
}
