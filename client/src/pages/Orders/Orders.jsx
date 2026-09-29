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
    <div className="page">
      <h1>Orders</h1>
      {!orders.length ? <StateMessage title="No orders yet" text="Your confirmed purchases will appear here." /> : orders.map((order) => (
        <Link className="order-row" key={order.id} to={`/orders/${order.id}`}>
          <span>{order.order_number}</span>
          <span>{order.payment_status}</span>
          <strong>{money(order.total_cents)}</strong>
        </Link>
      ))}
    </div>
  );
}
