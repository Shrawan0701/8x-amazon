import { api } from './api';

export const emptyCart = { items: [], subtotal_cents: 0, delivery_cents: 0, total_cents: 0 };

export const cartService = {
  get: () => api.get('/cart'),
  addItem: (productId, quantity = 1) => api.post('/cart/items', { productId, quantity }),
  updateItem: (id, quantity) => api.patch(`/cart/items/${id}`, { quantity }),
  removeItem: (id) => api.delete(`/cart/items/${id}`)
};
