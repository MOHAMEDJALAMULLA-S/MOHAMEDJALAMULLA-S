import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Copy, Check, Trash2 } from 'lucide-react';
import { transcribeAudio } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';

export default function TranscriptionApp() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [copied, setCopied] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleTranscription(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please ensure permissions are granted.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleTranscription = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = (reader.result as string).split(',')[1];
        const result = await transcribeAudio(base64data, 'audio/webm');
        setTranscription(prev => prev + (prev ? ' ' : '') + result);
        setIsTranscribing(false);
      };
    } catch (err) {
      console.error("Transcription failed:", err);
      setIsTranscribing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(transcription);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearTranscription = () => {
    if (confirm("Clear current transcription?")) {
      setTranscription('');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#E6E6E6] flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-[#151619] rounded-3xl shadow-2xl overflow-hidden border border-white/10"
      >
        {/* Hardware Header */}
        <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center">
          <div>
            <h1 className="text-white font-mono text-xs tracking-[0.2em] uppercase opacity-50">Audio Processor</h1>
            <p className="text-white text-xl font-medium">EchoScribe v1.0</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-zinc-700'}`} />
            <span className="text-white/40 font-mono text-[10px] uppercase tracking-wider">
              {isRecording ? 'Recording' : 'Standby'}
            </span>
          </div>
        </div>

        {/* Main Display Area */}
        <div className="p-8 space-y-8">
          <div className="relative bg-black/40 rounded-2xl p-6 min-h-[300px] border border-white/5 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <span className="text-white/20 font-mono text-[10px] uppercase tracking-widest">Output Monitor</span>
              <div className="flex gap-2">
                {transcription && (
                  <>
                    <button 
                      onClick={copyToClipboard}
                      className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/40 hover:text-white"
                      title="Copy to clipboard"
                    >
                      {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                    </button>
                    <button 
                      onClick={clearTranscription}
                      className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/40 hover:text-red-400"
                      title="Clear all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              {transcription ? (
                <p className="text-zinc-300 leading-relaxed text-lg whitespace-pre-wrap">
                  {transcription}
                </p>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4">
                  <Mic size={48} strokeWidth={1} className="opacity-20" />
                  <p className="text-sm font-mono tracking-wide">Press record to begin transcription</p>
                </div>
              )}
            </div>

            <AnimatePresence>
              {isTranscribing && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-6 right-6 flex items-center gap-2 bg-zinc-800/80 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10"
                >
                  <Loader2 size={14} className="text-blue-400 animate-spin" />
                  <span className="text-white/60 font-mono text-[10px] uppercase tracking-wider">Processing</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-8">
              <div className="text-center">
                <p className="text-white/20 font-mono text-[10px] uppercase tracking-widest mb-1">Duration</p>
                <p className="text-white font-mono text-2xl tabular-nums">{formatTime(recordingTime)}</p>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isRecording 
                  ? 'bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)]' 
                  : 'bg-white hover:bg-zinc-200 shadow-[0_0_30px_rgba(255,255,255,0.1)]'
                }`}
              >
                {isRecording ? (
                  <Square size={28} className="text-white fill-current" />
                ) : (
                  <Mic size={32} className="text-black" />
                )}
              </motion.button>

              <div className="text-center opacity-0 pointer-events-none">
                <p className="text-white/20 font-mono text-[10px] uppercase tracking-widest mb-1">Buffer</p>
                <p className="text-white font-mono text-2xl">0%</p>
              </div>
            </div>
            
            <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-[0.3em]">
              {isRecording ? 'Stop to process audio' : 'Click to start recording'}
            </p>
          </div>
        </div>

        {/* Footer Status Bar */}
        <div className="px-8 py-3 bg-black/40 border-t border-white/5 flex justify-between items-center">
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500/50" />
              <span className="text-[9px] font-mono text-white/30 uppercase tracking-wider">System Ready</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
              <span className="text-[9px] font-mono text-white/30 uppercase tracking-wider">Gemini 3 Flash</span>
            </div>
          </div>
          <span className="text-[9px] font-mono text-white/20 uppercase tracking-widest">Encrypted Stream</span>
        </div>
      </motion.div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}} />
    </div>
  );
}
