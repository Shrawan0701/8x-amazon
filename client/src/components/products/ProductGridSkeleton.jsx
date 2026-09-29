export function ProductGridSkeleton() {
  return <div className="product-grid">{Array.from({ length: 8 }).map((_, index) => <div className="skeleton" key={index} />)}</div>;
}
