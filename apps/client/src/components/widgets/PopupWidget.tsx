import { X } from 'lucide-react';
import React, { useEffect, useRef } from 'react'

interface PopupWidgetProps {
    open: boolean;
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    width?: string;
}

const PopupWidget = ({
    open,
    title,
    onClose,
    children,
    width = "w-[400px]",
}: PopupWidgetProps) => {
  const popupRef = useRef<HTMLDivElement>(null)

  // Close popup
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
        if (
            popupRef.current &&
            !popupRef.current.contains(event.target as Node)
        ) {
            onClose();
        }
    }

    if (open) {
        document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div 
        ref={popupRef}
        className={`absolute right-0 top-12 ${width} h-[460px] rounded-xl border bg-white shadow-2xl flex flex-col overflow-hidden z-50`}>
            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-3">
                <h2 className="font-medium text-lg text-primary-500">{title}</h2>
                <button
                    onClick={onClose}
                    className="rounded-full p-1 hover:bg-gray-100">
                        <X className="text-gray-700 h-5 w-5" />
                </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
                {children}
            </div>
        </div>
  )
}

export default PopupWidget