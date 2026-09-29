import express from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, HttpError } from '../utils/http.js';

export const productsRouter = express.Router();

const listSchema = z.object({
  query: z.object({
    q: z.string().optional().default(''),
    category: z.string().optional(),
    brand: z.string().optional(),
    minPrice: z.coerce.number().int().nonnegative().optional(),
    maxPrice: z.coerce.number().int().positive().optional(),
    sort: z.enum(['relevance', 'price_asc', 'price_desc', 'rating', 'newest']).optional().default('relevance')
  })
});

function productSelect() {
  return `
    p.id, p.name, p.slug, p.brand, p.description, p.price_cents, p.old_price_cents,
    p.stock, p.rating, p.review_count, p.tags, p.specs, c.name as category_name, c.slug as category_slug,
    coalesce(json_agg(json_build_object('url', pi.url, 'publicId', pi.public_id, 'alt', pi.alt, 'position', pi.position)
      order by pi.position) filter (where pi.id is not null), '[]') as images
  `;
}

productsRouter.get('/', validate(listSchema), asyncHandler(async (req, res) => {
  const { q, category, brand, minPrice, maxPrice, sort } = req.validated.query;
  const values = [];
  const where = [];
  if (q) {
    values.push(q);
    where.push(`to_tsvector('english', p.name || ' ' || p.brand || ' ' || p.description || ' ' || array_to_string(p.tags, ' ')) @@ plainto_tsquery('english', $${values.length})`);
  }
  if (category) {
    values.push(category);
    where.push(`c.slug = $${values.length}`);
  }
  if (brand) {
    values.push(brand);
    where.push(`lower(p.brand) = lower($${values.length})`);
  }
  if (minPrice !== undefined) {
    values.push(minPrice * 100);
    where.push(`p.price_cents >= $${values.length}`);
  }
  if (maxPrice !== undefined) {
    values.push(maxPrice * 100);
    where.push(`p.price_cents <= $${values.length}`);
  }
  const orderBy = {
    relevance: q ? `ts_rank(to_tsvector('english', p.name || ' ' || p.brand || ' ' || p.description), plainto_tsquery('english', $1)) desc, p.rating desc` : 'p.rating desc',
    price_asc: 'p.price_cents asc',
    price_desc: 'p.price_cents desc',
    rating: 'p.rating desc, p.review_count desc',
    newest: 'p.created_at desc'
  }[sort];
  const { rows } = await query(
    `select ${productSelect()} from products p
     left join categories c on c.id=p.category_id
     left join product_images pi on pi.product_id=p.id
     ${where.length ? `where ${where.join(' and ')}` : ''}
     group by p.id, c.id
     order by ${orderBy}
     limit 60`,
    values
  );
  const facets = await query(`
    select
      (select json_agg(row_to_json(x)) from (select name, slug from categories order by name) x) as categories,
      (select json_agg(brand order by brand) from (select distinct brand from products) b) as brands
  `);
  res.json({ products: rows, count: rows.length, facets: facets.rows[0] });
}));

productsRouter.get('/featured', asyncHandler(async (_req, res) => {
  const { rows } = await query(
    `select ${productSelect()} from products p
     left join categories c on c.id=p.category_id
     left join product_images pi on pi.product_id=p.id
     group by p.id, c.id order by p.rating desc, p.review_count desc limit 8`
  );
  res.json({ products: rows });
}));

productsRouter.get('/:slug', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `select ${productSelect()} from products p
     left join categories c on c.id=p.category_id
     left join product_images pi on pi.product_id=p.id
     where p.slug=$1 group by p.id, c.id`,
    [req.params.slug]
  );
  if (!rows[0]) throw new HttpError(404, 'Product not found.');
  const related = await query(
    `select ${productSelect()} from products p
     left join categories c on c.id=p.category_id
     left join product_images pi on pi.product_id=p.id
     where c.slug=$1 and p.slug <> $2
     group by p.id, c.id order by p.rating desc limit 4`,
    [rows[0].category_slug, req.params.slug]
  );
  res.json({ product: rows[0], related: related.rows });
}));
