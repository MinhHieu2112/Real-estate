"use client";

import { useGetAuthUserQuery, useGetPropertyQuery } from '@/state/api';
import { useParams } from 'next/navigation';
import React, { useState } from 'react'
import ImagePreview from './ImagePreview';
import PropertyOverview from './PropertyOverview';
import PropertyDetails from './PropertyDetails';
import PropertyLocation from './PropertyLocation';
import ContactWidget from './ContactWidget';
import ApplicationModal from './ApplicationModal';

const SingleListing = () => {
  const { id } = useParams();
  const propertyId = Number(id);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: authuser } = useGetAuthUserQuery();
  const { data: property } = useGetPropertyQuery(propertyId);

  return (
    <div>
        <div className="relative">
            <ImagePreview 
                images={property?.photoUrls || []}
            />
        </div>
        <div className="flex flex-col md:flex-row justify-center gap-10 mx-10 md:w-2/3 md:mx-auto mt-16 mb-8">
            <div className="order-2 md:order-1">
                <PropertyOverview propertyId={propertyId} />
                <PropertyDetails propertyId={propertyId} />
                <PropertyLocation propertyId={propertyId} />
            </div>

            <div className="order-1 md:order-2">
                <ContactWidget onOpenModal={() => setIsModalOpen(true)} />
            </div>
        </div>

        {authuser && (
            <ApplicationModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                propertyId={propertyId} 
            />
        )}
    </div>
  )
}

export default SingleListing