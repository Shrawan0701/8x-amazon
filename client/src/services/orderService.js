import { api } from './api';

export const orderService = {
  list: () => api.get('/orders'),
  detail: (id) => api.get(`/orders/${id}`),
  createPayment: (address) => api.post('/orders/create-payment', { address }),
  verifyPayment: (payload) => api.post('/orders/verify-payment', payload)
};
