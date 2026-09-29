import { ArrowLeft, CreditCard, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { QuantityControl } from '../../components/cart/QuantityControl';
import { StateMessage } from '../../components/common/StateMessage';
import { ProductGrid } from '../../components/products/ProductGrid';
import { useApp } from '../../hooks/useApp';
import { productService } from '../../services/productService';
import { money } from '../../utils/money';

export function ProductPage() {
  const { slug } = useParams();
  const { addToCart, user } = useApp();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    productService.detail(slug).then(({ data }) => setData(data));
  }, [slug]);

  if (!data) return <StateMessage title="Loading product..." />;
  const { product, related } = data;
  const image = product.images?.[0]?.url;

  async function buyNow() {
    if (!user) return navigate('/login');
    await addToCart(product.id, quantity);
    return navigate('/checkout');
  }

  return (
    <div className="page">
      <Link className="back-link" to="/search"><ArrowLeft size={18} /> Back to results</Link>
      <section className="product-detail">
        <div className="gallery">
          <img src={image} alt={product.name} />
          <div>{product.images?.map((img) => <img key={img.publicId} src={img.url} alt={img.alt} />)}</div>
        </div>
        <div className="detail-info">
          <p className="eyebrow">{product.brand} / {product.category_name}</p>
          <h1>{product.name}</h1>
          <div className="rating"><Star size={16} fill="currentColor" /> {product.rating} from {product.review_count} reviews</div>
          <p>{product.description}</p>
          <div className="price-row big"><strong>{money(product.price_cents)}</strong>{product.old_price_cents && <del>{money(product.old_price_cents)}</del>}</div>
          <p className={product.stock > 0 ? 'stock good' : 'stock'}>{product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</p>
          <QuantityControl
            value={quantity}
            onDecrease={() => setQuantity(Math.max(1, quantity - 1))}
            onIncrease={() => setQuantity(Math.min(20, quantity + 1))}
          />
          <div className="detail-actions">
            <button className="primary" onClick={() => user ? addToCart(product.id, quantity) : navigate('/login')}>Add to cart</button>
            <button className="secondary" onClick={buyNow}><CreditCard size={18} /> Buy now</button>
          </div>
          <div className="specs">{Object.entries(product.specs || {}).map(([key, value]) => <div key={key}><span>{key}</span><strong>{value}</strong></div>)}</div>
        </div>
      </section>
      <section className="section-head"><div><p className="eyebrow">Related</p><h2>You may also like</h2></div></section>
      <ProductGrid products={related} />
    </div>
  );
}
