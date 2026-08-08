"use client";

import Header from "@/components/Header";
import Loading from "@/components/Loading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useGetPaymentsQuery,
  useGetPropertyLeasesQuery,
  useGetPropertyQuery,
} from "@/state/api";
import { ArrowDownToLine, ArrowLeft, Check, Download, Edit } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import React from "react";

const PropertyTenants = () => {
  const { id } = useParams();
  const propertyId = Number(id);

  const { data: property, isLoading: propertyLoading } =
    useGetPropertyQuery(propertyId);
  const { data: leases, isLoading: leasesLoading } =
    useGetPropertyLeasesQuery(propertyId);
  const { data: payments, isLoading: paymentsLoading } =
    useGetPaymentsQuery(propertyId);

  if (propertyLoading || leasesLoading || paymentsLoading) return <Loading />;

  const getCurrentMonthPaymentStatus = (leaseId: number) => {
    const currentDate = new Date();
    const currentMonthPayment = payments?.find(
      (payment) =>
        payment.leaseId === leaseId &&
        new Date(payment.dueDate).getMonth() === currentDate.getMonth() &&
        new Date(payment.dueDate).getFullYear() === currentDate.getFullYear()
    );
    return currentMonthPayment?.paymentStatus || "Not Paid";
  };

  return (
    <div className="dashboard-container">
      {/* Back to properties page */}
      <Link
        href="/managers/properties"
        className="flex items-center mb-4 hover:text-primary-500"
        scroll={false}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        <span>Trở lại</span>
      </Link>

      <div className="flex justify-between items-center mb-6">
        <Header
          title={property?.name || "Dự án"}
          subtitle="Xem và quản lý thông tin dự án"
        />
        <Link
          href={`/managers/properties/${propertyId}/edit`}
          className="bg-primary-700 hover:bg-primary-800 text-white font-semibold py-2.5 px-5 rounded-lg flex items-center shadow transition-all"
        >
          <Edit className="w-4 h-4 mr-2" />
          <span>Chỉnh sửa</span>
        </Link>
      </div>

      <div className="w-full space-y-6">
        <div className="mt-8 bg-white rounded-xl shadow-md overflow-hidden p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold mb-1">Khách thuê</h2>
              <p className="text-sm text-gray-500">
                Xem và quản lý thông tin về các khách thuê hiện tại của dự án này
              </p>
            </div>
            <div>
              <button
                className={`bg-white border border-gray-300 text-gray-700 py-2
              px-4 rounded-md flex items-center justify-center hover:bg-primary-700 hover:text-primary-50`}
              >
                <Download className="w-5 h-5 mr-2" />
                <span>Tải về</span>
              </button>
            </div>
          </div>
          <hr className="mt-4 mb-1" />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Khách hàng</TableHead>
                  <TableHead className="w-[200px]">Thời gian thuê</TableHead>
                  <TableHead className="w-[200px]">Chi phí</TableHead>
                  <TableHead className="w-[200px]">Trạng thái</TableHead>
                  <TableHead className="w-[200px]">Liên hệ</TableHead>
                  <TableHead className="w-[100px]">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leases?.map((lease) => (
                  <TableRow key={lease.id} className="h-24">
                    {/* Khách hàng */}
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Image
                          src="/landing-i1.png"
                          alt={lease.tenant?.name || "Null"}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                        <div>
                          <div className="font-semibold">
                            {lease.tenant?.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {lease.tenant?.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Thời gian thuê */}
                    <TableCell>
                        {new Date(lease.startDate).toLocaleDateString("vi-VN")} - {new Date(lease.endDate).toLocaleDateString("vi-VN")}
                    </TableCell>

                    {/* Chi phí */}
                    <TableCell>
                      {lease.rent.toLocaleString("vi-VN")}
                    </TableCell>

                    {/* Trạng thái */}
                    <TableCell>
                      <span
                        className={`${
                          lease.status === "Active"
                            ? "bg-green-500"
                            : "bg-red-500"
                        } w-fit text-white px-3 py-1 rounded-full text-xs font-semibold`}
                      >
                        {lease.status}
                      </span>
                    </TableCell>

                    {/* Liên hệ */}
                    <TableCell>
                      {lease.tenant?.phoneNumber}
                    </TableCell>

                    {/* Hành động */}
                    <TableCell>
                      <button
                        className={`border border-gray-300 text-gray-700 py-2 px-4 rounded-md flex 
                      items-center justify-center font-semibold hover:bg-primary-700 hover:text-primary-50`}
                      >
                        <ArrowDownToLine className="w-4 h-4 mr-1" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyTenants;