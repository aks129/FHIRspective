import { BrowserRouter, Routes, Route } from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import NewAssessment from "@/pages/NewAssessment";
import AssessmentDetails from "@/pages/AssessmentDetails";
import Analytics from "@/pages/Analytics";
import Settings from "@/pages/Settings";
import AppLayout from "@/components/layout/AppLayout";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/assessments/new" element={<NewAssessment />} />
            <Route path="/assessments/:id" element={<AssessmentDetails />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
