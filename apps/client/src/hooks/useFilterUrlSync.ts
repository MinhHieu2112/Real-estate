import { useMemo, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { debounce } from 'lodash';
import { cleanParams } from '@/lib/utils';
import { FiltersState } from '@/state';

export const useFilterUrlSync = () => {
  const router = useRouter();
  const pathname = usePathname();

  const updateURL = useMemo(
    () =>
      debounce((newFilters: FiltersState) => {
        const cleanFilters = cleanParams(newFilters);
        const updatedSearchParams = new URLSearchParams();

        Object.entries(cleanFilters).forEach(([key, value]) => {
          updatedSearchParams.set(
            key,
            Array.isArray(value) ? value.join(',') : value.toString(),
          );
        });

        router.push(`${pathname}?${updatedSearchParams.toString()}`);
      }, 300),
    [pathname, router],
  );

  useEffect(() => {
    return () => {
      updateURL.cancel();
    };
  }, [updateURL]);

  return { updateURL };
};
