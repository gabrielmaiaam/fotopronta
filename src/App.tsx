import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Galerias from "./pages/Galerias";
import GaleriaDetail from "./pages/GaleriaDetail";
import Pedidos from "./pages/Pedidos";
import Pagamentos from "./pages/Pagamentos";
import MetaAds from "./pages/MetaAds";
import Configuracoes from "./pages/Configuracoes";
import GaleriaPublica from "./pages/GaleriaPublica";
import PreviaRapida from "./pages/PreviaRapida";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/galeria/:link" element={<GaleriaPublica />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/galerias" element={<Galerias />} />
              <Route path="/galerias/:id" element={<GaleriaDetail />} />
              <Route path="/previa-rapida" element={<PreviaRapida />} />
              <Route path="/pedidos" element={<Pedidos />} />
              <Route path="/financeiro" element={<Pagamentos />} />
              <Route path="/meta-ads" element={<MetaAds />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
