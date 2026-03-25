import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Check, CheckCheck, FileText, Download, Play, Pause, Phone, Video, Reply, X } from "lucide-react";

interface MessageData {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
  read: boolean;
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
  replyTo?: { text: string; senderName: string } | null;
}

interface MessageBubbleProps {
  message: MessageData;
  isMine: boolean;
  onReply?: (msg: MessageData) => void;
}

const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// Voice note player
const VoiceNote = ({ url, isMine }: { url: string; isMine: boolean }) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <audio
        ref={audioRef}
        src={url}
        onLoadedMetadata={() => setDuration(Math.round(audioRef.current?.duration || 0))}
        onTimeUpdate={() => {
          const a = audioRef.current;
          if (a) setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0);
        }}
        onEnded={() => { setPlaying(false); setProgress(0); }}
      />
      <button
        onClick={toggle}
        className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${isMine ? "bg-primary-foreground/20" : "bg-primary/20"}`}
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
      </button>
      <div className="flex-1 flex flex-col gap-1">
        <div className="h-1.5 rounded-full bg-current opacity-20 relative overflow-hidden">
          <div className="absolute inset-y-0 left-0 bg-current opacity-80 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-[10px] opacity-60">{formatDuration(duration)}</span>
      </div>
    </div>
  );
};

// Video player inline
const VideoPlayer = ({ url, isMine }: { url: string; isMine: boolean }) => (
  <video
    src={url}
    controls
    className="rounded-lg max-h-60 w-full object-cover"
    style={{ maxWidth: 280 }}
  />
);

// Image lightbox
const ImageLightbox = ({ url, onClose }: { url: string; onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
    onClick={onClose}
  >
    <button className="absolute top-4 right-4 h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
      <X className="h-5 w-5" />
    </button>
    <motion.img
      initial={{ scale: 0.9 }}
      animate={{ scale: 1 }}
      src={url}
      alt="Preview"
      className="max-w-full max-h-full rounded-xl object-contain"
      onClick={(e) => e.stopPropagation()}
    />
  </motion.div>
);

const MessageBubble = ({ message, isMine, onReply }: MessageBubbleProps) => {
  const [lightbox, setLightbox] = useState(false);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapCount = useRef(0);

  const isImage = message.fileType?.startsWith("image/");
  const isVideo = message.fileType?.startsWith("video/");
  const isAudio = message.fileType?.startsWith("audio/");
  const isCall = message.fileType === "call/audio" || message.fileType === "call/video";

  const handleTap = () => {
    tapCount.current += 1;
    if (tapCount.current === 1) {
      tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 300);
    } else if (tapCount.current === 2) {
      if (tapTimer.current) clearTimeout(tapTimer.current);
      tapCount.current = 0;
      onReply?.(message);
    }
  };

  return (
    <>
      {lightbox && <ImageLightbox url={message.fileUrl!} onClose={() => setLightbox(false)} />}
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.15 }}
        className={`flex ${isMine ? "justify-end" : "justify-start"} px-4 py-0.5 group`}
        onDoubleClick={() => onReply?.(message)}
        onClick={handleTap}
      >
        <div className="flex flex-col max-w-[72%]">
          {/* Reply preview */}
          {message.replyTo && (
            <div className={`text-[11px] px-3 py-1.5 rounded-t-xl mb-0.5 border-l-2 border-primary opacity-80 ${isMine ? "bg-primary/20 self-end" : "bg-muted self-start"}`}>
              <span className="font-semibold text-primary">{message.replyTo.senderName}</span>
              <p className="truncate text-muted-foreground">{message.replyTo.text}</p>
            </div>
          )}

          <div className={`relative px-3 py-2.5 ${
            isMine
              ? "gradient-primary text-primary-foreground rounded-2xl rounded-br-sm"
              : "bg-received text-foreground rounded-2xl rounded-bl-sm"
          }`}>
            {/* Reply button on hover */}
            <button
              onClick={(e) => { e.stopPropagation(); onReply?.(message); }}
              className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 rounded-full bg-muted flex items-center justify-center ${isMine ? "-left-9" : "-right-9"}`}
            >
              <Reply className="h-3.5 w-3.5 text-muted-foreground" />
            </button>

            {/* Call message */}
            {isCall && (
              <div className="flex items-center gap-2">
                {message.fileType === "call/video"
                  ? <Video className="h-4 w-4 shrink-0" />
                  : <Phone className="h-4 w-4 shrink-0" />}
                <span className="text-sm">{message.text}</span>
              </div>
            )}

            {/* Image */}
            {isImage && message.fileUrl && (
              <img
                src={message.fileUrl}
                alt={message.fileName || "Image"}
                className="rounded-lg max-h-60 w-auto object-cover cursor-pointer hover:opacity-90 transition-opacity mb-1"
                onClick={(e) => { e.stopPropagation(); setLightbox(true); }}
              />
            )}

            {/* Video */}
            {isVideo && message.fileUrl && (
              <div className="mb-1" onClick={(e) => e.stopPropagation()}>
                <VideoPlayer url={message.fileUrl} isMine={isMine} />
              </div>
            )}

            {/* Voice note */}
            {isAudio && message.fileUrl && (
              <div className="mb-1" onClick={(e) => e.stopPropagation()}>
                <VoiceNote url={message.fileUrl} isMine={isMine} />
              </div>
            )}

            {/* Document */}
            {message.fileUrl && !isImage && !isVideo && !isAudio && !isCall && (
              <a
                href={message.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`flex items-center gap-2 p-2 rounded-lg mb-1 ${isMine ? "bg-primary-foreground/10" : "bg-muted"} hover:opacity-80 transition-opacity`}
              >
                <FileText className="h-7 w-7 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{message.fileName || "File"}</p>
                  <p className={`text-[10px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>Tap to download</p>
                </div>
                <Download className="h-4 w-4 shrink-0" />
              </a>
            )}

            {/* Text */}
            {!isCall && message.text && !(message.fileUrl && message.text.startsWith("📎")) && (
              <p className="text-sm leading-relaxed break-words">{message.text}</p>
            )}

            <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
              <span className={`text-[10px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                {formatTime(message.timestamp)}
              </span>
              {isMine && (message.read
                ? <CheckCheck className="h-3 w-3 text-online" />
                : <Check className="h-3 w-3 text-primary-foreground/60" />
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default MessageBubble;
