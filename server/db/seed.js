import dotenv from 'dotenv';
import path from 'path';
import pg from 'pg';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const categories = [
  ['Audio', 'audio', 'Headphones, earbuds, speakers and creator audio gear.'],
  ['Footwear', 'footwear', 'Running, walking and lifestyle shoes.'],
  ['Home Tech', 'home-tech', 'Useful connected products for modern homes.'],
  ['Travel', 'travel', 'Bags, accessories and everyday carry.'],
  ['Fitness', 'fitness', 'Training essentials and recovery gear.']
];

const products = [
  ['audio', 'PulseWave ANC Headphones', 'PulseWave', 'Immersive wireless headphones with adaptive noise cancellation, 42-hour battery life and low-latency gaming mode.', 299900, 449900, 34, 4.6, 1842, ['wireless', 'headphones', 'anc'], { Battery: '42 hours', Connectivity: 'Bluetooth 5.3', Warranty: '1 year' }],
  ['audio', 'Auralite Pocket Buds Pro', 'Auralite', 'Compact earbuds with crisp calls, punchy bass and pocketable charging case.', 189900, 249900, 52, 4.4, 933, ['earbuds', 'wireless', 'commute'], { Battery: '30 hours with case', Water: 'IPX5', Charging: 'USB-C' }],
  ['footwear', 'Nike Air Max 270 Move', 'Nike', 'Cushioned lifestyle sneaker inspired by running silhouettes with breathable mesh and bold heel support.', 899900, 1199900, 16, 4.7, 2611, ['nike', 'running shoes', 'sneakers'], { Fit: 'Regular', Upper: 'Mesh', Sole: 'Air cushion' }],
  ['footwear', 'StrideFlex Runner 4', 'StrideFlex', 'Lightweight road running shoe with responsive foam and stable heel geometry.', 379900, 499900, 41, 4.3, 618, ['running', 'training', 'under 5000'], { Weight: '248g', Drop: '8mm', Terrain: 'Road' }],
  ['home-tech', 'NestBright Smart Lamp Duo', 'NestBright', 'Two-pack smart table lamps with warm-to-cool light, schedules and voice assistant support.', 459900, 599900, 22, 4.5, 402, ['smart home', 'lamp', 'lighting'], { Lumens: '900 each', App: 'iOS/Android', Scenes: '24 presets' }],
  ['home-tech', 'KitchenMate Air Fryer 5L', 'KitchenMate', 'Compact family air fryer with clear presets and dishwasher-safe basket.', 649900, 799900, 19, 4.6, 1270, ['kitchen', 'air fryer', 'home'], { Capacity: '5L', Power: '1500W', Modes: '8 presets' }],
  ['travel', 'Northlane Weekender Pack', 'Northlane', 'Weather-resistant travel backpack with laptop vault, shoe pocket and quick-access tech panel.', 549900, 749900, 27, 4.8, 815, ['backpack', 'travel', 'laptop'], { Volume: '34L', Laptop: '16 inch', Material: 'Recycled nylon' }],
  ['travel', 'OrbitGo Cabin Spinner', 'OrbitGo', 'Hard-shell cabin luggage with silent wheels, TSA lock and compression dividers.', 699900, 999900, 13, 4.4, 514, ['luggage', 'travel', 'cabin'], { Size: '55cm', Weight: '2.8kg', Lock: 'TSA' }],
  ['fitness', 'FormPro Adjustable Dumbbell', 'FormPro', 'Space-saving dumbbell adjustable from 2.5kg to 24kg with secure dial lock.', 1199900, 1499900, 8, 4.7, 356, ['fitness', 'strength', 'weights'], { Range: '2.5-24kg', Increment: '2.5kg', Pair: 'Single' }],
  ['fitness', 'RecoverEase Massage Gun Mini', 'RecoverEase', 'Quiet portable massage gun with five speed modes and four heads.', 329900, 449900, 38, 4.2, 746, ['recovery', 'massage', 'fitness'], { Speeds: '5', Heads: '4', Noise: '<45dB' }]
];

function imageFor(name, i) {
  const query = encodeURIComponent(name);
  return {
    url: `https://res.cloudinary.com/demo/image/fetch/c_fill,w_900,h_900,q_auto,f_auto/https://source.unsplash.com/900x900/?${query}`,
    publicId: `aurora-market/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${i}`
  };
}

const client = await pool.connect();
try {
  await client.query('begin');
  for (const [name, slug, description] of categories) {
    await client.query(
      `insert into categories(name, slug, description) values($1,$2,$3)
       on conflict(slug) do update set name = excluded.name, description = excluded.description`,
      [name, slug, description]
    );
  }

  for (const product of products) {
    const [categorySlug, name, brand, description, price, oldPrice, stock, rating, reviewCount, tags, specs] = product;
    const { rows: categoryRows } = await client.query('select id from categories where slug=$1', [categorySlug]);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const { rows } = await client.query(
      `insert into products(category_id, name, slug, brand, description, price_cents, old_price_cents, stock, rating, review_count, tags, specs)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       on conflict(slug) do update set
        category_id=excluded.category_id, name=excluded.name, brand=excluded.brand, description=excluded.description,
        price_cents=excluded.price_cents, old_price_cents=excluded.old_price_cents, stock=excluded.stock,
        rating=excluded.rating, review_count=excluded.review_count, tags=excluded.tags, specs=excluded.specs
       returning id`,
      [categoryRows[0].id, name, slug, brand, description, price, oldPrice, stock, rating, reviewCount, tags, specs]
    );
    await client.query('delete from product_images where product_id=$1', [rows[0].id]);
    for (let i = 1; i <= 3; i += 1) {
      const image = imageFor(`${name} product ${i}`, i);
      await client.query(
        'insert into product_images(product_id, url, public_id, alt, position) values($1,$2,$3,$4,$5)',
        [rows[0].id, image.url, image.publicId, `${name} view ${i}`, i]
      );
    }
  }
  await client.query('commit');
  console.log('Seed catalog loaded.');
} catch (error) {
  await client.query('rollback');
  throw error;
} finally {
  client.release();
  await pool.end();
}
