import { CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { StateMessage } from '../../components/common/StateMessage';
import { OrderSummary } from '../../components/checkout/OrderSummary';
import { orderService } from '../../services/orderService';
import { money } from '../../utils/money';

export function OrderDetailsPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    orderService.detail(id).then(({ data }) => setData(data));
  }, [id]);

  if (!data) return <StateMessage title="Loading order..." />;

  return (
    <div className="page">
      <div className="success"><CheckCircle2 size={34} /><div><p className="eyebrow">Confirmed</p><h1>{data.order.order_number}</h1></div></div>
      <div className="order-items">{data.items.map((item) => (
        <div className="cart-item" key={item.id}>
          <img src={item.image_url} alt={item.product_name} />
          <div><strong>{item.product_name}</strong><p>Qty {item.quantity}</p></div>
          <strong>{money(item.total_cents)}</strong>
        </div>
      ))}</div>
      <OrderSummary cart={data.order} />
    </div>
  );
}
