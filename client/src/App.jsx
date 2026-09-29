import axios from 'axios';
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  LogOut,
  Mic,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Sparkles,
  Star,
  Trash2,
  User
} from 'lucide-react';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import './App.css';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true
});

const AppContext = createContext(null);
const emptyCart = { items: [], subtotal_cents: 0, delivery_cents: 0, total_cents: 0 };

function money(cents) {
  return `Rs ${(Number(cents || 0) / 100).toLocaleString('en-IN')}`;
}

function useApp() {
  return useContext(AppContext);
}

function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState(emptyCart);
  const [booting, setBooting] = useState(true);
  const [toast, setToast] = useState('');

  async function refreshCart() {
    try {
      const { data } = await api.get('/cart');
      setCart(data.cart);
    } catch {
      setCart(emptyCart);
    }
  }

  async function refreshUser() {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      await refreshCart();
    } catch {
      setUser(null);
    } finally {
      setBooting(false);
    }
  }

  async function addToCart(productId, quantity = 1) {
    const { data } = await api.post('/cart/items', { productId, quantity });
    setCart(data.cart);
    setToast('Added to cart');
    setTimeout(() => setToast(''), 2200);
  }

  useEffect(() => {
    refreshUser();
  }, []);

  return (
    <AppContext.Provider value={{ api, user, setUser, cart, setCart, booting, refreshCart, addToCart, toast }}>
      {children}
    </AppContext.Provider>
  );
}

function Header() {
  const { user, cart, setUser, setCart } = useApp();
  const [term, setTerm] = useState('');
  const navigate = useNavigate();

  async function logout() {
    await api.post('/auth/logout');
    setUser(null);
    setCart(emptyCart);
    navigate('/');
  }

  function submit(event) {
    event.preventDefault();
    navigate(`/search?q=${encodeURIComponent(term)}`);
  }

  return (
    <header className="site-header">
      <Link className="brand" to="/">
        <span className="brand-mark">A</span>
        <span>Aurora Market</span>
      </Link>
      <form className="searchbar" onSubmit={submit}>
        <Search size={18} />
        <input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Search shoes, headphones, home tech..." />
        <button>Search</button>
      </form>
      <nav className="nav-actions">
        <Link to="/voice" className="icon-link" title="Voice search"><Mic size={19} /></Link>
        {user ? (
          <>
            <Link to="/orders" className="icon-link" title="Orders"><Package size={19} /></Link>
            <button className="icon-link" onClick={logout} title="Logout"><LogOut size={19} /></button>
          </>
        ) : (
          <Link to="/login" className="icon-link"><User size={19} /> <span>Login</span></Link>
        )}
        <Link to="/cart" className="cart-link">
          <ShoppingCart size={19} />
          <span>{cart.items?.reduce((sum, item) => sum + item.quantity, 0) || 0}</span>
        </Link>
      </nav>
    </header>
  );
}

function Layout() {
  const { toast } = useApp();
  return (
    <>
      <Header />
      {toast && <div className="toast">{toast}</div>}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/products/:slug" element={<ProductPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<Protected><CheckoutPage /></Protected>} />
          <Route path="/orders" element={<Protected><OrdersPage /></Protected>} />
          <Route path="/orders/:id" element={<Protected><OrderDetailPage /></Protected>} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/voice" element={<Protected><VoicePage /></Protected>} />
        </Routes>
      </main>
    </>
  );
}

function Protected({ children }) {
  const { user, booting } = useApp();
  const location = useLocation();
  if (booting) return <StateMessage title="Loading your account..." />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
}

