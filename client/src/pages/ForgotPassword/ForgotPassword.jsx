import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../../services/authService';

export function ForgotPasswordPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ email: '', otp: '', password: '' });
  const [message, setMessage] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (step === 1) {
      const { data } = await authService.forgotPassword(form.email);
      setMessage(data.message);
      setStep(2);
    } else {
      const { data } = await authService.resetPassword(form);
      setMessage(data.message);
      setStep(3);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>Reset password</h1>
        {step === 1 && <label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>}
        {step === 2 && (
          <>
            <label>OTP<input value={form.otp} onChange={(event) => setForm({ ...form, otp: event.target.value })} /></label>
            <label>New password<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
          </>
        )}
        {message && <p className="notice">{message}</p>}
        {step < 3 ? <button className="primary wide">{step === 1 ? 'Send OTP' : 'Reset password'}</button> : <Link className="primary wide" to="/login">Log in</Link>}
      </form>
    </div>
  );
}
