import { setFilters, setViewMode, toggleFiltersFullOpen } from '@/state';
import { useAppDispatch, useAppSelector } from '@/state/redux';
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Filter, Grid, List, MapPin, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAutocompleteAddressQuery } from '@/state/api';
import { useDebounce } from '@/hooks/useDebounce';
import { useFilterUrlSync } from '@/hooks/useFilterUrlSync';
import { usePlaceSearch } from '@/hooks/usePlaceSearch';

const FiltersBar = () => {
  const dispatch = useAppDispatch();
  const filters = useAppSelector((state) => state.global.filters);
  const isFiltersFullOpen = useAppSelector(
    (state) => state.global.isFiltersFullOpen,
  );
  const viewMode = useAppSelector((state) => state.global.viewMode);
  const [searchInput, setSearchInput] = useState(filters.location);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { updateURL } = useFilterUrlSync();
  const { searchPlace } = usePlaceSearch();

  const debouncedSearchInput = useDebounce(searchInput, 500);

  const { data: suggestions = [] } = useAutocompleteAddressQuery(
    debouncedSearchInput,
    { skip: searchInput.trim().length < 2 },
  );

  const executeSearch = async (queryText: string) => {
    if (!queryText.trim()) return;
    setShowSuggestions(false);

    const result = await searchPlace(queryText);

    const newFilters = {
      ...filters,
      location: queryText,
      coordinates: result?.position
        ? (result.position as [number, number])
        : filters.coordinates,
    };

    dispatch(setFilters(newFilters));
    updateURL(newFilters);
  };

  return (
    <div className="flex justify-between items-center w-full py-5">
      {/* FiltersBar */}
      <div className="flex justify-between items-center gap-4 p-2">
        {/* All filters */}
        <Button
          variant="outline"
          className={cn(
            'gap-2 rounded-xl border-primary-400 hover:bg-primary-500 hover:text-primary-100',
            isFiltersFullOpen && 'bg-primary-700 text-primary-100',
          )}
          onClick={() => dispatch(toggleFiltersFullOpen())}
        >
          <Filter className="w-4 h-4" />
          <span>Tất cả bộ lọc</span>
        </Button>

        {/* Search Location with Autocomplete */}
        <div className="relative flex items-center">
          <div className="relative flex items-center">
            <Input
              placeholder="Tìm vị trí (vd: Cầu Kiệu)"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  executeSearch(searchInput);
                }
              }}
              className="w-56 rounded-l-xl rounded-r-none border-primary-400 border-r-0"
            />
            <Button
              onClick={() => executeSearch(searchInput)}
              className="rounded-r-xl rounded-l-none border-l-none border-primary-400 shadow-none border hover:bg-primary-700 hover:text-primary-50"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>

          {/* Autocomplete Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
              {suggestions.map((item, idx) => (
                <div
                  key={item.placeId || idx}
                  onClick={() => {
                    setSearchInput(item.label);
                    executeSearch(item.label);
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 cursor-pointer border-b last:border-b-0 border-gray-100"
                >
                  <MapPin className="w-4 h-4 text-primary-500 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* View Mode */}
      <div className="flex justify-between items-center gap-4 p-2">
        <div className="flex border rounded-xl overflow-hidden">
          <Button
            variant="ghost"
            className={cn(
              'px-3 py-1 rounded-none hover:bg-primary-600 hover:text-primary-50',
              viewMode === 'list' ? 'bg-primary-700 text-primary-50' : '',
            )}
            onClick={() => dispatch(setViewMode('list'))}
          >
            <List className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            className={cn(
              'px-3 py-1 rounded-none hover:bg-primary-600 hover:text-primary-50',
              viewMode === 'grid' ? 'bg-primary-700 text-primary-50' : '',
            )}
            onClick={() => dispatch(setViewMode('grid'))}
          >
            <Grid className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FiltersBar;