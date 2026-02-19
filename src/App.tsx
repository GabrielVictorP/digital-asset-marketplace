import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useParams } from "react-router-dom";
import { useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";

import { SupabaseAuthProvider } from "@/contexts/SupabaseAuthContext";
import { SupabaseItemsProvider } from "@/contexts/SupabaseItemsContext";
import { Category } from "@/contexts/SupabaseItemsContext";
import Layout from "@/components/Layout";
import ScrollToTop from "@/components/ScrollToTop";
import PhoneNumberModal from "@/components/PhoneNumberModal";
import { usePhoneNumberCollection } from "@/hooks/usePhoneNumberCollection";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import RouteGuard from "@/components/RouteGuard";

import HomePage from "./pages/HomePage";
import CategoryPage from "./pages/CategoryPage";
import CreateItemPage from "./pages/CreateItemPage";
import DeleteItemPage from "./pages/DeleteItemPage";
import ProfitablePage from "./pages/ProfitablePage";
import AuthPage from "./pages/AuthPage";
import LoginPage from "./pages/LoginPage";
import UserDashboard from "./pages/UserDashboard";
import AccountSettingsPage from "./pages/AccountSettingsPage";
import EmailConfirmationPage from "./pages/EmailConfirmationPage";
import KKSPage from "./pages/KKSPage";
import AdminManagementPage from "./pages/AdminManagementPage";
import AdminItemsManagementPage from "./pages/AdminItemsManagementPage";
import CheckoutPage from "./pages/CheckoutPage";
import SalesPage from "./pages/SalesPage";
import PurchaseSuccessPage from "./pages/PurchaseSuccessPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Debug component removed for production

// Component wrapper to handle dynamic category routes
const DynamicCategoryPage = () => {
  const { category } = useParams<{ category: string }>();
  const validCategories: Category[] = ['kina', 'mage', 'pally', 'geral', 'outros', 'supercell', 'freefire', 'itens', 'promocoes'];

  if (!category || !validCategories.includes(category as Category)) {
    return <NotFound />;
  }

  return <CategoryPage category={category as Category} />;
};

// Component to handle phone number collection
const AppWithPhoneCollection = () => {
  const { showPhoneModal, handlePhoneNumberSaved, closePhoneModal, user } = usePhoneNumberCollection();

  return (
    <RouteGuard>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth/admin" element={<AuthPage />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/user/dashboard" element={<UserDashboard />} />
        <Route path="/account/settings" element={<AccountSettingsPage />} />
        <Route path="/email-confirmation" element={<EmailConfirmationPage />} />
        <Route path="/kina" element={<CategoryPage category="kina" />} />
        <Route path="/mage" element={<CategoryPage category="mage" />} />
        <Route path="/pally" element={<CategoryPage category="pally" />} />
        <Route path="/geral" element={<CategoryPage category="geral" />} />
        <Route path="/supercell" element={<CategoryPage category="supercell" />} />
        <Route path="/freefire" element={<CategoryPage category="freefire" />} />
        <Route path="/itens" element={<CategoryPage category="itens" />} />
        <Route path="/outros" element={<CategoryPage category="outros" />} />
        <Route path="/divulgacoes" element={<CategoryPage category="promocoes" />} />
        <Route path="/category/:category" element={<DynamicCategoryPage />} />
        <Route path="/create" element={<CreateItemPage />} />
        <Route path="/edit/:id" element={<CreateItemPage />} />
        <Route path="/delete" element={<DeleteItemPage />} />
        <Route path="/profitable" element={<ProfitablePage />} />
        <Route path="/kks" element={<KKSPage />} />
        <Route path="/admin-management" element={<AdminManagementPage />} />
        <Route path="/admin/items" element={<AdminItemsManagementPage />} />
        <Route path="/checkout/:itemId" element={<CheckoutPage />} />
        <Route path="/purchase-success/:orderId" element={<PurchaseSuccessPage />} />
        <Route path="/sales" element={<SalesPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      
      {/* Phone Number Collection Modal */}
      <PhoneNumberModal
        isOpen={showPhoneModal}
        onClose={closePhoneModal}
        onPhoneNumberSaved={handlePhoneNumberSaved}
        userEmail={user?.email || undefined}
      />
    </RouteGuard>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SupabaseAuthProvider>
      <SupabaseItemsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <Layout>
              <AppWithPhoneCollection />
            </Layout>
          </BrowserRouter>
          <Analytics />
        </TooltipProvider>
      </SupabaseItemsProvider>
    </SupabaseAuthProvider>
  </QueryClientProvider>
);

export default App;
