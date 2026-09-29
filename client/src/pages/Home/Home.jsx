import { Mic } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CategoryStrip } from '../../components/products/CategoryStrip';
import { ProductGrid } from '../../components/products/ProductGrid';
import { ProductGridSkeleton } from '../../components/products/ProductGridSkeleton';
import { productService } from '../../services/productService';

export function Home() {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productService.featured().then(({ data }) => setFeatured(data.products)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <section className="hero-band">
        <div>
          <p className="eyebrow">Fast finds. Verified checkout. Real orders.</p>
          <h1>Shop sharper picks for everyday motion.</h1>
          <p className="hero-copy">A polished marketplace for audio, footwear, home tech, travel and fitness essentials, with voice-powered shopping when typing slows you down.</p>
          <div className="hero-actions">
            <Link className="primary" to="/search">Browse products</Link>
            <Link className="secondary" to="/voice"><Mic size={18} /> Try voice search</Link>
          </div>
        </div>
        <div className="deal-panel">
          <span>Today&apos;s edit</span>
          <strong>Top-rated gear under Rs 5,000</strong>
          <Link to="/search?maxPrice=5000&sort=rating">Shop the edit</Link>
        </div>
      </section>
      <CategoryStrip />
      <section className="section-head">
        <div>
          <p className="eyebrow">Featured</p>
          <h2>Popular right now</h2>
        </div>
        <Link to="/search">View all</Link>
      </section>
      {loading ? <ProductGridSkeleton /> : <ProductGrid products={featured} />}
    </div>
  );
}
