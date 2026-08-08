import { useState, useCallback } from 'react';
import { useAppDispatch } from '@/state/redux';
import { api, SearchPlaceResult } from '@/state/api';

export const usePlaceSearch = () => {
  const dispatch = useAppDispatch();
  const [isSearching, setIsSearching] = useState(false);

  const searchPlace = useCallback(
    async (queryText: string): Promise<SearchPlaceResult | null> => {
      if (!queryText.trim()) return null;
      setIsSearching(true);

      // Khởi tạo request bằng RTK Query initiate
      const runningQuery = dispatch(
        api.endpoints.searchPlace.initiate(queryText)
      );

      try {
        const result = await runningQuery.unwrap();
        return result || null;
      } catch (err: any) {
        // Bóc tách thông tin lỗi chi tiết từ RTK Query
        const errorMessage =
          err?.data?.message || 
          err?.error ||      
          err?.message ||
          'Unknown search error';

        const statusCode = err?.status || err?.originalStatus;

        console.error('Failed to search place:', {
          status: statusCode,
          message: errorMessage,
          rawError: err,
        });

        return null;
      } finally {
        // Dọn dẹp cache listener để tránh đọng bộ nhớ
        runningQuery.unsubscribe();
        setIsSearching(false);
      }
    },
    [dispatch],
  );

  return { searchPlace, isSearching };
};