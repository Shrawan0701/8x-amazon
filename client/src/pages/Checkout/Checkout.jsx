import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OrderSummary } from '../../components/checkout/OrderSummary';
import { useApp } from '../../hooks/useApp';
import { emptyCart } from '../../services/cartService';
import { orderService } from '../../services/orderService';

const initialAddress = { fullName: '', phone: '', line1: '', line2: '', city: '', state: '', postalCode: '', country: 'India' };

export function CheckoutPage() {
  const { cart, setCart } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialAddress);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  function field(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function pay() {
    setProcessing(true);
    setError('');
    try {
      const { data } = await orderService.createPayment(form);
      if (!window.Razorpay) throw new Error('Razorpay checkout script is not loaded.');
      const checkout = new window.Razorpay({
        key: data.keyId,
        amount: data.razorpayOrder.amount,
        currency: 'INR',
        name: 'Aurora Market',
        description: data.order.order_number,
        order_id: data.razorpayOrder.id,
        handler: async (response) => {
          const verified = await orderService.verifyPayment({ orderId: data.order.id, ...response });
          setCart(emptyCart);
          navigate(`/orders/${verified.data.order.id}`);
        },
        modal: { ondismiss: () => setProcessing(false) }
      });
      checkout.open();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Payment could not start.');
      setProcessing(false);
    }
  }

  return (
    <div className="page cart-layout">
      <section>
        <h1>Checkout</h1>
        <div className="form-grid">
          {[
            ['fullName', 'Full name'], ['phone', 'Phone'], ['line1', 'Address line 1'], ['line2', 'Address line 2'],
            ['city', 'City'], ['state', 'State'], ['postalCode', 'Postal code'], ['country', 'Country']
          ].map(([key, label]) => <label key={key}>{label}<input value={form[key]} onChange={(event) => field(key, event.target.value)} /></label>)}
        </div>
        {error && <p className="error">{error}</p>}
      </section>
      <OrderSummary cart={cart} action={<button className="primary wide" disabled={processing || !cart.items.length} onClick={pay}>{processing ? 'Processing...' : 'Pay with Razorpay'}</button>} />
    </div>
  );
}
