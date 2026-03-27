import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index.tsx";
import JobsPage from "./pages/JobsPage.tsx";
import JobDetailPage from "./pages/JobDetailPage.tsx";
import PostJobPage from "./pages/PostJobPage.tsx";
import AdminPage from "./pages/AdminPage.tsx";
import AuthPage from "./pages/AuthPage.tsx";
import ChatPage from "./pages/ChatPage.tsx";
import ProfilePage from "./pages/ProfilePage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/jobs/:id" element={<JobDetailPage />} />
            <Route path="/post" element={<PostJobPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
