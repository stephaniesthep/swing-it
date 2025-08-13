import { useRef, useEffect, useState } from 'react';
import type { Point, SwingAnalysis } from '../../lib/types';

interface SwingPathOverlayProps {
  videoElement: HTMLVideoElement | null;
  swingPath: Point[];
  analysis?: SwingAnalysis;
  showPath?: boolean;
  showKeypoints?: boolean;
  className?: string;
}

export function SwingPathOverlay({
  videoElement,
  swingPath,
  analysis,
  showPath = true,
  showKeypoints = false,
  className = ''
}: SwingPathOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Update canvas dimensions when video dimensions change
  useEffect(() => {
    if (videoElement && canvasRef.current) {
      const updateDimensions = () => {
        const rect = videoElement.getBoundingClientRect();
        setDimensions({
          width: rect.width,
          height: rect.height
        });
        
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = rect.width;
          canvas.height = rect.height;
        }
      };

      updateDimensions();
      
      // Listen for video resize
      const resizeObserver = new ResizeObserver(updateDimensions);
      resizeObserver.observe(videoElement);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [videoElement]);

  // Draw swing path and analysis
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || swingPath.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Scale coordinates to canvas size
    const scaleX = canvas.width / (videoElement?.videoWidth || canvas.width);
    const scaleY = canvas.height / (videoElement?.videoHeight || canvas.height);

    if (showPath && swingPath.length > 1) {
      drawSwingPath(ctx, swingPath, scaleX, scaleY, analysis);
    }

    if (showKeypoints) {
      drawKeypoints(ctx, swingPath, scaleX, scaleY);
    }

    // Draw analysis indicators
    if (analysis) {
      drawAnalysisIndicators(ctx, analysis, canvas.width, canvas.height);
    }
  }, [swingPath, analysis, showPath, showKeypoints, dimensions, videoElement]);

  const drawSwingPath = (
    ctx: CanvasRenderingContext2D,
    path: Point[],
    scaleX: number,
    scaleY: number,
    analysis?: SwingAnalysis
  ) => {
    if (path.length < 2) return;

    // Determine path color based on smoothness score
    let pathColor = '#22c55e'; // Default green
    if (analysis) {
      if (analysis.smoothnessScore >= 85) {
        pathColor = '#10b981'; // Excellent - emerald
      } else if (analysis.smoothnessScore >= 70) {
        pathColor = '#f59e0b'; // Good - amber
      } else {
        pathColor = '#ef4444'; // Needs improvement - red
      }
    }

    // Draw main swing path
    ctx.beginPath();
    ctx.strokeStyle = pathColor;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Add glow effect
    ctx.shadowColor = pathColor;
    ctx.shadowBlur = 8;

    const firstPoint = path[0];
    ctx.moveTo(firstPoint.x * scaleX, firstPoint.y * scaleY);

    for (let i = 1; i < path.length; i++) {
      const point = path[i];
      ctx.lineTo(point.x * scaleX, point.y * scaleY);
    }

    ctx.stroke();

    // Reset shadow
    ctx.shadowBlur = 0;

    // Draw path direction arrows
    drawPathArrows(ctx, path, scaleX, scaleY, pathColor);

    // Draw swing phases if analysis is available
    if (analysis) {
      drawSwingPhases(ctx, path, scaleX, scaleY);
    }
  };

  const drawPathArrows = (
    ctx: CanvasRenderingContext2D,
    path: Point[],
    scaleX: number,
    scaleY: number,
    color: string
  ) => {
    const arrowSpacing = Math.max(5, Math.floor(path.length / 8));
    
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    for (let i = arrowSpacing; i < path.length - arrowSpacing; i += arrowSpacing) {
      const current = path[i];
      const next = path[i + 1];
      
      if (!next) continue;

      const x = current.x * scaleX;
      const y = current.y * scaleY;
      const dx = (next.x - current.x) * scaleX;
      const dy = (next.y - current.y) * scaleY;
      
      const angle = Math.atan2(dy, dx);
      const arrowLength = 8;
      const arrowAngle = Math.PI / 6;

      // Draw arrow
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(
        x - arrowLength * Math.cos(angle - arrowAngle),
        y - arrowLength * Math.sin(angle - arrowAngle)
      );
      ctx.moveTo(x, y);
      ctx.lineTo(
        x - arrowLength * Math.cos(angle + arrowAngle),
        y - arrowLength * Math.sin(angle + arrowAngle)
      );
      ctx.stroke();
    }
  };

  const drawSwingPhases = (
    ctx: CanvasRenderingContext2D,
    path: Point[],
    scaleX: number,
    scaleY: number
  ) => {
    if (path.length < 6) return;

    // Find key swing positions
    let topIndex = 0;
    let minY = path[0].y;

    for (let i = 1; i < path.length; i++) {
      if (path[i].y < minY) {
        minY = path[i].y;
        topIndex = i;
      }
    }

    // Draw phase markers
    const phases = [
      { index: 0, label: 'Start', color: '#3b82f6' },
      { index: topIndex, label: 'Top', color: '#8b5cf6' },
      { index: path.length - 1, label: 'Finish', color: '#10b981' }
    ];

    phases.forEach(phase => {
      const point = path[phase.index];
      const x = point.x * scaleX;
      const y = point.y * scaleY;

      // Draw marker circle
      ctx.beginPath();
      ctx.fillStyle = phase.color;
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fill();

      // Draw label
      ctx.fillStyle = 'white';
      ctx.font = 'bold 12px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(phase.label, x, y - 12);
    });
  };

  const drawKeypoints = (
    ctx: CanvasRenderingContext2D,
    path: Point[],
    scaleX: number,
    scaleY: number
  ) => {
    ctx.fillStyle = '#f59e0b';
    
    path.forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x * scaleX, point.y * scaleY, 3, 0, 2 * Math.PI);
      ctx.fill();
    });
  };

  const drawAnalysisIndicators = (
    ctx: CanvasRenderingContext2D,
    analysis: SwingAnalysis,
    width: number,
    height: number
  ) => {
    // Draw smoothness score
    const scoreText = `Smoothness: ${analysis.smoothnessScore}%`;
    const scoreColor = analysis.smoothnessScore >= 85 ? '#10b981' : 
                      analysis.smoothnessScore >= 70 ? '#f59e0b' : '#ef4444';

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 180, 40);

    ctx.fillStyle = scoreColor;
    ctx.font = 'bold 16px Inter';
    ctx.textAlign = 'left';
    ctx.fillText(scoreText, 20, 35);

    // Draw celebration indicator if triggered
    if (analysis.celebrationTriggered) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
      ctx.fillRect(width - 120, 10, 110, 40);
      
      ctx.fillStyle = 'white';
      ctx.font = 'bold 14px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('🎉 Great Swing!', width - 65, 35);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{
        width: dimensions.width,
        height: dimensions.height
      }}
    />
  );
}