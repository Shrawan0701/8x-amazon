import { CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { StateMessage } from '../../components/common/StateMessage';
import { OrderSummary } from '../../components/checkout/OrderSummary';
import { orderService } from '../../services/orderService';
import { money } from '../../utils/money';

const fallbackImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"%3E%3Crect width="160" height="160" rx="20" fill="%23f6f3ec"/%3E%3Cpath d="M49 63h62l-7 48H56l-7-48Z" fill="none" stroke="%23141c1a" stroke-width="8" stroke-linejoin="round"/%3E%3Cpath d="M65 63a15 15 0 0 1 30 0" fill="none" stroke="%23141c1a" stroke-width="8" stroke-linecap="round"/%3E%3C/svg%3E';

export function OrderDetailsPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    orderService.detail(id).then(({ data }) => setData(data));
  }, [id]);

  if (!data) return <StateMessage title="Loading order..." />;

  return (
    <div className="page order-detail-page">
      <div className="success"><CheckCircle2 size={34} /><div><p className="eyebrow">Confirmed order</p><h1>{data.order.order_number}</h1><p>{new Date(data.order.created_at).toLocaleString()}</p></div></div>
      <div className="cart-layout">
        <section className="panel">
          <h2>Items</h2>
          <div className="order-items">{data.items.map((item) => (
            <div className="cart-item" key={item.id}>
              <img src={item.image_url || fallbackImage} alt={item.product_name} onError={(event) => { event.currentTarget.src = fallbackImage; }} />
              <div><strong>{item.product_name}</strong><p>{item.product_brand} · Qty {item.quantity}</p></div>
              <strong>{money(item.total_cents)}</strong>
            </div>
          ))}</div>
        </section>
        <div className="detail-sidebar">
          <OrderSummary cart={data.order} />
          <section className="summary info-card">
            <h3>Delivery</h3>
            {data.address ? (
              <p>{data.address.full_name}<br />{data.address.line1}{data.address.line2 ? `, ${data.address.line2}` : ''}<br />{data.address.city}, {data.address.state} {data.address.postal_code}<br />{data.address.country}</p>
            ) : <p>Address unavailable</p>}
          </section>
          <section className="summary info-card">
            <h3>Payment</h3>
            <p><span className={`status-pill ${data.order.payment_status}`}>{data.order.payment_status}</span></p>
            <p>{data.payment?.razorpay_payment_id || data.payment?.razorpay_order_id || 'Payment reference unavailable'}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
