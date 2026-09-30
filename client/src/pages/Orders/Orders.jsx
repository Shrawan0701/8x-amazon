import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StateMessage } from '../../components/common/StateMessage';
import { orderService } from '../../services/orderService';
import { money } from '../../utils/money';

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
            {(order.thumbnails || []).slice(0, 3).map((image, index) => <img key={`${order.id}-${index}`} src={image} alt="" />)}
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
