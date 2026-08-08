"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/state/redux";
import { setFilters } from "@/state";
import { useAutocompleteAddressQuery } from "@/state/api";
import { useDebounce } from "@/hooks/useDebounce";
import { usePlaceSearch } from "@/hooks/usePlaceSearch";
import { MapPin, Search } from "lucide-react";

const HeroSection = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [searchInput, setSearchInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const debouncedSearchInput = useDebounce(searchInput, 500);
  const { searchPlace } = usePlaceSearch();

  const { data: suggestions = [] } = useAutocompleteAddressQuery(
    debouncedSearchInput,
    { skip: searchInput.trim().length < 2 }
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = async (queryText: string) => {
    if (!queryText.trim()) return;
    setShowSuggestions(false);

    const result = await searchPlace(queryText);

    const params = new URLSearchParams();
    params.set("location", queryText);

    if (result?.position) {
      params.set("coordinates", result.position.join(","));
      dispatch(
        setFilters({
          location: queryText,
          coordinates: result.position as [number, number],
        })
      );
    } else {
      dispatch(setFilters({ location: queryText }));
    }

    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="relative h-screen">
      <Image
        src="/landing-splash.jpg"
        alt="Rentiful Rental Platform Hero Section"
        fill
        className="object-cover object-center"
        priority
      />
      <div className="absolute inset-0 bg-black bg-opacity-60">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute top-1/3 transform -translate-x-1/2 -translate-y-1/2 text-center w-full"
        >
          <div className="max-w-4xl mx-auto px-16 sm:px-12">
            <h1 className="text-5xl font-bold text-white mb-4">
              Bắt đầu hành trình tìm kiếm căn hộ thuê hoàn hảo của bạn
            </h1>
            <p className="text-xl text-white mb-8">
              Khám phá căn hộ cho thuê lý tưởng với công cụ tìm kiếm tiên tiến
              và gợi ý cá nhân hóa
            </p>

            {/* Search Box */}
            <div className="flex justify-center">
              <div
                ref={dropdownRef}
                className="relative flex items-center w-full max-w-lg"
              >
                <div className="relative flex items-center w-full">
                  <Input
                    type="text"
                    placeholder="Tìm kiếm theo thành phố, khu vực hoặc địa chỉ"
                    value={searchInput}
                    onChange={(e) => {
                      setSearchInput(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSearch(searchInput);
                      }
                    }}
                    className="w-full rounded-none rounded-l-xl border-none bg-white h-12 text-gray-900 focus-visible:ring-0 text-base"
                  />
                  <Button
                    onClick={() => handleSearch(searchInput)}
                    className="bg-secondary-500 text-white rounded-none rounded-r-xl border-none hover:bg-secondary-600 h-12 px-6 text-base font-semibold"
                  >
                    <Search className="w-5 h-5 mr-1 sm:mr-2" />
                    <span>Tìm kiếm</span>
                  </Button>
                </div>

                {/* Autocomplete Dropdown Suggestions */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden text-left">
                    {suggestions.map((item, idx) => (
                      <div
                        key={item.placeId || idx}
                        onClick={() => {
                          setSearchInput(item.label);
                          handleSearch(item.label);
                        }}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 cursor-pointer border-b last:border-b-0 border-gray-100 transition-colors"
                      >
                        <MapPin className="w-4 h-4 text-primary-500 shrink-0" />
                        <span className="truncate font-medium">{item.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default HeroSection;