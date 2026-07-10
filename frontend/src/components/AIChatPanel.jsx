import { useCallback, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { sendMessage, pushUserMessage } from "../store/chatSlice";
import FollowupSuggestions from "./FollowupSuggestions";
import {
  grantVoiceConsent,
  hasVoiceConsent,
  useSpeechRecognition,
} from "../hooks/useSpeechRecognition";

function renderMessageContent(content, variant) {
  if (variant !== "success") return content;
  const parts = content.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  );
}

export default function AIChatPanel() {
  const dispatch = useDispatch();
  const { messages, sending } = useSelector((s) => s.chat);
  const [draft, setDraft] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [showConsent, setShowConsent] = useState(false);
  const baseTextRef = useRef("");
  const spokenFinalRef = useRef("");

  const handleTranscript = useCallback(({ final, interim }) => {
    if (final) {
      spokenFinalRef.current = spokenFinalRef.current
        ? `${spokenFinalRef.current} ${final}`
        : final;
    }
    const combined = [baseTextRef.current, spokenFinalRef.current, interim]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    setDraft(combined);
  }, []);

  const { listening, supported, toggle, stop } = useSpeechRecognition({
    onTranscript: handleTranscript,
    onError: setVoiceError,
  });

  const submit = () => {
    const text = draft.trim();
    if (!text || sending) return;
    if (listening) stop();
    dispatch(pushUserMessage(text));
    dispatch(sendMessage(text));
    setDraft("");
    baseTextRef.current = "";
    spokenFinalRef.current = "";
    setVoiceError("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const startVoice = () => {
    setVoiceError("");
    if (listening) {
      stop();
      return;
    }
    if (!hasVoiceConsent()) {
      setShowConsent(true);
      return;
    }
    baseTextRef.current = draft.trim();
    spokenFinalRef.current = "";
    toggle();
  };

  const acceptConsent = () => {
    grantVoiceConsent();
    setShowConsent(false);
    baseTextRef.current = draft.trim();
    spokenFinalRef.current = "";
    toggle();
  };

  const onDraftChange = (value) => {
    if (!listening) {
      baseTextRef.current = value;
      spokenFinalRef.current = "";
    }
    setDraft(value);
  };

  return (
    <section className="panel chat-panel">
      <div className="chat-header-block">
        <h2 className="chat-title">🤖 AI Assistant</h2>
        <p>Log Interaction details here via chat or voice</p>
      </div>

      <div className="chat-messages">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`bubble ${m.error ? "error" : m.variant || m.role}`}
          >
            {renderMessageContent(m.content, m.variant)}
            {m.variant === "refine" && m.updated_fields?.length > 0 && (
              <div className="intent-tag refine-tag">
                updated: {m.updated_fields.join(", ")}
              </div>
            )}
            {m.completeness_score > 0 && m.variant !== "user" && (
              <div className="intent-tag score-tag">
                completeness {m.completeness_score}%
              </div>
            )}
          </div>
        ))}
        {sending && (
          <div className="typing">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}
      </div>

      {showConsent && (
        <div className="voice-consent">
          <p>
            Voice input uses your microphone to transcribe speech in the browser.
            Audio is processed locally and sent as text to the AI assistant.
          </p>
          <div className="voice-consent-actions">
            <button type="button" className="btn-inline ghost" onClick={() => setShowConsent(false)}>
              Cancel
            </button>
            <button type="button" className="btn-inline" onClick={acceptConsent}>
              Allow microphone
            </button>
          </div>
        </div>
      )}

      {listening && (
        <div className="voice-status listening">
          <span className="voice-pulse" />
          Listening… speak your interaction, then tap the mic to stop
        </div>
      )}

      {voiceError && <div className="voice-status error">{voiceError}</div>}

      <FollowupSuggestions />

      <div className="chat-input-bar">
        <button
          type="button"
          className={`mic-btn${listening ? " active" : ""}`}
          onClick={startVoice}
          disabled={!supported || sending}
          title={
            supported
              ? listening
                ? "Stop recording"
                : "Start voice input"
              : "Voice not supported in this browser"
          }
          aria-label={listening ? "Stop voice input" : "Start voice input"}
        >
          🎙️
        </button>
        <input
          type="text"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={listening ? "Listening…" : "Describe Interaction..."}
        />
        <button
          className="log-btn"
          onClick={submit}
          disabled={sending || !draft.trim()}
          aria-label="Log interaction"
        >
          <span className="log-btn-icon">✎</span>
          <span className="log-btn-label">Log</span>
        </button>
      </div>
    </section>
  );
}
