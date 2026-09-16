import { useState, useEffect } from "react";
import { LiveKitRoom, VideoTrack, useTracks, RoomAudioRenderer, isTrackReference } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Loader2, Radio, WifiOff } from "lucide-react";

function RemoteTracks() {
  const cameraTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: false }],
    { onlySubscribed: true }
  );
  const screenTracks = useTracks(
    [{ source: Track.Source.ScreenShare, withPlaceholder: false }],
    { onlySubscribed: true }
  );

  const trackRef = [...cameraTracks, ...screenTracks].find(isTrackReference);

  if (!trackRef) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-gray-950">
        <span className="relative flex h-6 w-6">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-60" />
          <span className="relative inline-flex rounded-full h-6 w-6 bg-orange-500 items-center justify-center">
            <Radio className="w-3.5 h-3.5 text-white" />
          </span>
        </span>
        <p className="text-white font-bold text-sm">Waiting for host to start video…</p>
        <p className="text-gray-500 text-xs">Audio will play automatically when the seller goes live</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black">
      <VideoTrack
        trackRef={trackRef}
        className="w-full h-full object-contain"
      />
    </div>
  );
}

interface LiveKitViewerProps {
  roomName: string;
  viewerIdentity: string;
}

export function LiveKitViewer({ roomName, viewerIdentity }: LiveKitViewerProps) {
  const [token, setToken]   = useState<string | null>(null);
  const [wsUrl, setWsUrl]   = useState<string | null>(null);
  const [error, setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(
      `/api/livekit/token?room=${encodeURIComponent(roomName)}&identity=${encodeURIComponent(viewerIdentity)}&canPublish=false`
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setToken(data.token);
        setWsUrl(data.wsUrl);
      })
      .catch(() => setError("Could not connect to stream. Please refresh and try again."))
      .finally(() => setLoading(false));
  }, [roomName, viewerIdentity]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          <p className="text-gray-400 text-sm">Connecting to live stream…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-gray-950 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
          <WifiOff className="w-8 h-8 text-red-400" />
        </div>
        <p className="text-white font-bold">Unable to connect</p>
        <p className="text-gray-400 text-sm max-w-xs">{error}</p>
      </div>
    );
  }

  if (!token || !wsUrl) return null;

  return (
    <LiveKitRoom
      token={token}
      serverUrl={wsUrl}
      connect={true}
      video={false}
      audio={false}
      style={{ height: "100%", width: "100%", background: "#030712" }}
    >
      <RemoteTracks />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
