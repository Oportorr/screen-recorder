"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createUploadUrl, getAssetIdFromUpload } from "@/app/actions";
import { Loader2, StopCircle, Monitor, Video } from "lucide-react";

const MAX_DURATION = 7 * 60; // 7 minutes in seconds

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function ScreenRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [mediaBlob, setMediaBlob] = useState<Blob | null>(null);
  const [timeLeft, setTimeLeft] = useState(MAX_DURATION);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const limitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const router = useRouter();

  useEffect(() => {
    return () => {
      if (limitTimerRef.current) clearTimeout(limitTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      // Step 1: Capture the screen
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      // Step 2: Capture the microphone
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
        video: false,
      });

      // Step 3: Store references for cleanup
      screenStreamRef.current = screenStream;
      micStreamRef.current = micStream;

      // Step 4: Merge the streams
      const combinedStream = new MediaStream([
        ...screenStream.getVideoTracks(),
        ...micStream.getAudioTracks(),
      ]);

      // Step 5: Show live preview
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = combinedStream;
      }

      // Step 6: Set up the recorder
      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: "video/webm; codecs=vp9",
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // Step 7: Collect chunks as they're recorded
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      // Step 8: Handle recording completion
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        setMediaBlob(blob);

        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = null;
        }

        // Critical: Stop all tracks
        screenStreamRef.current?.getTracks().forEach((t) => t.stop());
        micStreamRef.current?.getTracks().forEach((t) => t.stop());

        // Clean up timers
        if (limitTimerRef.current) clearTimeout(limitTimerRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
      };

      // Step 9: Start recording
      mediaRecorder.start();
      setIsRecording(true);
      setTimeLeft(MAX_DURATION);

      // Step 10: Auto-stop after 7 minutes
      limitTimerRef.current = setTimeout(() => {
        stopRecording();
      }, MAX_DURATION * 1000);

      // Step 11: Countdown ticker
      countdownRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Step 12: Handle native "Stop sharing" button
      screenStream.getVideoTracks()[0].onended = stopRecording;
    } catch (err) {
      console.error("Error starting recording:", err);
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (limitTimerRef.current) clearTimeout(limitTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    }
  };

  const handleUpload = async () => {
    if (!mediaBlob) return;

    setIsUploading(true);

    try {
      // Step 1: Get a signed upload URL from our server
      const uploadConfig = await createUploadUrl();

      // Step 2: Upload directly to Mux (not through our server!)
      await fetch(uploadConfig.url, {
        method: "PUT",
        body: mediaBlob,
      });

      // Step 3: Poll until processing completes
      while (true) {
        const result = await getAssetIdFromUpload(uploadConfig.id);
        if (result.playbackId) {
          router.push(`/video/${result.playbackId}`);
          break;
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
    } catch (err) {
      console.error("Upload failed", err);
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 p-8 bg-slate-900 rounded-xl border border-slate-700 w-full max-w-md shadow-2xl">
      <h2 className="text-2xl font-bold text-white">
        {isRecording ? "Recording..." : "New Recording"}
      </h2>

      {/* Preview Area */}
      <div className="w-full aspect-video bg-black rounded-lg border border-slate-800 flex items-center justify-center relative overflow-hidden">
        {/* Live Preview (while recording) */}
        <video
          ref={liveVideoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${isRecording ? "block" : "hidden"}`}
        />

        {/* Recording Ready State */}
        {!isRecording && mediaBlob && (
          <div className="text-emerald-400 flex flex-col items-center">
            <Video className="w-12 h-12 mb-2" />
            <span>Recording Ready</span>
          </div>
        )}

        {/* Idle State */}
        {!isRecording && !mediaBlob && (
          <div className="text-slate-600 flex flex-col items-center">
            <Monitor className="w-12 h-12 mb-2 opacity-50" />
            <span>Preview Area</span>
          </div>
        )}

        {/* Recording Indicator + Countdown */}
        {isRecording && (
          <div className="absolute top-3 right-3 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg">
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
            <span
              className={`text-xs font-mono font-semibold ${timeLeft <= 60 ? "text-red-400" : "text-white"}`}
            >
              {formatTime(timeLeft)}
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex w-full gap-4">
        {!isRecording && !mediaBlob && (
          <button
            onClick={startRecording}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            Start Recording
          </button>
        )}

        {isRecording && (
          <button
            onClick={stopRecording}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex justify-center items-center gap-2"
          >
            <StopCircle className="w-5 h-5" /> Stop Recording
          </button>
        )}

        {mediaBlob && (
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : (
              "Upload & Share"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
