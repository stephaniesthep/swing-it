import { useState } from 'react';

export function SimpleGolfApp() {
  const [message, setMessage] = useState('Golf Swing Analyzer Loading...');

  return (
    <div className="min-h-screen bg-green-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-green-800 text-center mb-8">
          🏌️ Golf Swing Analyzer
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 text-center">
          <p className="text-lg text-gray-700 mb-4">
            {message}
          </p>
          
          <button 
            onClick={() => setMessage('App is working! Ready to analyze golf swings.')}
            className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Test App
          </button>
          
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-100 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">📹 Record Swing</h3>
              <p className="text-sm text-green-700">Use your camera to record golf swings</p>
            </div>
            
            <div className="bg-blue-100 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">📁 Upload Video</h3>
              <p className="text-sm text-blue-700">Upload existing swing videos</p>
            </div>
            
            <div className="bg-yellow-100 p-4 rounded-lg">
              <h3 className="font-semibold text-yellow-800 mb-2">🤖 AI Analysis</h3>
              <p className="text-sm text-yellow-700">Get personalized recommendations</p>
            </div>
            
            <div className="bg-purple-100 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-800 mb-2">🎉 Celebrations</h3>
              <p className="text-sm text-purple-700">Confetti for great swings!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}