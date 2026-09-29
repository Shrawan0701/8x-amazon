import { Minus, Plus } from 'lucide-react';

export function QuantityControl({ value, onDecrease, onIncrease }) {
  return (
    <div className="qty">
      <button onClick={onDecrease}><Minus size={16} /></button>
      <span>{value}</span>
      <button onClick={onIncrease}><Plus size={16} /></button>
    </div>
  );
}
