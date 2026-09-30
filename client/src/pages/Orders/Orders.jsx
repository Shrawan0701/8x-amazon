import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StateMessage } from '../../components/common/StateMessage';
import { orderService } from '../../services/orderService';
import { money } from '../../utils/money';

const fallbackThumb = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"%3E%3Crect width="96" height="96" rx="48" fill="%23f6f3ec"/%3E%3Cpath d="M30 38h36l-4 28H34l-4-28Z" fill="none" stroke="%23141c1a" stroke-width="5" stroke-linejoin="round"/%3E%3Cpath d="M39 38a9 9 0 0 1 18 0" fill="none" stroke="%23141c1a" stroke-width="5" stroke-linecap="round"/%3E%3C/svg%3E';

export function OrdersPage() {
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    orderService.list().then(({ data }) => setOrders(data.orders));
  }, []);

  if (!orders) return <StateMessage title="Loading orders..." />;

  return (
    <div className="page orders-page">
      <div className="section-head">
        <div><p className="eyebrow">Purchases</p><h1>Orders</h1></div>
      </div>
      {!orders.length ? <StateMessage title="No orders yet" text="Your confirmed purchases will appear here." /> : orders.map((order) => (
        <Link className="order-row" key={order.id} to={`/orders/${order.id}`}>
          <div className="order-thumbs">
            {((order.thumbnails || []).length ? order.thumbnails : [fallbackThumb]).slice(0, 3).map((image, index) => (
              <img key={`${order.id}-${index}`} src={image || fallbackThumb} alt="" onError={(event) => { event.currentTarget.src = fallbackThumb; }} />
            ))}
          </div>
          <div>
            <strong>{order.order_number}</strong>
            <span>{new Date(order.created_at).toLocaleDateString()} · {order.item_count || 0} item{order.item_count === 1 ? '' : 's'}</span>
          </div>
          <span className={`status-pill ${order.payment_status}`}>{order.payment_status}</span>
          <strong>{money(order.total_cents)}</strong>
        </Link>
      ))}
    </div>
  );
}
