function SelfieUpload({ onUpload }) {
  try {
    const [previewImage, setPreviewImage] = React.useState(null);
    const videoRef = React.useRef(null);
    const canvasRef = React.useRef(null);
    const [showCamera, setShowCamera] = React.useState(false);
    const [cameraStatus, setCameraStatus] = React.useState('');
    const [cameraError, setCameraError] = React.useState('');

    async function stopTracks(stream) {
      try {
        if (!stream) return;
        const tracks = stream.getTracks ? stream.getTracks() : [];
        tracks.forEach(t => { try { t.stop(); } catch {} });
      } catch {}
    }

    async function startWithConstraints(constraints) {
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        return { ok: false, stream: null, err };
      }

      if (!videoRef.current) return { ok: false, stream, err: new Error('Video element missing') };

      const video = videoRef.current;
      video.muted = true;
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      video.srcObject = stream;

      // Wait briefly for dimensions; resolve quickly to feel instant
      const ready = await new Promise(resolve => {
        let done = false;
        const markReady = () => {
          if (done) return;
          if (video.videoWidth > 0 && video.videoHeight > 0) { done = true; resolve(true); }
        };
        const onCanPlay = () => { markReady(); };
        const onLoadedData = () => { markReady(); };
        video.addEventListener('canplay', onCanPlay, { once: true });
        video.addEventListener('loadeddata', onLoadedData, { once: true });
        // Also attempt immediate play
        video.play().then(markReady).catch(() => {});
        // Fallback timer
        setTimeout(() => { resolve(video.videoWidth > 0); }, 700);
      });

      if (ready) return { ok: true, stream };
      await stopTracks(stream);
      return { ok: false, stream: null, err: new Error('Video failed to become ready') };
    }

    const startCamera = async () => {
      try {
        setCameraError('');
        setCameraStatus('Requesting camera permission…');
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera not supported in this browser');
        }

        setShowCamera(true);
        setCameraStatus('Starting camera…');

        const attempts = [
          { video: { facingMode: { ideal: 'user' }, width: { ideal: 640 }, height: { ideal: 640 } }, audio: false },
          { video: { facingMode: 'user' }, audio: false },
          { video: true, audio: false },
          { video: { facingMode: { ideal: 'environment' } }, audio: false }
        ];

        let lastError = null;
        for (let i = 0; i < attempts.length; i++) {
          const res = await startWithConstraints(attempts[i]);
          if (res.ok) {
            setCameraStatus('Camera ready');
            return;
          }
          lastError = res.err || lastError;
        }

        throw lastError || new Error('Unable to start camera');
      } catch (error) {
        console.error('Camera access error:', error);
        setCameraError('Camera access is required. Please allow permissions and ensure no other app is using the camera.');
        setShowCamera(false);
      }
    };

    const stopCamera = () => {
      try {
        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject;
          if (stream && stream.getTracks) {
            const tracks = stream.getTracks();
            tracks.forEach(track => {
              if (track && track.stop) {
                track.stop();
              }
            });
          }
          videoRef.current.srcObject = null;
        }
        setShowCamera(false);
      } catch (error) {
        console.error('Error stopping camera:', error);
        setShowCamera(false);
      }
    };

    // Cleanup on component unmount
    React.useEffect(() => {
      return () => {
        stopCamera();
      };
    }, []);

    const capturePhoto = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      if (!canvas || !video) return;
      
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      const imageUrl = canvas.toDataURL('image/jpeg');
      setPreviewImage(imageUrl);
      setShowCamera(false);
      
      // Stop camera stream safely
      try {
        const stream = video.srcObject;
        if (stream && stream.getTracks) {
          const tracks = stream.getTracks();
          tracks.forEach(track => {
            if (track && track.stop) {
              track.stop();
            }
          });
        }
      } catch (error) {
        console.error('Error stopping camera stream:', error);
      }
    };

    const handleContinue = () => {
      if (previewImage) {
        onUpload(previewImage);
      }
    };

    return (
      <div className="text-center" data-name="selfie-upload" data-file="components/SelfieUpload.js">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Take Your Selfie</h2>
        <p className="text-[var(--text-secondary)] mb-2">Position yourself in the camera frame</p>
        {(cameraStatus || cameraError) && (
          <div className="mb-4 text-sm" role="status" aria-live="polite">
            {cameraStatus && <p className="text-[var(--text-secondary)]">{cameraStatus}</p>}
            {cameraError && <p className="text-red-400">{cameraError}</p>}
          </div>
        )}

        {!showCamera && !previewImage && (
          <div>
            <div className="camera-area">
              <div className="icon-camera text-6xl text-[var(--primary-color)] mb-4"></div>
              <p className="text-lg font-medium text-[var(--text-primary)] mb-2">
                Ready to take your selfie?
              </p>
              <p className="text-[var(--text-secondary)] mb-6">Make sure you have good lighting</p>
              <button onClick={startCamera} className="btn-primary w-full">
                <div className="icon-camera text-xl"></div>
                Start Camera
              </button>
            </div>
          </div>
        )}

        {showCamera && (
          <div className="space-y-6">
            <div className="relative bg-black rounded-2xl overflow-hidden aspect-square">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className="w-full h-full object-cover transform -scale-x-100"
                style={{ backgroundColor: '#000' }}
              />
              <div className="absolute inset-0 border-4 border-[var(--primary-color)] rounded-2xl pointer-events-none"></div>
            </div>
            <div className="flex flex-col gap-4">
              <button onClick={capturePhoto} className="btn-primary w-full text-xl py-4">
                <div className="icon-camera text-2xl"></div>
                Capture Photo
              </button>
              <button 
                onClick={stopCamera}
                className="btn-secondary w-full"
              >
                Cancel
              </button>
            </div>
            <canvas ref={canvasRef} className="hidden"></canvas>
          </div>
        )}

        {previewImage && (
          <div className="space-y-6">
            <div className="aspect-square">
              <img 
                src={previewImage} 
                alt="Preview" 
                className="w-full h-full object-cover rounded-2xl shadow-xl border-4 border-[var(--primary-color)]"
              />
            </div>
            <div className="flex flex-col gap-4">
              <button onClick={handleContinue} className="btn-primary w-full text-xl py-4">
                Continue
                <div className="icon-arrow-right text-2xl"></div>
              </button>
              <button 
                onClick={() => setPreviewImage(null)}
                className="btn-secondary w-full"
              >
                Retake Photo
              </button>
            </div>
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error('SelfieUpload component error:', error);
    return null;
  }
}