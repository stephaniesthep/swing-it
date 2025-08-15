import { useState, useRef, useCallback, useEffect } from 'react';

export function ImprovedGolfApp() {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'complete'>('idle');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<{
    smoothnessScore: number;
    tempo: number;
    recommendations: Array<{
      category: string;
      issue: string;
      explanation: string;
      improvement: string;
      priority: 'high' | 'medium' | 'low';
    }>;
    celebrationTriggered: boolean;
    swingPath: Array<{ x: number; y: number; timestamp: number }>;
  } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment'); // Default to back camera
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  
  // Drag and drop state
  const [isDragActive, setIsDragActive] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Enhanced analysis function with detailed AI recommendations
  const analyzeSwing = useCallback(() => {
    setStatus('processing');
    
    setTimeout(() => {
      const score = Math.floor(Math.random() * 40) + 60; // 60-100
      
      // Generate mock swing path for overlay
      const swingPath = [];
      for (let i = 0; i < 30; i++) {
        const progress = i / 29;
        const x = 50 + Math.sin(progress * Math.PI * 2) * 30 + (Math.random() - 0.5) * 5;
        const y = 20 + progress * 60 + Math.sin(progress * Math.PI * 4) * 10;
        swingPath.push({
          x: x,
          y: y,
          timestamp: Date.now() + i * 100
        });
      }

      // Detailed AI recommendations based on score
      const recommendations = [];
      
      if (score < 70) {
        recommendations.push({
          category: 'Swing Plane',
          issue: 'Inconsistent swing plane detected',
          explanation: 'Your club is moving outside the ideal swing plane, causing inconsistent ball contact. The swing plane should follow a consistent arc from takeaway through impact.',
          improvement: 'Practice with alignment sticks placed at your target line and parallel to your feet. Focus on keeping the club head traveling along this plane throughout your swing.',
          priority: 'high' as const
        });
        
        recommendations.push({
          category: 'Tempo',
          issue: 'Rushed downswing transition',
          explanation: 'Your transition from backswing to downswing is too quick, not allowing proper weight transfer and club positioning. This leads to loss of power and accuracy.',
          improvement: 'Practice the "pause drill" - take your backswing to the top, pause for one second, then start your downswing. This helps develop proper sequencing.',
          priority: 'high' as const
        });
      } else if (score < 85) {
        recommendations.push({
          category: 'Follow Through',
          issue: 'Incomplete follow-through',
          explanation: 'Your follow-through is cutting short, which indicates deceleration through impact. A complete follow-through ensures maximum energy transfer to the ball.',
          improvement: 'Focus on finishing with your chest facing the target and your weight fully on your front foot. Hold your finish position for 3 seconds after each swing.',
          priority: 'medium' as const
        });
        
        recommendations.push({
          category: 'Weight Transfer',
          issue: 'Limited weight shift',
          explanation: 'Your weight transfer from back foot to front foot could be more pronounced. Proper weight transfer is crucial for generating power and maintaining balance.',
          improvement: 'Practice the "step drill" - take your normal stance, then step your front foot toward the target as you swing. This exaggerates the weight transfer feeling.',
          priority: 'medium' as const
        });
      } else {
        recommendations.push({
          category: 'Consistency',
          issue: 'Excellent swing mechanics!',
          explanation: 'Your swing shows great consistency and proper sequencing. You\'re maintaining good tempo, plane, and follow-through throughout the motion.',
          improvement: 'Continue practicing to maintain this level. Focus on course management and mental game to translate this swing quality to lower scores on the course.',
          priority: 'low' as const
        });
        
        recommendations.push({
          category: 'Fine-tuning',
          issue: 'Minor timing optimization',
          explanation: 'While your swing is very good, there\'s always room for small improvements in timing and rhythm that can lead to even more consistent ball striking.',
          improvement: 'Work with a metronome or counting system to develop an even more consistent tempo. Try counting "one-two" for backswing and "three" for impact.',
          priority: 'low' as const
        });
      }

      const mockAnalysis = {
        smoothnessScore: score,
        tempo: 2.1 + Math.random() * 1.5,
        recommendations,
        celebrationTriggered: score >= 85,
        swingPath
      };
      
      setAnalysis(mockAnalysis);
      setStatus('complete');
      
      if (score >= 85) {
        console.log('🎉 Celebration! Great swing!');
      }
    }, 3000); // Longer processing time for more realistic feel
  }, []);

  // Setup camera with portrait orientation
  const setupCamera = useCallback(async (facing: 'user' | 'environment' = facingMode) => {
    try {
      setError(null);
      setCameraReady(false);
      
      // Stop existing stream if any
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Calculate optimal resolution based on orientation
      let videoConstraints;
      if (orientation === 'portrait') {
        videoConstraints = {
          width: { ideal: 720 },  // Portrait: height > width
          height: { ideal: 1280 },
          facingMode: facing,
          aspectRatio: { ideal: 9/16 } // Portrait aspect ratio
        };
      } else {
        videoConstraints = {
          width: { ideal: 1280 }, // Landscape: width > height
          height: { ideal: 720 },
          facingMode: facing,
          aspectRatio: { ideal: 16/9 } // Landscape aspect ratio
        };
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: true
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true);
        };
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Camera access denied. Please allow camera permissions and try again.');
    }
  }, [facingMode, orientation]);

  // Flip camera between front and back
  const flipCamera = useCallback(async () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    await setupCamera(newFacingMode);
  }, [facingMode, setupCamera]);

  // Toggle camera orientation
  const toggleOrientation = useCallback(async () => {
    const newOrientation = orientation === 'portrait' ? 'landscape' : 'portrait';
    setOrientation(newOrientation);
    await setupCamera(facingMode);
  }, [orientation, setupCamera, facingMode]);

  // Fixed recording functionality
  const startRecording = useCallback(async () => {
    if (!streamRef.current || !cameraReady) {
      setError('Camera not ready. Please wait for camera to load.');
      return;
    }

    try {
      setError(null);
      chunksRef.current = [];
      
      // Check if MediaRecorder is supported
      if (!MediaRecorder.isTypeSupported('video/webm')) {
        setError('Video recording not supported in this browser.');
        return;
      }

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
        const url = URL.createObjectURL(videoBlob);
        setVideoUrl(url);
        analyzeSwing();
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording failed. Please try again.');
        setIsRecording(false);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setStatus('recording');
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          if (newTime >= 60) { // Auto-stop after 60 seconds
            stopRecording();
          }
          return newTime;
        });
      }, 1000);
    } catch (err) {
      console.error('Recording error:', err);
      setError('Failed to start recording. Please try again.');
    }
  }, [cameraReady, analyzeSwing]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setError('Please select a video file');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setError('File too large. Maximum size: 100MB');
      return;
    }

    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setError(null);
    analyzeSwing();
  }, [analyzeSwing]);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only set drag active if we have files being dragged
    if (e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
      setDragCounter(prev => prev + 1);
      setIsDragActive(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragCounter(prev => {
      const newCount = prev - 1;
      // Only deactivate when counter reaches 0
      if (newCount <= 0) {
        setIsDragActive(false);
        return 0;
      }
      return newCount;
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Ensure drag state stays active during drag over
    if (e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
      setIsDragActive(true);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Reset drag state immediately
    setIsDragActive(false);
    setDragCounter(0);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      
      if (!file.type.startsWith('video/')) {
        setError('Please drop a video file');
        return;
      }

      if (file.size > 100 * 1024 * 1024) {
        setError('File too large. Maximum size: 100MB');
        return;
      }

      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setError(null);
      analyzeSwing();
    }
  }, [analyzeSwing]);

  // Cleanup media stream function
  const cleanupMediaStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log(`Stopped ${track.kind} track`); // For debugging
      });
      streamRef.current = null;
    }
    // Reset camera ready state when stream is cleaned up
    setCameraReady(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Draw swing path overlay on video
  const drawSwingPath = useCallback(() => {
    if (!analysis?.swingPath || !canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match video
    const rect = video.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw swing path
    const path = analysis.swingPath;
    if (path.length < 2) return;

    ctx.strokeStyle = analysis.smoothnessScore >= 85 ? '#22c55e' : 
                     analysis.smoothnessScore >= 70 ? '#f59e0b' : '#ef4444';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 8;

    // Convert percentage coordinates to canvas coordinates
    ctx.beginPath();
    const firstPoint = path[0];
    ctx.moveTo((firstPoint.x / 100) * canvas.width, (firstPoint.y / 100) * canvas.height);

    for (let i = 1; i < path.length; i++) {
      const point = path[i];
      ctx.lineTo((point.x / 100) * canvas.width, (point.y / 100) * canvas.height);
    }

    ctx.stroke();

    // Draw key points
    ctx.shadowBlur = 0;
    ctx.fillStyle = ctx.strokeStyle;
    
    // Start point
    ctx.beginPath();
    ctx.arc((path[0].x / 100) * canvas.width, (path[0].y / 100) * canvas.height, 6, 0, 2 * Math.PI);
    ctx.fill();

    // End point
    ctx.beginPath();
    ctx.arc((path[path.length - 1].x / 100) * canvas.width, (path[path.length - 1].y / 100) * canvas.height, 6, 0, 2 * Math.PI);
    ctx.fill();

    // Add labels
    ctx.fillStyle = 'white';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Start', (path[0].x / 100) * canvas.width, (path[0].y / 100) * canvas.height - 10);
    ctx.fillText('Finish', (path[path.length - 1].x / 100) * canvas.width, (path[path.length - 1].y / 100) * canvas.height - 10);
  }, [analysis]);

  // Setup camera on mount
  useEffect(() => {
    if (activeTab === 'camera') {
      setupCamera();
    }
  }, [activeTab, setupCamera]);

  // Draw overlay when analysis is complete
  useEffect(() => {
    if (analysis && videoUrl) {
      // Wait a bit for video to load
      setTimeout(drawSwingPath, 500);
    }
  }, [analysis, videoUrl, drawSwingPath]);

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

  const reset = () => {
    setVideoUrl(null);
    setAnalysis(null);
    setError(null);
    setStatus('idle');
    setIsRecording(false);
    setRecordingTime(0);
    setCameraReady(false);
    setFacingMode('environment'); // Reset to back camera
    
    cleanupMediaStream();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#22c55e';
      default: return '#6b7280';
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f0fdf4', 
      padding: '16px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: 'bold', 
            color: '#166534', 
            marginBottom: '16px' 
          }}>
            🏌️ Golf Swing Analyzer
          </h1>
          <p style={{ fontSize: '1.125rem', color: '#6b7280' }}>
            Record or upload your golf swing to get detailed analysis
          </p>
        </div>

        {/* Status */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '8px 16px',
            borderRadius: '9999px',
            fontSize: '0.875rem',
            fontWeight: '500',
            backgroundColor: 
              status === 'complete' ? '#dcfce7' :
              status === 'processing' || status === 'recording' ? '#dbeafe' :
              '#f3f4f6',
            color:
              status === 'complete' ? '#166534' :
              status === 'processing' || status === 'recording' ? '#1e40af' :
              '#374151'
          }}>
            {status === 'recording' && '🔴 Recording...'}
            {status === 'processing' && '⚡ Analyzing swing...'}
            {status === 'complete' && '✅ Analysis complete!'}
            {status === 'idle' && '🏌️ Ready to analyze your swing'}
          </div>
        </div>

        {/* Mobile-first single column layout */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          alignItems: 'center'
        }}>
          {/* Input Section - Centered */}
          <div style={{ width: '100%', maxWidth: '400px' }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              padding: '24px'
            }}>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                <button
                  onClick={() => setActiveTab('camera')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: '500',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: activeTab === 'camera' ? '#22c55e' : '#e5e7eb',
                    color: activeTab === 'camera' ? 'white' : '#374151'
                  }}
                >
                  📹 Record
                </button>
                <button
                  onClick={() => setActiveTab('upload')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: '500',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: activeTab === 'upload' ? '#22c55e' : '#e5e7eb',
                    color: activeTab === 'upload' ? 'white' : '#374151'
                  }}
                >
                  📁 Upload
                </button>
              </div>

              {activeTab === 'camera' ? (
                <div>
                  <div style={{
                    position: 'relative',
                    backgroundColor: '#111827',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    marginBottom: '16px',
                    aspectRatio: orientation === 'portrait' ? '9/16' : '16/9',
                    maxHeight: orientation === 'portrait' ? '400px' : '300px',
                    width: '100%',
                    maxWidth: orientation === 'portrait' ? '280px' : '500px',
                    margin: '0 auto 16px auto' // Center the video container
                  }}>
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                        WebkitTransform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                        MozTransform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                        msTransform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
                      }}
                    />
                    {(!cameraReady || !streamRef.current) && (
                      <div style={{
                        position: 'absolute',
                        inset: '0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        color: 'white'
                      }}>
                        <div style={{ textAlign: 'center' }}>
                          <button
                            onClick={() => setupCamera()}
                            style={{
                              backgroundColor: '#22c55e',
                              color: 'white',
                              border: 'none',
                              borderRadius: '50%',
                              width: '80px',
                              height: '80px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              margin: '0 auto 16px',
                              fontSize: '24px',
                              boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
                              transition: 'all 0.2s ease-in-out'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'scale(1.1)';
                              e.currentTarget.style.backgroundColor = '#16a34a';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.backgroundColor = '#22c55e';
                            }}
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
                          <p style={{ margin: '0', fontSize: '16px', fontWeight: '500' }}>
                            Camera Inactive
                          </p>
                          <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: '0.8' }}>
                            Click to activate camera
                          </p>
                        </div>
                      </div>
                    )}
                    {/* Camera status indicator */}
                    <div style={{
                      position: 'absolute',
                      top: '16px',
                      left: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      zIndex: 1001
                    }}>
                      {isRecording && (
                        <>
                          <div style={{
                            width: '12px',
                            height: '12px',
                            backgroundColor: '#ef4444',
                            borderRadius: '50%',
                            animation: 'pulse 2s infinite'
                          }}></div>
                          <span style={{
                            color: 'white',
                            fontWeight: '600',
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid rgba(255, 255, 255, 0.2)'
                          }}>
                            REC {formatTime(recordingTime)}
                          </span>
                        </>
                      )}
                      {!isRecording && cameraReady && streamRef.current && (
                        <>
                          <button
                            onClick={toggleOrientation}
                            style={{
                              color: 'white',
                              fontSize: '1rem',
                              fontWeight: '600',
                              backgroundColor: 'rgba(0, 0, 0, 0.5)',
                              padding: '6px',
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '32px',
                              height: '32px',
                              marginRight: '8px'
                            }}
                            title={`Switch to ${orientation === 'portrait' ? 'landscape' : 'portrait'} orientation`}
                          >
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              {/* Phone in center */}
                              <rect x="8" y="6" width="8" height="12" rx="2"/>
                              <path d="M10 8h4"/>
                              <path d="M12 16v1"/>
                              
                              {/* Circular rotation arrows around phone */}
                              <path d="M4 12c0-4.4 3.6-8 8-8"/>
                              <path d="M20 12c0 4.4-3.6 8-8 8"/>
                              
                              {/* Arrow heads */}
                              <path d="M6 8l-2 2 2 2"/>
                              <path d="M18 16l2-2-2-2"/>
                            </svg>
                          </button>
                          <button
                            onClick={flipCamera}
                            style={{
                              color: 'white',
                              fontSize: '1rem',
                              fontWeight: '600',
                              backgroundColor: 'rgba(0, 0, 0, 0.5)',
                              padding: '6px',
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '32px',
                              height: '32px'
                            }}
                            title="Tap to flip camera"
                          >
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              stroke="none"
                            >
                              {/* Two circular refresh arrows with arrowheads */}
                              <path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6z"/>
                              <path d="M12 18v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26L17.3 9.2c.45.83.7 1.79.7 2.8 0 3.31-2.69 6-6 6z"/>
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                    
                    {/* Max duration indicator - only show when NOT recording and camera is active */}
                    {!isRecording && cameraReady && streamRef.current && (
                      <div style={{
                        position: 'absolute',
                        bottom: '16px',
                        right: '16px',
                        color: 'white',
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.875rem',
                        border: '1px solid rgba(255, 255, 255, 0.2)'
                      }}>
                        Max: 60s
                      </div>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                    {!isRecording ? (
                      <button
                        onClick={startRecording}
                        disabled={!cameraReady}
                        style={{
                          backgroundColor: cameraReady ? '#22c55e' : '#9ca3af',
                          color: 'white',
                          fontWeight: '600',
                          padding: '12px 24px',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: cameraReady ? 'pointer' : 'not-allowed',
                          opacity: cameraReady ? 1 : 0.6
                        }}
                      >
                        🎥 Start Recording
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        style={{
                          backgroundColor: '#ef4444',
                          color: 'white',
                          fontWeight: '600',
                          padding: '12px 24px',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        ⏹️ Stop Recording
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div
                    style={{
                      border: `2px dashed ${isDragActive ? '#16a34a' : '#22c55e'}`,
                      borderRadius: '8px',
                      padding: '32px',
                      textAlign: 'center',
                      backgroundColor: isDragActive ? '#f0fdf4' : 'transparent',
                      transition: 'all 0.2s ease-in-out',
                      transform: isDragActive ? 'scale(1.02)' : 'scale(1)',
                      boxShadow: isDragActive ? '0 8px 25px -8px rgba(34, 197, 94, 0.3)' : 'none'
                    }}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{
                        fontSize: '3rem',
                        marginBottom: '16px',
                        transform: isDragActive ? 'scale(1.1)' : 'scale(1)',
                        transition: 'transform 0.2s ease-in-out'
                      }}>
                        {isDragActive ? '🎯' : '📁'}
                      </div>
                      <p style={{
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        color: isDragActive ? '#16a34a' : '#374151',
                        marginBottom: '8px',
                        transition: 'color 0.2s ease-in-out'
                      }}>
                        {isDragActive ? 'Drop your golf swing video here!' : 'Upload your golf swing video'}
                      </p>
                      <p style={{
                        color: isDragActive ? '#16a34a' : '#6b7280',
                        marginBottom: '16px',
                        transition: 'color 0.2s ease-in-out'
                      }}>
                        {isDragActive ? 'Release to upload' : 'Drag & drop or click to browse'}
                      </p>
                      <p style={{
                        color: '#9ca3af',
                        fontSize: '0.875rem',
                        marginBottom: '16px'
                      }}>
                        Supported formats: MP4, WebM, MOV (max 100MB)
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                      id="video-upload"
                    />
                    <label
                      htmlFor="video-upload"
                      style={{
                        backgroundColor: isDragActive ? '#16a34a' : '#22c55e',
                        color: 'white',
                        fontWeight: '600',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'inline-block',
                        transition: 'background-color 0.2s ease-in-out',
                        transform: isDragActive ? 'scale(1.05)' : 'scale(1)'
                      }}
                    >
                      Choose Video File
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results Section - Centered */}
          <div style={{ width: '100%', maxWidth: '400px' }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              padding: '24px'
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
                📊 Results
              </h3>
              
              {analysis ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ 
                      fontSize: '2rem', 
                      fontWeight: 'bold',
                      color: analysis.smoothnessScore >= 85 ? '#16a34a' : 
                             analysis.smoothnessScore >= 70 ? '#ca8a04' : '#dc2626'
                    }}>
                      {analysis.smoothnessScore}%
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Smoothness Score</div>
                    {analysis.celebrationTriggered && (
                      <div style={{ color: '#16a34a', fontWeight: '600', marginTop: '8px' }}>
                        🎉 Excellent swing!
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#374151' }}>
                      {analysis.tempo.toFixed(1)}s
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Swing Tempo</div>
                  </div>
                </div>
              ) : status === 'processing' ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    border: '2px solid #e5e7eb',
                    borderTop: '2px solid #22c55e',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 16px'
                  }}></div>
                  <p style={{ color: '#6b7280' }}>Analyzing your swing...</p>
                  <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '8px' }}>
                    This may take a few moments
                  </p>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#6b7280' }}>
                  <p>Record or upload a video to see analysis results</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detailed AI Recommendations - Centered */}
        {analysis?.recommendations && (
          <div style={{ marginTop: '32px', width: '100%', maxWidth: '500px', margin: '32px auto 0' }}>
            <div style={{ 
              backgroundColor: 'white', 
              borderRadius: '12px', 
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              padding: '24px' 
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
                 Analysis & Recommendations
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {analysis.recommendations.map((rec, index) => (
                  <div key={index} style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '16px',
                    borderLeft: `4px solid ${getPriorityColor(rec.priority)}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                      <h4 style={{ 
                        fontWeight: '600', 
                        color: '#1f2937',
                        margin: '0',
                        marginRight: '8px'
                      }}>
                        {rec.category}
                      </h4>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        color: getPriorityColor(rec.priority),
                        backgroundColor: `${getPriorityColor(rec.priority)}20`,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        textTransform: 'uppercase'
                      }}>
                        {rec.priority}
                      </span>
                    </div>
                    
                    <p style={{ 
                      fontWeight: '500', 
                      color: '#374151', 
                      marginBottom: '8px',
                      fontSize: '0.9rem'
                    }}>
                      {rec.issue}
                    </p>
                    
                    <p style={{ 
                      color: '#6b7280', 
                      marginBottom: '12px',
                      fontSize: '0.875rem',
                      lineHeight: '1.5'
                    }}>
                      {rec.explanation}
                    </p>
                    
                    <div style={{
                      backgroundColor: '#f9fafb',
                      padding: '12px',
                      borderRadius: '6px',
                      borderLeft: '3px solid #22c55e'
                    }}>
                      <p style={{ 
                        color: '#374151', 
                        margin: '0',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                      }}>
                        💡 <strong>How to improve:</strong> {rec.improvement}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Video Player with Overlay - Centered */}
        {videoUrl && (
          <div style={{ marginTop: '32px', width: '100%', maxWidth: '500px', margin: '32px auto 0' }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              padding: '24px'
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '16px', textAlign: 'center' }}>
                🎬 Your Golf Swing {analysis && '- With Swing Path Analysis'}
              </h3>
              <div style={{
                position: 'relative',
                display: 'flex',
                justifyContent: 'center',
                width: '100%'
              }}>
                <video
                  src={videoUrl}
                  controls
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                    aspectRatio: orientation === 'portrait' ? '9/16' : '16/9',
                    maxWidth: orientation === 'portrait' ? '300px' : '500px',
                    objectFit: 'cover'
                  }}
                />
                {analysis && (
                  <canvas
                    ref={canvasRef}
                    style={{
                      position: 'absolute',
                      top: '0',
                      left: '0',
                      pointerEvents: 'none',
                      borderRadius: '8px'
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* New Analysis Button - After Your Gold Swing */}
        {analysis && videoUrl && (
          <div style={{ marginTop: '24px', width: '100%', maxWidth: '400px', margin: '24px auto 0' }}>
            <button
              onClick={reset}
              style={{
                width: '100%',
                backgroundColor: '#6b7280',
                color: 'white',
                fontWeight: '600',
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              🔄 New Analysis
            </button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div style={{
            marginTop: '24px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: '8px',
            padding: '16px',
            maxWidth: '512px',
            margin: '24px auto 0'
          }}>
            <p>{error}</p>
            <button
              onClick={() => setError(null)}
              style={{
                marginTop: '8px',
                backgroundColor: '#fee2e2',
                color: '#991b1b',
                padding: '4px 12px',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}