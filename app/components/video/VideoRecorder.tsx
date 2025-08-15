import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '../ui';
import type { VideoSource, AnalysisStatus } from '../../lib/types';
import { Camera, Square, Play, Pause, RotateCcw, RotateCw } from 'lucide-react';

interface VideoRecorderProps {
  onVideoReady: (videoBlob: Blob, videoUrl: string) => void;
  onStatusChange: (status: AnalysisStatus) => void;
  maxDuration?: number;
}

export function VideoRecorder({ 
  onVideoReady, 
  onStatusChange, 
  maxDuration = 60
}: VideoRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isMirrored, setIsMirrored] = useState(true);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);

  // Detect if device is mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Request camera permission and setup stream
  const setupCamera = useCallback(async () => {
    try {
      setError(null);
      onStatusChange('idle');

      // Stop existing stream if any
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Calculate optimal resolution based on orientation
      let aspectRatio: number;
      let baseWidth: number;
      let baseHeight: number;
      
      if (orientation === 'portrait') {
        aspectRatio = 9 / 16; // Portrait aspect ratio
        baseHeight = 640; // Taller for portrait
        baseWidth = Math.round(baseHeight * aspectRatio); // ≈ 360
      } else {
        aspectRatio = 16 / 9; // Landscape aspect ratio
        baseHeight = 360; // Shorter for landscape
        baseWidth = Math.round(baseHeight * aspectRatio); // ≈ 640
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: baseWidth, min: 320, max: 640 },
          height: { ideal: baseHeight, min: 280, max: 560 },
          aspectRatio: aspectRatio,
          facingMode: facingMode
        },
        audio: true
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasPermission(true);
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Camera access denied. Please allow camera permissions.');
      setHasPermission(false);
      onStatusChange('error');
    }
  }, [onStatusChange, facingMode, orientation]);

  // Start recording
  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    try {
      chunksRef.current = [];
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm;codecs=vp9'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const videoBlob = new Blob(chunksRef.current, { type: 'video/webm' });
        const videoUrl = URL.createObjectURL(videoBlob);
        onVideoReady(videoBlob, videoUrl);
        onStatusChange('processing');
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(maxDuration);
      onStatusChange('recording');

      // Record the exact start time
      recordingStartTimeRef.current = Date.now();

      // Start precise timer - check every 100ms for better accuracy
      timerRef.current = setInterval(() => {
        if (recordingStartTimeRef.current) {
          const elapsedMs = Date.now() - recordingStartTimeRef.current;
          const elapsedSeconds = Math.floor(elapsedMs / 1000);
          
          // Set countdown time (maxDuration - elapsed time)
          const remainingSeconds = Math.max(0, maxDuration - elapsedSeconds);
          setRecordingTime(remainingSeconds);
          
          // Stop recording if we've reached or exceeded the maximum duration
          // Use a small buffer (50ms) to ensure we don't go over
          if (elapsedMs >= (maxDuration * 1000) - 50) {
            stopRecording();
          }
        }
      }, 100); // Check every 100ms for precise timing
    } catch (err) {
      console.error('Recording error:', err);
      setError('Failed to start recording');
      onStatusChange('error');
    }
  }, [maxDuration, onVideoReady, onStatusChange]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Clear the start time reference
      recordingStartTimeRef.current = null;
    }
  }, [isRecording]);

  // Pause/Resume recording
  const togglePause = useCallback(() => {
    if (!mediaRecorderRef.current) return;

    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
      // Adjust start time to account for paused duration
      if (recordingStartTimeRef.current) {
        const pausedDuration = Date.now() - (recordingStartTimeRef.current + (recordingTime * 1000));
        recordingStartTimeRef.current = Date.now() - (recordingTime * 1000);
      }
      
      // Resume precise timer
      timerRef.current = setInterval(() => {
        if (recordingStartTimeRef.current) {
          const elapsedMs = Date.now() - recordingStartTimeRef.current;
          const elapsedSeconds = Math.floor(elapsedMs / 1000);
          
          // Set countdown time (maxDuration - elapsed time)
          const remainingSeconds = Math.max(0, maxDuration - elapsedSeconds);
          setRecordingTime(remainingSeconds);
          
          // Stop recording if we've reached or exceeded the maximum duration
          if (elapsedMs >= (maxDuration * 1000) - 50) {
            stopRecording();
          }
        }
      }, 100);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isPaused, maxDuration, stopRecording, recordingTime]);

  // Flip camera (available on all devices)
  const flipCamera = useCallback(async () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    // Always mirror front camera, never mirror back camera
    setIsMirrored(newFacingMode === 'user');
    await setupCamera();
  }, [facingMode, setupCamera]);

  // Toggle mirror manually (only allow when using back camera)
  const toggleMirror = useCallback(() => {
    // Only allow manual mirror toggle for back camera
    // Front camera should always be mirrored
    if (facingMode === 'environment') {
      setIsMirrored(prev => !prev);
    }
  }, [facingMode]);

  // Toggle camera orientation
  const toggleOrientation = useCallback(async () => {
    const newOrientation = orientation === 'portrait' ? 'landscape' : 'portrait';
    setOrientation(newOrientation);
    await setupCamera();
  }, [orientation, setupCamera]);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup media stream function
  const cleanupMediaStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log(`Stopped ${track.kind} track`); // For debugging
      });
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Browser event cleanup - ensures media streams are stopped when page is closed/hidden
  useEffect(() => {
    const handleBeforeUnload = () => {
      cleanupMediaStream();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        cleanupMediaStream();
      }
    };

    const handleBlur = () => {
      cleanupMediaStream();
    };

    const handlePageHide = () => {
      cleanupMediaStream();
    };

    // Add event listeners for various browser events
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('pagehide', handlePageHide);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('pagehide', handlePageHide);
      cleanupMediaStream();
    };
  }, [cleanupMediaStream]);

  // Setup camera on mount
  useEffect(() => {
    setupCamera();
  }, [setupCamera]);

  // Ensure front camera is always mirrored
  useEffect(() => {
    if (facingMode === 'user') {
      setIsMirrored(true);
    }
  }, [facingMode]);

  if (hasPermission === false) {
    return (
      <div className="golf-card text-center">
        <div className="golf-error mb-4">
          <p>{error}</p>
        </div>
        <Button onClick={setupCamera} variant="primary">
          <Camera className="w-4 h-4 mr-2" />
          Request Camera Access
        </Button>
      </div>
    );
  }

  if (hasPermission === null) {
    return (
      <div className="golf-card text-center">
        <div className="golf-loading h-64 mb-4"></div>
        <p>Setting up camera...</p>
      </div>
    );
  }

  return (
    <div className="golf-card">
      <div className="golf-video-container mb-4 relative">
        <div
          className="w-full rounded-lg overflow-hidden bg-black"
          style={{
            aspectRatio: orientation === 'portrait' ? '9/16' : '16/9',
            maxWidth: '100%',
            height: 'auto'
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full ${(facingMode === 'user' || isMirrored) ? 'scale-x-[-1]' : 'scale-x-[1]'}`}
            style={{
              objectFit: 'cover',
              objectPosition: 'center',
              transform: (facingMode === 'user' || isMirrored) ? 'scaleX(-1)' : 'scaleX(1)',
              WebkitTransform: (facingMode === 'user' || isMirrored) ? 'scaleX(-1)' : 'scaleX(1)',
              MozTransform: (facingMode === 'user' || isMirrored) ? 'scaleX(-1)' : 'scaleX(1)',
              msTransform: (facingMode === 'user' || isMirrored) ? 'scaleX(-1)' : 'scaleX(1)',
              filter: 'none',
              backfaceVisibility: 'hidden'
            }}
          />
        </div>
        
        {/* Camera mode indicator - positioned over video */}
        <div className="absolute top-4 left-4 flex items-center space-x-2 z-[1001]" style={{
          zIndex: 1001,
          pointerEvents: 'none'
        }}>
          {isRecording && (
            <>
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-white font-semibold bg-red-600 px-2 py-1 rounded text-sm shadow-lg border border-white/20">
                REC {formatTime(recordingTime)}
              </span>
            </>
          )}
          <span className="text-white text-sm bg-blue-600 px-3 py-1 rounded font-medium shadow-lg border border-white/20">
            {facingMode === 'user' ? 'FRONT (MIRRORED)' : 'BACK'} {facingMode === 'environment' && isMirrored ? '(FLIPPED)' : ''} - {orientation.toUpperCase()}
          </span>
        </div>

        {/* Camera controls - positioned over video - only show when camera is ready and stream is active */}
        {!isRecording && hasPermission === true && streamRef.current && (
          <div className="absolute top-4 right-4 flex space-x-2 z-[1001]" style={{ zIndex: 1001 }}>
            <button
              onClick={toggleOrientation}
              className="p-3 bg-gray-900/80 backdrop-blur-sm text-white rounded-full hover:bg-gray-700/80 transition-all shadow-lg border-2 border-white/30"
              title={`Switch to ${orientation === 'portrait' ? 'landscape' : 'portrait'} orientation`}
            >
              <RotateCw className="w-5 h-5" />
            </button>
            <button
              onClick={flipCamera}
              className="p-3 bg-gray-900/80 backdrop-blur-sm text-white rounded-full hover:bg-gray-700/80 transition-all shadow-lg border-2 border-white/30"
              title={`Switch to ${facingMode === 'user' ? 'back' : 'front'} camera`}
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            {facingMode === 'environment' && (
              <button
                onClick={toggleMirror}
                className="p-3 bg-gray-900/80 backdrop-blur-sm text-white rounded-full hover:bg-gray-700/80 transition-all shadow-lg border-2 border-white/30"
                title={`${isMirrored ? 'Disable' : 'Enable'} manual mirror for back camera`}
              >
                <span className="text-sm font-bold">M</span>
              </button>
            )}
          </div>
        )}

        {/* Refresh button overlay when camera is inactive */}
        {hasPermission === true && !streamRef.current && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-[1002]">
            <div className="text-center">
              <button
                onClick={() => setupCamera()}
                className="w-20 h-20 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center mb-4 mx-auto transition-all duration-200 hover:scale-110 shadow-lg"
                title="Click to activate camera"
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  stroke="none"
                >
                  <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                </svg>
              </button>
              <p className="text-white font-medium mb-2">Camera Inactive</p>
              <p className="text-white/80 text-sm">Click to activate camera</p>
            </div>
          </div>
        )}

        {/* Max duration indicator - positioned over video - only show when NOT recording and stream is active */}
        {!isRecording && streamRef.current && (
          <div className="absolute bottom-4 right-4 text-white bg-gray-900/80 backdrop-blur-sm px-3 py-1 rounded shadow-lg border border-white/20 z-[1001]" style={{
            zIndex: 1001,
            pointerEvents: 'none'
          }}>
            Max: {formatTime(maxDuration)}
          </div>
        )}

      </div>

      {/* Controls */}
      <div className="flex justify-center space-x-4">
        {!isRecording ? (
          <Button onClick={startRecording} variant="primary" size="lg">
            <Camera className="w-5 h-5 mr-2" />
            Start Recording
          </Button>
        ) : (
          <>
            <Button onClick={togglePause} variant="secondary">
              {isPaused ? (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </>
              )}
            </Button>
            <Button onClick={stopRecording} variant="outline">
              <Square className="w-4 h-4 mr-2" />
              Stop
            </Button>
          </>
        )}
      </div>

      {error && (
        <div className="golf-error mt-4">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}