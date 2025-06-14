import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getDailyChallengeImages } from '@/data/sampleData';
import { getGameImagesFromPool } from '@/utils/imagePool';

const DEFAULT_TOTAL_ROUNDS = 5;

export const useGameImages = (
  gameStartCounter: number,
  isDailyChallenge: boolean,
  gameMode: string,
  userId?: string
) => {
  const queryClient = useQueryClient();

  const {
    data: gameImages = [],
    isLoading,
    error,
    refetch,
    isError,
    isSuccess
  } = useQuery({
    queryKey: ['gameImages', gameStartCounter, isDailyChallenge, userId],
    queryFn: async () => {
      console.log('🎮 React Query fetching game images...');
      console.log('Query params:', {
        gameStartCounter,
        isDailyChallenge,
        userId: userId ? `${userId.slice(0, 8)}...` : 'guest',
        timestamp: new Date().toISOString()
      });
      try {
        const images = isDailyChallenge 
          ? await getDailyChallengeImages() 
          : await getGameImagesFromPool(DEFAULT_TOTAL_ROUNDS, userId);
        console.log('🎯 Query function result:', images);
        console.log('🎯 Image IDs fetched:', images.map(img => img.id));
        if (!images || images.length === 0) {
          console.error('🚫 Query returned no images');
          throw new Error('No images returned from database');
        }
        return images;
      } catch (error) {
        console.error('💥 Query function error:', error);
        throw error;
      }
    },
    staleTime: 0,
    gcTime: 0,
    enabled: gameMode === 'playing' || gameMode === 'daily',
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });

  const invalidateQuery = () => {
    queryClient.invalidateQueries({
      queryKey: ['gameImages']
    });
  };

  return {
    gameImages,
    isLoading,
    error,
    refetch,
    isError,
    isSuccess,
    invalidateQuery
  };
};
