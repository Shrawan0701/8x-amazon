import { Navigate } from 'react-router-dom';
import { AuthForm } from '../../components/auth/AuthForm';
import { StateMessage } from '../../components/common/StateMessage';
import { useApp } from '../../hooks/useApp';

export function LoginPage() {
  const { user, booting } = useApp();
  if (booting) return <StateMessage title="Loading your account..." />;
  if (user) return <Navigate to="/profile" replace />;
  return <div className="auth-page"><AuthForm mode="login" /></div>;
}
