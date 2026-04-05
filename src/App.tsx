import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Index from "./pages/Index";
import JobsPage from "./pages/JobsPage";
import JobDetailPage from "./pages/JobDetailPage";
import PostJobPage from "./pages/PostJobPage";
import AdminPage from "./pages/AdminPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AuthPage from "./pages/AuthPage";
import ChatPage from "./pages/ChatPage";
import ProfilePage from "./pages/ProfilePage";
import KYCPage from "./pages/KYCPage";
import MyJobsPage from "./pages/MyJobsPage";
import NotFound from "./pages/NotFound";
import PublicProfilePage from "./pages/PublicProfilePage";
import { BottomNavigation } from "@/components/BottomNavigation";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 2 * 60 * 1000, retry: 1 },
  },
});

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
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
                <Route path="/my-jobs" element={<MyJobsPage />} />
                <Route path="/user/:userId" element={<PublicProfilePage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <BottomNavigation />
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
