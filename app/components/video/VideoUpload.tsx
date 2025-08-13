import { useState, useRef, useCallback } from 'react';
import { Button } from '../ui';
import type { AnalysisStatus } from '../../lib/types';
import { Upload, X, CheckCircle } from 'lucide-react';

interface VideoUploadProps {
  onVideoReady: (videoBlob: Blob, videoUrl: string) => void;
  onStatusChange: (status: AnalysisStatus) => void;
  maxSizeMB?: number;
  maxDurationSeconds?: number;
}

const SUPPORTED_FORMATS = ['video/mp4', 'video/webm', 'video/quicktime'];
const SUPPORTED_EXTENSIONS = ['.mp4', '.webm', '.mov'];

export function VideoUpload({ 
  onVideoReady, 
  onStatusChange, 
  maxSizeMB = 100,
  maxDurationSeconds = 60 
}: VideoUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    duration: number;
    size: number;
    format: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Validate video file
  const validateVideo = useCallback((file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      setIsValidating(true);
      setError(null);

      // Check file type
      if (!SUPPORTED_FORMATS.includes(file.type)) {
        const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        if (!SUPPORTED_EXTENSIONS.includes(extension)) {
          setError(`Unsupported format. Please use: ${SUPPORTED_EXTENSIONS.join(', ')}`);
          setIsValidating(false);
          resolve(false);
          return;
        }
      }

      // Check file size
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > maxSizeMB) {
        setError(`File too large. Maximum size: ${maxSizeMB}MB`);
        setIsValidating(false);
        resolve(false);
        return;
      }

      // Check video duration and metadata
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        const duration = video.duration;
        
        if (duration > maxDurationSeconds) {
          setError(`Video too long. Maximum duration: ${maxDurationSeconds} seconds`);
          setIsValidating(false);
          resolve(false);
          return;
        }

        // Store validation results
        setValidationResult({
          duration: Math.round(duration),
          size: Math.round(fileSizeMB * 10) / 10,
          format: file.type || 'video/' + file.name.split('.').pop()
        });

        setIsValidating(false);
        resolve(true);
      };

      video.onerror = () => {
        setError('Invalid video file or corrupted data');
        setIsValidating(false);
        resolve(false);
      };

      video.src = URL.createObjectURL(file);
    });
  }, [maxSizeMB, maxDurationSeconds]);

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    onStatusChange('processing');

    const isValid = await validateVideo(file);
    
    if (isValid) {
      const videoUrl = URL.createObjectURL(file);
      onVideoReady(file, videoUrl);
      onStatusChange('complete');
    } else {
      onStatusChange('error');
    }
  }, [validateVideo, onVideoReady, onStatusChange]);

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [handleFileSelect]);

  // Handle file input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  }, [handleFileSelect]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedFile(null);
    setError(null);
    setValidationResult(null);
    onStatusChange('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onStatusChange]);

  // Open file dialog
  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="golf-card">
      {/* File input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={SUPPORTED_EXTENSIONS.join(',')}
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Drop zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200
          ${dragActive 
            ? 'border-golf-green-500 bg-golf-green-50' 
            : 'border-golf-green-300 hover:border-golf-green-400'
          }
          ${selectedFile ? 'border-golf-green-500 bg-golf-green-50' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {isValidating ? (
          <div className="space-y-4">
            <div className="golf-spinner w-8 h-8 mx-auto"></div>
            <p className="text-golf-dark">Validating video...</p>
          </div>
        ) : selectedFile && validationResult ? (
          <div className="space-y-4">
            <CheckCircle className="w-12 h-12 text-golf-green-600 mx-auto" />
            <div>
              <h3 className="font-semibold text-golf-dark mb-2">{selectedFile.name}</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Duration: {validationResult.duration}s</p>
                <p>Size: {validationResult.size}MB</p>
                <p>Format: {validationResult.format}</p>
              </div>
            </div>
            <Button onClick={clearSelection} variant="outline" size="sm">
              <X className="w-4 h-4 mr-2" />
              Choose Different Video
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="w-12 h-12 text-golf-green-500 mx-auto" />
            <div>
              <p className="text-lg font-semibold text-golf-dark mb-2">
                Drop your golf swing video here
              </p>
              <p className="text-gray-600 mb-4">
                or click to browse files
              </p>
              <Button onClick={openFileDialog} variant="primary">
                Choose Video File
              </Button>
            </div>
            <div className="text-sm text-gray-500 space-y-1">
              <p>Supported formats: MP4, WebM, MOV</p>
              <p>Max size: {maxSizeMB}MB | Max duration: {maxDurationSeconds}s</p>
            </div>
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="golf-error mt-4">
          <p>{error}</p>
          <Button onClick={clearSelection} variant="outline" size="sm" className="mt-2">
            Try Again
          </Button>
        </div>
      )}

      {/* Preview video (hidden, used for validation) */}
      <video
        ref={videoRef}
        className="hidden"
        preload="metadata"
      />
    </div>
  );
}