import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import PriceSegmentedSales from "./pages/PriceSegmentedSales";
import Top10Models from "./pages/Top10Models";
import EnergyTypeSales from "./pages/EnergyTypeSales";
import VehicleTypeSales from "./pages/VehicleTypeSales";
import NewEnergyCompanies from "./pages/NewEnergyCompanies";
import SingleCompanySales from "./pages/SingleCompanySales";
import { useState } from "react";
import { AuthContext } from './contexts/authContext';
import { Empty } from './components/Empty';

export default function App() {
  // 简化认证状态管理
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  const logout = () => {
    setIsAuthenticated(false);
  };

  // 确保组件在各种环境下都能正常显示
  return (
    <div className="min-h-screen w-full flex flex-col">
      <AuthContext.Provider
        value={{ isAuthenticated, setIsAuthenticated, logout }}
      >
        <Routes>
           {/* 保持简单的路由配置，确保在GitHub Pages环境下正常工作 */}
          <Route path="/" element={<Home />} />
           <Route path="/price-segmented" element={<PriceSegmentedSales />} />
           {/* 为未来的页面预留路由 */}
           <Route path="/single-company" element={<SingleCompanySales />} />
           <Route path="/top-10-models" element={<Top10Models />} />
           <Route path="/energy-type" element={<EnergyTypeSales />} />
           <Route path="/vehicle-type" element={<VehicleTypeSales />} />
           <Route path="/new-energy-companies" element={<NewEnergyCompanies />} />
          {/* 添加通配符路由，确保任何未匹配的路径都显示Home组件 */}
          <Route path="*" element={<Home />} />
        </Routes>
      </AuthContext.Provider>
    </div>
  );
}
