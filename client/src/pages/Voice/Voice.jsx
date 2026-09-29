import { Sparkles } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VoiceControls } from '../../components/voice/VoiceControls';
import { useApp } from '../../hooks/useApp';
import { productService } from '../../services/productService';
import { voiceService } from '../../services/voiceService';

export function VoicePage() {
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
      const { data } = await productService.search(`q=${encodeURIComponent(nextIntent.productName)}`);
      if (data.products?.[0]) navigate(`/products/${data.products[0].slug}`);
    }
    if (nextIntent.intent === 'add_to_cart' && nextIntent.productName) {
      const { data } = await productService.search(`q=${encodeURIComponent(nextIntent.productName)}`);
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
        const { data } = await voiceService.fromAudio(form);
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
      const { data } = await voiceService.fromText(text);
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
      <VoiceControls
        state={state}
        text={text}
        onTextChange={setText}
        onTextSubmit={submitText}
        onVoiceToggle={state === 'listening' ? () => mediaRef.current?.stop() : startVoice}
      />
      {state === 'processing' && <p className="notice">Processing...</p>}
      {transcript && <p className="notice">Transcript: {transcript}</p>}
      {intent && <pre>{JSON.stringify(intent, null, 2)}</pre>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
