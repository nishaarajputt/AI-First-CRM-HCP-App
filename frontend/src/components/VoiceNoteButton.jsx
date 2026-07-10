import { useCallback, useRef, useState } from "react";
import {
  grantVoiceConsent,
  hasVoiceConsent,
  useSpeechRecognition,
} from "../hooks/useSpeechRecognition";

export default function VoiceNoteButton({ onTranscript, initialText = "", className = "" }) {
  const [showConsent, setShowConsent] = useState(false);
  const [error, setError] = useState("");
  const baseRef = useRef("");
  const finalRef = useRef("");

  const handleTranscript = useCallback(
    ({ final, interim }) => {
      if (final) {
        finalRef.current = finalRef.current ? `${finalRef.current} ${final}` : final;
      }
      const text = [baseRef.current, finalRef.current, interim]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      onTranscript(text);
    },
    [onTranscript]
  );

  const { listening, supported, toggle, stop } = useSpeechRecognition({
    onTranscript: handleTranscript,
    onError: setError,
  });

  const begin = () => {
    setError("");
    if (listening) {
      stop();
      return;
    }
    if (!supported) {
      setError("Voice input requires Chrome, Edge, or Safari.");
      return;
    }
    if (!hasVoiceConsent()) {
      setShowConsent(true);
      return;
    }
    baseRef.current = initialText.trim();
    finalRef.current = "";
    toggle();
  };

  const accept = () => {
    grantVoiceConsent();
    setShowConsent(false);
    baseRef.current = initialText.trim();
    finalRef.current = "";
    toggle();
  };

  return (
    <div className={`voice-note-wrap ${className}`}>
      <button
        type="button"
        className={`voice-note-link${listening ? " active" : ""}`}
        onClick={begin}
      >
        {listening ? "⏹ Stop voice note" : "🎙️ Summarize from Voice Note (Requires Consent)"}
      </button>
      {showConsent && (
        <div className="voice-consent inline">
          <p>Allow microphone access to dictate into this field?</p>
          <div className="voice-consent-actions">
            <button type="button" className="btn-inline ghost" onClick={() => setShowConsent(false)}>
              Cancel
            </button>
            <button type="button" className="btn-inline" onClick={accept}>
              Allow
            </button>
          </div>
        </div>
      )}
      {listening && <span className="voice-note-hint">Listening…</span>}
      {error && <span className="voice-note-error">{error}</span>}
    </div>
  );
}
