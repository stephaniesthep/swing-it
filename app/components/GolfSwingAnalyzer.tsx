import { useState, useRef, useCallback, useEffect } from 'react';
import { Button, Card, CardHeader, CardTitle, CardContent } from './ui';
import { VideoRecorder } from './video/VideoRecorder';
import { VideoUpload } from './video/VideoUpload';
import { SwingPathOverlay } from './video/SwingPathOverlay';
import { ConfettiCelebration, useGolfConfetti } from './animations/ConfettiCelebration';
import { swingDetector } from '../lib/video-processing/swingDetection';
import { openRouterClient } from '../lib/ai/openRouterClient';
import type { 
  AnalysisStatus, 
  SwingAnalysis, 
  SwingDetectionResult, 
  Point, 
  VideoSource,
  SwingRecommendation 
} from '../lib/types';
import { Camera, Upload, Play, Download, RotateCcw, TrendingUp } from 'lucide-react';

export function GolfSwingAnalyzer() {
  const [activeTab, setActiveTab] = useState<VideoSource>('camera');
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<SwingAnalysis | null>(null);
  const [recommendations, setRecommendations] = useState<SwingRecommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const detectionResults = useRef<SwingDetectionResult[]>([]);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { triggerCelebration } = useGolfConfetti();

  // Initialize swing detector
  useEffect(() => {
    const initDetector = async () => {
      try {
        await swingDetector.initialize();
        console.log('Swing detector ready');
      } catch (err) {
        console.error('Failed to initialize swing detector:', err);
        setError('Failed to initialize swing analysis. Please refresh the page.');
      }
    };

    initDetector();

    return () => {
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
      }
    };
  }, []);

  // Handle video ready from recorder or upload
  const handleVideoReady = useCallback(async (blob: Blob, url: string) => {
    setVideoBlob(blob);
    setVideoUrl(url);
    setError(null);
    setAnalysis(null);
    setRecommendations([]);
    detectionResults.current = [];

    // Wait for video to load
    if (videoRef.current) {
      videoRef.current.src = url;
      videoRef.current.onloadeddata = () => {
        startVideoAnalysis();
      };
    }
  }, []);

  // Start analyzing the video
  const startVideoAnalysis = useCallback(async () => {
    if (!videoRef.current || !swingDetector) return;

    setIsProcessing(true);
    setStatus('processing');
    detectionResults.current = [];

    try {
      const video = videoRef.current;
      const duration = video.duration;
      const fps = 30; // Assume 30 FPS for analysis
      const frameInterval = 1000 / fps;

      let currentTime = 0;
      const detectionPromises: Promise<void>[] = [];

      // Analyze video frame by frame
      while (currentTime < duration) {
        const promise = new Promise<void>((resolve) => {
          video.currentTime = currentTime;
          video.onseeked = async () => {
            try {
              const result = await swingDetector.detectSwing(video, currentTime * 1000);
              if (result) {
                detectionResults.current.push(result);
              }
            } catch (err) {
              console.error('Detection error at time', currentTime, err);
            }
            resolve();
          };
        });

        detectionPromises.push(promise);
        currentTime += frameInterval / 1000; // Convert to seconds
      }

      // Wait for all detections to complete
      await Promise.all(detectionPromises);

      // Process results
      await processAnalysisResults();

    } catch (err) {
      console.error('Analysis error:', err);
      setError('Failed to analyze swing. Please try again.');
      setStatus('error');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Process the detection results into analysis
  const processAnalysisResults = useCallback(async () => {
    if (detectionResults.current.length === 0) {
      setError('No swing detected in the video. Please ensure you are visible and performing a golf swing.');
      setStatus('error');
      return;
    }

    try {
      // Calculate swing path
      const swingPath = swingDetector.calculateSwingPath(detectionResults.current);
      
      if (swingPath.length < 3) {
        setError('Insufficient swing data detected. Please try recording a clearer swing.');
        setStatus('error');
        return;
      }

      // Calculate smoothness score
      const smoothnessScore = swingDetector.calculateSmoothness(swingPath);
      
      // Calculate tempo (swing duration)
      const firstTimestamp = detectionResults.current[0]?.timestamp || 0;
      const lastTimestamp = detectionResults.current[detectionResults.current.length - 1]?.timestamp || 0;
      const tempo = (lastTimestamp - firstTimestamp) / 1000; // Convert to seconds

      // Check if celebration should be triggered
      const celebrationTriggered = smoothnessScore >= 85;

      // Create analysis object
      const swingAnalysis: SwingAnalysis = {
        smoothnessScore,
        swingPath,
        tempo,
        recommendations: [],
        celebrationTriggered,
        analysisComplete: false
      };

      setAnalysis(swingAnalysis);

      // Trigger celebration if score is high enough
      if (celebrationTriggered) {
        setShowCelebration(true);
        triggerCelebration(smoothnessScore);
      }

      // Get AI recommendations
      try {
        const aiRecommendations = await openRouterClient.analyzeSwing(
          swingPath,
          smoothnessScore,
          tempo,
          videoRef.current ? {
            duration: videoRef.current.duration,
            width: videoRef.current.videoWidth,
            height: videoRef.current.videoHeight
          } : undefined
        );

        setRecommendations(aiRecommendations);
        
        // Update analysis with recommendations
        const finalAnalysis: SwingAnalysis = {
          ...swingAnalysis,
          recommendations: aiRecommendations.map(r => r.message),
          analysisComplete: true
        };
        
        setAnalysis(finalAnalysis);
        setStatus('complete');

      } catch (aiError) {
        console.error('AI analysis error:', aiError);
        // Continue without AI recommendations
        setAnalysis({ ...swingAnalysis, analysisComplete: true });
        setStatus('complete');
      }

    } catch (err) {
      console.error('Processing error:', err);
      setError('Failed to process swing analysis.');
      setStatus('error');
    }
  }, [triggerCelebration]);

  // Reset everything
  const handleReset = useCallback(() => {
    setVideoBlob(null);
    setVideoUrl(null);
    setAnalysis(null);
    setRecommendations([]);
    setError(null);
    setStatus('idle');
    setIsProcessing(false);
    setShowCelebration(false);
    detectionResults.current = [];
    
    if (videoRef.current) {
      videoRef.current.src = '';
    }
  }, []);

  // Download processed video (placeholder for now)
  const handleDownload = useCallback(() => {
    if (!videoBlob) return;
    
    const url = URL.createObjectURL(videoBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `golf-swing-analysis-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [videoBlob]);

  const getStatusMessage = () => {
    switch (status) {
      case 'recording': return 'Recording swing...';
      case 'processing': return 'Analyzing swing...';
      case 'complete': return 'Analysis complete!';
      case 'error': return 'Analysis failed';
      default: return 'Ready to analyze your golf swing';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="golf-container py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-golf-dark mb-4">
          🏌️ Golf Swing Analyzer
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Record or upload your golf swing to get AI-powered analysis and personalized recommendations
        </p>
      </div>

      {/* Status indicator */}
      <div className="text-center mb-6">
        <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
          status === 'complete' ? 'bg-green-100 text-green-800' :
          status === 'error' ? 'bg-red-100 text-red-800' :
          status === 'processing' || status === 'recording' ? 'bg-blue-100 text-blue-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {isProcessing && <div className="golf-spinner w-4 h-4 mr-2" />}
          {getStatusMessage()}
        </div>
      </div>

      <div className="golf-grid max-w-6xl mx-auto">
        {/* Video Input Section */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Record or Upload Swing</CardTitle>
              <div className="flex space-x-2">
                <Button
                  variant={activeTab === 'camera' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('camera')}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Record
                </Button>
                <Button
                  variant={activeTab === 'upload' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('upload')}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {activeTab === 'camera' ? (
                <VideoRecorder
                  onVideoReady={handleVideoReady}
                  onStatusChange={setStatus}
                  maxDuration={30}
                />
              ) : (
                <VideoUpload
                  onVideoReady={handleVideoReady}
                  onStatusChange={setStatus}
                  maxSizeMB={100}
                  maxDurationSeconds={60}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Analysis Results */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Analysis Results
              </CardTitle>
            </CardHeader>
            <CardContent>
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

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-semibold">Tempo</div>
                      <div>{analysis.tempo.toFixed(1)}s</div>
                    </div>
                    <div>
                      <div className="font-semibold">Path Points</div>
                      <div>{analysis.swingPath.length}</div>
                    </div>
                  </div>

                  {videoBlob && (
                    <div className="flex space-x-2">
                      <Button onClick={handleDownload} size="sm" variant="secondary">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                      <Button onClick={handleReset} size="sm" variant="outline">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        New Analysis
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  {status === 'processing' ? (
                    <div>
                      <div className="golf-spinner w-8 h-8 mx-auto mb-4" />
                      <p>Analyzing your swing...</p>
                    </div>
                  ) : (
                    <p>Record or upload a video to see analysis results</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>AI Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recommendations.map((rec, index) => (
                    <div key={index} className={`p-3 rounded-lg border-l-4 ${
                      rec.severity === 'high' ? 'border-red-500 bg-red-50' :
                      rec.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                      'border-green-500 bg-green-50'
                    }`}>
                      <div className="font-semibold text-sm capitalize">
                        {rec.category.replace('-', ' ')}
                      </div>
                      <div className="text-sm text-gray-700 mt-1">
                        {rec.message}
                      </div>
                      <div className="text-xs text-gray-600 mt-2">
                        💡 {rec.improvement}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Video Player with Overlay */}
      {videoUrl && (
        <div className="mt-8 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Swing Analysis Video</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="golf-video-container">
                <video
                  ref={videoRef}
                  controls
                  className="w-full h-auto"
                  style={{ maxHeight: '500px' }}
                >
                  <source src={videoUrl} type="video/webm" />
                  Your browser does not support the video tag.
                </video>
                
                {analysis && (
                  <SwingPathOverlay
                    videoElement={videoRef.current}
                    swingPath={analysis.swingPath}
                    analysis={analysis}
                    showPath={true}
                    className="golf-video-overlay"
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="golf-error max-w-2xl mx-auto mt-6">
          <p>{error}</p>
          <Button onClick={handleReset} variant="outline" size="sm" className="mt-2">
            Try Again
          </Button>
        </div>
      )}

      {/* Confetti Celebration */}
      <ConfettiCelebration
        trigger={showCelebration}
        onComplete={() => setShowCelebration(false)}
        intensity="high"
        duration={3000}
      />
    </div>
  );
}