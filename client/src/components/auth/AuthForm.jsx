import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useApp } from '../../hooks/useApp';
import { authService } from '../../services/authService';

export function AuthForm({ mode }) {
  const isSignup = mode === 'signup';
  const { setUser, refreshCart } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      const { data } = isSignup ? await authService.signup(form) : await authService.login(form);
      setUser(data.user);
      await refreshCart();
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed.');
    }
  }

  return (
    <form className="auth-card" onSubmit={submit}>
      <h1>{isSignup ? 'Create account' : 'Welcome back'}</h1>
      {isSignup && <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>}
      <label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
      <label>Password<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
      {isSignup && <label>Confirm password<input type="password" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} /></label>}
      {error && <p className="error">{error}</p>}
      <button className="primary wide">{isSignup ? 'Sign up' : 'Log in'}</button>
      <p>{isSignup ? 'Already have an account?' : 'New here?'} <Link to={isSignup ? '/login' : '/signup'}>{isSignup ? 'Log in' : 'Create one'}</Link></p>
      {!isSignup && <Link to="/forgot-password">Forgot password?</Link>}
    </form>
  );
}
