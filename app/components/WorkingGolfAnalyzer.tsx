import { useState, useRef, useCallback, useEffect } from 'react';

interface SwingAnalysis {
  smoothnessScore: number;
  tempo: number;
  recommendations: string[];
  celebrationTriggered: boolean;
}

export function WorkingGolfAnalyzer() {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'complete' | 'error'>('idle');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<SwingAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Mock analysis function
  const analyzeSwing = useCallback(() => {
    setStatus('processing');
    
    // Simulate analysis delay
    setTimeout(() => {
      const mockScore = Math.floor(Math.random() * 40) + 60; // 60-100
      const mockAnalysis: SwingAnalysis = {
        smoothnessScore: mockScore,
        tempo: 2.1 + Math.random() * 1.5,
        recommendations: [
          mockScore < 70 ? 'Focus on maintaining a steady swing plane' : 'Great swing consistency!',
          mockScore < 80 ? 'Work on your follow-through' : 'Excellent tempo control',
          'Keep practicing for continued improvement'
        ],
        celebrationTriggered: mockScore >= 85
      };
      
      setAnalysis(mockAnalysis);
      setStatus('complete');
      
      // Trigger celebration if score is high
      if (mockScore >= 85) {
        triggerCelebration();
      }
    }, 2000);
  }, []);

  const triggerCelebration = () => {
    // Simple celebration effect
    const colors = ['#22c55e', '#16a34a', '#fbbf24', '#ffffff'];
    console.log('🎉 Celebration triggered! Great swing!');
  };

  const setupCamera = useCallback(async () => {
    try {
      setError(null);
      setCameraReady(false);
      
      // Stop existing stream if any
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
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
      console.error('Camera error:', err);
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

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      setError('Failed to start recording');
      console.error('Recording error:', err);
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

    // Validate file
    if (!file.type.startsWith('video/')) {
      setError('Please select a video file');
      return;
    }

    if (file.size > 100 * 1024 * 1024) { // 100MB
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

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-green-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-green-800 mb-4">
            🏌️ Golf Swing Analyzer
          </h1>
          <p className="text-lg text-gray-600">
            Record or upload your golf swing to get AI-powered analysis
          </p>
        </div>

        {/* Status */}
        <div className="text-center mb-6">
          <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
            status === 'complete' ? 'bg-green-100 text-green-800' :
            status === 'error' ? 'bg-red-100 text-red-800' :
            status === 'processing' || status === 'recording' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {status === 'recording' && '🔴 Recording...'}
            {status === 'processing' && '⚡ Analyzing swing...'}
            {status === 'complete' && '✅ Analysis complete!'}
            {status === 'error' && '❌ Error occurred'}
            {status === 'idle' && '🏌️ Ready to analyze your swing'}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex space-x-4 mb-6">
                <button
                  onClick={() => setActiveTab('camera')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'camera'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  📹 Record
                </button>
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'upload'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  📁 Upload
                </button>
              </div>

              {activeTab === 'camera' ? (
                <div>
                  <div className="relative bg-gray-900 rounded-lg overflow-hidden mb-4">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-64 object-cover"
                    />
                    {(!cameraReady || !streamRef.current) && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 text-white">
                        <div className="text-center">
                          <button
                            onClick={() => setupCamera()}
                            className="w-20 h-20 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center mb-4 mx-auto transition-all duration-200 hover:scale-110 shadow-lg text-2xl"
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
                          <p className="font-medium mb-2">Camera Inactive</p>
                          <p className="text-white text-opacity-80 text-sm">Click to activate camera</p>
                        </div>
                      </div>
                    )}
                    {isRecording && (
                      <div className="absolute top-4 left-4 flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-white font-semibold bg-black bg-opacity-50 px-2 py-1 rounded">
                          REC {formatTime(recordingTime)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-center space-x-4">
                    {!isRecording ? (
                      <button
                        onClick={startRecording}
                        className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                      >
                        🎥 Start Recording
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        className="bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                      >
                        ⏹️ Stop Recording
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="border-2 border-dashed border-green-300 rounded-lg p-8 text-center">
                    <div className="mb-4">
                      <svg className="w-12 h-12 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-lg font-semibold text-gray-700 mb-2">
                        Upload your golf swing video
                      </p>
                      <p className="text-gray-500 mb-4">
                        Supported formats: MP4, WebM, MOV (max 100MB)
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="video-upload"
                    />
                    <label
                      htmlFor="video-upload"
                      className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg cursor-pointer transition-colors inline-block"
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
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                📊 Results
              </h3>
              
              {analysis ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${getScoreColor(analysis.smoothnessScore)}`}>
                      {analysis.smoothnessScore}%
                    </div>
                    <div className="text-sm text-gray-600">Smoothness Score</div>
                    {analysis.celebrationTriggered && (
                      <div className="text-green-600 font-semibold mt-2">
                        🎉 Excellent swing!
                      </div>
                    )}
                  </div>

                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-700">
                      {analysis.tempo.toFixed(1)}s
                    </div>
                    <div className="text-sm text-gray-600">Swing Tempo</div>
                  </div>

                  {/* Video Player - Swing Path Analysis */}
                  {videoUrl && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-gray-700 mb-3">🎬 Your Golf Swing - With Swing Path Analysis</h4>
                      <video
                        src={videoUrl}
                        controls
                        className="w-full rounded-lg"
                        style={{ maxHeight: '200px' }}
                      />
                    </div>
                  )}

                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Recommendations:</h4>
                    <div className="space-y-2">
                      {analysis.recommendations.map((rec, index) => (
                        <div key={index} className="text-sm p-2 bg-green-50 rounded border-l-4 border-green-500">
                          💡 {rec}
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={reset}
                    className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    🔄 New Analysis
                  </button>
                </div>
              ) : status === 'processing' ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">Analyzing your swing...</p>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Record or upload a video to see analysis results</p>
                </div>
              )}
            </div>
          </div>
        </div>


        {/* Error Display */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 max-w-2xl mx-auto">
            <p>{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
}