create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) >= 2),
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists password_reset_otps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  otp_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text not null default ''
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id),
  name text not null,
  slug text not null unique,
  brand text not null,
  description text not null,
  price_cents int not null check (price_cents > 0),
  old_price_cents int check (old_price_cents is null or old_price_cents >= price_cents),
  stock int not null default 0 check (stock >= 0),
  rating numeric(2,1) not null default 0,
  review_count int not null default 0,
  tags text[] not null default '{}',
  specs jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  url text not null,
  public_id text not null,
  alt text not null,
  position int not null default 0
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  product_id uuid not null references products(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  line1 text not null,
  line2 text,
  city text not null,
  state text not null,
  postal_code text not null,
  country text not null default 'India',
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  updated_at timestamptz not null default now()
);

create table if not exists cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references carts(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  quantity int not null check (quantity > 0 and quantity <= 20),
  unique(cart_id, product_id)
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete restrict,
  address_id uuid references addresses(id) on delete set null,
  order_number text not null unique,
  subtotal_cents int not null,
  delivery_cents int not null default 0,
  total_cents int not null,
  payment_status text not null default 'pending',
  order_status text not null default 'created',
  razorpay_order_id text unique,
  created_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  product_brand text not null,
  image_url text,
  quantity int not null check (quantity > 0),
  unit_price_cents int not null,
  total_cents int not null
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references orders(id) on delete cascade,
  razorpay_order_id text not null,
  razorpay_payment_id text,
  razorpay_signature text,
  amount_cents int not null,
  status text not null default 'created',
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists products_name_idx on products(name);
create index if not exists products_description_idx on products(description);
create index if not exists products_category_idx on products(category_id);
create index if not exists products_brand_idx on products(brand);
alter table addresses add column if not exists is_default boolean not null default false;
create index if not exists addresses_user_idx on addresses(user_id, is_default desc, created_at desc);
create index if not exists orders_user_idx on orders(user_id, created_at desc);
create index if not exists otps_user_idx on password_reset_otps(user_id, created_at desc);
