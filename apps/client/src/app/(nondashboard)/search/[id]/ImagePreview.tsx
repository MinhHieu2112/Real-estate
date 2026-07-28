"use client";

import { ChevronLeft, ChevronRight, Grid2X2, X } from 'lucide-react';
import Image from 'next/image';
import React, { useState } from 'react';

interface ImagePreviewsProps {
  images: string[];
}

const ImagePreview = ({ images }: ImagePreviewsProps) => {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const displayImages =
    images && images.length > 0
      ? images
      : ["/singlelisting-2.jpg", "/singlelisting-3.jpg"];

  // Carousel navigation
  const prevSlide = () => {
    setActiveSlideIndex((prev) =>
      prev === 0 ? displayImages.length - 1 : prev - 1
    );
  };

  const nextSlide = () => {
    setActiveSlideIndex((prev) =>
      prev === displayImages.length - 1 ? 0 : prev + 1
    );
  };

  // Lightbox functions
  const openLightbox = (index: number = activeSlideIndex) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => setLightboxOpen(false);

  const prevLightboxImage = () =>
    setLightboxIndex((prev) =>
      prev === 0 ? displayImages.length - 1 : prev - 1
    );

  const nextLightboxImage = () =>
    setLightboxIndex((prev) =>
      prev === displayImages.length - 1 ? 0 : prev + 1
    );

  // Keyboard navigation in Lightbox
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') prevLightboxImage();
    if (e.key === 'ArrowRight') nextLightboxImage();
    if (e.key === 'Escape') closeLightbox();
  };

  return (
    <>
      {/* Slider Banner Section */}
      <div className="relative w-full h-[480px] md:h-[540px] bg-slate-900 overflow-hidden group select-none">
        {/* Main Sliding Image */}
        <div 
          className="relative w-full h-full cursor-pointer"
          onClick={() => openLightbox(activeSlideIndex)}
        >
          {displayImages.map((img, idx) => (
            <div
              key={idx}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                idx === activeSlideIndex ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
              }`}
            >
              <Image
                src={img}
                alt={`Property photo ${idx + 1}`}
                fill
                priority={idx === 0}
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />
            </div>
          ))}
        </div>

        {/* Navigation Arrows (Show on hover) */}
        {displayImages.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevSlide();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-black/70 text-white p-3 rounded-full backdrop-blur-md transition-all opacity-80 group-hover:opacity-100 hover:scale-110 shadow-lg"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                nextSlide();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-black/70 text-white p-3 rounded-full backdrop-blur-md transition-all opacity-80 group-hover:opacity-100 hover:scale-110 shadow-lg"
              aria-label="Next slide"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Counter Badge (Top Left) */}
        <div className="absolute top-4 left-6 z-20 bg-black/50 backdrop-blur-md text-white text-xs font-semibold px-3.5 py-1.5 rounded-full border border-white/10 shadow-sm">
          {activeSlideIndex + 1} / {displayImages.length}
        </div>

        {/* Thumbnail Selector Bar (Bottom Left) */}
        {displayImages.length > 1 && (
          <div className="absolute bottom-4 left-6 z-20 hidden md:flex items-center gap-2 bg-black/40 backdrop-blur-md p-1.5 rounded-xl border border-white/10 max-w-[65%] overflow-x-auto">
            {displayImages.map((img, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSlideIndex(i);
                }}
                className={`relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                  i === activeSlideIndex
                    ? 'border-white scale-105 opacity-100 shadow-md'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <Image src={img} alt={`Slide thumb ${i + 1}`} fill className="object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Floating "Show all X photos" Button (Bottom Right) */}
        {displayImages.length > 0 && (
          <button
            onClick={() => openLightbox(activeSlideIndex)}
            className="absolute bottom-4 right-6 z-20 bg-white/90 hover:bg-white text-gray-900 text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xl backdrop-blur-sm transition-all hover:scale-105 active:scale-95 border border-gray-100"
          >
            <Grid2X2 className="w-4 h-4 text-primary-700" />
            <span>Show all {displayImages.length} photos</span>
          </button>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center select-none"
          onKeyDown={handleKeyDown}
          tabIndex={0}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-5 right-5 text-white bg-white/10 hover:bg-white/20 rounded-full p-2.5 transition-all hover:rotate-90 z-20"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Counter */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 text-white text-sm font-medium bg-black/50 px-4 py-1.5 rounded-full border border-white/10 z-20">
            {lightboxIndex + 1} / {displayImages.length}
          </div>

          {/* Prev button */}
          {displayImages.length > 1 && (
            <button
              onClick={prevLightboxImage}
              className="absolute left-6 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 p-3.5 rounded-full text-white transition-all hover:scale-110 z-20"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-7 h-7" />
            </button>
          )}

          {/* Main Lightbox image */}
          <div className="relative w-full max-w-5xl mx-16 aspect-[16/9] max-h-[80vh]">
            <Image
              src={displayImages[lightboxIndex]}
              alt={`Property Image ${lightboxIndex + 1}`}
              fill
              className="object-contain"
              priority
            />
          </div>

          {/* Next button */}
          {displayImages.length > 1 && (
            <button
              onClick={nextLightboxImage}
              className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 p-3.5 rounded-full text-white transition-all hover:scale-110 z-20"
              aria-label="Next image"
            >
              <ChevronRight className="w-7 h-7" />
            </button>
          )}

          {/* Thumbnail strip in Lightbox */}
          {displayImages.length > 1 && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2.5 px-4 max-w-2xl overflow-x-auto bg-black/40 backdrop-blur-md p-2 rounded-2xl border border-white/10 z-20">
              {displayImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxIndex(i)}
                  className={`relative flex-shrink-0 w-16 h-11 rounded-lg overflow-hidden border-2 transition-all ${
                    i === lightboxIndex
                      ? 'border-white opacity-100 scale-105 shadow-md'
                      : 'border-transparent opacity-50 hover:opacity-80'
                  }`}
                >
                  <Image src={img} alt={`Thumbnail ${i + 1}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default ImagePreview;