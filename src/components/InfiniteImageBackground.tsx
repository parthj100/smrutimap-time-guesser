import React, { useEffect, useState } from 'react';
import { 
  GridBody,
  DraggableContainer,
  GridItem, 
} from "@/components/ui/infinite-drag-scroll";
import { getAllImages } from '@/data/sampleData';
import { GameImage } from '@/types/game';

const InfiniteImageBackground: React.FC = () => {
  const [images, setImages] = useState<GameImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadImages = async () => {
      try {
        console.log('🎠 Loading all images for infinite background...');
        
        // Use the same getAllImages function that the game uses to get ALL images
        const allImages = await getAllImages();
        
        if (allImages && allImages.length > 0) {
          console.log(`✅ Infinite background loaded ${allImages.length} images from database`);
          setImages(allImages);
        } else {
          console.warn('⚠️ No images found in database for infinite background');
          setImages([]);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('❌ Failed to load images for infinite background:', error);
        setImages([]);
        setLoading(false);
      }
    };

    loadImages();
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-gradient-to-br from-[#f8f5f0] to-[#e8e0d0] opacity-50" />
    );
  }

  if (images.length === 0) {
    return (
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-gradient-to-br from-[#f8f5f0] to-[#e8e0d0] opacity-50" />
    );
  }

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <DraggableContainer 
        variant="masonry" 
        className="bg-gradient-to-br from-[#f8f5f0] to-[#e8e0d0]"
        autoScroll={true}
        scrollSpeed={1.0} // Slower, smoother movement for relaxed feeling
        disableDrag={true} // Completely disable user interaction
      >
        <GridBody>
          {images.map((image, index) => (
            <GridItem
              key={`${image.id}-${index}`}
              className="relative h-36 w-56 md:h-48 md:w-72 lg:h-60 lg:w-80"
            >
              <img
                src={image.image_url}
                alt={image.description}
                className="pointer-events-none absolute h-full w-full object-cover opacity-40 blur-[0.5px] transition-all duration-500 hover:opacity-55 rounded-lg"
                loading="lazy"
                onError={(e) => {
                  // Hide broken images
                  e.currentTarget.style.display = 'none';
                }}
              />
              {/* Subtle border effect with rounded corners */}
              <div className="absolute inset-0 border border-white/10 rounded-lg"></div>
            </GridItem>
          ))}
        </GridBody>
      </DraggableContainer>
    </div>
  );
};

export default InfiniteImageBackground; 