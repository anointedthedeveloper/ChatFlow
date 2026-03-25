import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, PhoneMissed, Video, VideoOff, Mic, MicOff } from "lucide-react";

interface CallOverlayProps {
  callState: "idle" | "calling" | "receiving" | "connected";
  callType: "audio" | "video";
  remoteUsername: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callDuration: number;
  onAccept: () => void;
  onEnd: () => void;
  onReject: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
}

const formatDuration = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

const CallOverlay = ({
  callState, callType, remoteUsername,
  localStream, remoteStream, callDuration,
  onAccept, onEnd, onReject, onToggleMute, onToggleVideo,
}: CallOverlayProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  useEffect(() => {
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
    if (remoteAudioRef.current && remoteStream) remoteAudioRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  if (callState === "idle") return null;

  const isVideo = callType === "video" && callState === "connected";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col"
    >
      {/* Background */}
      <div className={`absolute inset-0 ${isVideo ? "bg-black" : "bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900"}`} />

      {/* Video streams */}
      {isVideo && (
        <>
          <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
          <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-28 right-4 w-28 h-20 rounded-xl object-cover border-2 border-primary shadow-lg z-10" />
        </>
      )}

      {/* Hidden audio for audio calls */}
      <audio ref={remoteAudioRef} autoPlay />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 gap-6 px-6">
        {/* Pulse rings for incoming/calling */}
        {(callState === "calling" || callState === "receiving") && (
          <div className="relative flex items-center justify-center">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border border-white/20"
                animate={{ scale: [1, 2.5], opacity: [0.4, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.5, ease: "easeOut" }}
                style={{ width: 96, height: 96 }}
              />
            ))}
            <div className="h-24 w-24 rounded-full gradient-primary flex items-center justify-center text-3xl font-bold text-white shadow-2xl z-10">
              {remoteUsername[0]?.toUpperCase() || "?"}
            </div>
          </div>
        )}

        {/* Audio call avatar when connected */}
        {callState === "connected" && !isVideo && (
          <div className="h-24 w-24 rounded-full gradient-primary flex items-center justify-center text-3xl font-bold text-white shadow-2xl">
            {remoteUsername[0]?.toUpperCase() || "?"}
          </div>
        )}

        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">{remoteUsername}</h2>
          <p className="text-sm text-white/60 mt-1">
            {callState === "calling" && "Calling..."}
            {callState === "receiving" && `Incoming ${callType} call`}
            {callState === "connected" && formatDuration(callDuration)}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="relative z-10 pb-12 flex flex-col items-center gap-6">
        {/* Mute / Video toggles — only when connected */}
        {callState === "connected" && (
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setIsMuted(!isMuted); onToggleMute(); }}
              className={`h-12 w-12 rounded-full flex items-center justify-center transition-colors ${isMuted ? "bg-white/20 text-white" : "bg-white/10 text-white/70 hover:bg-white/20"}`}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
            {callType === "video" && (
              <button
                onClick={() => { setIsVideoOff(!isVideoOff); onToggleVideo(); }}
                className={`h-12 w-12 rounded-full flex items-center justify-center transition-colors ${isVideoOff ? "bg-white/20 text-white" : "bg-white/10 text-white/70 hover:bg-white/20"}`}
              >
                {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
              </button>
            )}
          </div>
        )}

        {/* Accept / Reject / End */}
        <div className="flex items-center gap-8">
          {callState === "receiving" && (
            <>
              <div className="flex flex-col items-center gap-2">
                <button onClick={onReject} className="h-16 w-16 rounded-full bg-destructive flex items-center justify-center shadow-lg hover:bg-destructive/80 transition-colors">
                  <PhoneMissed className="h-7 w-7 text-white" />
                </button>
                <span className="text-xs text-white/60">Decline</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <button onClick={onAccept} className="h-16 w-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg hover:bg-green-400 transition-colors">
                  <Phone className="h-7 w-7 text-white" />
                </button>
                <span className="text-xs text-white/60">Accept</span>
              </div>
            </>
          )}

          {(callState === "calling" || callState === "connected") && (
            <div className="flex flex-col items-center gap-2">
              <button onClick={onEnd} className="h-16 w-16 rounded-full bg-destructive flex items-center justify-center shadow-lg hover:bg-destructive/80 transition-colors">
                <PhoneOff className="h-7 w-7 text-white" />
              </button>
              <span className="text-xs text-white/60">{callState === "calling" ? "Cancel" : "End"}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default CallOverlay;
