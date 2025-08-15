import { useState, useRef, useCallback, useEffect } from 'react';

export function FinalGolfApp() {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'complete'>('idle');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<{
    smoothnessScore: number;
    tempo: number;
    recommendations: string[];
    celebrationTriggered: boolean;
  } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Mock analysis function
  const analyzeSwing = useCallback(() => {
    setStatus('processing');
    
    setTimeout(() => {
      const score = Math.floor(Math.random() * 40) + 60; // 60-100
      const mockAnalysis = {
        smoothnessScore: score,
        tempo: 2.1 + Math.random() * 1.5,
        recommendations: [
          score < 70 ? 'Focus on maintaining a steady swing plane' : 'Great swing consistency!',
          score < 80 ? 'Work on your follow-through' : 'Excellent tempo control',
          'Keep practicing for continued improvement'
        ],
        celebrationTriggered: score >= 85
      };
      
      setAnalysis(mockAnalysis);
      setStatus('complete');
      
      if (score >= 85) {
        // Simple celebration
        console.log('🎉 Celebration! Great swing!');
      }
    }, 2000);
  }, []);

  const setupCamera = useCallback(async () => {
    try {
      setError(null);
      setCameraReady(false);
      
      // Stop existing stream if any
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
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
      setError('Camera access denied. Please allow camera permissions.');
      setCameraReady(false);
    }
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    try {
      chunksRef.current = [];
      const mediaRecorder = new MediaRecorder(streamRef.current);

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

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setStatus('recording');
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      setError('Failed to start recording');
    }
  }, [analyzeSwing]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
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

  const reset = () => {
    setVideoUrl(null);
    setAnalysis(null);
    setError(null);
    setStatus('idle');
    setIsRecording(false);
    setRecordingTime(0);
    
    cleanupMediaStream();
  };

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
    if (activeTab === 'camera') {
      setupCamera();
    }
  }, [activeTab, setupCamera]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
            Record or upload your golf swing to get AI-powered analysis
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

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '24px'
        }} className="lg:grid-cols-[2fr_1fr]">
          {/* Input Section */}
          <div>
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
                    marginBottom: '16px'
                  }}>
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      style={{ width: '100%', height: '256px', objectFit: 'cover' }}
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
                    {isRecording && (
                      <div style={{
                        position: 'absolute',
                        top: '16px',
                        left: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
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
                          backgroundColor: 'rgba(0, 0, 0, 0.5)',
                          padding: '4px 8px',
                          borderRadius: '4px'
                        }}>
                          REC {formatTime(recordingTime)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                    {!isRecording ? (
                      <button
                        onClick={startRecording}
                        style={{
                          backgroundColor: '#22c55e',
                          color: 'white',
                          fontWeight: '600',
                          padding: '12px 24px',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: 'pointer'
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
                  <div style={{
                    border: '2px dashed #22c55e',
                    borderRadius: '8px',
                    padding: '32px',
                    textAlign: 'center'
                  }}>
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📁</div>
                      <p style={{ fontSize: '1.125rem', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                        Upload your golf swing video
                      </p>
                      <p style={{ color: '#6b7280', marginBottom: '16px' }}>
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
                        backgroundColor: '#22c55e',
                        color: 'white',
                        fontWeight: '600',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'inline-block'
                      }}
                    >
                      Choose Video File
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results Section */}
          <div>
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

                  <div>
                    <h4 style={{ fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Recommendations:</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {analysis.recommendations.map((rec, index) => (
                        <div key={index} style={{
                          fontSize: '0.875rem',
                          padding: '8px',
                          backgroundColor: '#f0fdf4',
                          borderRadius: '4px',
                          borderLeft: '4px solid #22c55e'
                        }}>
                          💡 {rec}
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={reset}
                    style={{
                      width: '100%',
                      backgroundColor: '#6b7280',
                      color: 'white',
                      fontWeight: '600',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    🔄 New Analysis
                  </button>
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
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#6b7280' }}>
                  <p>Record or upload a video to see analysis results</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Video Player */}
        {videoUrl && (
          <div style={{ marginTop: '32px' }}>
            <div style={{ 
              backgroundColor: 'white', 
              borderRadius: '12px', 
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              padding: '24px' 
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
                🎬 Your Golf Swing
              </h3>
              <video
                src={videoUrl}
                controls
                style={{ 
                  width: '100%', 
                  maxWidth: '512px', 
                  margin: '0 auto', 
                  borderRadius: '8px',
                  maxHeight: '400px',
                  display: 'block'
                }}
              />
            </div>
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