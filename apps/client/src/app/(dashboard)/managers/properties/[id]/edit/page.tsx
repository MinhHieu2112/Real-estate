"use client";

import { CustomFormField } from '@/components/FormField';
import Header from '@/components/Header';
import Loading from '@/components/Loading';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { AmenityEnum, HighlightEnum, PropertyTypeEnum } from '@/lib/constants';
import { EditPropertyFormData, editPropertySchema } from '@/lib/schemas';
import {
  useGetAuthUserQuery,
  useGetPropertyQuery,
  useUpdatePropertyMutation,
} from '@/state/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';

const EditProperty = () => {
  const router = useRouter();
  const { id } = useParams();
  const propertyId = Number(id);

  const { data: property, isLoading: isPropertyLoading } =
    useGetPropertyQuery(propertyId);
  const [updateProperty, { isLoading: isUpdating }] =
    useUpdatePropertyMutation();
  const { data: authUser } = useGetAuthUserQuery();

  const form = useForm({
    resolver: zodResolver(editPropertySchema),
    defaultValues: {
      name: "",
      description: "",
      pricePerMonth: 1000,
      securityDeposit: 500,
      applicationFee: 100,
      isPetsAllowed: true,
      isParkingIncluded: true,
      photoUrls: [],
      amenities: [],
      highlights: [],
      beds: 1,
      baths: 1,
      squareFeet: 1000,
      address: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
    },
  });

  useEffect(() => {
    if (property) {
      form.reset({
        name: property.name || "",
        description: property.description || "",
        pricePerMonth: property.pricePerMonth || 0,
        securityDeposit: property.securityDeposit || 0,
        applicationFee: property.applicationFee || 0,
        isPetsAllowed: property.isPetsAllowed ?? true,
        isParkingIncluded: property.isParkingIncluded ?? true,
        photoUrls: [],
        amenities: (property.amenities as any) || [],
        highlights: (property.highlights as any) || [],
        beds: property.beds || 1,
        baths: property.baths || 1,
        squareFeet: property.squareFeet || 1000,
        propertyType: property.propertyType as unknown as PropertyTypeEnum,
        address: property.location?.address || "",
        city: property.location?.city || "",
        state: property.location?.state || "",
        country: property.location?.country || "",
        postalCode: property.location?.postalCode || "",
      });
    }
  }, [property, form]);

  if (isPropertyLoading) return <Loading />;

  const onSubmit = async (data: EditPropertyFormData) => {
    if (!authUser?.cognitoInfo?.userId) {
      throw new Error("No manager ID found");
    }

    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === "photoUrls") {
        const files = value as (File | string)[];
        files?.forEach((file) => {
          if (file instanceof File) {
            formData.append("files", file);
          }
        });
      } else if (Array.isArray(value)) {
        formData.append(key, value.join(","));
      } else if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    formData.append("managerCognitoId", authUser.cognitoInfo.userId);

    try {
      await updateProperty({ id: propertyId, formData }).unwrap();
      router.push(`/managers/properties/${propertyId}`);
    } catch (err) {
      console.error("Failed to update property:", err);
    }
  };

  return (
    <div className="dashboard-container">
      <Link
        href={`/managers/properties/${propertyId}`}
        className="flex items-center mb-4 text-gray-600 hover:text-primary-700"
        scroll={false}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        <span>Back to Property</span>
      </Link>

      <Header
        title={`Edit Property: ${property?.name || ""}`}
        subtitle="Update property listing information"
      />
      <div className="bg-white rounded-xl p-6 shadow-md mt-6">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="p-4 space-y-10"
          >
            {/* Basic Information*/}
            <div>
              <h2 className="text-lg font-semibold mb-4">
                Basic Information
              </h2>
              <div className="space-y-4">
                <CustomFormField name="name" label="Property Name" />
                <CustomFormField
                  name="description"
                  label="Description"
                  type="textarea"
                />
              </div>
            </div>

            <hr className="my-6 border-gray-200" />

            {/* Fees */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold mb-4">Fees</h2>
              <CustomFormField
                name="pricePerMonth"
                label="Price per Month"
                type="number"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CustomFormField
                  name="securityDeposit"
                  label="Security Deposit"
                  type="number"
                />
                <CustomFormField
                  name="applicationFee"
                  label="Application Fee"
                  type="number"
                />
              </div>
            </div>

            <hr className="my-6 border-gray-200" />

            {/* Property Details */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold mb-4">Property Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CustomFormField
                  name="beds"
                  label="Number of Beds"
                  type="number"
                />
                <CustomFormField
                  name="baths"
                  label="Number of Baths"
                  type="number"
                />
                <CustomFormField
                  name="squareFeet"
                  label="Square Feet"
                  type="number"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <CustomFormField
                  name="isPetsAllowed"
                  label="Pets Allowed"
                  type="switch"
                />
                <CustomFormField
                  name="isParkingIncluded"
                  label="Parking Included"
                  type="switch"
                />
              </div>
              <div className="mt-4">
                <CustomFormField
                  name="propertyType"
                  label="Property Type"
                  type="select"
                  options={Object.keys(PropertyTypeEnum).map((type) => ({
                    value: type,
                    label: type,
                  }))}
                />
              </div>
            </div>

            <hr className="my-6 border-gray-200" />

            {/* Amenities and Highlights */}
            <div>
              <h2 className="text-lg font-semibold mb-4">
                Amenities and Highlights
              </h2>
              <div className="space-y-6">
                <CustomFormField
                  name="amenities"
                  label="Amenities"
                  type="multi-select"
                  options={Object.keys(AmenityEnum).map((amenity) => ({
                    value: amenity,
                    label: amenity,
                  }))}
                />
                <CustomFormField
                  name="highlights"
                  label="Highlights"
                  type="multi-select"
                  options={Object.keys(HighlightEnum).map((highlight) => ({
                    value: highlight,
                    label: highlight,
                  }))}
                />
              </div>
            </div>

            <hr className="my-6 border-gray-200" />

            {/* Photos */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Add New Photos</h2>
              <CustomFormField
                name="photoUrls"
                label="Property Photos (Optional: upload to add more photos)"
                type="file"
                accept="image/*"
              />
            </div>

            <hr className="my-6 border-gray-200" />

            {/* Additional Information */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold mb-4">
                Additional Information
              </h2>
              <CustomFormField name="address" label="Address" />
              <div className="flex justify-between gap-4">
                <CustomFormField name="city" label="City" className="w-full" />
                <CustomFormField name="state" label="State" className="w-full" />
                <CustomFormField name="postalCode" label="Postal Code" className="w-full" />
              </div>
              <CustomFormField name="country" label="Country" />
            </div>

            <Button
              type="submit"
              disabled={isUpdating || form.formState.isSubmitting}
              className="bg-primary-700 hover:bg-primary-800 text-white w-full mt-8"
            >
              {isUpdating || form.formState.isSubmitting
                ? "Updating Property..."
                : "Save Changes"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default EditProperty;
