import { setFilters, setViewMode, toggleFiltersFullOpen } from '@/state';
import { useAppDispatch, useAppSelector } from '@/state/redux';
import { usePathname, useRouter } from 'next/navigation';
import { debounce } from 'lodash';
import React, { useState } from 'react';
import { cleanParams, cn, formatPriceValue } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Filter, Grid, List, MapPin, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PropertyTypeIcons, PRICE_RANGES_MIN, PRICE_RANGES_MAX } from '@/lib/constants';
import { PropertyTypeEnum } from '@shared/types';
import { useAutocompleteAddressQuery, api } from '@/state/api';

const FiltersBar = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const filters = useAppSelector((state) => state.global.filters);
  const isFiltersFullOpen = useAppSelector(
    (state) => state.global.isFiltersFullOpen,
  );
  const viewMode = useAppSelector((state) => state.global.viewMode);
  const [searchInput, setSearchInput] = useState(filters.location);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Fetch address autocomplete suggestions from NestJS backend (AWS Places)
  const { data: suggestions = [] } = useAutocompleteAddressQuery(
    searchInput,
    { skip: searchInput.trim().length < 2 },
  );

  const updateURL = debounce((newFilters) => {
    const cleanFilters = cleanParams(newFilters);
    const updatedSearchParams = new URLSearchParams();

    Object.entries(cleanFilters).forEach(([key, value]) => {
      updatedSearchParams.set(
        key,
        Array.isArray(value) ? value.join(',') : value.toString(),
      );
    });

    router.push(`${pathname}?${updatedSearchParams.toString()}`);
  }, 300);

  const handleFilterChange = (
    key: string,
    value: any,
    isMin: boolean | null,
  ) => {
    let newValue = value;

    if (key === 'priceRange' || key === 'squareFeet') {
      const currentArrayRange = [...filters[key]];
      if (isMin !== null) {
        const index = isMin ? 0 : 1;
        currentArrayRange[index] = value === 'any' ? null : Number(value);
      }
      newValue = currentArrayRange;
    } else if (key === 'coordinates') {
      newValue = value === 'any' ? [0, 0] : value.map(Number);
    } else {
      newValue = value === 'any' ? 'any' : value;
    }

    const newFilters = { ...filters, [key]: newValue };
    dispatch(setFilters(newFilters));
    updateURL(newFilters);
  };

  const executeSearch = async (queryText: string) => {
    if (!queryText.trim()) return;
    setShowSuggestions(false);

    try {
      // Resolve queryText to centroid position via NestJS LocationService
      const result = await dispatch(
        api.endpoints.searchPlace.initiate(queryText),
      ).unwrap();

      const newFilters = {
        ...filters,
        location: queryText,
        coordinates: result?.position
          ? (result.position as [number, number])
          : filters.coordinates,
      };

      dispatch(setFilters(newFilters));
      updateURL(newFilters);
    } catch (err) {
      console.error('Failed to search place:', err);
    }
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

        {/* Price Range */}
        <div className="flex gap-1">
          {/* Minimum Price Selector */}
          <Select
            value={filters.priceRange[0]?.toString() || 'any'}
            onValueChange={(value) =>
              handleFilterChange('priceRange', value, true)
            }
          >
            <SelectTrigger className="w-28 rounded-xl border-primary-400">
              <SelectValue>
                {formatPriceValue(filters.priceRange[0], true)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="any">Giá tối thiểu</SelectItem>
              {PRICE_RANGES_MIN.map((price) => (
                <SelectItem key={price} value={price.toString()}>
                  {formatPriceValue(price, true)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Maximum Price Selector */}
          <Select
            value={filters.priceRange[1]?.toString() || 'any'}
            onValueChange={(value) =>
              handleFilterChange('priceRange', value, false)
            }
          >
            <SelectTrigger className="w-28 rounded-xl border-primary-400">
              <SelectValue>
                {formatPriceValue(filters.priceRange[1], false)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="any">Giá tối đa</SelectItem>
              {PRICE_RANGES_MAX.map((price) => (
                <SelectItem key={price} value={price.toString()}>
                  {formatPriceValue(price, false)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Beds and Baths */}
        <div className="flex gap-1">
          <Select
            value={filters.beds}
            onValueChange={(value) => handleFilterChange('beds', value, null)}
          >
            <SelectTrigger className="w-26 rounded-xl border-primary-400">
              <SelectValue placeholder="Phòng ngủ" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="any">Tất cả phòng ngủ</SelectItem>
              <SelectItem value="1">1+ phòng ngủ</SelectItem>
              <SelectItem value="2">2+ phòng ngủ</SelectItem>
              <SelectItem value="3">3+ phòng ngủ</SelectItem>
              <SelectItem value="4">4+ phòng ngủ</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.baths}
            onValueChange={(value) => handleFilterChange('baths', value, null)}
          >
            <SelectTrigger className="w-26 rounded-xl border-primary-400">
              <SelectValue placeholder="Phòng tắm" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="any">Tất cả phòng tắm</SelectItem>
              <SelectItem value="1">1+ phòng tắm</SelectItem>
              <SelectItem value="2">2+ phòng tắm</SelectItem>
              <SelectItem value="3">3+ phòng tắm</SelectItem>
              <SelectItem value="4">4+ phòng tắm</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Property Type */}
        <Select
          value={filters.propertyType}
          onValueChange={(value) =>
            handleFilterChange('propertyType', value, null)
          }
        >
          <SelectTrigger className="w-36 rounded-xl border-primary-400">
            <SelectValue placeholder="Loại bất động sản" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="any">Tất cả loại</SelectItem>
            {Object.entries(PropertyTypeIcons).map(([type, Icon]) => (
              <SelectItem key={type} value={type}>
                <div className="flex items-center">
                  <Icon className="w-4 h-4 mr-2" />
                  <span>{PropertyTypeEnum[type as unknown as keyof typeof PropertyTypeEnum] || type}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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