import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from './ui';
import type { SwingAnalysis } from '../lib/types';
import { History, Trash2, TrendingUp, Calendar } from 'lucide-react';

interface SwingHistoryEntry {
  id: string;
  timestamp: number;
  analysis: SwingAnalysis;
  videoUrl?: string;
}

export function SwingHistory() {
  const [history, setHistory] = useState<SwingHistoryEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<SwingHistoryEntry | null>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('golf-swing-history');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setHistory(parsed);
      } catch (error) {
        console.error('Failed to load swing history:', error);
      }
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('golf-swing-history', JSON.stringify(history));
  }, [history]);

  const addSwingToHistory = (analysis: SwingAnalysis, videoUrl?: string) => {
    const entry: SwingHistoryEntry = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      analysis,
      videoUrl
    };

    setHistory(prev => [entry, ...prev].slice(0, 50)); // Keep only last 50 entries
  };

  const deleteEntry = (id: string) => {
    setHistory(prev => prev.filter(entry => entry.id !== id));
    if (selectedEntry?.id === id) {
      setSelectedEntry(null);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    setSelectedEntry(null);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const calculateAverageScore = () => {
    if (history.length === 0) return 0;
    const total = history.reduce((sum, entry) => sum + entry.analysis.smoothnessScore, 0);
    return Math.round(total / history.length);
  };

  const getBestScore = () => {
    if (history.length === 0) return 0;
    return Math.max(...history.map(entry => entry.analysis.smoothnessScore));
  };

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-golf-green-600">
              {history.length}
            </div>
            <div className="text-sm text-gray-600">Total Swings</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${getScoreColor(calculateAverageScore())}`}>
              {calculateAverageScore()}%
            </div>
            <div className="text-sm text-gray-600">Average Score</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {getBestScore()}%
            </div>
            <div className="text-sm text-gray-600">Best Score</div>
          </CardContent>
        </Card>
      </div>

      {/* History List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <History className="w-5 h-5 mr-2" />
              Swing History
            </CardTitle>
            {history.length > 0 && (
              <Button
                onClick={clearHistory}
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No swing history yet</p>
              <p className="text-sm">Your analyzed swings will appear here</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedEntry?.id === entry.id
                      ? 'border-golf-green-500 bg-golf-green-50'
                      : 'border-gray-200 hover:border-golf-green-300'
                  }`}
                  onClick={() => setSelectedEntry(entry)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`text-xl font-bold ${getScoreColor(entry.analysis.smoothnessScore)}`}>
                        {entry.analysis.smoothnessScore}%
                      </div>
                      <div>
                        <div className="font-medium">
                          {entry.analysis.celebrationTriggered && '🎉 '}
                          Swing Analysis
                        </div>
                        <div className="text-sm text-gray-600 flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(entry.timestamp)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">
                        Tempo: {entry.analysis.tempo.toFixed(1)}s
                      </div>
                      <div className="text-sm text-gray-600">
                        Points: {entry.analysis.swingPath.length}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Entry Details */}
      {selectedEntry && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Swing Details - {formatDate(selectedEntry.timestamp)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">Performance Metrics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Smoothness Score:</span>
                    <span className={`font-semibold ${getScoreColor(selectedEntry.analysis.smoothnessScore)}`}>
                      {selectedEntry.analysis.smoothnessScore}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Swing Tempo:</span>
                    <span>{selectedEntry.analysis.tempo.toFixed(1)}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Path Points:</span>
                    <span>{selectedEntry.analysis.swingPath.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Celebration:</span>
                    <span>{selectedEntry.analysis.celebrationTriggered ? '🎉 Yes' : '❌ No'}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3">Recommendations</h4>
                {selectedEntry.analysis.recommendations.length > 0 ? (
                  <div className="space-y-2">
                    {selectedEntry.analysis.recommendations.map((rec, index) => (
                      <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                        {rec}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">No specific recommendations</p>
                )}
              </div>
            </div>
            
            <div className="mt-4 flex space-x-2">
              <Button
                onClick={() => deleteEntry(selectedEntry.id)}
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Entry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Hook to add swings to history
export function useSwingHistory() {
  const [history, setHistory] = useState<SwingHistoryEntry[]>([]);

  const addSwing = (analysis: SwingAnalysis, videoUrl?: string) => {
    const entry: SwingHistoryEntry = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      analysis,
      videoUrl
    };

    setHistory(prev => {
      const newHistory = [entry, ...prev].slice(0, 50);
      localStorage.setItem('golf-swing-history', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  return { addSwing, history };
}