import { api } from './api';

export const voiceService = {
  fromAudio: (formData) => api.post('/ai/voice-intent', formData),
  fromText: (text) => api.post('/ai/text-intent', { text })
};
