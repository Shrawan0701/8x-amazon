import { Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { money } from '../../utils/money';
import { QuantityControl } from './QuantityControl';

export function CartItem({ item, onUpdate, onRemove }) {
  return (
    <div className="cart-item">
      <img src={item.image_url} alt={item.name} />
      <div>
        <Link to={`/products/${item.slug}`}>{item.name}</Link>
        <p>{item.brand}</p>
        <strong>{money(item.price_cents)}</strong>
      </div>
      <QuantityControl
        value={item.quantity}
        onDecrease={() => onUpdate(item.id, Math.max(1, item.quantity - 1))}
        onIncrease={() => onUpdate(item.id, item.quantity + 1)}
      />
      <button className="icon-link" onClick={() => onRemove(item.id)}><Trash2 size={18} /></button>
    </div>
  );
}
