import { Outlet } from 'react-router-dom';
import { useApp } from '../../hooks/useApp';
import { Toast } from '../common/Toast';
import { Header } from './Header';

export function AppLayout() {
  const { toast } = useApp();
  return (
    <>
      <Header />
      <Toast message={toast} />
      <main>
        <Outlet />
      </main>
    </>
  );
}
