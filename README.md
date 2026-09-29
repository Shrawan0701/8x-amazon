# Aurora Market

Aurora Market is a polished Amazon-inspired e-commerce marketplace built for the 8x Software Engineer assignment. It supports the full shopping loop: home, search/browse, product details, cart, checkout, Razorpay payment verification, confirmed orders, transactional email hooks, and AI-assisted voice/text shopping intent.

## Features

- React marketplace UI with responsive desktop, tablet and mobile layouts.
- Product search, category/brand filters, sorting, price filters and result counts.
- Product details with multiple Cloudinary-delivered image URLs, quantity controls and related products.
- Account signup/login/logout with hashed passwords and HTTP-only JWT session cookies.
- Forgot password flow with short-lived OTPs, attempt limits and Brevo email delivery.
- Authenticated cart with add, remove and quantity update.
- Checkout with shipping address, backend amount calculation and Razorpay Standard Checkout.
- Backend Razorpay signature verification before marking an order paid.
- Orders list and order detail pages.
- Brevo HTML emails for password reset OTP and order confirmation.
- OpenAI-backed voice/text shopping intent extraction through the backend.

## Tech Stack

- Frontend: React, JavaScript, CSS, Vite, React Router, Axios, Lucide icons.
- Backend: Node.js, Express, Zod validation, HTTP-only cookies.
- Database: PostgreSQL.
- External services: Razorpay, Brevo, Cloudinary-hosted/fetched image URLs, OpenAI.

## Architecture

```text
client/ React app
  -> /api/auth for sessions and password reset
  -> /api/products for search, filters and details
  -> /api/cart for authenticated cart state
  -> /api/orders for Razorpay order creation and verification
  -> /api/ai for audio/text -> structured shopping intent

server/
  src/routes     Express route modules
  src/services   payment/email/money helpers
  db/schema.sql  reproducible PostgreSQL schema
  db/seed.js     realistic starter catalog
```

## Local Setup

1. Install dependencies:

```bash
npm install
npm install --prefix client
npm install --prefix server
```

2. Create `.env` from `.env.example` and fill in service credentials.

3. Create a PostgreSQL database. The included Docker option uses port `5433` to avoid colliding with any existing local Postgres:

```bash
docker compose up -d postgres
```

Then run:

```bash
npm run db:schema
npm run db:seed
```

4. Start development servers:

```bash
npm run dev
```

The client runs on `http://localhost:5174` and the API on `http://localhost:5000`.

## Environment Variables

Do not commit real secrets.

- `DATABASE_URL`
- `JWT_SECRET`
- `CLIENT_URL`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `BREVO_API_KEY`
- `BREVO_SENDER_EMAIL`
- `BREVO_SENDER_NAME`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `OPENAI_API_KEY`

## Database

The schema includes:

- `users`
- `password_reset_otps`
- `categories`
- `products`
- `product_images`
- `reviews`
- `addresses`
- `carts`
- `cart_items`
- `orders`
- `order_items`
- `payments`

Run `npm run db:schema` after changing `server/db/schema.sql`.

## Payment Flow

1. Checkout sends the shipping address to the backend.
2. Backend reads the authenticated cart and calculates totals from database prices.
3. Backend creates a Razorpay order using server-side secrets.
4. Frontend opens Razorpay Standard Checkout with the returned `order_id`.
5. Frontend sends Razorpay payment response values back to the backend.
6. Backend verifies the signature with `RAZORPAY_KEY_SECRET`.
7. Only verified payments create order items, mark payment/order paid, clear the cart and send the Brevo order email.

Webhooks are intentionally not implemented because the assignment requested Standard Checkout without webhooks.

## Email Flow

Brevo sends:

- Password reset OTP emails with a 10-minute OTP.
- Order confirmation emails after verified payment.

If `BREVO_API_KEY` is missing in development, the server logs a safe dev email notice and does not expose OTPs or secrets to the frontend.

## AI / Voice Architecture

Voice shopping is intentionally constrained:

```text
browser microphone
-> backend /api/ai/voice-intent
-> OpenAI transcription
-> OpenAI structured output intent
-> frontend validates intent and navigates/searches/adds through normal app flows
```

Supported safe intents:

- `search_products`
- `open_product`
- `add_to_cart`
- `view_cart`

The model never executes raw database queries. It only returns a constrained JSON intent, and the application calls normal product/cart endpoints.

## Production Deployment Notes

- Build the client with `npm run build`.
- Set `NODE_ENV=production`.
- Start the server with `npm start`.
- The Express server serves `client/dist` in production and keeps `/api/*` routes on the same host.
- Configure the deployment platform with all required environment variables.
- The final product must be tested logged out/incognito so a reviewer who is not signed into the developer account can use it.

## Testing Checklist

- Signup, login, logout.
- Forgot password request, OTP verification, password reset.
- Search, filters, sorting and empty state.
- Product detail, quantity selection, related products.
- Add to cart, update quantity, remove item.
- Checkout address validation.
- Razorpay test payment success, cancel and failed verification.
- Order history and order details.
- Brevo order confirmation email.
- Voice/text intent search and graceful OpenAI failure state.

## Product Decisions

- The product is inspired by Amazon's shopping loop, not copied visually.
- The visual identity uses warm editorial commerce styling with strong cards and compact operational checkout flows.
- Seller/admin marketplace tooling is intentionally left out to focus on the buyer journey.
- Product images are stored as Cloudinary-style URLs/public IDs and delivered remotely; binaries are not stored in PostgreSQL.
- Webhooks are intentionally left out per assignment instructions.
