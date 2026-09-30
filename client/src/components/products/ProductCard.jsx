import { Heart, ShoppingCart, Star } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../hooks/useApp';
import { discountPercent, money } from '../../utils/money';

export function ProductCard({ product }) {
  const { addToCart, user } = useApp();
  const navigate = useNavigate();
  const image = product.images?.[0]?.url || '';
  const discount = discountPercent(product.price_cents, product.old_price_cents);

  return (
    <article className="product-card">
      <div className="product-media">
        {discount && <span className="deal-badge">{discount}% off</span>}
        <button className="wishlist-button" title="Save for later"><Heart size={17} /></button>
        <Link to={`/products/${product.slug}`} className="product-image"><img src={image} alt={product.name} loading="lazy" /></Link>
      </div>
      <div className="product-body">
        <span className="brand-name">{product.brand}</span>
        <Link to={`/products/${product.slug}`} className="product-title">{product.name}</Link>
        <div className="rating"><Star size={15} fill="currentColor" /> {product.rating} <span>({product.review_count})</span></div>
        <div className="price-row"><strong>{money(product.price_cents)}</strong>{product.old_price_cents && <del>{money(product.old_price_cents)}</del>}</div>
        <button className="wide product-cta" onClick={() => user ? addToCart(product.id) : navigate('/login')}><ShoppingCart size={17} /> Add to cart</button>
      </div>
    </article>
  );
}
