import { api } from './api';

export const productService = {
  featured: () => api.get('/products/featured'),
  search: (queryString = '') => api.get(`/products?${queryString}`),
  detail: (slug) => api.get(`/products/${slug}`)
};
