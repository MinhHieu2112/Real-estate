"use client";

import React from 'react'
import Image from "next/image";
import { motion } from "framer-motion";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const HeroSection = () => {
  return (
    <div className="relative h-screen">
        <Image src="/landing-splash.jpg" 
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
                            Khám phá căn hộ cho thuê lý tưởng với công cụ tìm kiếm tiên tiến và gợi ý cá nhân hóa
                        </p>
                        <div className="flex justify-center">
                            <Input
                                type="text"
                                onChange={() => {}}
                                placeholder="Tìm kiếm theo thành phố, khu vực hoặc địa chỉ"
                                className="w-full max-w-lg rounded-none rounded-l-xl border-none bg-white h-12"
                            />
                            <Button
                                onClick={() => {}}
                                className="bg-secondary-500 text-white rounded-none rounded-r-xl border-none hover:bg-secondary-600 h-12">
                                Tìm kiếm
                            </Button>
                        </div>
                    </div>
            </motion.div>
        </div>
    </div>
  );
};

export default HeroSection;