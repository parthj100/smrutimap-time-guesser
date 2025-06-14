
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { getAllImages } from '@/data/sampleData';
import { GameImage } from '@/types/game';
import { toast } from 'sonner';

const CustomImages = () => {
  const navigate = useNavigate();
  const [images, setImages] = useState<GameImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadImages = async () => {
      try {
        const allImages = await getAllImages();
        setImages(allImages);
      } catch (error) {
        console.error('Error loading images:', error);
        toast.error('Failed to load images');
      } finally {
        setLoading(false);
      }
    };

    loadImages();
  }, []);

  return (
    <div className="min-h-screen bg-[#eee9da] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-[#ea384c]">Custom Images Manager</h1>
          <Button onClick={() => navigate('/')} variant="outline">
            Back to Game
          </Button>
        </div>

        {loading ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ea384c] mx-auto mb-4"></div>
            <p className="text-lg">Loading images...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Available Images ({images.length})</h2>
            
            {images.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-xl text-gray-600 mb-4">No images found in the database</p>
                <p className="text-gray-500">Add some images to start playing the game!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {images.map((image) => (
                  <div key={image.id} className="border rounded-lg p-4">
                    <img 
                      src={image.image_url} 
                      alt={image.description}
                      className="w-full h-48 object-cover rounded mb-3"
                    />
                    <h3 className="font-semibold">{image.year} - {image.location.name}</h3>
                    <p className="text-gray-600 text-sm mt-1">{image.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomImages;