function Home() {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/products/featured').then(({ data }) => setFeatured(data.products)).finally(() => setLoading(false));
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

function CategoryStrip() {
  const categories = [['Audio', 'audio'], ['Footwear', 'footwear'], ['Home Tech', 'home-tech'], ['Travel', 'travel'], ['Fitness', 'fitness']];
  return <div className="category-strip">{categories.map(([name, slug]) => <Link key={slug} to={`/search?category=${slug}`}>{name}</Link>)}</div>;
}

function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [facets, setFacets] = useState({ categories: [], brands: [] });
  const [loading, setLoading] = useState(true);
  const queryString = params.toString();

  useEffect(() => {
    setLoading(true);
    api.get(`/products?${queryString}`).then(({ data }) => {
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
      <aside className="filters">
        <h3>Refine</h3>
        <label>Category<select value={params.get('category') || ''} onChange={(event) => update('category', event.target.value)}>
          <option value="">All categories</option>
          {(facets.categories || []).map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}
        </select></label>
        <label>Brand<select value={params.get('brand') || ''} onChange={(event) => update('brand', event.target.value)}>
          <option value="">All brands</option>
          {(facets.brands || []).map((brand) => <option key={brand} value={brand}>{brand}</option>)}
        </select></label>
        <label>Max price<input type="number" value={params.get('maxPrice') || ''} onChange={(event) => update('maxPrice', event.target.value)} placeholder="5000" /></label>
        <label>Sort<select value={params.get('sort') || 'relevance'} onChange={(event) => update('sort', event.target.value)}>
          <option value="relevance">Best match</option>
          <option value="rating">Top rated</option>
          <option value="price_asc">Price low to high</option>
          <option value="price_desc">Price high to low</option>
          <option value="newest">Newest</option>
        </select></label>
      </aside>
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

function ProductGrid({ products }) {
  return <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>;
}

function ProductCard({ product }) {
  const { addToCart, user } = useApp();
  const navigate = useNavigate();
  const image = product.images?.[0]?.url || '';
  return (
    <article className="product-card">
      <Link to={`/products/${product.slug}`} className="product-image"><img src={image} alt={product.name} /></Link>
      <div className="product-body">
        <span className="brand-name">{product.brand}</span>
        <Link to={`/products/${product.slug}`} className="product-title">{product.name}</Link>
        <div className="rating"><Star size={15} fill="currentColor" /> {product.rating} <span>({product.review_count})</span></div>
        <div className="price-row"><strong>{money(product.price_cents)}</strong>{product.old_price_cents && <del>{money(product.old_price_cents)}</del>}</div>
        <button className="wide" onClick={() => user ? addToCart(product.id) : navigate('/login')}>Add to cart</button>
      </div>
    </article>
  );
}

function ProductPage() {
  const { slug } = useParams();
  const { addToCart, user } = useApp();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    api.get(`/products/${slug}`).then(({ data }) => setData(data));
  }, [slug]);

  if (!data) return <StateMessage title="Loading product..." />;
  const { product, related } = data;
  const image = product.images?.[0]?.url;

  async function buyNow() {
    if (!user) return navigate('/login');
    await addToCart(product.id, quantity);
    return navigate('/checkout');
  }

  return (
    <div className="page">
      <Link className="back-link" to="/search"><ArrowLeft size={18} /> Back to results</Link>
      <section className="product-detail">
        <div className="gallery">
          <img src={image} alt={product.name} />
          <div>{product.images?.map((img) => <img key={img.publicId} src={img.url} alt={img.alt} />)}</div>
        </div>
        <div className="detail-info">
          <p className="eyebrow">{product.brand} / {product.category_name}</p>
          <h1>{product.name}</h1>
          <div className="rating"><Star size={16} fill="currentColor" /> {product.rating} from {product.review_count} reviews</div>
          <p>{product.description}</p>
          <div className="price-row big"><strong>{money(product.price_cents)}</strong>{product.old_price_cents && <del>{money(product.old_price_cents)}</del>}</div>
          <p className={product.stock > 0 ? 'stock good' : 'stock'}>{product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</p>
          <div className="qty">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={16} /></button>
            <span>{quantity}</span>
            <button onClick={() => setQuantity(Math.min(20, quantity + 1))}><Plus size={16} /></button>
          </div>
          <div className="detail-actions">
            <button className="primary" onClick={() => user ? addToCart(product.id, quantity) : navigate('/login')}>Add to cart</button>
            <button className="secondary" onClick={buyNow}><CreditCard size={18} /> Buy now</button>
          </div>
          <div className="specs">{Object.entries(product.specs || {}).map(([key, value]) => <div key={key}><span>{key}</span><strong>{value}</strong></div>)}</div>
        </div>
      </section>
      <section className="section-head"><div><p className="eyebrow">Related</p><h2>You may also like</h2></div></section>
      <ProductGrid products={related} />
    </div>
  );
}

function CartPage() {
  const { cart, setCart, user } = useApp();
  const navigate = useNavigate();

  async function update(id, quantity) {
    const { data } = await api.patch(`/cart/items/${id}`, { quantity });
    setCart(data.cart);
  }

  async function remove(id) {
    const { data } = await api.delete(`/cart/items/${id}`);
    setCart(data.cart);
  }

  if (!user) return <AuthNudge />;
  return (
    <div className="page cart-layout">
      <section>
        <h1>Your cart</h1>
        {!cart.items.length ? <StateMessage title="Your cart is empty" text="Find something worth bringing home." /> : cart.items.map((item) => (
          <div className="cart-item" key={item.id}>
            <img src={item.image_url} alt={item.name} />
            <div>
              <Link to={`/products/${item.slug}`}>{item.name}</Link>
              <p>{item.brand}</p>
              <strong>{money(item.price_cents)}</strong>
            </div>
            <div className="qty">
              <button onClick={() => update(item.id, Math.max(1, item.quantity - 1))}><Minus size={16} /></button>
              <span>{item.quantity}</span>
              <button onClick={() => update(item.id, item.quantity + 1)}><Plus size={16} /></button>
            </div>
            <button className="icon-link" onClick={() => remove(item.id)}><Trash2 size={18} /></button>
          </div>
        ))}
      </section>
      <OrderSummary cart={cart} action={<button className="primary wide" disabled={!cart.items.length} onClick={() => navigate('/checkout')}>Proceed to checkout</button>} />
    </div>
  );
}

function OrderSummary({ cart, action }) {
  return (
    <aside className="summary">
      <h3>Order summary</h3>
      <div><span>Subtotal</span><strong>{money(cart.subtotal_cents)}</strong></div>
      <div><span>Delivery</span><strong>{cart.delivery_cents ? money(cart.delivery_cents) : 'Free'}</strong></div>
      <div className="total"><span>Total</span><strong>{money(cart.total_cents)}</strong></div>
      {action}
    </aside>
  );
}

function CheckoutPage() {
  const { cart, setCart } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', phone: '', line1: '', line2: '', city: '', state: '', postalCode: '', country: 'India' });
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  function field(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function pay() {
    setProcessing(true);
    setError('');
    try {
      const { data } = await api.post('/orders/create-payment', { address: form });
      if (!window.Razorpay) throw new Error('Razorpay checkout script is not loaded.');
      const checkout = new window.Razorpay({
        key: data.keyId,
        amount: data.razorpayOrder.amount,
        currency: 'INR',
        name: 'Aurora Market',
        description: data.order.order_number,
        order_id: data.razorpayOrder.id,
        handler: async (response) => {
          const verified = await api.post('/orders/verify-payment', { orderId: data.order.id, ...response });
          setCart(emptyCart);
          navigate(`/orders/${verified.data.order.id}`);
        },
        modal: { ondismiss: () => setProcessing(false) }
      });
      checkout.open();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Payment could not start.');
      setProcessing(false);
    }
  }

  return (
    <div className="page cart-layout">
      <section>
        <h1>Checkout</h1>
        <div className="form-grid">
          {[
            ['fullName', 'Full name'], ['phone', 'Phone'], ['line1', 'Address line 1'], ['line2', 'Address line 2'],
            ['city', 'City'], ['state', 'State'], ['postalCode', 'Postal code'], ['country', 'Country']
          ].map(([key, label]) => <label key={key}>{label}<input value={form[key]} onChange={(event) => field(key, event.target.value)} /></label>)}
        </div>
        {error && <p className="error">{error}</p>}
      </section>
      <OrderSummary cart={cart} action={<button className="primary wide" disabled={processing || !cart.items.length} onClick={pay}>{processing ? 'Processing...' : 'Pay with Razorpay'}</button>} />
    </div>
  );
}

function OrdersPage() {
  const [orders, setOrders] = useState(null);
  useEffect(() => { api.get('/orders').then(({ data }) => setOrders(data.orders)); }, []);
  if (!orders) return <StateMessage title="Loading orders..." />;
  return (
    <div className="page">
      <h1>Orders</h1>
      {!orders.length ? <StateMessage title="No orders yet" text="Your confirmed purchases will appear here." /> : orders.map((order) => (
        <Link className="order-row" key={order.id} to={`/orders/${order.id}`}>
          <span>{order.order_number}</span><span>{order.payment_status}</span><strong>{money(order.total_cents)}</strong>
        </Link>
      ))}
    </div>
  );
}

function OrderDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  useEffect(() => { api.get(`/orders/${id}`).then(({ data }) => setData(data)); }, [id]);
  if (!data) return <StateMessage title="Loading order..." />;
  return (
    <div className="page">
      <div className="success"><CheckCircle2 size={34} /><div><p className="eyebrow">Confirmed</p><h1>{data.order.order_number}</h1></div></div>
      <div className="order-items">{data.items.map((item) => (
        <div className="cart-item" key={item.id}><img src={item.image_url} alt={item.product_name} /><div><strong>{item.product_name}</strong><p>Qty {item.quantity}</p></div><strong>{money(item.total_cents)}</strong></div>
      ))}</div>
      <OrderSummary cart={data.order} />
    </div>
  );
}

function AuthPage({ mode }) {
  const isSignup = mode === 'signup';
  const { setUser, refreshCart } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      const { data } = await api.post(`/auth/${isSignup ? 'signup' : 'login'}`, form);
      setUser(data.user);
      await refreshCart();
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed.');
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>{isSignup ? 'Create account' : 'Welcome back'}</h1>
        {isSignup && <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>}
        <label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
        <label>Password<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
        {isSignup && <label>Confirm password<input type="password" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} /></label>}
        {error && <p className="error">{error}</p>}
        <button className="primary wide">{isSignup ? 'Sign up' : 'Log in'}</button>
        <p>{isSignup ? 'Already have an account?' : 'New here?'} <Link to={isSignup ? '/login' : '/signup'}>{isSignup ? 'Log in' : 'Create one'}</Link></p>
        {!isSignup && <Link to="/forgot-password">Forgot password?</Link>}
      </form>
    </div>
  );
}

function ForgotPasswordPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ email: '', otp: '', password: '' });
  const [message, setMessage] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (step === 1) {
      const { data } = await api.post('/auth/forgot-password', { email: form.email });
      setMessage(data.message);
      setStep(2);
    } else {
      const { data } = await api.post('/auth/reset-password', form);
      setMessage(data.message);
      setStep(3);
    }
  }

  return (
    <div className="auth-page"><form className="auth-card" onSubmit={submit}>
      <h1>Reset password</h1>
      {step === 1 && <label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>}
      {step === 2 && <><label>OTP<input value={form.otp} onChange={(event) => setForm({ ...form, otp: event.target.value })} /></label><label>New password<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label></>}
      {message && <p className="notice">{message}</p>}
      {step < 3 ? <button className="primary wide">{step === 1 ? 'Send OTP' : 'Reset password'}</button> : <Link className="primary wide" to="/login">Log in</Link>}
    </form></div>
  );
}

