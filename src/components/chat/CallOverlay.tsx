import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Phone, PhoneOff, PhoneMissed, Video, VideoOff, Mic, MicOff, Monitor, MonitorOff } from "lucide-react";
import { Sounds, unlockAudio } from "@/lib/sounds";

interface CallOverlayProps {
  callState: "idle" | "calling" | "receiving" | "connected";
  callType: "audio" | "video";
  remoteUsername: string;
  remoteAvatarUrl?: string | null;
  localAvatarUrl?: string | null;
  localUsername?: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callDuration: number;
  onAccept: () => void;
  onEnd: () => void;
  onReject: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onReplaceVideoTrack?: (track: MediaStreamTrack | null) => Promise<void>;
}

const fmt = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

const CallOverlay = ({
  callState, callType, remoteUsername, remoteAvatarUrl, localAvatarUrl, localUsername,
  localStream, remoteStream, callDuration,
  onAccept, onEnd, onReject, onToggleMute, onToggleVideo, onReplaceVideoTrack,
}: CallOverlayProps) => {
  const mainVideoRef   = useRef<HTMLVideoElement>(null);
  const pipVideoRef    = useRef<HTMLVideoElement>(null);
  const previewRef     = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef  = useRef<MediaStream | null>(null);

  // Use refs for values used inside callbacks to avoid stale closures
  const swappedRef   = useRef(false);
  const isSharingRef = useRef(false);

  const [isMuted,           setIsMuted]           = useState(false);
  const [isVideoOff,        setIsVideoOff]        = useState(false);
  const [isSharing,         setIsSharing]         = useState(false);
  const [swapped,           setSwapped]           = useState(false);
  const [remoteVideoActive, setRemoteVideoActive] = useState(false);
  const [prevState,         setPrevState]         = useState(callState);

  // Keep refs in sync with state
  useEffect(() => { swappedRef.current = swapped; }, [swapped]);
  useEffect(() => { isSharingRef.current = isSharing; }, [isSharing]);

  // ── Unlock audio + sound effects on state transitions ─────────────────────
  useEffect(() => {
    if (prevState === callState) return;
    // State transitions happen after user gesture (button click), so audio is unlocked
    if (callState === "connected") Sounds.callAccept();
    if (callState === "idle" && prevState === "connected") Sounds.callEnd();
    if (callState === "idle" && prevState === "receiving") Sounds.callDecline();
    // Stop screen share when call ends
    if (callState === "idle") {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      isSharingRef.current = false;
      setIsSharing(false);
    }
    setPrevState(callState);
  }, [callState, prevState]);

  // ── Sync mute/video from actual track state ────────────────────────────────
  useEffect(() => {
    if (!localStream) { setIsMuted(false); setIsVideoOff(false); return; }
    const a = localStream.getAudioTracks()[0];
    const v = localStream.getVideoTracks()[0];
    if (a) setIsMuted(!a.enabled);
    if (v) setIsVideoOff(!v.enabled);
  }, [localStream]);

  // ── Camera preview before accepting ───────────────────────────────────────
  useEffect(() => {
    if (callState === "receiving" && callType === "video") {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then((s) => {
          previewStreamRef.current = s;
          if (previewRef.current) {
            previewRef.current.srcObject = s;
            previewRef.current.play().catch(() => {});
          }
        })
        .catch(() => {});
    } else {
      previewStreamRef.current?.getTracks().forEach((t) => t.stop());
      previewStreamRef.current = null;
      if (previewRef.current) previewRef.current.srcObject = null;
    }
    return () => {
      previewStreamRef.current?.getTracks().forEach((t) => t.stop());
      previewStreamRef.current = null;
    };
  }, [callState, callType]);

  // ── Track remote video active ──────────────────────────────────────────────
  useEffect(() => {
    if (!remoteStream) { setRemoteVideoActive(false); return; }
    const vt = remoteStream.getVideoTracks()[0];
    if (vt) {
      setRemoteVideoActive(vt.enabled && vt.readyState === "live");
      const onMute   = () => setRemoteVideoActive(false);
      const onUnmute = () => setRemoteVideoActive(true);
      vt.addEventListener("mute", onMute);
      vt.addEventListener("unmute", onUnmute);
      return () => { vt.removeEventListener("mute", onMute); vt.removeEventListener("unmute", onUnmute); };
    } else {
      setRemoteVideoActive(false);
    }
  }, [remoteStream]);

  // ── Wire video elements ────────────────────────────────────────────────────
  useEffect(() => {
    if (!mainVideoRef.current || !pipVideoRef.current) return;
    if (isSharingRef.current && screenStreamRef.current) {
      mainVideoRef.current.srcObject = screenStreamRef.current;
      pipVideoRef.current.srcObject  = localStream;
    } else if (swappedRef.current) {
      mainVideoRef.current.srcObject = localStream;
      pipVideoRef.current.srcObject  = remoteStream;
    } else {
      mainVideoRef.current.srcObject = remoteStream;
      pipVideoRef.current.srcObject  = localStream;
    }
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream;
  }, [swapped, localStream, remoteStream, isSharing]);

  // ── Screen sharing ─────────────────────────────────────────────────────────
  const stopScreenShare = useCallback(async () => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    isSharingRef.current = false;
    setIsSharing(false);
    await onReplaceVideoTrack?.(null);
    // Restore video element using refs (no stale closure)
    if (mainVideoRef.current) {
      mainVideoRef.current.srcObject = swappedRef.current ? localStream : remoteStream;
    }
  }, [localStream, remoteStream, onReplaceVideoTrack]);

  const toggleScreenShare = useCallback(async () => {
    if (isSharingRef.current) {
      await stopScreenShare();
    } else {
      try {
        const screen = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: false });
        screenStreamRef.current = screen;
        isSharingRef.current = true;
        setIsSharing(true);
        const screenTrack = screen.getVideoTracks()[0];
        await onReplaceVideoTrack?.(screenTrack);
        if (mainVideoRef.current) mainVideoRef.current.srcObject = screen;
        // Auto-stop when browser "Stop sharing" is clicked
        screenTrack.onended = () => stopScreenShare();
      } catch {}
    }
  }, [stopScreenShare, onReplaceVideoTrack]);

  const handleSwap = useCallback(() => {
    if (isSharingRef.current) return; // can't swap while sharing
    setSwapped((s) => !s);
  }, []);

  if (callState === "idle") return null;

  const isVideo     = callType === "video";
  const isConnected = callState === "connected";
  const showVideo   = isVideo && isConnected;

  const AvatarCircle = ({ url, name, size = "lg" }: { url?: string | null; name: string; size?: "sm" | "lg" }) => {
    const sz = size === "lg" ? "h-24 w-24 text-3xl" : "h-10 w-10 text-sm";
    return url
      ? <img src={url} alt={name} className={`${sz} rounded-full object-cover border-2 border-white/20 shadow-2xl`} />
      : <div className={`${sz} rounded-full gradient-primary flex items-center justify-center font-bold text-white shadow-2xl`}>{name[0]?.toUpperCase() || "?"}</div>;
  };

  // Wrap every user-facing button click to unlock audio
  const withAudio = (fn: () => void) => () => { unlockAudio(); fn(); };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col select-none"
    >
      {/* Background */}
      <div className={`absolute inset-0 ${showVideo ? "bg-black" : "bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900"}`} />

      {/* Main video */}
      <video ref={mainVideoRef} autoPlay playsInline muted={swapped || isSharing}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${showVideo ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      />

      {/* Avatar overlays on main when camera off */}
      {showVideo && !isSharing && (
        <>
          {!swapped && !remoteVideoActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-3 z-10">
              <AvatarCircle url={remoteAvatarUrl} name={remoteUsername} />
              <span className="text-white/60 text-sm">{remoteUsername} turned off camera</span>
            </div>
          )}
          {swapped && isVideoOff && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-3 z-10">
              <AvatarCircle url={localAvatarUrl} name={localUsername || "You"} />
              <span className="text-white/60 text-sm">Your camera is off</span>
            </div>
          )}
        </>
      )}

      {/* PiP — tap to swap */}
      {showVideo && (
        <motion.div
          className="absolute z-20 rounded-2xl overflow-hidden border-2 border-primary shadow-2xl cursor-pointer"
          style={{ bottom: 130, right: 16, width: 108, height: 78 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSwap}
          title={isSharing ? "Screen sharing active" : "Tap to swap"}
        >
          <video ref={pipVideoRef} autoPlay playsInline muted className="w-full h-full object-cover bg-black" />
          {/* Avatar in PiP when local cam off (default: PiP = local) */}
          {!swapped && isVideoOff && !isSharing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/85">
              <AvatarCircle url={localAvatarUrl} name={localUsername || "You"} size="sm" />
            </div>
          )}
          {/* Avatar in PiP when remote cam off (swapped: PiP = remote) */}
          {swapped && !remoteVideoActive && !isSharing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/85">
              <AvatarCircle url={remoteAvatarUrl} name={remoteUsername} size="sm" />
            </div>
          )}
          <div className="absolute bottom-1 left-0 right-0 text-center pointer-events-none">
            <span className="text-[9px] text-white/70 bg-black/50 px-1.5 py-0.5 rounded-full">
              {isSharing ? "Your cam" : swapped ? remoteUsername : "You"}{!isSharing && " · tap"}
            </span>
          </div>
        </motion.div>
      )}

      {/* Camera preview before accepting — always in DOM, opacity-controlled */}
      <div
        className={`absolute z-20 rounded-xl overflow-hidden border-2 border-white/30 shadow-xl bg-black transition-all duration-300 ${
          callState === "receiving" && isVideo ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        style={{ bottom: 176, right: 16, width: 112, height: 80 }}
      >
        <video ref={previewRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        <div className="absolute bottom-1 left-0 right-0 text-center pointer-events-none">
          <span className="text-[9px] text-white/70 bg-black/50 px-1.5 py-0.5 rounded-full">You</span>
        </div>
      </div>

      <audio ref={remoteAudioRef} autoPlay />

      {/* Center info */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 gap-4 px-6">
        {!isConnected && (
          <>
            <div className="relative flex items-center justify-center">
              {[1, 2, 3].map((i) => (
                <motion.div key={i} className="absolute rounded-full border border-white/20"
                  animate={{ scale: [1, 2.5], opacity: [0.4, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.5, ease: "easeOut" }}
                  style={{ width: 96, height: 96 }}
                />
              ))}
              <AvatarCircle url={remoteAvatarUrl} name={remoteUsername} />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white">{remoteUsername}</h2>
              <p className="text-sm text-white/60 mt-1">
                {callState === "calling" && "Calling..."}
                {callState === "receiving" && `Incoming ${callType} call`}
              </p>
            </div>
          </>
        )}
        {isConnected && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm px-4 py-1.5 rounded-full z-30 flex items-center gap-2">
            <span className="text-white text-sm font-medium">{fmt(callDuration)}</span>
            {isSharing && <span className="text-green-400 text-xs font-medium">● Sharing screen</span>}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="relative z-20 pb-10 flex flex-col items-center gap-4">
        {isConnected && (
          <div className="flex items-center gap-3 flex-wrap justify-center px-4">
            <button onClick={withAudio(() => { onToggleMute(); setIsMuted((m) => !m); })}
              className={`h-12 w-12 rounded-full flex items-center justify-center transition-colors ${isMuted ? "bg-white/30 text-white" : "bg-white/10 text-white/80 hover:bg-white/20"}`}>
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
            {isVideo && (
              <button onClick={withAudio(() => { onToggleVideo(); setIsVideoOff((v) => !v); })}
                className={`h-12 w-12 rounded-full flex items-center justify-center transition-colors ${isVideoOff ? "bg-white/30 text-white" : "bg-white/10 text-white/80 hover:bg-white/20"}`}>
                {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
              </button>
            )}
            {isVideo && (
              <button onClick={withAudio(toggleScreenShare)}
                className={`h-12 w-12 rounded-full flex items-center justify-center transition-colors ${isSharing ? "bg-green-500/70 text-white" : "bg-white/10 text-white/80 hover:bg-white/20"}`}
                title="Share screen">
                {isSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-8">
          {callState === "receiving" && (
            <>
              <div className="flex flex-col items-center gap-2">
                <button onClick={withAudio(() => { Sounds.callDecline(); onReject(); })}
                  className="h-16 w-16 rounded-full bg-destructive flex items-center justify-center shadow-lg hover:bg-destructive/80 transition-colors">
                  <PhoneMissed className="h-7 w-7 text-white" />
                </button>
                <span className="text-xs text-white/60">Decline</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <button onClick={withAudio(() => { Sounds.callAccept(); onAccept(); })}
                  className="h-16 w-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg hover:bg-green-400 transition-colors">
                  <Phone className="h-7 w-7 text-white" />
                </button>
                <span className="text-xs text-white/60">Accept</span>
              </div>
            </>
          )}
          {(callState === "calling" || isConnected) && (
            <div className="flex flex-col items-center gap-2">
              <button onClick={withAudio(() => { Sounds.callEnd(); onEnd(); })}
                className="h-16 w-16 rounded-full bg-destructive flex items-center justify-center shadow-lg hover:bg-destructive/80 transition-colors">
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
