import { money } from '../../utils/money';

export function OrderSummary({ cart, action }) {
  return (
    <aside className="summary">
      <h3>Order summary</h3>
      <div><span>Subtotal</span><strong>{money(cart.subtotal_cents)}</strong></div>
      <div><span>Delivery</span><strong>{cart.delivery_cents ? money(cart.delivery_cents) : 'Free'}</strong></div>
      <div className="total"><span>Total</span><strong>{money(cart.total_cents)}</strong></div>
      {action}
    </aside>
  );
}
