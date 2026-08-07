import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { AmenityIcons, PropertyTypeIcons } from '@/lib/constants';
import { cleanParams, cn } from '@/lib/utils';
import { FiltersState, initialState, setFilters } from '@/state';
import { useAppDispatch, useAppSelector } from '@/state/redux';
import { debounce } from 'lodash';
import { Search } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import {
  AmenityEnum,
  PropertyTypeEnum,
  AmenityLabels,
  PropertyTypeLabels,
} from '@shared/types';
import React, { useState } from 'react'

const FiltersFull = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const [localFilters, setLocalFilters] = useState(initialState.filters);
  const isFiltersFullOpen = useAppSelector(
    (state) => state.global.isFiltersFullOpen
  );
  const updateURL = debounce((newFilters: FiltersState) => {
    const cleanFilters = cleanParams(newFilters);
    const updatedSearchParams = new URLSearchParams();

    Object.entries(cleanFilters).forEach(([key, value]) => {
        updatedSearchParams.set(
            key,
            Array.isArray(value) ? value.join(",") : value.toString()
        );
    });

    router.push(`${pathname}?${updatedSearchParams.toString()}`);
  });

  const handleSubmit = () => {
    dispatch(setFilters(localFilters));
    updateURL(localFilters);
  }

  const handleReset = () => {
    setLocalFilters(initialState.filters);
    dispatch(setFilters(initialState.filters));
    updateURL(initialState.filters);
  }

  const handleAmenityChange = (amenity: AmenityEnum) => {
    setLocalFilters((prev) => ({
        ...prev,
        amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const handleLocationSearch = async () => {
    try {
        const response = await fetch(
            `https://places.geo.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com/v2/search-text?key=${process.env.NEXT_PUBLIC_AWS_LOCATION_API_KEY}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    QueryText: localFilters.location,
                    MaxResults: 1,
                    Language: "vi",
                    BiasPosition: [106.6297, 10.8231], // Ho Chi Minh City center
                    Filter: {
                        IncludeCountries: ["VNM"],
                    },
                }),
            }
        );

        if (!response.ok) {
            throw new Error(await response.text());
        }

        const data = await response.json();
        const place = data.ResultItems?.[0];

        if (place?.Position) {
            const [lng, lat] = place.Position;
            setLocalFilters((prev) => ({
                ...prev,
                location: localFilters.location,
                coordinates: [lng, lat],
            }));
        } else {
            setLocalFilters((prev) => ({
                ...prev,
                location: localFilters.location,
                coordinates: undefined,
            }));
        }
    } catch (error) {
        console.error("Error fetching location:", error);
    }
  }

  if (!isFiltersFullOpen) {
    return null;
  }
  
  return (
    <div className="bg-white rounded-lg px-4 h-full overflow-auto pb-10">
        <div className="flex flex-col space-y-6">
            {/* Location */}
            <div>
                <h4 className="font-bold mb-2">Vị trí</h4>
                <div className="flex items-center">
                    <Input 
                        placeholder="Nhập vị trí"
                        value={localFilters.location}
                        onChange={(e) => 
                            setLocalFilters((prev) => ({
                                ...prev,
                                location: e.target.value
                            }))
                        }
                        onKeyDown={(e) => e.key === 'Enter' && handleLocationSearch()}
                        className="rounded-l-xl rounded-r-none border-r-0"
                    />
                    <Button 
                        onClick={handleLocationSearch}
                        className="rounded-r-xl rounded-l-none border-l-none border-black shadow-none border hover:bg-primary-700 hover:text-primary-50"
                    >
                        <Search className="w-4 h-4"/>
                    </Button>
                </div>
            </div>

            {/* Property Type */}
            <div>
                <h4 className="font-bold mb-2">Loại dự án</h4>
                <div className="grid grid-cols-2 gap-4">
                    {Object.entries(PropertyTypeIcons).map(([type, Icon]) => (
                        <div
                            key={type}
                            className={cn(
                                "flex flex-col items-center justify-center p-4 border rounded-xl cursor-pointer",
                                localFilters.propertyType === type
                                    ? "border-black"
                                    : "border-gray-300"
                            )}
                            onClick={() => 
                                setLocalFilters((prev) => ({
                                    ...prev,
                                    propertyType: type as PropertyTypeEnum
                                }))
                            }
                            >
                                <Icon className="w-6 h-6 mb-2"/>
                                <span className="text-sm text-center">{PropertyTypeLabels[type as PropertyTypeEnum] || type}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Price Range */}
            <div>
                <h4 className="font-bold mb-2">Khoảng giá (VNĐ/tháng)</h4>
                <div className="flex gap-2 mb-3">
                  <div className="flex-1">
                    <Label className="text-xs text-gray-500 mb-1 block">Giá tối thiểu (VNĐ)</Label>
                    <Input
                      type="number"
                      placeholder="1,000,000"
                      value={localFilters.priceRange[0] ?? ''}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : null;
                        setLocalFilters((prev) => ({
                          ...prev,
                          priceRange: [val, prev.priceRange[1]] as [number, number],
                        }));
                      }}
                      className="rounded-xl text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-gray-500 mb-1 block">Giá tối đa (VNĐ)</Label>
                    <Input
                      type="number"
                      placeholder="5,000,000"
                      value={localFilters.priceRange[1] ?? ''}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : null;
                        setLocalFilters((prev) => ({
                          ...prev,
                          priceRange: [prev.priceRange[0], val] as [number, number],
                        }));
                      }}
                      className="rounded-xl text-sm"
                    />
                  </div>
                </div>
                <Slider
                    min={0}
                    max={50000000}
                    step={500000}
                    value={[
                        localFilters.priceRange[0] ?? 0,
                        localFilters.priceRange[1] ?? 50000000,
                    ]}
                    onValueChange={(value: any) => 
                        setLocalFilters((prev) => ({
                            ...prev,
                            priceRange: value as [number, number],
                        }))
                    } 
                />
                <div className="flex justify-between mt-2 text-xs text-gray-500 font-medium">
                    <span>{(localFilters.priceRange[0] ?? 0).toLocaleString('vi-VN')} VNĐ</span>
                    <span>{(localFilters.priceRange[1] ?? 50000000).toLocaleString('vi-VN')} VNĐ</span>
                </div>
            </div>

            {/* Beds and Baths */}
            <div className="flex gap-4">
                <div className="flex-1">
                    <Select
                        value={localFilters.beds || "any"}
                        onValueChange={(value) => 
                            setLocalFilters((prev) => ({ ...prev, beds: value || "" }))
                        }
                    >
                        <SelectTrigger className="w-full rounded-xl">
                            <SelectValue placeholder="Phòng ngủ" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="any">Tất cả phòng ngủ</SelectItem>
                            <SelectItem value="1">1+ phòng ngủ</SelectItem>
                            <SelectItem value="2">2+ phòng ngủ</SelectItem>
                            <SelectItem value="3">3+ phòng ngủ</SelectItem>
                            <SelectItem value="4">4+ phòng ngủ</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Square Feet */}
            <div>
                <h4 className="font-bold mb-2">Diện tích</h4>
                <Slider 
                    min={0}
                    max={10000}
                    step={100}
                    value={[
                        localFilters.squareFeet[0] ?? 0,
                        localFilters.squareFeet[1] ?? 10000,
                    ]}
                    onValueChange={(value) => 
                        setLocalFilters((prev) => ({
                            ...prev,
                            squareFeet: value as [number, number],
                        }))
                    }
                    className="[&>.bar]:bg-primary-700"
                />
                <div className="flex justify-between mt-2">
                    <span>{localFilters.squareFeet[0] ?? 0} sq ft</span>
                    <span>{localFilters.squareFeet[1] ?? 10000} sq ft</span>
                </div>
            </div>

            {/* Amenities */}
            <div>
                <h4 className="font-bold mb-2">Tiện ích</h4>
                <div className="flex flex-wrap gap-2">
                    {Object.entries(AmenityIcons).map(([amenity, Icon]) => (
                        <div 
                            key={amenity}
                            className={cn(
                                "flex items-center space-x-2 p-2 border rounded-lg hover:cursor-pointer",
                                localFilters.amenities.includes(amenity as AmenityEnum)
                                    ? "border-black"
                                    : "border-gray-200"     
                            )}
                            onClick={() => handleAmenityChange(amenity as AmenityEnum)}
                            >
                            <Icon className="w-5 h-5 hover:cursor-pointer" />
                            <Label className="hover:cursor-pointer">
                                {AmenityLabels[amenity as AmenityEnum] || amenity}
                            </Label>
                        </div>
                    ))}
                </div>
            </div>

            {/* Available From */}
            <div>
                <h4 className="font-bold mb-2">Có sẵn từ ngày</h4>
                <Input 
                    type="date"
                    value={
                        localFilters.availableFrom !== "any"
                            ? localFilters.availableFrom
                            : ""
                    }
                    onChange={(e) => 
                        setLocalFilters((prev) => ({
                            ...prev,
                            availableFrom: e.target.value ? e.target.value : "any",
                        }))
                    }
                    className="rounded-xl"
                    />
            </div>

            {/* Apply and Reset buttons */}
            <div className="flex gap-4 mt-6">
                <Button
                    onClick={handleSubmit}
                    className="flex-1 bg-primary-700 text-white rounded-xl">
                        Áp dụng
                </Button>
                <Button
                    onClick={handleReset}
                    className="flex-1 text-primary-700 border border-primary-700 rounded-xl">
                        Đặt lại
                </Button>
            </div>
        </div>
    </div>
  )
}

export default FiltersFull