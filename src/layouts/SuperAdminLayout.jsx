// layouts/SuperAdminLayout.jsx
import { Outlet } from "react-router-dom";
import SuperAdminHeader from "../components/SuperAdmin/Header/Header";
import SuperAdminSidebar from "../components/SuperAdmin/Sidebar/Sidebar";

const SuperAdminLayout = () => {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F8FAFC" }}>
      <SuperAdminSidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <SuperAdminHeader />
        <main style={{ flex: 1 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;