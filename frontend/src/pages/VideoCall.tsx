import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../context/AuthContext";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || API_BASE_URL;

type CallStatus =
  | "created"
  | "ongoing"
  | "ended"
  | "missed";

interface VideoCallResponse {
  id: number;
  case_id: number;
  caller_id: number;
  receiver_id: number;
  room_id: string;
  status: CallStatus;
  started_at?: string | null;
  ended_at?: string | null;
  created_at: string;
}

export default function VideoCall() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const caseId = Number(
    searchParams.get("case_id")
  );

  const receiverId = Number(
    searchParams.get("receiver_id")
  );

  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("access_token");

  const localVideoRef =
    useRef<HTMLVideoElement | null>(null);

  const remoteVideoRef =
    useRef<HTMLVideoElement | null>(null);

  const socketRef =
    useRef<Socket | null>(null);

  const peerConnectionRef =
    useRef<RTCPeerConnection | null>(null);

  const localStreamRef =
    useRef<MediaStream | null>(null);

  const screenStreamRef =
    useRef<MediaStream | null>(null);

  const cameraTrackRef =
    useRef<MediaStreamTrack | null>(null);

  const roomIdRef =
    useRef<string | null>(null);

  const [call, setCall] =
    useState<VideoCallResponse | null>(null);

  const [connected, setConnected] =
    useState(false);

  const [remoteConnected, setRemoteConnected] =
    useState(false);

  const [connectionStatus, setConnectionStatus] =
    useState<
      "connecting" | "connected" | "reconnecting" | "disconnected"
    >("connecting");

  const [callDuration, setCallDuration] =
    useState(0);

  const [isRemoteFullscreen, setIsRemoteFullscreen] =
    useState(false);

  const [isLocalFullscreen, setIsLocalFullscreen] =
    useState(false);

  const [micEnabled, setMicEnabled] =
    useState(true);

  const [cameraEnabled, setCameraEnabled] =
    useState(true);

  const [isScreenSharing, setIsScreenSharing] =
    useState(false);

  const [screenShareMenuOpen, setScreenShareMenuOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [ending, setEnding] =
    useState(false);

  // ==========================================================
  // GET VIDEO CALL ROOM
  // ==========================================================

  const createRoom = async () => {
    if (!token) {
      setError(
        "You are not logged in."
      );
      return null;
    }

    if (!caseId || !receiverId) {
      setError(
        "Case and participant information is missing."
      );
      return null;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/video/create-room`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            case_id: caseId,
            receiver_id: receiverId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Unable to create video room."
        );
      }

      setCall(data);
      roomIdRef.current = data.room_id;

      return data as VideoCallResponse;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create video room."
      );

      return null;
    }
  };

  // ==========================================================
  // CREATE PEER CONNECTION
  // ==========================================================

  const createPeerConnection = () => {
    if (
      peerConnectionRef.current
    ) {
      return peerConnectionRef.current;
    }

    const peerConnection =
      new RTCPeerConnection({
        iceServers: [
          {
            urls:
              "stun:stun.l.google.com:19302",
          },
        ],
      });

    peerConnection.onicecandidate =
      (event) => {
        if (
          !event.candidate ||
          !socketRef.current ||
          !roomIdRef.current
        ) {
          return;
        }

        socketRef.current.emit(
          "ice_candidate",
          {
            token,
            room_id:
              roomIdRef.current,
            candidate:
              event.candidate,
          }
        );
      };

    peerConnection.ontrack =
      (event) => {
        if (
          remoteVideoRef.current &&
          event.streams[0]
        ) {
          remoteVideoRef.current.srcObject =
            event.streams[0];

          setRemoteConnected(true);
        }
      };

    peerConnection.onconnectionstatechange =
      () => {
        const state =
          peerConnection.connectionState;

        if (
          state === "connected"
        ) {
          setRemoteConnected(true);
          setConnectionStatus("connected");
        }

        if (
          state === "connecting"
        ) {
          setConnectionStatus("connecting");
        }

        if (
          state === "disconnected"
        ) {
          setRemoteConnected(false);
          setConnectionStatus("reconnecting");
        }

        if (
          state === "failed" ||
          state === "closed"
        ) {
          setRemoteConnected(false);
          setConnectionStatus("disconnected");
        }
      };

    peerConnectionRef.current =
      peerConnection;

    return peerConnection;
  };

  // ==========================================================
  // START CAMERA / MICROPHONE
  // ==========================================================

  const startLocalMedia =
    async () => {
      try {
        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
              video: true,
              audio: true,
            }
          );

        localStreamRef.current =
          stream;

        if (
          localVideoRef.current
        ) {
          localVideoRef.current.srcObject =
            stream;
        }

        const cameraTrack =
          stream.getVideoTracks()[0] || null;

        cameraTrackRef.current =
          cameraTrack;

        const peerConnection =
          createPeerConnection();

        stream
          .getTracks()
          .forEach((track) => {
            peerConnection.addTrack(
              track,
              stream
            );
          });

        return stream;
      } catch {
        setError(
          "Unable to access camera or microphone. Please allow browser permissions."
        );

        return null;
      }
    };

  // ==========================================================
  // JOIN VIDEO ROOM
  // ==========================================================

  const joinRoom = async (
    roomId: string
  ) => {
    if (!token) {
      return;
    }

    const socket =
      io(SOCKET_URL, {
        transports: [
          "websocket",
          "polling",
        ],

        auth: {
          token,
        },
      });

    socketRef.current =
      socket;

    socket.on(
      "connect",
      () => {
        setConnected(true);
        setConnectionStatus("connected");

        socket.emit(
          "join_video",
          {
            token,
            room_id: roomId,
          }
        );
      }
    );

    socket.on(
      "disconnect",
      () => {
        setConnected(false);
        setConnectionStatus("disconnected");
      }
    );

    socket.io.on(
      "reconnect_attempt",
      () => {
        setConnectionStatus("reconnecting");
      }
    );

    socket.io.on(
      "reconnect",
      () => {
        setConnected(true);
        setConnectionStatus("connected");
      }
    );

    socket.on(
      "video_error",
      (data) => {
        setError(
          data?.message ||
            "Video connection error. Please make sure you are a participant in an active consultation."
        );
      }
    );

    // --------------------------------------------------------
    // OTHER USER JOINED
    // --------------------------------------------------------

    socket.on(
      "user_joined",
      async () => {
        try {
          const peerConnection =
            createPeerConnection();

          const offer =
            await peerConnection.createOffer();

          await peerConnection.setLocalDescription(
            offer
          );

          socket.emit(
            "offer",
            {
              token,
              room_id: roomId,
              offer,
            }
          );
        } catch (err) {
          console.error(
            "Offer error:",
            err
          );
        }
      }
    );

    // --------------------------------------------------------
    // RECEIVE OFFER
    // --------------------------------------------------------

    socket.on(
      "offer",
      async (data) => {
        try {
          const peerConnection =
            createPeerConnection();

          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(
              data.offer
            )
          );

          const answer =
            await peerConnection.createAnswer();

          await peerConnection.setLocalDescription(
            answer
          );

          socket.emit(
            "answer",
            {
              token,
              room_id: roomId,
              answer,
            }
          );
        } catch (err) {
          console.error(
            "Answer error:",
            err
          );
        }
      }
    );

    // --------------------------------------------------------
    // RECEIVE ANSWER
    // --------------------------------------------------------

    socket.on(
      "answer",
      async (data) => {
        try {
          const peerConnection =
            peerConnectionRef.current;

          if (!peerConnection) {
            return;
          }

          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(
              data.answer
            )
          );
        } catch (err) {
          console.error(
            "Remote answer error:",
            err
          );
        }
      }
    );

    // --------------------------------------------------------
    // RECEIVE ICE CANDIDATE
    // --------------------------------------------------------

    socket.on(
      "ice_candidate",
      async (data) => {
        try {
          const peerConnection =
            peerConnectionRef.current;

          if (!peerConnection) {
            return;
          }

          if (!data.candidate) {
            return;
          }

          await peerConnection.addIceCandidate(
            new RTCIceCandidate(
              data.candidate
            )
          );
        } catch (err) {
          console.error(
            "ICE candidate error:",
            err
          );
        }
      }
    );

    // --------------------------------------------------------
    // OTHER USER LEFT
    // --------------------------------------------------------

    socket.on(
      "user_left",
      () => {
        setRemoteConnected(
          false
        );

        if (
          remoteVideoRef.current
        ) {
          remoteVideoRef.current.srcObject =
            null;
        }
      }
    );
  };

  // ==========================================================
  // START CALL
  // ==========================================================

  const startCall = async (
    roomId: string
  ): Promise<boolean> => {
    if (!token) {
      setError("You are not logged in.");
      return false;
    }

    try {
      const response =
        await fetch(
          `${API_BASE_URL}/video/${encodeURIComponent(
            roomId
          )}/start`,
          {
            method: "PATCH",

            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Unable to start call."
        );
      }

      setCall(data);
      return true;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to start call."
      );
      return false;
    }
  };

  // ==========================================================
  // CALL DURATION
  // ==========================================================

  useEffect(() => {
    if (!call?.started_at) {
      setCallDuration(0);
      return;
    }

    const startedAt =
      new Date(call.started_at).getTime();

    const updateDuration = () => {
      const elapsed = Math.max(
        0,
        Math.floor(
          (Date.now() - startedAt) / 1000
        )
      );

      setCallDuration(elapsed);
    };

    updateDuration();

    const interval =
      window.setInterval(
        updateDuration,
        1000
      );

    return () => {
      window.clearInterval(interval);
    };
  }, [call?.started_at]);

  const formatDuration = (
    totalSeconds: number
  ) => {
    const hours =
      Math.floor(totalSeconds / 3600);

    const minutes =
      Math.floor(
        (totalSeconds % 3600) / 60
      );

    const seconds =
      totalSeconds % 60;

    if (hours > 0) {
      return [
        hours,
        minutes,
        seconds,
      ]
        .map((value, index) =>
          index === 0
            ? String(value).padStart(2, "0")
            : String(value).padStart(2, "0")
        )
        .join(":");
    }

    return [
      minutes,
      seconds,
    ]
      .map((value) =>
        String(value).padStart(2, "0")
      )
      .join(":");
  };

  // ==========================================================
  // FULLSCREEN
  // ==========================================================

  const toggleRemoteFullscreen =
    async () => {
      const video =
        remoteVideoRef.current;

      if (!video) {
        return;
      }

      try {
        if (
          document.fullscreenElement
        ) {
          await document.exitFullscreen();
          setIsRemoteFullscreen(false);
          return;
        }

        await video.requestFullscreen();
        setIsRemoteFullscreen(true);
      } catch (err) {
        console.error(
          "Remote fullscreen error:",
          err
        );
      }
    };

  const toggleLocalFullscreen =
    async () => {
      const video =
        localVideoRef.current;

      if (!video) {
        return;
      }

      try {
        if (
          document.fullscreenElement
        ) {
          await document.exitFullscreen();
          setIsLocalFullscreen(false);
          return;
        }

        await video.requestFullscreen();
        setIsLocalFullscreen(true);
      } catch (err) {
        console.error(
          "Local fullscreen error:",
          err
        );
      }
    };

  useEffect(() => {
    const handleFullscreenChange =
      () => {
        const element =
          document.fullscreenElement;

        setIsRemoteFullscreen(
          element ===
            remoteVideoRef.current
        );

        setIsLocalFullscreen(
          element ===
            localVideoRef.current
        );
      };

    document.addEventListener(
      "fullscreenchange",
      handleFullscreenChange
    );

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange
      );
    };
  }, []);

  // ==========================================================
  // INITIALIZE
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    const initialize =
      async () => {
        setLoading(true);
        setError("");

        const room =
          await createRoom();

        if (
          cancelled ||
          !room
        ) {
          setLoading(false);
          return;
        }

        const stream =
          await startLocalMedia();

        if (
          cancelled ||
          !stream
        ) {
          setLoading(false);
          return;
        }

        await joinRoom(
          room.room_id
        );

        const started = await startCall(
          room.room_id
        );

        if (!started) {
          if (!cancelled) {
            setLoading(false);
          }
          return;
        }

        if (!cancelled) {
          setLoading(false);
        }
      };

    initialize();

    return () => {
      cancelled = true;

      if (
        socketRef.current &&
        roomIdRef.current
      ) {
        socketRef.current.emit(
          "leave_video",
          {
            token,
            room_id:
              roomIdRef.current,
          }
        );

        socketRef.current.disconnect();
      }

      if (
        peerConnectionRef.current
      ) {
        peerConnectionRef.current.close();
        peerConnectionRef.current =
          null;
      }

      if (
        localStreamRef.current
      ) {
        localStreamRef.current
          .getTracks()
          .forEach(
            (track) => track.stop()
          );

        localStreamRef.current =
          null;
      }

      if (
        screenStreamRef.current
      ) {
        screenStreamRef.current
          .getTracks()
          .forEach(
            (track) => track.stop()
          );

        screenStreamRef.current =
          null;
      }
    };
  }, []);

  // ==========================================================
  // TOGGLE MICROPHONE
  // ==========================================================

  const toggleMicrophone =
    () => {
      const stream =
        localStreamRef.current;

      if (!stream) {
        return;
      }

      const audioTracks =
        stream.getAudioTracks();

      audioTracks.forEach(
        (track) => {
          track.enabled =
            !track.enabled;
        }
      );

      setMicEnabled(
        audioTracks.some(
          (track) =>
            track.enabled
        )
      );
    };

  // ==========================================================
  // TOGGLE CAMERA
  // ==========================================================

  const toggleCamera =
    () => {
      const stream =
        localStreamRef.current;

      if (!stream) {
        return;
      }

      const videoTracks =
        stream.getVideoTracks();

      videoTracks.forEach(
        (track) => {
          track.enabled =
            !track.enabled;
        }
      );

      setCameraEnabled(
        videoTracks.some(
          (track) =>
            track.enabled
        )
      );
    };

  // ==========================================================
  // SCREEN SHARING
  // ==========================================================

  const startScreenShare = async (
    mode: "entire-screen" | "window" | "tab"
  ) => {
    const peerConnection =
      peerConnectionRef.current;

    if (!peerConnection) {
      setError(
        "Video connection is not ready yet."
      );
      return;
    }

    try {
      // Browser-native screen picker options.
      // The browser still controls the actual picker UI.
      // Some browsers support extra tab-specific options that are not present in the
      // TypeScript DOM typings, so we cast the final object to the browser API type.
      const displayOptions = {
        video: {
          displaySurface:
            mode === "entire-screen"
              ? "monitor"
              : mode === "window"
                ? "window"
                : "browser",
        } as MediaTrackConstraints,
        audio: true,
        ...(mode === "tab"
          ? {
              preferCurrentTab: true,
              selfBrowserSurface: "include" as const,
            }
          : {
              selfBrowserSurface: "exclude" as const,
            }),
      } as DisplayMediaStreamOptions;

      const screenStream =
        await navigator.mediaDevices.getDisplayMedia(
          displayOptions
        );

      const screenTrack =
        screenStream.getVideoTracks()[0];

      if (!screenTrack) {
        screenStream
          .getTracks()
          .forEach((track) => track.stop());

        return;
      }

      const videoSender =
        peerConnection
          .getSenders()
          .find(
            (item) =>
              item.track?.kind === "video"
          );

      if (!videoSender) {
        screenStream
          .getTracks()
          .forEach((track) => track.stop());

        setError(
          "Unable to start screen sharing."
        );
        return;
      }

      await videoSender.replaceTrack(
        screenTrack
      );

      screenStreamRef.current =
        screenStream;

      setIsScreenSharing(true);
      setScreenShareMenuOpen(false);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject =
          screenStream;
      }

      screenTrack.onended = async () => {
        await stopScreenShare();
      };
    } catch (err) {
      setScreenShareMenuOpen(false);

      // Closing/cancelling the browser picker is normal.
      if (
        err instanceof DOMException &&
        err.name === "NotAllowedError"
      ) {
        return;
      }

      console.error(
        "Screen sharing error:",
        err
      );

      setError(
        "Unable to share your screen. Please try again."
      );
    }
  };

  const stopScreenShare = async () => {
    const peerConnection =
      peerConnectionRef.current;

    const cameraTrack =
      cameraTrackRef.current ||
      localStreamRef.current?.getVideoTracks()[0];

    if (peerConnection && cameraTrack) {
      const videoSender =
        peerConnection
          .getSenders()
          .find(
            (item) =>
              item.track?.kind === "video"
          );

      if (videoSender) {
        await videoSender.replaceTrack(
          cameraTrack
        );
      }
    }

    if (screenStreamRef.current) {
      screenStreamRef.current
        .getTracks()
        .forEach(
          (track) => track.stop()
        );

      screenStreamRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject =
        localStreamRef.current;
    }

    setIsScreenSharing(false);
    setScreenShareMenuOpen(false);
  };

  const toggleScreenShare = () => {
    if (isScreenSharing) {
      void stopScreenShare();
      return;
    }

    setScreenShareMenuOpen(
      (previous) => !previous
    );
  };


  // ==========================================================
  // END CALL
  // ==========================================================

  const endCall =
    async () => {
      if (ending) {
        return;
      }

      setEnding(true);

      try {
        if (
          socketRef.current &&
          roomIdRef.current
        ) {
          socketRef.current.emit(
            "leave_video",
            {
              token,
              room_id:
                roomIdRef.current,
            }
          );
        }

        if (
          token &&
          roomIdRef.current
        ) {
          await fetch(
            `${API_BASE_URL}/video/${encodeURIComponent(
              roomIdRef.current
            )}/end`,
            {
              method: "PATCH",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${token}`,
              },

              body: JSON.stringify({
                status: "ended",
              }),
            }
          );
        }
      } catch (err) {
        console.error(
          "End call error:",
          err
        );
      }

      if (
        peerConnectionRef.current
      ) {
        peerConnectionRef.current.close();

        peerConnectionRef.current =
          null;
      }

      if (
        localStreamRef.current
      ) {
        localStreamRef.current
          .getTracks()
          .forEach(
            (track) => track.stop()
          );

        localStreamRef.current =
          null;
      }

      if (
        screenStreamRef.current
      ) {
        screenStreamRef.current
          .getTracks()
          .forEach(
            (track) => track.stop()
          );

        screenStreamRef.current =
          null;
      }

      setIsScreenSharing(false);
      setScreenShareMenuOpen(false);

      if (
        socketRef.current
      ) {
        socketRef.current.disconnect();
        socketRef.current =
          null;
      }

      // Return to the correct dashboard using the authenticated user's role.
      const role = user?.role?.toLowerCase();

      const dashboardPath =
        role === "lawyer"
          ? "/lawyer/dashboard"
          : "/client/dashboard";

      navigate(dashboardPath, { replace: true });
    };

  const connectionLabel =
    connectionStatus === "connected"
      ? "Connected"
      : connectionStatus === "reconnecting"
        ? "Reconnecting..."
        : connectionStatus === "connecting"
          ? "Connecting..."
          : "Disconnected";

  const connectionDotClass =
    connectionStatus === "connected"
      ? "bg-green-400"
      : connectionStatus === "reconnecting"
        ? "bg-yellow-400"
        : connectionStatus === "connecting"
          ? "bg-yellow-400"
          : "bg-red-400";

  // ==========================================================
  // UI
  // ==========================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center text-white">
        <div className="text-center">
          <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />

          <h2 className="text-lg font-semibold">
            Connecting to consultation...
          </h2>

          <p className="mt-2 text-sm text-white/50">
            Please allow camera and microphone access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="flex h-16 items-center justify-between border-b border-white/10 px-5 md:px-8">

        <div>
          <div className="text-sm font-semibold">
            Vakilo
          </div>

          <div className="text-xs text-white/40">
            Video Consultation
          </div>
        </div>

        <div className="flex items-center gap-3">

          <div className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${connectionDotClass}`}
            />

            {connectionLabel}
          </div>

          <div className="rounded-full bg-white/5 px-3 py-1.5 text-xs tabular-nums text-white/70">
            {formatDuration(callDuration)}
          </div>

          {call && (
            <div className="hidden text-xs text-white/40 md:block">
              Case #{call.case_id}
            </div>
          )}

        </div>

      </header>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="mx-auto mt-4 max-w-7xl px-5">
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        </div>
      )}

      {/* =====================================================
          VIDEO AREA
      ===================================================== */}

      <main className="mx-auto max-w-7xl p-4 md:p-6">

        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#151515]">

          {/* REMOTE VIDEO */}

          <div className="relative aspect-video w-full bg-[#101010]">

            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="h-full w-full object-cover"
            />

            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-xs backdrop-blur">
              <span
                className={`h-2 w-2 rounded-full ${
                  remoteConnected
                    ? "bg-green-400"
                    : "bg-white/30"
                }`}
              />
              {remoteConnected
                ? "Participant connected"
                : "Waiting for participant"}
            </div>

            <button
              type="button"
              onClick={toggleRemoteFullscreen}
              className="absolute right-4 top-4 rounded-lg bg-black/50 px-3 py-2 text-xs text-white backdrop-blur transition hover:bg-black/70"
              title="Full screen"
            >
              {isRemoteFullscreen
                ? "Exit Fullscreen"
                : "⛶ Fullscreen"}
            </button>

            {!remoteConnected && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">

                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-xl">
                    👤
                  </div>

                  <p className="text-sm font-medium">
                    Waiting for the other participant
                  </p>

                  <p className="mt-1 text-xs text-white/40">
                    The lawyer or client can join the consultation.
                  </p>

                </div>
              </div>
            )}

            {/* LOCAL VIDEO */}

            <div className="absolute bottom-4 right-4 h-32 w-48 overflow-hidden rounded-xl border border-white/20 bg-black shadow-2xl md:h-40 md:w-56">

              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="h-full w-full object-cover"
              />

              <button
                type="button"
                onClick={toggleLocalFullscreen}
                className="absolute right-2 top-2 rounded-md bg-black/50 px-2 py-1 text-[10px] text-white backdrop-blur transition hover:bg-black/70"
                title="Full screen"
              >
                ⛶
              </button>

              {!cameraEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#151515] text-xs text-white/60">
                  Camera off
                </div>
              )}

            </div>

          </div>

          {/* =================================================
              CONTROLS
          ================================================= */}

          <div className="flex flex-wrap items-center justify-center gap-3 border-t border-white/10 bg-[#111111] p-4">

            <button
              type="button"
              onClick={toggleMicrophone}
              className={`rounded-full px-5 py-3 text-sm font-medium transition ${
                micEnabled
                  ? "bg-white/10 hover:bg-white/15"
                  : "bg-red-500/20 text-red-300 hover:bg-red-500/30"
              }`}
            >
              {micEnabled
                ? "🎙 Mute"
                : "🔇 Unmute"}
            </button>

            <button
              type="button"
              onClick={toggleCamera}
              className={`rounded-full px-5 py-3 text-sm font-medium transition ${
                cameraEnabled
                  ? "bg-white/10 hover:bg-white/15"
                  : "bg-red-500/20 text-red-300 hover:bg-red-500/30"
              }`}
            >
              {cameraEnabled
                ? "📹 Camera"
                : "🚫 Camera"}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={toggleScreenShare}
                disabled={ending || !connected || !remoteConnected}
                className={`rounded-full px-5 py-3 text-sm font-medium transition ${
                  isScreenSharing
                    ? "bg-[#C9A227] text-[#171717] hover:bg-[#B38F1D]"
                    : "bg-white/10 hover:bg-white/15"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {isScreenSharing
                  ? "🛑 Stop Sharing"
                  : "🖥 Share Screen"}
              </button>

              {screenShareMenuOpen &&
                !isScreenSharing && (
                  <div className="absolute bottom-full left-1/2 z-50 mb-3 w-64 -translate-x-1/2 overflow-hidden rounded-xl border border-white/10 bg-[#1A1A1A] p-2 shadow-2xl">
                    <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                      Choose what to share
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        void startScreenShare(
                          "entire-screen"
                        )
                      }
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-white transition hover:bg-white/10"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                        🖥️
                      </span>
                      <span>
                        <span className="block font-medium">
                          Entire Screen
                        </span>
                        <span className="block text-xs text-white/40">
                          Share your complete display
                        </span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void startScreenShare(
                          "window"
                        )
                      }
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-white transition hover:bg-white/10"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                        🪟
                      </span>
                      <span>
                        <span className="block font-medium">
                          Choose Screen / Window
                        </span>
                        <span className="block text-xs text-white/40">
                          Share a specific application window
                        </span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void startScreenShare(
                          "tab"
                        )
                      }
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-white transition hover:bg-white/10"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                        🌐
                      </span>
                      <span>
                        <span className="block font-medium">
                          Choose Browser Tab
                        </span>
                        <span className="block text-xs text-white/40">
                          Share a specific browser tab
                        </span>
                      </span>
                    </button>
                  </div>
                )}
            </div>

            <button
              type="button"
              onClick={endCall}
              disabled={ending}
              className="rounded-full bg-red-600 px-6 py-3 text-sm font-semibold transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {ending
                ? "Ending..."
                : "End Consultation"}
            </button>

          </div>

        </div>

        {/* ===================================================
            INFORMATION
        =================================================== */}

        <div className="mt-5 grid gap-4 md:grid-cols-3">

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-wider text-white/40">
              Case
            </p>

            <p className="mt-2 text-sm font-medium">
              #{caseId}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-wider text-white/40">
              Room
            </p>

            <p className="mt-2 truncate text-sm font-medium">
              {call?.room_id || "Connecting..."}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-wider text-white/40">
              Status
            </p>

            <p className="mt-2 text-sm font-medium capitalize">
              {call?.status || "Connecting..."}
            </p>
          </div>

        </div>

      </main>
    </div>
  );
}