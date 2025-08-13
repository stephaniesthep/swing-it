import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '../ui';
import type { VideoSource, AnalysisStatus } from '../../lib/types';
import { Camera, Square, Play, Pause } from 'lucide-react';

interface VideoRecorderProps {
  onVideoReady: (videoBlob: Blob, videoUrl: string) => void;
  onStatusChange: (status: AnalysisStatus) => void;
  maxDuration?: number;
}

export function VideoRecorder({ 
  onVideoReady, 
  onStatusChange, 
  maxDuration = 30 
}: VideoRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Request camera permission and setup stream
  const setupCamera = useCallback(async () => {
    try {
      setError(null);
      onStatusChange('idle');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
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
  }, [onStatusChange]);

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
      setRecordingTime(0);
      onStatusChange('recording');

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          if (newTime >= maxDuration) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);
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
    }
  }, [isRecording]);

  // Pause/Resume recording
  const togglePause = useCallback(() => {
    if (!mediaRecorderRef.current) return;

    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      // Resume timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          if (newTime >= maxDuration) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isPaused, maxDuration, stopRecording]);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Setup camera on mount
  useEffect(() => {
    setupCamera();
  }, [setupCamera]);

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
      <div className="golf-video-container mb-4">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-64 md:h-80 object-cover"
        />
        
        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute top-4 left-4 flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-white font-semibold bg-black bg-opacity-50 px-2 py-1 rounded">
              REC {formatTime(recordingTime)}
            </span>
          </div>
        )}

        {/* Max duration indicator */}
        <div className="absolute top-4 right-4 text-white bg-black bg-opacity-50 px-2 py-1 rounded text-sm">
          Max: {formatTime(maxDuration)}
        </div>
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