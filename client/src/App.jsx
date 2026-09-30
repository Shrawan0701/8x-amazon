import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { AppProvider } from './context/AppContext';
import { ProtectedRoute } from './hooks/useProtectedRoute';
import { CartPage } from './pages/Cart/Cart';
import { CheckoutPage } from './pages/Checkout/Checkout';
import { ForgotPasswordPage } from './pages/ForgotPassword/ForgotPassword';
import { Home } from './pages/Home/Home';
import { LoginPage } from './pages/Login/Login';
import { OrderDetailsPage } from './pages/OrderDetails/OrderDetails';
import { OrdersPage } from './pages/Orders/Orders';
import { ProductPage } from './pages/Product/Product';
import { ProfilePage } from './pages/Profile/Profile';
import { SearchPage } from './pages/Search/Search';
import { SignupPage } from './pages/Signup/Signup';
import { VoicePage } from './pages/Voice/Voice';
import './styles/app.css';

export default function App() {
  return (
    <AppProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/products/:slug" element={<ProductPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
          <Route path="/orders/:id" element={<ProtectedRoute><OrderDetailsPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/voice" element={<ProtectedRoute><VoicePage /></ProtectedRoute>} />
        </Route>
      </Routes>
    </AppProvider>
  );
}
