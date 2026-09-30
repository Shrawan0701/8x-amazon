import { useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService';
import { cartService, emptyCart } from '../services/cartService';
import { AppContext } from './appContextValue';

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState(emptyCart);
  const [booting, setBooting] = useState(true);
  const [toast, setToast] = useState(null);

  async function refreshCart() {
    try {
      const { data } = await cartService.get();
      setCart(data.cart);
    } catch {
      setCart(emptyCart);
    }
  }

  async function refreshUser() {
    try {
      const { data } = await authService.me();
      setUser(data.user);
      await refreshCart();
    } catch {
      setUser(null);
    } finally {
      setBooting(false);
    }
  }

  function notify(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2600);
  }

  async function addToCart(productId, quantity = 1) {
    const { data } = await cartService.addItem(productId, quantity);
    setCart(data.cart);
    notify('Added to cart');
  }

  useEffect(() => {
    refreshUser();
  }, []);

  const value = useMemo(() => ({
    user,
    setUser,
    cart,
    setCart,
    booting,
    refreshCart,
    refreshUser,
    addToCart,
    toast,
    notify
  }), [user, cart, booting, toast]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