function VoicePage() {
  const { addToCart } = useApp();
  const navigate = useNavigate();
  const mediaRef = useRef(null);
  const chunks = useRef([]);
  const [state, setState] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [intent, setIntent] = useState(null);
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  async function applyIntent(nextIntent) {
    setIntent(nextIntent);
    if (nextIntent.intent === 'view_cart') navigate('/cart');
    if (nextIntent.intent === 'search_products') {
      const params = new URLSearchParams();
      if (nextIntent.query) params.set('q', nextIntent.query);
      if (nextIntent.brand) params.set('brand', nextIntent.brand);
      if (nextIntent.category) params.set('category', nextIntent.category);
      if (nextIntent.maxPrice) params.set('maxPrice', Math.round(nextIntent.maxPrice));
      if (nextIntent.minPrice) params.set('minPrice', Math.round(nextIntent.minPrice));
      if (nextIntent.sort) params.set('sort', nextIntent.sort);
      navigate(`/search?${params}`);
    }
    if (nextIntent.intent === 'open_product' && nextIntent.productName) {
      const { data } = await api.get(`/products?q=${encodeURIComponent(nextIntent.productName)}`);
      if (data.products?.[0]) navigate(`/products/${data.products[0].slug}`);
    }
    if (nextIntent.intent === 'add_to_cart' && nextIntent.productName) {
      const { data } = await api.get(`/products?q=${encodeURIComponent(nextIntent.productName)}`);
      if (data.products?.[0]) await addToCart(data.products[0].id, nextIntent.quantity || 1);
    }
  }

  async function startVoice() {
    setError('');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    mediaRef.current = recorder;
    chunks.current = [];
    recorder.ondataavailable = (event) => chunks.current.push(event.data);
    recorder.onstop = async () => {
      setState('processing');
      try {
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        const form = new FormData();
        form.append('audio', blob, 'voice.webm');
        const { data } = await api.post('/ai/voice-intent', form);
        setTranscript(data.transcript);
        await applyIntent(data.intent);
        setState('idle');
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Voice search failed.');
        setState('idle');
      }
      stream.getTracks().forEach((track) => track.stop());
    };
    recorder.start();
    setState('listening');
  }

  async function submitText(event) {
    event.preventDefault();
    setState('processing');
    try {
      const { data } = await api.post('/ai/text-intent', { text });
      setTranscript(data.transcript);
      await applyIntent(data.intent);
    } catch (err) {
      setError(err.response?.data?.message || 'Intent extraction failed.');
    } finally {
      setState('idle');
    }
  }

  return (
    <div className="page voice-page">
      <Sparkles size={38} />
      <h1>Voice shopping</h1>
      <p>Say "Show me Nike running shoes under 5000" or type the same command.</p>
      <button className="primary mic-button" onClick={state === 'listening' ? () => mediaRef.current?.stop() : startVoice}>
        <Mic /> {state === 'listening' ? 'Stop listening' : 'Start listening'}
      </button>
      <form className="voice-text" onSubmit={submitText}><input value={text} onChange={(event) => setText(event.target.value)} placeholder="Find wireless headphones under 3000" /><button>Run</button></form>
      {state === 'processing' && <p className="notice">Processing...</p>}
      {transcript && <p className="notice">Transcript: {transcript}</p>}
      {intent && <pre>{JSON.stringify(intent, null, 2)}</pre>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}

function AuthNudge() {
  return <div className="page"><StateMessage title="Log in to use your cart" text="Your cart and orders are protected behind your account." /><Link className="primary" to="/login">Log in</Link></div>;
}

function StateMessage({ title, text }) {
  return <div className="state"><h2>{title}</h2>{text && <p>{text}</p>}</div>;
}

function ProductGridSkeleton() {
  return <div className="product-grid">{Array.from({ length: 8 }).map((_, index) => <div className="skeleton" key={index} />)}</div>;
}

export default function App() {
  return <AppProvider><Layout /></AppProvider>;
}
