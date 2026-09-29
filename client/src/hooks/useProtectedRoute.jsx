import { Navigate, useLocation } from 'react-router-dom';
import { StateMessage } from '../components/common/StateMessage';
import { useApp } from './useApp';

export function ProtectedRoute({ children }) {
  const { user, booting } = useApp();
  const location = useLocation();
  if (booting) return <StateMessage title="Loading your account..." />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
}
