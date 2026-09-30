import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OrderSummary } from '../../components/checkout/OrderSummary';
import { useApp } from '../../hooks/useApp';
import { accountService } from '../../services/accountService';
import { orderService } from '../../services/orderService';

const initialAddress = { fullName: '', phone: '', line1: '', line2: '', city: '', state: '', postalCode: '', country: 'India' };

export function CheckoutPage() {
  const { cart, refreshCart } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialAddress);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    accountService.profile().then(({ data }) => {
      const address = data.addresses?.find((item) => item.is_default) || data.addresses?.[0];
      if (address) {
        setForm({
          fullName: address.full_name,
          phone: address.phone,
          line1: address.line1,
          line2: address.line2 || '',
          city: address.city,
          state: address.state,
          postalCode: address.postal_code,
          country: address.country
        });
      }
    }).catch(() => {});
  }, []);

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
          try {
            const verified = await orderService.verifyPayment({ orderId: data.order.id, ...response });
            await refreshCart();
            navigate(`/orders/${verified.data.order.id}`);
          } catch (err) {
            setError(err.response?.data?.message || 'Payment verification failed. Please contact support with your payment ID.');
            setProcessing(false);
          }
        },
        modal: { ondismiss: () => setProcessing(false) }
      });
      checkout.on('payment.failed', (response) => {
        setError(response.error?.description || 'Payment failed. Please try again.');
        setProcessing(false);
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
        <p className="eyebrow">Secure payment</p>
        <h1>Checkout</h1>
        <p className="muted">Confirm your delivery details before opening Razorpay checkout.</p>
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
