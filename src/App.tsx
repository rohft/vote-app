import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { DataProvider } from "@/contexts/DataContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Municipalities from "@/pages/Municipalities";
import MunicipalityWizard from "@/pages/MunicipalityWizard";
import MunicipalityDetail from "@/pages/MunicipalityDetail";
import VoterTable from "@/pages/VoterTable";
import Analytics from "@/pages/Analytics";
import Segments from "@/pages/Segments";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LanguageProvider>
        <DataProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/municipalities" element={<Municipalities />} />
                  <Route path="/create-municipality" element={<MunicipalityWizard />} />
                  <Route path="/municipality/:id" element={<MunicipalityDetail />} />
                  <Route path="/voters" element={<VoterTable />} />
                  <Route path="/segments" element={<Segments />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Layout>
            </BrowserRouter>
          </TooltipProvider>
        </DataProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
