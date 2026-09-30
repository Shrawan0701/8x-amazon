import { LogOut, Mic, Package, ShoppingCart, User } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../hooks/useApp';
import { authService } from '../../services/authService';
import { emptyCart } from '../../services/cartService';
import { VoicePopup } from '../voice/VoicePopup';
import { SearchBar } from './SearchBar';

export function Header() {
  const { user, cart, setUser, setCart } = useApp();
  const [voiceOpen, setVoiceOpen] = useState(false);
  const navigate = useNavigate();

  async function logout() {
    await authService.logout();
    setUser(null);
    setCart(emptyCart);
    navigate('/');
  }

  return (
    <header className="site-header">
      <Link className="brand" to="/">
        <span className="brand-mark">S</span>
        <span>ShopKart</span>
      </Link>
      <SearchBar />
      <nav className="nav-actions">
        <button className="icon-link" title="Voice search" onClick={() => setVoiceOpen(true)}><Mic size={19} /></button>
        {user ? (
          <>
            <Link to="/profile" className="icon-link account-link" title="Profile"><User size={19} /><span>{user.name?.split(' ')[0]}</span></Link>
            <Link to="/orders" className="icon-link" title="Orders"><Package size={19} /></Link>
            <button className="icon-link" onClick={logout} title="Logout"><LogOut size={19} /></button>
          </>
        ) : (
          <Link to="/login" className="icon-link"><User size={19} /> <span>Login</span></Link>
        )}
        <Link to="/cart" className="cart-link">
          <ShoppingCart size={19} />
          <span>{cart.items?.reduce((sum, item) => sum + item.quantity, 0) || 0}</span>
        </Link>
      </nav>
      <VoicePopup open={voiceOpen} onClose={() => setVoiceOpen(false)} />
    </header>
  );
}
