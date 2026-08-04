"use client";

import { CustomFormField } from '@/components/FormField';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { ApplicationFormData, applicationSchema } from '@/lib/schemas';
import { useCreateApplicationMutation, useGetAuthUserQuery } from '@/state/api'
import { zodResolver } from '@hookform/resolvers/zod';
import { ApplicationStatus } from '@shared/types';
import React from 'react'
import { useForm } from 'react-hook-form';

const ApplicationModal = ({
    isOpen,
    onClose,
    propertyId
}: ApplicationModalProps) => {
  const [createApplication, { isLoading: isSubmitting }] = useCreateApplicationMutation();
  const { data: authUser } = useGetAuthUserQuery();

  const defaultStartDate = new Date().toISOString().split("T")[0];
  const defaultEndDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split("T")[0];

  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
        name: authUser?.userInfo?.name || "",
        email: authUser?.userInfo?.email || "",
        phoneNumber: authUser?.userInfo?.phoneNumber || "",
        startDate: defaultStartDate,
        endDate: defaultEndDate,
        message: "",
    },
  });

  const onSubmit = async (data: ApplicationFormData) => {
    if (!authUser || authUser.userRole !== "tenant") {
        console.error(
            "You must be logged in as a tenant to apply for a property"
        );
        return;
    }

    await createApplication({
      ...data,
      applicationDate: new Date().toISOString(),
      startDate: new Date(data.startDate).toISOString(),
      endDate: new Date(data.endDate).toISOString(),
      status: ApplicationStatus.Pending,
      propertyId: propertyId,
      tenantCognitoId: authUser.cognitoInfo.userId,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={isSubmitting ? undefined : onClose}>
        <DialogContent className="bg-white">
            <DialogHeader className="mb-4 font-semibold text-center">
                <DialogTitle>Đơn đăng ký</DialogTitle>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    <CustomFormField 
                        name="name"
                        label="Họ và tên"
                        type="text"
                        placeholder="Nhập họ và tên"
                    />
                    <CustomFormField 
                        name="email"
                        label="Email"
                        type="email"
                        placeholder="Nhập địa chỉ email"
                    />
                    <CustomFormField 
                        name="phoneNumber"
                        label="Số điện thoại"
                        type="text"
                        placeholder="Nhập số điện thoại"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <CustomFormField 
                          name="startDate"
                          label="Ngày chuyển vào"
                          type="date"
                          placeholder="Chọn ngày bắt đầu"
                      />
                      <CustomFormField 
                          name="endDate"
                          label="Ngày kết thúc hợp đồng"
                          type="date"
                          placeholder="Chọn ngày kết thúc"
                      />
                    </div>
                    <CustomFormField 
                        name="message"
                        label="Lời nhắn (Không bắt buộc)"
                        type="textarea"
                        placeholder="Nhập thêm thông tin nếu có"
                    />
                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-primary-700 text-white w-full disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? "Đang gửi..." : "Gửi đơn đăng ký"}
                    </Button>
                </form>
            </Form>
        </DialogContent>
    </Dialog>
  )
}

export default ApplicationModal