export function TestApp() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: 'green' }}>🏌️ Golf Swing Analyzer</h1>
      <p>App is working! This is a test component.</p>
      <div style={{ 
        backgroundColor: '#f0f9ff', 
        padding: '20px', 
        borderRadius: '8px',
        margin: '20px 0'
      }}>
        <h2>Features Coming Soon:</h2>
        <ul>
          <li>📹 Video Recording</li>
          <li>📁 File Upload</li>
          <li>🤖 AI Analysis</li>
          <li>🎉 Celebrations</li>
        </ul>
      </div>
      <button 
        style={{
          backgroundColor: '#22c55e',
          color: 'white',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
        onClick={() => alert('Golf Swing Analyzer is working!')}
      >
        Test Button
      </button>
    </div>
  );
}