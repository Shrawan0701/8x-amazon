import { api } from './api';

export const accountService = {
  profile: () => api.get('/account/profile'),
  updateProfile: (payload) => api.patch('/account/profile', payload),
  addAddress: (payload) => api.post('/account/addresses', payload),
  updateAddress: (id, payload) => api.patch(`/account/addresses/${id}`, payload),
  deleteAddress: (id) => api.delete(`/account/addresses/${id}`)
};
