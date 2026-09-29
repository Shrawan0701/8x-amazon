export function ProductFilters({ params, facets, onChange }) {
  return (
    <aside className="filters">
      <h3>Refine</h3>
      <label>Category<select value={params.get('category') || ''} onChange={(event) => onChange('category', event.target.value)}>
        <option value="">All categories</option>
        {(facets.categories || []).map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}
      </select></label>
      <label>Brand<select value={params.get('brand') || ''} onChange={(event) => onChange('brand', event.target.value)}>
        <option value="">All brands</option>
        {(facets.brands || []).map((brand) => <option key={brand} value={brand}>{brand}</option>)}
      </select></label>
      <label>Max price<input type="number" value={params.get('maxPrice') || ''} onChange={(event) => onChange('maxPrice', event.target.value)} placeholder="5000" /></label>
      <label>Sort<select value={params.get('sort') || 'relevance'} onChange={(event) => onChange('sort', event.target.value)}>
        <option value="relevance">Best match</option>
        <option value="rating">Top rated</option>
        <option value="price_asc">Price low to high</option>
        <option value="price_desc">Price high to low</option>
        <option value="newest">Newest</option>
      </select></label>
    </aside>
  );
}
