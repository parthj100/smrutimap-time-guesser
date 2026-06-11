import React, { useEffect, useState } from 'react';
import { Maximize2, X } from 'lucide-react';

interface DuelPhotoProps {
  /** null while the round image is still being fetched */
  imageUrl: string | null;
}

/** Round photo panel that fills its container (object-contain, no backdrop),
 *  with a fullscreen zoom for clue-hunting. GameImage is not reused here
 *  because it manages its own fixed 400-800px height for the single-player
 *  layout and cannot fill a flexible grid cell. */
const DuelPhoto: React.FC<DuelPhotoProps> = ({ imageUrl }) => {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setErrored(false);
  }, [imageUrl]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden">
      {(!imageUrl || (!loaded && !errored)) && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center text-gray-500">
          Loading photo…
        </div>
      )}
      {errored && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-500">
          Could not load the photo
        </div>
      )}
      {imageUrl && !errored && (
        <>
          <img
            src={imageUrl}
            alt="Guess where and when this Smruti photo was taken"
            className={`w-full h-full object-contain transition-opacity duration-300 ${
              loaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setLoaded(true)}
            onError={() => setErrored(true)}
            decoding="async"
          />
          {loaded && (
            <button
              onClick={() => setFullscreen(true)}
              aria-label="View photo fullscreen"
              className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white p-2 rounded-lg transition-colors"
            >
              <Maximize2 size={18} />
            </button>
          )}
        </>
      )}
      {fullscreen && imageUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo fullscreen view"
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setFullscreen(false)}
        >
          <img
            src={imageUrl}
            alt="Smruti photo, fullscreen"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setFullscreen(false)}
            aria-label="Close fullscreen"
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-colors"
          >
            <X size={22} />
          </button>
        </div>
      )}
    </div>
  );
};

export default DuelPhoto;
