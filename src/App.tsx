import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index.tsx";
import JobsPage from "./pages/JobsPage.tsx";
import JobDetailPage from "./pages/JobDetailPage.tsx";
import PostJobPage from "./pages/PostJobPage.tsx";
import AdminPage from "./pages/AdminPage.tsx";
import AdminLoginPage from "./pages/AdminLoginPage.tsx";
import AuthPage from "./pages/AuthPage.tsx";
import ChatPage from "./pages/ChatPage.tsx";
import ProfilePage from "./pages/ProfilePage.tsx";
import KYCPage from "./pages/KYCPage.tsx";
import NotFound from "./pages/NotFound.tsx";
import PublicProfilePage from "./pages/PublicProfilePage.tsx";
import { BottomNavigation } from "@/components/BottomNavigation";
import { AIAssistant } from "@/components/AIAssistant";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="pb-16 md:pb-0 min-h-screen flex flex-col">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/jobs" element={<JobsPage />} />
                <Route path="/jobs/:id" element={<JobDetailPage />} />
                <Route path="/post" element={<PostJobPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/admin-login" element={<AdminLoginPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/kyc" element={<KYCPage />} />
                <Route path="/user/:userId" element={<PublicProfilePage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <BottomNavigation />
              <AIAssistant />
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
