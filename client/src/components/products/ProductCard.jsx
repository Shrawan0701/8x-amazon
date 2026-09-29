import { Star } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../hooks/useApp';
import { money } from '../../utils/money';

export function ProductCard({ product }) {
  const { addToCart, user } = useApp();
  const navigate = useNavigate();
  const image = product.images?.[0]?.url || '';

  return (
    <article className="product-card">
      <Link to={`/products/${product.slug}`} className="product-image"><img src={image} alt={product.name} /></Link>
      <div className="product-body">
        <span className="brand-name">{product.brand}</span>
        <Link to={`/products/${product.slug}`} className="product-title">{product.name}</Link>
        <div className="rating"><Star size={15} fill="currentColor" /> {product.rating} <span>({product.review_count})</span></div>
        <div className="price-row"><strong>{money(product.price_cents)}</strong>{product.old_price_cents && <del>{money(product.old_price_cents)}</del>}</div>
        <button className="wide" onClick={() => user ? addToCart(product.id) : navigate('/login')}>Add to cart</button>
      </div>
    </article>
  );
}
