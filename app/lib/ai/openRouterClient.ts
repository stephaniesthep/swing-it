import type { SwingAnalysis, SwingRecommendation, Point } from '../types';

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenRouterClient {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
  private model = 'meta-llama/llama-3.1-8b-instruct:free'; // Free model

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyzeSwing(
    swingPath: Point[],
    smoothnessScore: number,
    tempo: number,
    videoMetadata?: { duration: number; width: number; height: number }
  ): Promise<SwingRecommendation[]> {
    try {
      const swingData = this.prepareSwingData(swingPath, smoothnessScore, tempo, videoMetadata);
      const analysis = await this.callOpenRouter(swingData);
      return this.parseRecommendations(analysis);
    } catch (error) {
      console.error('Error analyzing swing:', error);
      return this.getFallbackRecommendations(smoothnessScore);
    }
  }

  private prepareSwingData(
    swingPath: Point[],
    smoothnessScore: number,
    tempo: number,
    videoMetadata?: { duration: number; width: number; height: number }
  ): string {
    // Calculate swing metrics
    const swingMetrics = this.calculateSwingMetrics(swingPath, tempo);
    
    return `
Golf Swing Analysis Data:
- Smoothness Score: ${smoothnessScore}%
- Tempo: ${tempo} (swing duration in seconds)
- Path Points: ${swingPath.length}
- Swing Arc Height: ${swingMetrics.arcHeight}px
- Swing Width: ${swingMetrics.swingWidth}px
- Path Consistency: ${swingMetrics.consistency}%
- Acceleration Pattern: ${swingMetrics.accelerationPattern}
${videoMetadata ? `- Video Duration: ${videoMetadata.duration}s` : ''}
${videoMetadata ? `- Video Resolution: ${videoMetadata.width}x${videoMetadata.height}` : ''}

Swing Path Coordinates (first 10 points):
${swingPath.slice(0, 10).map((p, i) => `${i + 1}. (${Math.round(p.x)}, ${Math.round(p.y)})`).join('\n')}
`;
  }

  private calculateSwingMetrics(swingPath: Point[], tempo: number) {
    if (swingPath.length < 3) {
      return {
        arcHeight: 0,
        swingWidth: 0,
        consistency: 0,
        accelerationPattern: 'insufficient_data'
      };
    }

    // Calculate swing arc dimensions
    const xCoords = swingPath.map(p => p.x);
    const yCoords = swingPath.map(p => p.y);
    
    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minY = Math.min(...yCoords);
    const maxY = Math.max(...yCoords);

    const swingWidth = maxX - minX;
    const arcHeight = maxY - minY;

    // Calculate path consistency (how smooth the path is)
    let totalDeviation = 0;
    for (let i = 1; i < swingPath.length - 1; i++) {
      const prev = swingPath[i - 1];
      const curr = swingPath[i];
      const next = swingPath[i + 1];

      // Calculate expected position based on linear interpolation
      const expectedX = (prev.x + next.x) / 2;
      const expectedY = (prev.y + next.y) / 2;

      // Calculate deviation from expected position
      const deviation = Math.sqrt(
        Math.pow(curr.x - expectedX, 2) + Math.pow(curr.y - expectedY, 2)
      );
      totalDeviation += deviation;
    }

    const avgDeviation = totalDeviation / (swingPath.length - 2);
    const consistency = Math.max(0, 100 - (avgDeviation / 10)); // Normalize to 0-100

    // Analyze acceleration pattern
    let accelerationPattern = 'unknown';
    if (tempo < 1.5) {
      accelerationPattern = 'too_fast';
    } else if (tempo > 3.5) {
      accelerationPattern = 'too_slow';
    } else {
      accelerationPattern = 'good_tempo';
    }

    return {
      arcHeight: Math.round(arcHeight),
      swingWidth: Math.round(swingWidth),
      consistency: Math.round(consistency),
      accelerationPattern
    };
  }

  private async callOpenRouter(swingData: string): Promise<string> {
    const messages: OpenRouterMessage[] = [
      {
        role: 'system',
        content: `You are a professional golf instructor analyzing swing data. Provide specific, actionable recommendations based on the swing metrics. Focus on:
1. Swing path and plane
2. Tempo and rhythm
3. Consistency and smoothness
4. Body mechanics (inferred from path data)

Format your response as a JSON array of recommendations, each with:
- category: "posture" | "tempo" | "path" | "follow-through"
- severity: "low" | "medium" | "high"
- message: brief description of the issue
- improvement: specific actionable advice

Keep recommendations concise and practical for amateur golfers.`
      },
      {
        role: 'user',
        content: `Please analyze this golf swing data and provide recommendations:\n\n${swingData}`
      }
    ];

    const request: OpenRouterRequest = {
      model: this.model,
      messages,
      temperature: 0.7,
      max_tokens: 500
    };

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Golf Swing Analyzer'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    const data: OpenRouterResponse = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from OpenRouter API');
    }

    return data.choices[0].message.content;
  }

  private parseRecommendations(analysis: string): SwingRecommendation[] {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(analysis);
      if (Array.isArray(parsed)) {
        return parsed.map(rec => ({
          category: rec.category || 'path',
          severity: rec.severity || 'medium',
          message: rec.message || 'General swing improvement needed',
          improvement: rec.improvement || 'Practice with a golf instructor'
        }));
      }
    } catch (error) {
      // If JSON parsing fails, extract recommendations from text
      console.log('Parsing text-based recommendations');
    }

    // Fallback: parse text-based recommendations
    return this.parseTextRecommendations(analysis);
  }

  private parseTextRecommendations(text: string): SwingRecommendation[] {
    const recommendations: SwingRecommendation[] = [];
    const lines = text.split('\n').filter(line => line.trim());

    // Look for common golf instruction patterns
    const patterns = [
      { regex: /tempo|rhythm|speed/i, category: 'tempo' as const },
      { regex: /posture|stance|setup/i, category: 'posture' as const },
      { regex: /path|plane|swing/i, category: 'path' as const },
      { regex: /follow.*through|finish/i, category: 'follow-through' as const }
    ];

    lines.forEach(line => {
      if (line.length < 10) return; // Skip short lines

      let category: SwingRecommendation['category'] = 'path';
      for (const pattern of patterns) {
        if (pattern.regex.test(line)) {
          category = pattern.category;
          break;
        }
      }

      // Determine severity based on keywords
      let severity: SwingRecommendation['severity'] = 'medium';
      if (/critical|major|serious|significant/i.test(line)) {
        severity = 'high';
      } else if (/minor|slight|small/i.test(line)) {
        severity = 'low';
      }

      recommendations.push({
        category,
        severity,
        message: line.trim(),
        improvement: 'Practice this aspect with focused drills'
      });
    });

    return recommendations.slice(0, 4); // Limit to 4 recommendations
  }

  private getFallbackRecommendations(smoothnessScore: number): SwingRecommendation[] {
    const recommendations: SwingRecommendation[] = [];

    if (smoothnessScore < 70) {
      recommendations.push({
        category: 'path',
        severity: 'high',
        message: 'Swing path shows significant inconsistency',
        improvement: 'Practice slow, controlled swings focusing on a smooth arc'
      });

      recommendations.push({
        category: 'tempo',
        severity: 'medium',
        message: 'Work on maintaining consistent tempo',
        improvement: 'Use a metronome or count "one-two" for backswing and downswing'
      });
    } else if (smoothnessScore < 85) {
      recommendations.push({
        category: 'path',
        severity: 'medium',
        message: 'Good swing foundation with room for improvement',
        improvement: 'Focus on maintaining the same swing plane throughout'
      });

      recommendations.push({
        category: 'follow-through',
        severity: 'low',
        message: 'Complete your follow-through for better consistency',
        improvement: 'Hold your finish position for 3 seconds after each swing'
      });
    } else {
      recommendations.push({
        category: 'path',
        severity: 'low',
        message: 'Excellent swing consistency!',
        improvement: 'Continue practicing to maintain this level of performance'
      });
    }

    return recommendations;
  }
}

// Singleton instance
export const openRouterClient = new OpenRouterClient(
  import.meta.env.VITE_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY || ''
);