import { useCallback, useEffect, useRef, useState } from "react";

type FetchResult<T> = { data: T[]; totalCount: number };
type PageFetcher<T> = (offset: number, limit: number) => Promise<FetchResult<T>>;

type UsePaginatedCacheOptions<T> = {
  fetcher: PageFetcher<T>;
  pageSize?: number;
  cacheWindow?: number;
  initialPage?: number;
};

type UsePaginatedCacheResult<T> = {
  data: T[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  loading: boolean;
  goToPage: (page: number, options?: { forceRefresh?: boolean }) => Promise<void>;
  refresh: (page?: number) => Promise<void>;
};

export function usePaginatedCache<T>({
  fetcher,
  pageSize = 10,
  cacheWindow = 2,
  initialPage = 1,
}: UsePaginatedCacheOptions<T>): UsePaginatedCacheResult<T> {
  const [cache, setCache] = useState<Record<number, T[]>>({});
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [loading, setLoading] = useState(true);

  const fetcherRef = useRef(fetcher);
  const requestSeqRef = useRef(0);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const loadWindow = useCallback(
    async (centerPage: number): Promise<boolean> => {
      const min = Math.max(1, centerPage - cacheWindow);
      const max = centerPage + cacheWindow;

      const offset = (min - 1) * pageSize;
      const limit = (max - min + 1) * pageSize;

      const seq = ++requestSeqRef.current;

      try {
        const { data, totalCount } = await fetcherRef.current(offset, limit);

        if (seq !== requestSeqRef.current) return false;

        const newCache: Record<number, T[]> = {};
        let page = min;
        for (let start = 0; start < data.length; start += pageSize) {
          newCache[page++] = data.slice(
            start,
            Math.min(start + pageSize, data.length),
          );
        }

        setCache(newCache);
        setTotalCount(totalCount);
        return true;
      } finally {
        if (seq === requestSeqRef.current) setLoading(false);
      }
    },
    [cacheWindow, pageSize],
  );

  const goToPage = useCallback(
    async (page: number, options?: { forceRefresh?: boolean }) => {
      if (page < 1 || page > totalPages) return;
      if (options?.forceRefresh || !cache[page]) {
        setLoading(true);
        const committed = await loadWindow(page);
        if (!committed) return;
      }
      setCurrentPage(page);
    },
    [cache, loadWindow, totalPages],
  );

  const refresh = useCallback(
    async (page?: number) => {
      setLoading(true);
      await loadWindow(page ?? currentPage);
    },
    [currentPage, loadWindow],
  );

  useEffect(() => {
    void loadWindow(initialPage);
  }, [initialPage, loadWindow]);

  return {
    data: cache[currentPage] ?? [],
    totalCount,
    totalPages,
    currentPage,
    loading,
    goToPage,
    refresh,
  };
}