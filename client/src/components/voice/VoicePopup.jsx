import { Mic, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../hooks/useApp';
import { productService } from '../../services/productService';
import { voiceService } from '../../services/voiceService';

export function VoicePopup({ open, onClose }) {
  const { addToCart, user, notify } = useApp();
  const navigate = useNavigate();
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const frameRef = useRef(null);
  const silentSinceRef = useRef(null);
  const heardSpeechRef = useRef(false);
  const audioContextRef = useRef(null);
  const recognitionRef = useRef(null);
  const speechTextRef = useRef('');
  const noSpeechTimerRef = useRef(null);
  const processingRef = useRef(false);
  const suppressRecognitionEndRef = useRef(false);
  const autoStartedRef = useRef(false);
  const [state, setState] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');

  async function applyIntent(intent) {
    if (intent.intent === 'view_cart') {
      onClose();
      navigate('/cart');
      return;
    }

    if (intent.intent === 'search_products') {
      const params = new URLSearchParams();
      if (intent.query) params.set('q', intent.query);
      if (intent.brand) params.set('brand', intent.brand);
      if (intent.category) params.set('category', intent.category);
      if (intent.maxPrice) params.set('maxPrice', Math.round(intent.maxPrice));
      if (intent.minPrice) params.set('minPrice', Math.round(intent.minPrice));
      if (intent.sort) params.set('sort', intent.sort);
      if (!params.toString()) {
        setError('I did not catch a specific product request. Try "show me shoes" or "headphones under 3000".');
        return;
      }
      onClose();
      navigate(`/search?${params}`);
      return;
    }

    if (intent.intent === 'open_product' && intent.productName) {
      const { data } = await productService.search(`q=${encodeURIComponent(intent.productName)}`);
      if (data.products?.[0]) {
        onClose();
        navigate(`/products/${data.products[0].slug}`);
      }
      return;
    }

    if (intent.intent === 'add_to_cart' && intent.productName) {
      if (!user) {
        onClose();
        navigate('/login');
        return;
      }
      const { data } = await productService.search(`q=${encodeURIComponent(intent.productName)}`);
      if (data.products?.[0]) {
        await addToCart(data.products[0].id, intent.quantity || 1);
        notify('Added from voice command');
      }
    }
  }

  function stopRecording() {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    suppressRecognitionEndRef.current = true;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    clearTimeout(noSpeechTimerRef.current);
    noSpeechTimerRef.current = null;
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }

  async function processSpokenText(text) {
    const spoken = text.trim();
    if (processingRef.current) return;
    if (!spoken) {
      setError('I did not hear a shopping request. Tap the mic and try again.');
      setState('idle');
      return;
    }
    processingRef.current = true;
    setState('processing');
    try {
      const { data } = await voiceService.fromText(spoken);
      await applyIntent(data.intent);
      setState('idle');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Voice search failed.');
      setState('idle');
    } finally {
      processingRef.current = false;
    }
  }

  function startSpeechRecognitionOnly() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return false;

    clearTimeout(noSpeechTimerRef.current);
    speechTextRef.current = '';
    processingRef.current = false;
    suppressRecognitionEndRef.current = false;
    heardSpeechRef.current = false;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const text = Array.from(event.results)
        .map((result) => result[0]?.transcript || '')
        .join(' ')
        .trim();
      if (text) {
        heardSpeechRef.current = true;
        speechTextRef.current = text;
        clearTimeout(noSpeechTimerRef.current);
        noSpeechTimerRef.current = setTimeout(() => recognition.stop(), 900);
      }
    };
    recognition.onend = () => {
      clearTimeout(noSpeechTimerRef.current);
      recognitionRef.current = null;
      if (suppressRecognitionEndRef.current) return;
      processSpokenText(speechTextRef.current);
    };
    recognition.onerror = () => {
      clearTimeout(noSpeechTimerRef.current);
      recognitionRef.current = null;
      if (!speechTextRef.current) {
        setError('I did not hear a shopping request. Tap the mic and try again.');
        setState('idle');
      }
    };
    recognitionRef.current = recognition;
    recognition.start();
    noSpeechTimerRef.current = setTimeout(() => recognition.stop(), 3000);
    return true;
  }

  function watchSilence(stream) {
    const context = new AudioContext();
    audioContextRef.current = context;
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    const data = new Uint8Array(analyser.fftSize);
    source.connect(analyser);

    function tick() {
      analyser.getByteTimeDomainData(data);
      const volume = data.reduce((sum, value) => sum + Math.abs(value - 128), 0) / data.length;
      const now = Date.now();
      if (volume > 6) {
        heardSpeechRef.current = true;
        silentSinceRef.current = now;
      }
      if (!silentSinceRef.current) silentSinceRef.current = now;
      if (now - silentSinceRef.current > 3000) {
        context.close();
        audioContextRef.current = null;
        stopRecording();
        return;
      }
      frameRef.current = requestAnimationFrame(tick);
    }

    tick();
  }

  async function startListening() {
    setError('');
    setTranscript('');
    setState('listening');
    if (startSpeechRecognitionOnly()) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      silentSinceRef.current = Date.now();
      heardSpeechRef.current = false;
      speechTextRef.current = '';
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        setState('processing');
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
        streamRef.current?.getTracks().forEach((track) => track.stop());
        try {
          const speechText = speechTextRef.current.trim();
          if (!heardSpeechRef.current && !speechText) {
            setError('I did not hear a shopping request. Tap the mic and try again.');
            setState('idle');
            return;
          }
          let data;
          if (speechText) {
            const response = await voiceService.fromText(speechText);
            data = response.data;
          } else {
            const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
            const form = new FormData();
            form.append('audio', blob, 'voice.webm');
            const response = await voiceService.fromAudio(form);
            data = response.data;
          }
          setTranscript(data.transcript);
          await applyIntent(data.intent);
          setState('idle');
        } catch (err) {
          setError(err.response?.data?.message || err.message || 'Voice search failed.');
          setState('idle');
        }
      };
      recorder.start();
      watchSilence(stream);
    } catch (err) {
      setError(err.message || 'Microphone access was blocked.');
      setState('idle');
    }
  }

  function close() {
    stopRecording();
    autoStartedRef.current = false;
    onClose();
  }

  useEffect(() => {
    if (open && !autoStartedRef.current) {
      autoStartedRef.current = true;
      startListening();
    }
    if (!open) autoStartedRef.current = false;
  }, [open]);

  if (!open) return null;

  return (
    <div className="voice-popover" role="dialog" aria-label="Voice shopping">
      <button className="voice-close" onClick={close} title="Close voice shopping"><X size={18} /></button>
      <button className={`voice-orb ${state}`} onClick={state === 'idle' ? startListening : undefined} disabled={state !== 'idle'} title="Start voice shopping">
        <Mic size={28} />
      </button>
      <h3>Voice shopping</h3>
      <p>{state === 'listening' ? 'Listening. I will stop after 3 seconds of silence.' : state === 'processing' ? 'Processing your request...' : 'Tap the mic and say what you want to find.'}</p>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
