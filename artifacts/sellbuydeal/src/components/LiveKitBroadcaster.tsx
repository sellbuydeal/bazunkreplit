import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/react";
import {
  LiveKitRoom, VideoTrack, useTracks, useLocalParticipant, RoomAudioRenderer, isTrackReference,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import {
  Loader2, Mic, MicOff, Video, VideoOff, WifiOff, Radio,
} from "lucide-react";

function BroadcasterControls({ onEnd }: { onEnd?: () => void }) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();

  const cameraTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: false }],
    { onlySubscribed: false }
  );
  const myTrack = cameraTracks
    .filter(isTrackReference)
    .find((t) => t.participant.identity === localParticipant?.identity);

  async function toggleMic() {
    if (!localParticipant) return;
    await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
  }

  async function toggleCamera() {
    if (!localParticipant) return;
    await localParticipant.setCameraEnabled(!isCameraEnabled);
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Preview */}
      <div
        className="relative flex-1 bg-gray-900 rounded-xl overflow-hidden"
        style={{ minHeight: 200 }}
      >
        {myTrack ? (
          <VideoTrack trackRef={myTrack} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-600">
            <VideoOff className="w-8 h-8" />
            <p className="text-xs">Camera off</p>
          </div>
        )}

        {/* Live badge overlay */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-lg">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
          </span>
          BROADCASTING
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleCamera}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
            isCameraEnabled
              ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
              : "bg-gray-200 text-gray-400 hover:bg-gray-300"
          }`}
        >
          {isCameraEnabled ? (
            <><Video className="w-4 h-4" /> Camera On</>
          ) : (
            <><VideoOff className="w-4 h-4" /> Camera Off</>
          )}
        </button>
        <button
          onClick={toggleMic}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
            isMicrophoneEnabled
              ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
              : "bg-gray-200 text-gray-400 hover:bg-gray-300"
          }`}
        >
          {isMicrophoneEnabled ? (
            <><Mic className="w-4 h-4" /> Mic On</>
          ) : (
            <><MicOff className="w-4 h-4" /> Mic Off</>
          )}
        </button>
      </div>

      {onEnd && (
        <button
          onClick={onEnd}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 transition-colors border border-red-100"
        >
          End Broadcast
        </button>
      )}
    </div>
  );
}

interface LiveKitBroadcasterProps {
  roomName: string;
  publisherIdentity: string;
  onEnd?: () => void;
  youtube?: { streamKey: string; rtmpsUrl: string };
}

export function LiveKitBroadcaster({ roomName, publisherIdentity, onEnd, youtube }: LiveKitBroadcasterProps) {
  const { getToken } = useAuth();
  const egressStarted = useRef(false);
  const [relayStatus, setRelayStatus] = useState<"idle" | "starting" | "live" | "error">("idle");
  const [relayError, setRelayError] = useState<string | null>(null);
  const [token, setToken]     = useState<string | null>(null);
  const [wsUrl, setWsUrl]     = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getToken().then((authToken) => fetch(
      `/api/livekit/token?room=${encodeURIComponent(roomName)}&identity=${encodeURIComponent(publisherIdentity)}&canPublish=true`,
      { headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} }
    ))
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setToken(data.token);
        setWsUrl(data.wsUrl);
      })
      .catch(() => setError("Could not connect to LiveKit. Check your server credentials."))
      .finally(() => setLoading(false));
  }, [roomName, publisherIdentity, getToken]);


  async function startYouTubeRelay() {
    if (!youtube || egressStarted.current) return;
    egressStarted.current = true;
    setRelayStatus("starting");
    setRelayError(null);
    try {
      const authToken = await getToken();
      const response = await fetch("/api/livekit/youtube/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ roomName, streamKey: youtube.streamKey, rtmpsUrl: youtube.rtmpsUrl }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not start YouTube relay.");
      setRelayStatus("live");
    } catch (err) {
      egressStarted.current = false;
      setRelayStatus("error");
      setRelayError(err instanceof Error ? err.message : "Could not start YouTube relay.");
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10">
        <Loader2 className="w-7 h-7 text-orange-500 animate-spin" />
        <p className="text-gray-500 text-sm">Connecting to LiveKit…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-6 px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
          <WifiOff className="w-6 h-6 text-red-400" />
        </div>
        <p className="text-red-600 text-sm font-semibold">Connection failed</p>
        <p className="text-gray-400 text-xs max-w-xs">{error}</p>
        <p className="text-gray-400 text-xs max-w-xs">
          Make sure LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET are set in your secrets.
        </p>
      </div>
    );
  }

  if (!token || !wsUrl) return null;

  return (
    <LiveKitRoom
      token={token}
      serverUrl={wsUrl}
      connect={true}
      video={true}
      audio={true}
      style={{ height: "100%" }}
      onConnected={() => { void startYouTubeRelay(); }}
    >
      <div className="space-y-3">
        {youtube && (
          <div className={`rounded-xl px-3 py-2 text-xs font-semibold ${
            relayStatus === "live" ? "bg-emerald-50 text-emerald-700" :
            relayStatus === "error" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"
          }`}>
            {relayStatus === "live" ? "YouTube relay connected — your Bazunk camera and microphone are being sent to YouTube." :
             relayStatus === "error" ? `YouTube relay failed: ${relayError}` :
             "Connecting your Bazunk camera and microphone to YouTube…"}
            {relayStatus === "error" && <button onClick={() => { void startYouTubeRelay(); }} className="ml-2 underline font-black">Retry</button>}
          </div>
        )}
        <BroadcasterControls onEnd={onEnd} />
      </div>
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

export function LiveKitStatusBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-white bg-orange-500 px-2.5 py-1 rounded-full">
      <Radio className="w-3 h-3" />
      LiveKit Native
    </span>
  );
}
