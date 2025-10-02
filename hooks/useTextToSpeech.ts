import { useState, useCallback, useEffect, useRef } from 'react';

export const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const speakWithNativeTTS = useCallback((text: string) => {
    if (!window.speechSynthesis || !text.trim()) {
      if (!text.trim()) setIsSpeaking(false);
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (event) => {
        console.error("SpeechSynthesis Error", event);
        setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      const audioSrc = audioRef.current.src;
      if (audioSrc && audioSrc.startsWith('blob:')) {
          URL.revokeObjectURL(audioSrc);
      }
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(async (text: string, elevenLabsApiKey?: string, voiceId?: string) => {
    stop(); // Stop any current speech

    if (elevenLabsApiKey && text.trim()) {
        setIsSpeaking(true);
        try {
            const VOICE_ID = voiceId || '21m00Tcm4TlvDq8ikWAM'; // Default to Rachel if no ID is provided
            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': elevenLabsApiKey,
                },
                body: JSON.stringify({
                    text: text,
                    model_id: 'eleven_monolingual_v1',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.5,
                    },
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("ElevenLabs API Error:", errorData);
                throw new Error(errorData.detail?.message || 'ElevenLabs API request failed');
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audioRef.current = audio;
            
            audio.play().catch(e => {
                console.error("Audio play failed:", e);
                setIsSpeaking(false);
            });

            audio.onended = () => {
                setIsSpeaking(false);
                URL.revokeObjectURL(url);
                audioRef.current = null;
            };
            audio.onerror = () => {
                console.error("Error playing ElevenLabs audio.");
                setIsSpeaking(false);
                URL.revokeObjectURL(url);
                audioRef.current = null;
            };

        } catch (err) {
            console.error("Falling back to native TTS due to ElevenLabs error:", err);
            speakWithNativeTTS(text);
        }
    } else {
        speakWithNativeTTS(text);
    }
  }, [stop, speakWithNativeTTS]);
  
  // Cleanup effect to stop any speech on component unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { isSpeaking, speak };
};