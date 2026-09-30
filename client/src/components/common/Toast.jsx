export function Toast({ toast }) {
  if (!toast?.message) return null;
  return <div className={`toast ${toast.type || 'success'}`}>{toast.message}</div>;
}
