import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';
import type { Point, SwingDetectionResult, AnalysisConfig } from '../types';

export class SwingDetector {
  private detector: poseDetection.PoseDetector | null = null;
  private isInitialized = false;
  private config: AnalysisConfig;

  constructor(config: Partial<AnalysisConfig> = {}) {
    this.config = {
      smoothnessThreshold: 85,
      minSwingDuration: 1,
      maxSwingDuration: 5,
      confidenceThreshold: 0.3,
      ...config
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize TensorFlow.js
      await tf.ready();
      
      // Load the pose detection model
      const model = poseDetection.SupportedModels.MoveNet;
      const detectorConfig = {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        enableSmoothing: true,
        minPoseScore: this.config.confidenceThreshold
      };

      this.detector = await poseDetection.createDetector(model, detectorConfig);
      this.isInitialized = true;
      console.log('Swing detector initialized successfully');
    } catch (error) {
      console.error('Failed to initialize swing detector:', error);
      throw new Error('Failed to initialize pose detection model');
    }
  }

  async detectSwing(
    videoElement: HTMLVideoElement,
    timestamp: number
  ): Promise<SwingDetectionResult | null> {
    if (!this.detector || !this.isInitialized) {
      throw new Error('Detector not initialized');
    }

    try {
      const poses = await this.detector.estimatePoses(videoElement);
      
      if (poses.length === 0) {
        return null;
      }

      const pose = poses[0];
      const keypoints = this.extractSwingKeypoints(pose.keypoints);
      const confidence = this.calculateAverageConfidence(pose.keypoints);

      if (confidence < this.config.confidenceThreshold) {
        return null;
      }

      return {
        keypoints,
        confidence,
        timestamp
      };
    } catch (error) {
      console.error('Error detecting swing:', error);
      return null;
    }
  }

  private extractSwingKeypoints(keypoints: poseDetection.Keypoint[]): Point[] {
    // Key body parts for golf swing analysis
    const swingKeypoints = [
      'left_shoulder',
      'right_shoulder',
      'left_elbow',
      'right_elbow',
      'left_wrist',
      'right_wrist',
      'left_hip',
      'right_hip',
      'left_knee',
      'right_knee'
    ];

    return keypoints
      .filter(kp => swingKeypoints.includes(kp.name || ''))
      .map(kp => ({
        x: kp.x,
        y: kp.y,
        timestamp: Date.now()
      }));
  }

  private calculateAverageConfidence(keypoints: poseDetection.Keypoint[]): number {
    const validKeypoints = keypoints.filter(kp => kp.score !== undefined);
    if (validKeypoints.length === 0) return 0;

    const totalScore = validKeypoints.reduce((sum, kp) => sum + (kp.score || 0), 0);
    return totalScore / validKeypoints.length;
  }

  // Calculate swing path from a series of detection results
  calculateSwingPath(detectionResults: SwingDetectionResult[]): Point[] {
    if (detectionResults.length === 0) return [];

    // Focus on wrist movement for swing path
    const swingPath: Point[] = [];

    detectionResults.forEach(result => {
      // Find right wrist (assuming right-handed golfer)
      const rightWrist = result.keypoints.find((_, index) => {
        // This is a simplified approach - in practice, you'd need to map keypoint indices
        return index === 4; // Approximate index for right wrist
      });

      if (rightWrist) {
        swingPath.push({
          x: rightWrist.x,
          y: rightWrist.y,
          timestamp: result.timestamp
        });
      }
    });

    return this.smoothPath(swingPath);
  }

  // Smooth the swing path to reduce noise
  private smoothPath(path: Point[]): Point[] {
    if (path.length < 3) return path;

    const smoothedPath: Point[] = [];
    const windowSize = 3;

    for (let i = 0; i < path.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(path.length, i + Math.ceil(windowSize / 2));
      
      let sumX = 0, sumY = 0, count = 0;
      
      for (let j = start; j < end; j++) {
        sumX += path[j].x;
        sumY += path[j].y;
        count++;
      }

      smoothedPath.push({
        x: sumX / count,
        y: sumY / count,
        timestamp: path[i].timestamp
      });
    }

    return smoothedPath;
  }

  // Calculate smoothness score (0-100)
  calculateSmoothness(path: Point[]): number {
    if (path.length < 3) return 0;

    let totalVariation = 0;
    let totalDistance = 0;

    for (let i = 1; i < path.length - 1; i++) {
      const prev = path[i - 1];
      const curr = path[i];
      const next = path[i + 1];

      // Calculate direction vectors
      const v1 = { x: curr.x - prev.x, y: curr.y - prev.y };
      const v2 = { x: next.x - curr.x, y: next.y - curr.y };

      // Calculate angle between vectors
      const dot = v1.x * v2.x + v1.y * v2.y;
      const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
      const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

      if (mag1 > 0 && mag2 > 0) {
        const cosAngle = dot / (mag1 * mag2);
        const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
        totalVariation += angle;
      }

      totalDistance += mag1;
    }

    if (totalDistance === 0) return 0;

    // Convert to smoothness score (lower variation = higher smoothness)
    const avgVariation = totalVariation / (path.length - 2);
    const smoothness = Math.max(0, 100 - (avgVariation * 180 / Math.PI) * 10);
    
    return Math.round(smoothness);
  }

  // Detect swing phases (backswing, downswing, follow-through)
  detectSwingPhases(path: Point[]): {
    backswing: Point[];
    downswing: Point[];
    followThrough: Point[];
  } {
    if (path.length < 6) {
      return { backswing: [], downswing: [], followThrough: [] };
    }

    // Find the highest point (top of backswing)
    let topIndex = 0;
    let minY = path[0].y;

    for (let i = 1; i < path.length; i++) {
      if (path[i].y < minY) {
        minY = path[i].y;
        topIndex = i;
      }
    }

    // Find impact point (lowest point after backswing)
    let impactIndex = topIndex;
    let maxY = path[topIndex].y;

    for (let i = topIndex + 1; i < path.length; i++) {
      if (path[i].y > maxY) {
        maxY = path[i].y;
        impactIndex = i;
        break;
      }
    }

    return {
      backswing: path.slice(0, topIndex + 1),
      downswing: path.slice(topIndex, impactIndex + 1),
      followThrough: path.slice(impactIndex)
    };
  }

  dispose(): void {
    if (this.detector) {
      this.detector.dispose();
      this.detector = null;
    }
    this.isInitialized = false;
  }
}

// Singleton instance for global use
export const swingDetector = new SwingDetector();