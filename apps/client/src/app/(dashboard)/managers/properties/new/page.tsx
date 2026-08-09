"use client";

import { CustomFormField } from '@/components/FormField';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import {
  AmenityEnum,
  HighlightEnum,
  PropertyTypeEnum,
  PropertyTypeLabels,
  AmenityLabels,
  HighlightLabels,
  PropertyStatusEnum,
  PropertyStatusLabels,
} from '@shared/types';
import { PropertyFormData, propertySchema } from '@/lib/schemas';
import { useCreatePropertyMutation, useGetAuthUserQuery } from '@/state/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import React from 'react';
import { useForm } from 'react-hook-form';

const NewProperty = () => {
  const router = useRouter();
  const [createProperty, { isLoading: isCreating }] = useCreatePropertyMutation();
  const { data: authUser } = useGetAuthUserQuery();

  const form = useForm({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      name: "",
      description: "",
      pricePerMonth: 1,
      securityDeposit: 1,
      applicationFee: 1,
      isPetsAllowed: true,
      isParkingIncluded: true,
      propertyType: PropertyTypeEnum.Rooms,
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

  const onSubmit = async (data: PropertyFormData) => {
    if (!authUser?.cognitoInfo?.userId) {
      throw new Error("No manager ID found");
    }

    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === "photoUrls") {
        const files = value as File[];
        files?.forEach((file: File) => {
          formData.append("files", file);
        });
      } else if (Array.isArray(value)) {
        formData.append(key, value.join(","));
      } else if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    formData.append("managerCognitoId", authUser.cognitoInfo.userId);

    try {
      await createProperty(formData).unwrap();
      router.push(`/managers/properties`);
    } catch (err) {
      console.error("Failed to create property:", err);
    }
  };

  return (
    <div className="dashboard-container">
      <Header 
        title="Tên dự án"
        subtitle="Điền thông tin dự án của bạn vào form bên dưới"
      />
      <div className="bg-white rounded-xl p-6">
        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit(onSubmit)}
            className="p-4 space-y-10"
          >
            {/* Basic Information*/}
            <div>
              <h2 className="text-lg font-semibold mb-4">
                Thông tin cơ bản
              </h2>
              <div className="space-y-4">
                <CustomFormField name="name" label="Tên dự án"/>
                <CustomFormField 
                  name="description" 
                  label="Mô tả"
                  type="textarea"
                />
              </div>
            </div>

            <hr className="my-6 border-gray-200" />

            {/* Fees */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold mb-4">Chi phí</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CustomFormField 
                name="pricePerMonth"
                label="Phí trong tháng"
                type="number"
                />
                <CustomFormField 
                  name="securityDeposit"
                  label="Phí đặt cọc"
                  type="number"
                />
                <CustomFormField 
                  name="applicationFee"
                  label="Phí đăng ký"
                  type="number"
                />
              </div>
            </div>

            <hr className="my-6 border-gray-200" />

            {/* Property Details */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold mb-4">Thông tin dự án</h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
                <CustomFormField 
                  name="beds"
                  label="Số lượng phòng ngủ"
                  type="number"
                />
                <CustomFormField 
                  name="baths"
                  label="Số lượng phòng tắm"
                  type="number"
                />
                <CustomFormField 
                  name="squareFeet"
                  label="Diện tích (m²)"
                  type="number"
                />
                <CustomFormField 
                  name="propertyType"
                  label="Loại dự án"
                  type="select"
                  options={Object.values(PropertyTypeEnum).map((type) => ({
                    value: type,
                    label: PropertyTypeLabels[type],
                  }))}
                />
                <CustomFormField 
                  name="status"
                  label="Tình trạng"
                  type="select"
                  options={Object.values(PropertyStatusEnum).map((status) => ({
                    value: status,
                    label: PropertyStatusLabels[status],
                  }))}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <CustomFormField 
                  name="isPetsAllowed"
                  label="Cho phép giữ thú cưng"
                  type="switch"
                />
                <CustomFormField 
                  name="isParkingIncluded"
                  label="Bao gồm chỗ đậu xe"
                  type="switch"
                />
              </div>
            </div>

            <hr className="my-6 border-gray-200" />

            {/* Amenities and Highlights */}
            <div>
              <h2 className="text-lg font-semibold mb-4">
                Tiện ích
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CustomFormField 
                  name="amenities"
                  label="Dịch vụ"
                  type="multi-select"
                  options={Object.values(AmenityEnum).map((amenity) => ({
                    value: amenity,
                    label: AmenityLabels[amenity],
                  }))}
                />
                <CustomFormField 
                  name="highlights"
                  label="Điểm nổi bật"
                  type="multi-select"
                  options={Object.values(HighlightEnum).map((highlight) => ({
                    value: highlight,
                    label: HighlightLabels[highlight],
                  }))}
                />
              </div>
            </div>

            <hr className="my-6 border-gray-200" />

            {/* Photos */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Hình ảnh</h2>
                <CustomFormField 
                name="photoUrls"
                label="Tải lên hình ảnh"
                type="file"
                accept="image/*"
                />
            </div>

            <hr className="my-6 border-gray-200" />

            {/* Additional Information */}
            <div className="space-y-5">
              <h2 className="text-lg font-semibold">
                Thông tin bổ sung
              </h2>

              {/* Address */}
              <CustomFormField
                name="address"
                label="Địa chỉ"
                placeholder="123 Nguyễn Huệ"
              />

              {/* City + State */}
              <div className="grid grid-cols-2 gap-4">
                <CustomFormField
                  name="city"
                  label="Thành phố"
                />
                <CustomFormField
                  name="state"
                  label="Phường / Xã"
                />
              </div>

              {/* Postal Code + Country */}
              <div className="grid grid-cols-2 gap-4">
                <CustomFormField
                  name="postalCode"
                  label="Mã bưu điện"
                />
                <CustomFormField
                  name="country"
                  label="Quốc gia"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isCreating || form.formState.isSubmitting}
              className="bg-primary-700 text-white w-full mt-8"
            >
              {isCreating || form.formState.isSubmitting ? "Creating Property..." : "Create Property"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default NewProperty;
