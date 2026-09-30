import { Outlet } from 'react-router-dom';
import { useApp } from '../../hooks/useApp';
import { Toast } from '../common/Toast';
import { Header } from './Header';

export function AppLayout() {
  const { toast } = useApp();
  return (
    <>
      <Header />
      <Toast toast={toast} />
      <main>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div>
          <strong>Aurora Market</strong>
          <span>Curated tech, travel, fitness and lifestyle essentials.</span>
        </div>
        <nav>
          <a href="/search">Catalog</a>
          <a href="/orders">Orders</a>
        </nav>
      </footer>
    </>
  );
}
