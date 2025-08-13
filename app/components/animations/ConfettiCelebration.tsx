import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

interface ConfettiCelebrationProps {
  trigger: boolean;
  onComplete?: () => void;
  intensity?: 'low' | 'medium' | 'high';
  duration?: number;
}

export function ConfettiCelebration({
  trigger,
  onComplete,
  intensity = 'medium',
  duration = 3000
}: ConfettiCelebrationProps) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!trigger) return;

    // Clear any existing animations
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    // Golf-themed confetti colors
    const golfColors = [
      '#22c55e', // Golf green
      '#16a34a', // Darker green
      '#fbbf24', // Golf ball yellow
      '#ffffff', // White
      '#86efac', // Light green
      '#dcfce7'  // Very light green
    ];

    const intensitySettings = {
      low: {
        particleCount: 50,
        spread: 45,
        startVelocity: 25,
        scalar: 0.8
      },
      medium: {
        particleCount: 100,
        spread: 60,
        startVelocity: 30,
        scalar: 1.0
      },
      high: {
        particleCount: 150,
        spread: 80,
        startVelocity: 40,
        scalar: 1.2
      }
    };

    const settings = intensitySettings[intensity];

    // Golf swing celebration sequence
    const celebrateGolfSwing = () => {
      const end = Date.now() + duration;

      const frame = () => {
        // Left side burst (backswing)
        confetti({
          particleCount: Math.floor(settings.particleCount * 0.3),
          angle: 60,
          spread: settings.spread,
          origin: { x: 0.1, y: 0.6 },
          colors: golfColors,
          startVelocity: settings.startVelocity,
          scalar: settings.scalar,
          shapes: ['circle', 'square'],
          gravity: 0.8
        });

        // Center burst (impact)
        confetti({
          particleCount: Math.floor(settings.particleCount * 0.4),
          angle: 90,
          spread: settings.spread + 20,
          origin: { x: 0.5, y: 0.7 },
          colors: golfColors,
          startVelocity: settings.startVelocity + 10,
          scalar: settings.scalar,
          shapes: ['circle'],
          gravity: 0.6
        });

        // Right side burst (follow-through)
        confetti({
          particleCount: Math.floor(settings.particleCount * 0.3),
          angle: 120,
          spread: settings.spread,
          origin: { x: 0.9, y: 0.6 },
          colors: golfColors,
          startVelocity: settings.startVelocity,
          scalar: settings.scalar,
          shapes: ['circle', 'square'],
          gravity: 0.8
        });

        if (Date.now() < end) {
          animationRef.current = requestAnimationFrame(frame);
        } else {
          onComplete?.();
        }
      };

      frame();
    };

    // Start celebration with a slight delay for dramatic effect
    timeoutRef.current = setTimeout(() => {
      celebrateGolfSwing();
    }, 200);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [trigger, intensity, duration, onComplete]);

  // This component doesn't render anything visible
  return null;
}

// Golf-specific celebration patterns
export const golfCelebrationPatterns = {
  perfectSwing: (canvas?: HTMLCanvasElement) => {
    const myConfetti = canvas ? confetti.create(canvas, { resize: true }) : confetti;
    
    // Burst from multiple points to simulate a perfect swing arc
    const colors = ['#22c55e', '#16a34a', '#fbbf24', '#ffffff'];
    
    // Backswing celebration
    myConfetti({
      particleCount: 30,
      angle: 45,
      spread: 45,
      origin: { x: 0.2, y: 0.8 },
      colors,
      startVelocity: 25,
      gravity: 0.8
    });

    // Impact celebration
    setTimeout(() => {
      myConfetti({
        particleCount: 60,
        angle: 90,
        spread: 70,
        origin: { x: 0.5, y: 0.9 },
        colors,
        startVelocity: 35,
        gravity: 0.6
      });
    }, 300);

    // Follow-through celebration
    setTimeout(() => {
      myConfetti({
        particleCount: 40,
        angle: 135,
        spread: 50,
        origin: { x: 0.8, y: 0.7 },
        colors,
        startVelocity: 30,
        gravity: 0.8
      });
    }, 600);
  },

  holeInOne: (canvas?: HTMLCanvasElement) => {
    const myConfetti = canvas ? confetti.create(canvas, { resize: true }) : confetti;
    
    // Massive celebration for hole-in-one level smoothness
    const colors = ['#22c55e', '#16a34a', '#fbbf24', '#ffffff', '#86efac'];
    
    // Multiple bursts
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        myConfetti({
          particleCount: 100,
          angle: 60 + (i * 15),
          spread: 80,
          origin: { x: 0.1 + (i * 0.2), y: 0.6 },
          colors,
          startVelocity: 40,
          gravity: 0.5,
          scalar: 1.2
        });
      }, i * 200);
    }
  },

  goodSwing: (canvas?: HTMLCanvasElement) => {
    const myConfetti = canvas ? confetti.create(canvas, { resize: true }) : confetti;
    
    // Moderate celebration for good swings
    const colors = ['#22c55e', '#fbbf24', '#ffffff'];
    
    myConfetti({
      particleCount: 50,
      angle: 90,
      spread: 60,
      origin: { x: 0.5, y: 0.8 },
      colors,
      startVelocity: 25,
      gravity: 0.7
    });
  }
};

// Hook for easy confetti triggering
export function useGolfConfetti() {
  const triggerCelebration = (smoothnessScore: number, canvas?: HTMLCanvasElement) => {
    if (smoothnessScore >= 95) {
      golfCelebrationPatterns.holeInOne(canvas);
    } else if (smoothnessScore >= 85) {
      golfCelebrationPatterns.perfectSwing(canvas);
    } else if (smoothnessScore >= 75) {
      golfCelebrationPatterns.goodSwing(canvas);
    }
  };

  return { triggerCelebration };
}