"use client";

import { CustomFormField } from '@/components/FormField';
import Header from '@/components/Header';
import Loading from '@/components/Loading';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import {
  AmenityEnum,
  HighlightEnum,
  PropertyTypeEnum,
  PropertyTypeLabels,
  AmenityLabels,
  HighlightLabels,
  PropertyStatusLabels,
  PropertyStatusEnum,
} from '@shared/types';
import {
  editPropertySchema,
} from '@/lib/schemas';
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
  const params = useParams();
  const id = Number(params.id);
  const router = useRouter();

  const { data: user } = useGetAuthUserQuery();
  const { data: property, isLoading: isPropertyLoading } =
    useGetPropertyQuery(id);
  const [updateProperty, { isLoading: isUpdating }] =
    useUpdatePropertyMutation();

  const form = useForm({
    resolver: zodResolver(editPropertySchema),
    defaultValues: {
      name: '',
      description: '',
      status: 'Available',
      pricePerDay: 0,
      securityDeposit: 0,
      applicationFee: 0,
      isPetsAllowed: false,
      isParkingIncluded: false,
      beds: 1,
      baths: 1,
      squareFeet: 0,
      propertyType: PropertyTypeEnum.Rooms,
      amenities: [],
      highlights: [],
      address: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
    },
  });

  useEffect(() => {
    if (property) {
      form.reset({
        name: property.name || '',
        description: property.description || '',
        pricePerDay: property.pricePerDay || 0,
        securityDeposit: property.securityDeposit || 0,
        applicationFee: property.applicationFee || 0,
        isPetsAllowed: property.isPetsAllowed ?? false,
        isParkingIncluded: property.isParkingIncluded ?? false,
        beds: property.beds || 1,
        baths: property.baths || 1,
        squareFeet: property.squareFeet || 0,
        propertyType: (property.propertyType as PropertyTypeEnum) || PropertyTypeEnum.Rooms,
        amenities: (property.amenities as AmenityEnum[]) || [],
        highlights: (property.highlights as HighlightEnum[]) || [],
        address: property.location?.address || '',
        city: property.location?.city || '',
        state: property.location?.state || '',
        country: property.location?.country || '',
        postalCode: property.location?.postalCode || '',
      });
    }
  }, [property, form]);

  const onSubmit = async (data: any) => {
    if (!user?.cognitoInfo?.userId) return;

    try {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('description', data.description);
      formData.append('status', data.status);
      formData.append('applicationFee', data.applicationFee.toString());
      formData.append('pricePerDay', data.pricePerDay.toString());
      formData.append('securityDeposit', data.securityDeposit.toString());
      formData.append('isPetsAllowed', data.isPetsAllowed.toString());
      formData.append('isParkingIncluded', data.isParkingIncluded.toString());
      formData.append('beds', data.beds.toString());
      formData.append('baths', data.baths.toString());
      formData.append('squareFeet', data.squareFeet.toString());
      formData.append('propertyType', data.propertyType);
      formData.append('address', data.address);
      formData.append('city', data.city);
      formData.append('state', data.state);
      formData.append('country', data.country);
      formData.append('postalCode', data.postalCode);

      formData.append('amenities', JSON.stringify(data.amenities));
      formData.append('highlights', JSON.stringify(data.highlights));

      if (data.photoUrls && data.photoUrls.length > 0) {
        Array.from(data.photoUrls).forEach((file: any) => {
          formData.append('files', file);
        });
      }

      await updateProperty({ id, formData }).unwrap();
      router.push(`/managers/properties`);
    } catch (error) {
      console.error('Failed to update property:', error);
    }
  };

  if (isPropertyLoading) return <Loading />;

  return (
    <div className="dashboard-container">
      <Link
        href="/managers/properties"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        scroll={false}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        <span>Trở lại</span>
      </Link>

      <Header
        title={`${PropertyTypeLabels[property?.propertyType as PropertyTypeEnum] || property?.propertyType || ''} ${property?.name || ''}`}
        subtitle="Chỉnh sửa thông tin chi tiết"
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
                Thông tin cơ bản
              </h2>
              <div className="space-y-4">
                <CustomFormField name="name" label="Tên dự án" />
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
                  name="securityDeposit"
                  label="Phí đặt cọc"
                  type="number"
                />
                <CustomFormField
                  name="applicationFee"
                  label="Phí đăng ký"
                  type="number"
                />
                <CustomFormField
                  name="pricePerDay"
                  label="Phí qua đêm"
                  type="number"
                />
              </div>
            </div>

            <hr className="my-6 border-gray-200" />

            {/* Property Details */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold mb-4">Chi tiết dự án</h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
                <CustomFormField
                  name="beds"
                  label="Số lượng giường"
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
                  label="Cho phép thú cưng"
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
              <h2 className="text-lg font-semibold mb-4">Thêm ảnh mới</h2>
              <CustomFormField
                name="photoUrls"
                label="Ảnh dự án (Tùy chọn: tải lên để thêm ảnh)"
                type="file"
                accept="image/*"
              />
            </div>

            <hr className="my-6 border-gray-200" />

            {/* Additional Information */}
            <div className="space-y-5">
              <h2 className="text-lg font-semibold">
                Thông tin địa chỉ
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
              disabled={isUpdating || form.formState.isSubmitting}
              className="bg-primary-700 hover:bg-primary-800 text-white w-full mt-8"
            >
              {isUpdating || form.formState.isSubmitting
                ? "Đang lưu..."
                : "Lưu thay đổi"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default EditProperty;
