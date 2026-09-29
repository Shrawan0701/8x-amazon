import { Link, useNavigate } from 'react-router-dom';
import { CartItem } from '../../components/cart/CartItem';
import { StateMessage } from '../../components/common/StateMessage';
import { OrderSummary } from '../../components/checkout/OrderSummary';
import { useApp } from '../../hooks/useApp';
import { cartService } from '../../services/cartService';

export function CartPage() {
  const { cart, setCart, user } = useApp();
  const navigate = useNavigate();

  async function update(id, quantity) {
    const { data } = await cartService.updateItem(id, quantity);
    setCart(data.cart);
  }

  async function remove(id) {
    const { data } = await cartService.removeItem(id);
    setCart(data.cart);
  }

  if (!user) {
    return (
      <div className="page">
        <StateMessage title="Log in to use your cart" text="Your cart and orders are protected behind your account." />
        <Link className="primary" to="/login">Log in</Link>
      </div>
    );
  }

  return (
    <div className="page cart-layout">
      <section>
        <h1>Your cart</h1>
        {!cart.items.length ? <StateMessage title="Your cart is empty" text="Find something worth bringing home." /> : cart.items.map((item) => (
          <CartItem key={item.id} item={item} onUpdate={update} onRemove={remove} />
        ))}
      </section>
      <OrderSummary cart={cart} action={<button className="primary wide" disabled={!cart.items.length} onClick={() => navigate('/checkout')}>Proceed to checkout</button>} />
    </div>
  );
}
