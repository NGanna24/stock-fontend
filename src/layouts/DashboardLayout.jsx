// layouts/DashboardLayout.jsx
import { Outlet } from "react-router-dom"; // Important !
import Sidebar from "../components/Dashboard/Sidebar/Sidebar";
import Header from "../components/Dashboard/Header/Header";
import "./DashboardLayout.css";

const DashboardLayout = () => {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-main">
        <Header />
        <main className="dashboard-content">
          <Outlet /> {/* Remplacer {children} par Outlet */}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;