import React, { useEffect, useState } from 'react';
import { getAllImages } from '@/data/sampleData';
import { GameImage } from '@/types/game';

const AnimatedBackgroundCarousel: React.FC = () => {
  const [images, setImages] = useState<GameImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const loadImages = async () => {
      try {
        console.log('🎠 Loading all images for carousel...');
        
        // Use the same getAllImages function that the game uses to get ALL images
        const allImages = await getAllImages();
        
        if (allImages && allImages.length > 0) {
          console.log(`✅ Carousel loaded ${allImages.length} images from database`);
          setImages(allImages);
        } else {
          console.warn('⚠️ No images found in database for carousel');
          setImages([]);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('❌ Failed to load images for carousel:', error);
        // Set empty array instead of hardcoded fallback to troubleshoot database issues
        setImages([]);
        setLoading(false);
      }
    };

    loadImages();
  }, []);

  // Show carousel with fade-in effect after images are loaded
  useEffect(() => {
    // Always reset visibility state first
    setIsVisible(false);
    
    if (!loading) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 50); // Reduced from 100ms to 50ms for faster appearance

      return () => clearTimeout(timer);
    }
  }, [loading]);

  // Additional effect to ensure proper reset on component mount
  useEffect(() => {
    // Reset visibility state when component mounts
    setIsVisible(false);
    
    // Small delay to ensure proper initialization
    const initTimer = setTimeout(() => {
      if (!loading) {
        setIsVisible(true);
      }
    }, 75); // Reduced from 150ms to 75ms

    return () => clearTimeout(initTimer);
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-gradient-to-br from-gray-100 to-gray-200 opacity-30" />
    );
  }

  if (images.length === 0) {
    return null;
  }

  // Create multiple columns with different images and directions
  const createColumn = (columnIndex: number) => {
    // Use overlapping distribution - each column gets 75% of images with different starting points
    // This gives much more variety while still ensuring each column is different
    const imagesPerColumn = Math.min(15, images.length); // Use 15 out of 20 images per column
    const offset = Math.floor(images.length * 0.25 * columnIndex); // 25% offset between columns
    
    // Create column images with wrapping for variety
    const columnImages = [];
    for (let i = 0; i < imagesPerColumn; i++) {
      const imageIndex = (offset + i) % images.length;
      columnImages.push(images[imageIndex]);
    }
    
    // Deterministic shuffle based on column index to prevent constant re-shuffling
    const shuffledColumnImages = [...columnImages].sort((a, b) => {
      // Create a more robust seed using multiple parts of the ID and column index
      const getImageSeed = (img) => {
        const idParts = img.id.split('-');
        const seed1 = parseInt(idParts[0].slice(-4), 16) || 0;
        const seed2 = parseInt(idParts[1]?.slice(-4), 16) || 0;
        return (seed1 + seed2) * (columnIndex + 1) * 1000;
      };
      
      const seedA = getImageSeed(a);
      const seedB = getImageSeed(b);
      
      // Use sine function for better distribution
      return Math.sin(seedA) - Math.sin(seedB);
    });
    
    // Create fewer duplicates since we have more variety per column
    const duplicatedImages = [
      ...shuffledColumnImages, 
      ...shuffledColumnImages, 
      ...shuffledColumnImages
    ];
    
    // Debug: Log the first few images for each column to verify variety
    if (process.env.NODE_ENV === 'development') {
      console.log(`Column ${columnIndex} images:`, shuffledColumnImages.slice(0, 5).map(img => img.description.slice(0, 30)));
    }
    
    // Determine direction: columns 0,2 go up; columns 1,3 go down
    const isUpward = columnIndex % 2 === 0;
    
    // Slower animation speeds for smoother endless loop effect
    const animationDuration = 180 + columnIndex * 15; // 180s, 195s, 210s, 225s (much slower for seamless effect)

    // Calculate centered column positioning - increased column width for larger images
    const columnWidth = 18; // Increased from 15% to 18% for larger images
    const gapWidth = 2.5; // Keep same gap for spacing
    const totalWidth = (columnWidth * 4) + (gapWidth * 3); // Total width: 72% + 7.5% = 79.5%
    const startOffset = (100 - totalWidth) / 2; // Center the entire layout: 10.25%
    const leftPosition = startOffset + (columnIndex * (columnWidth + gapWidth));

    // Staggered fade-in delay for each column
    const fadeInDelay = columnIndex * 75; // Reduced from 150ms to 75ms for faster staggered appearance

    return (
      <div
        key={columnIndex}
        className="absolute flex flex-col"
        style={{
          left: `${leftPosition}%`,
          width: `${columnWidth}%`,
          gap: '6px', // Add back some spacing between images for visual separation
          animation: `infiniteScroll${isUpward ? 'Up' : 'Down'} ${animationDuration}s linear infinite`,
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: `opacity 0.5s ease-out ${fadeInDelay}ms, transform 0.5s ease-out ${fadeInDelay}ms`,
        }}
      >
        {duplicatedImages.map((image, index) => (
          <div
            key={`${image.id}-${index}`}
            className="relative overflow-hidden rounded-lg flex-shrink-0" // Restore rounded-lg for nice corners
            style={{ height: '220px' }} // Increased from 180px to 220px for larger images
          >
            <img
              src={image.image_url}
              alt={image.description}
              className="w-full h-full object-cover opacity-40 blur-[1px] transition-opacity duration-300"
              loading="lazy"
              onError={(e) => {
                // Hide broken images
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <style>{`
        /* Seamless upward animation - calculated for perfect loop */
        @keyframes infiniteScrollUp {
          0% { 
            transform: translateY(0); 
          }
          100% { 
            transform: translateY(-50%); 
          }
        }
        
        /* Seamless downward animation - calculated for perfect loop */
        @keyframes infiniteScrollDown {
          0% { 
            transform: translateY(-50%); 
          }
          100% { 
            transform: translateY(0); 
          }
        }
      `}</style>
      
      {/* Create 4 columns with staggered fade-in */}
      {createColumn(0)}      {/* Left - Up - Fades in first */}
      {createColumn(1)}      {/* Second - Down - Fades in 150ms later */}
      {createColumn(2)}      {/* Third - Up - Fades in 300ms later */}
      {createColumn(3)}      {/* Right - Down - Fades in 450ms later */}
    </div>
  );
};

export default AnimatedBackgroundCarousel;
