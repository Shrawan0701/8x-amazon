import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StateMessage } from '../../components/common/StateMessage';
import { ProductFilters } from '../../components/products/ProductFilters';
import { ProductGrid } from '../../components/products/ProductGrid';
import { ProductGridSkeleton } from '../../components/products/ProductGridSkeleton';
import { productService } from '../../services/productService';

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [facets, setFacets] = useState({ categories: [], brands: [] });
  const [loading, setLoading] = useState(true);
  const queryString = params.toString();

  useEffect(() => {
    setLoading(true);
    productService.search(queryString).then(({ data }) => {
      setProducts(data.products);
      setFacets(data.facets || {});
    }).finally(() => setLoading(false));
  }, [queryString]);

  function update(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  }

  return (
    <div className="page split">
      <ProductFilters params={params} facets={facets} onChange={update} />
      <section>
        <div className="section-head compact">
          <div>
            <p className="eyebrow">{products.length} results</p>
            <h2>{params.get('q') ? `Search for "${params.get('q')}"` : 'All products'}</h2>
          </div>
        </div>
        {loading ? <ProductGridSkeleton /> : products.length ? <ProductGrid products={products} /> : <StateMessage title="No products found" text="Try a broader search or remove a filter." />}
      </section>
    </div>
  );
}
