import { useCallback, useEffect, useRef, useState } from "react";

const SpeechRecognition =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

const ERROR_MESSAGES = {
  "not-allowed":
    "Microphone access was denied. Allow microphone permission in your browser settings.",
  "no-speech": "No speech detected. Please try again.",
  "network": "Voice recognition requires a network connection.",
  "aborted": "",
};

export function useSpeechRecognition({ onTranscript, onError } = {}) {
  const [listening, setListening] = useState(false);
  const [supported] = useState(() => !!SpeechRecognition);
  const recognitionRef = useRef(null);

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch (_) {
      /* ignore */
    }
    setListening(false);
  }, []);

  const start = useCallback(() => {
    if (!SpeechRecognition) {
      onError?.(
        "Voice input is not supported in this browser. Please use Chrome, Edge, or Safari."
      );
      return;
    }

    if (recognitionRef.current) {
      stop();
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += text;
        else interim += text;
      }
      onTranscript?.({ final: final.trim(), interim: interim.trim() });
    };

    recognition.onerror = (event) => {
      setListening(false);
      const msg = ERROR_MESSAGES[event.error];
      if (msg) onError?.(msg);
    };

    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [onError, onTranscript, stop]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch (_) {
        /* ignore */
      }
    };
  }, []);

  return { listening, supported, start, stop, toggle };
}

export const VOICE_CONSENT_KEY = "hcp-crm-voice-consent";

export function hasVoiceConsent() {
  try {
    return localStorage.getItem(VOICE_CONSENT_KEY) === "true";
  } catch {
    return false;
  }
}

export function grantVoiceConsent() {
  try {
    localStorage.setItem(VOICE_CONSENT_KEY, "true");
  } catch {
    /* ignore */
  }
}
