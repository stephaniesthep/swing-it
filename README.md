# 🏌️ Golf Swing Analyzer

An AI-powered golf swing analysis application that uses computer vision and machine learning to provide real-time feedback and personalized recommendations for improving your golf swing.

## ✨ Features

### 🎥 Video Input
- **Real-time Recording**: Record your golf swing directly using your device camera
- **Video Upload**: Upload existing golf swing videos (MP4, WebM, MOV formats)
- **Format Validation**: Automatic validation of video format, size, and duration
- **Mobile-First Design**: Optimized for mobile devices and touch interfaces

### 🔍 Swing Analysis
- **Pose Detection**: Advanced pose detection using TensorFlow.js and MoveNet
- **Swing Path Tracking**: Real-time tracking of club/body movement path
- **Smoothness Scoring**: Algorithmic scoring of swing smoothness (0-100%)
- **Tempo Analysis**: Measurement of swing timing and rhythm
- **Phase Detection**: Identification of backswing, downswing, and follow-through

### 🤖 AI-Powered Recommendations
- **OpenRouter Integration**: Uses free LLM models for swing analysis
- **Personalized Feedback**: Tailored recommendations based on your swing data
- **Category-based Tips**: Organized feedback for posture, tempo, path, and follow-through
- **Severity Levels**: Prioritized recommendations (low, medium, high importance)

### 🎉 Interactive Features
- **Celebration Animation**: Confetti animation for swings scoring 85%+ smoothness
- **Visual Overlays**: Real-time swing path visualization on video
- **Progress Tracking**: Historical analysis and improvement tracking
- **Download Capability**: Export analyzed videos with overlays

### 🎨 Golf-Themed Design
- **Custom Color Palette**: Golf course inspired greens, sand, and sky colors
- **Responsive Layout**: Mobile-first design with desktop optimization
- **Smooth Animations**: Golf-themed transitions and loading states
- **Dark Mode Support**: Automatic dark/light theme switching

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Modern web browser with camera access
- OpenRouter API key (free tier available)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd golf-swing-analyzer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   VITE_OPENROUTER_API_KEY=your_openrouter_api_key_here
   VITE_APP_NAME=Golf Swing Analyzer
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173` (or the port shown in terminal)

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory, ready for deployment.

## 🛠️ Technology Stack

### Frontend Framework
- **React Router v7**: Modern React framework with file-based routing
- **TypeScript**: Type-safe JavaScript development
- **Vite**: Fast build tool and development server

### Styling & UI
- **Tailwind CSS**: Utility-first CSS framework
- **Custom Golf Theme**: Specialized color palette and components
- **Lucide React**: Beautiful icon library
- **Canvas Confetti**: Celebration animations

### Computer Vision & AI
- **TensorFlow.js**: Machine learning in the browser
- **MoveNet**: Pose detection model for human movement tracking
- **OpenRouter API**: Access to various LLM models
- **Canvas API**: Real-time video overlay rendering

### Video Processing
- **MediaRecorder API**: Browser-native video recording
- **WebRTC**: Real-time camera access
- **HTML5 Video**: Video playback and manipulation

### Deployment
- **Netlify**: Serverless deployment platform
- **Environment Variables**: Secure API key management

## 📱 Usage Guide

### Recording a Swing
1. Click the "Record" tab
2. Allow camera permissions when prompted
3. Position yourself in the camera view
4. Click "Start Recording" and perform your golf swing
5. Click "Stop" when finished

### Uploading a Video
1. Click the "Upload" tab
2. Drag and drop your video file or click to browse
3. Supported formats: MP4, WebM, MOV (max 100MB, 60 seconds)
4. Wait for validation and processing

### Understanding Results
- **Smoothness Score**: 0-100% rating of swing consistency
  - 85%+: Excellent (triggers celebration)
  - 70-84%: Good
  - Below 70%: Needs improvement
- **Tempo**: Duration of your swing in seconds
- **AI Recommendations**: Personalized tips for improvement
- **Visual Overlay**: Swing path drawn on your video

### Viewing History
- All analyzed swings are automatically saved locally
- View statistics: total swings, average score, best score
- Click on any historical entry to see detailed analysis
- Clear history when needed

## 🔧 Configuration

### Video Settings
- **Max Duration**: 30 seconds for recording, 60 seconds for upload
- **Max File Size**: 100MB for uploads
- **Supported Formats**: MP4, WebM, MOV
- **Resolution**: Optimized for HD (720p-1080p)

### Analysis Settings
- **Smoothness Threshold**: 85% for celebration trigger
- **Confidence Threshold**: 30% minimum for pose detection
- **Frame Rate**: 30 FPS for analysis
- **History Limit**: 50 most recent swings stored

### AI Model Settings
- **Default Model**: Meta Llama 3.1 8B (free tier)
- **Temperature**: 0.7 for balanced creativity
- **Max Tokens**: 500 for recommendations
- **Fallback**: Local recommendations if API fails

## 🚀 Deployment

### Netlify Deployment
1. Connect your repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables in Netlify dashboard:
   - `VITE_OPENROUTER_API_KEY`
   - `VITE_APP_NAME`

### Environment Variables
```env
# Required
VITE_OPENROUTER_API_KEY=your_api_key

# Optional
VITE_APP_NAME=Golf Swing Analyzer
NODE_ENV=production
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **TensorFlow.js Team** for the pose detection models
- **OpenRouter** for providing free LLM access
- **Golf Community** for inspiration and feedback
- **React Router Team** for the excellent framework

## 📞 Support

If you encounter any issues or have questions:
1. Check the [Issues](../../issues) page
2. Create a new issue with detailed description
3. Include browser version and error messages

---

**Happy Swinging! 🏌️‍♂️⛳**
