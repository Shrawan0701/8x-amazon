export function StateMessage({ title, text }) {
  return (
    <div className="state">
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </div>
  );
}
