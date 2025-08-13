export interface Point {
  x: number;
  y: number;
  timestamp: number;
}

export interface SwingAnalysis {
  smoothnessScore: number;
  swingPath: Point[];
  tempo: number;
  recommendations: string[];
  celebrationTriggered: boolean;
  analysisComplete: boolean;
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  format: string;
}

export interface SwingDetectionResult {
  keypoints: Point[];
  confidence: number;
  timestamp: number;
}

export interface AnalysisConfig {
  smoothnessThreshold: number;
  minSwingDuration: number;
  maxSwingDuration: number;
  confidenceThreshold: number;
}

export interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export interface SwingRecommendation {
  category: 'posture' | 'tempo' | 'path' | 'follow-through';
  severity: 'low' | 'medium' | 'high';
  message: string;
  improvement: string;
}

export type VideoSource = 'camera' | 'upload';
export type AnalysisStatus = 'idle' | 'recording' | 'processing' | 'complete' | 'error';