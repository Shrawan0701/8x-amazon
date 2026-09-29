import { Link } from 'react-router-dom';

const categories = [['Audio', 'audio'], ['Footwear', 'footwear'], ['Home Tech', 'home-tech'], ['Travel', 'travel'], ['Fitness', 'fitness']];

export function CategoryStrip() {
  return <div className="category-strip">{categories.map(([name, slug]) => <Link key={slug} to={`/search?category=${slug}`}>{name}</Link>)}</div>;
}
