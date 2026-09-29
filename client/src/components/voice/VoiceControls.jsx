import { Mic } from 'lucide-react';

export function VoiceControls({ state, text, onTextChange, onTextSubmit, onVoiceToggle }) {
  return (
    <>
      <button className="primary mic-button" onClick={onVoiceToggle}>
        <Mic /> {state === 'listening' ? 'Stop listening' : 'Start listening'}
      </button>
      <form className="voice-text" onSubmit={onTextSubmit}>
        <input value={text} onChange={(event) => onTextChange(event.target.value)} placeholder="Find wireless headphones under 3000" />
        <button>Run</button>
      </form>
    </>
  );
}
