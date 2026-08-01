"use client";

import Loading from '@/components/Loading';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useGetAuthUserQuery, useGetLeasesQuery, useGetPaymentsQuery, useGetPropertyQuery } from '@/state/api';
import { Lease, Payment, Property } from '@shared/types';
import { ArrowDownToLineIcon, Check, CreditCard, Download, Edit, FileText, Mail, MapPin, User } from 'lucide-react'
import Image from 'next/image';
import { useParams } from 'next/navigation';
import React from 'react'

const PaymentMethod = () => {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden p-6 mt-10 md:mt-0 flex-1 flex flex-col justify-between">
      <div>
        <h2 className="text-2xl font-bold mb-1">Phương thức thanh toán</h2>
        <p className="text-sm text-gray-500 mb-6">Thay đổi cách bạn thanh toán cho gói dịch vụ.</p>
        
        {/* Card Info */}
        <div className="flex gap-6 items-center">
          <div className="w-32 h-20 bg-blue-600 flex items-center justify-center rounded-xl shadow-sm text-white font-bold text-xl tracking-wider">
            VISA
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-semibold">VISA</h3>
              <span className="text-xs font-medium border border-primary-700 text-primary-700 px-2.5 py-0.5 rounded-full">
                Default
              </span>
            </div>
            <div className="text-sm text-gray-500 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4" />
              <span>Ngày hết hạn: 12/2026</span>
            </div>
            <div className="text-sm text-gray-500 flex items-center gap-1.5">
              <Mail className="w-4 h-4" />
              <span>billing@baseclup.com</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <hr className="my-4 border-gray-200" />
        <div className="flex justify-end">
          <button className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md flex items-center justify-center hover:bg-primary-700 hover:text-white transition-colors text-sm font-medium">
            <Edit className="w-4 h-4 mr-2" />
            <span>Thay đổi</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const ResidenceCard = ({
  property,
  currentLease,
}: {
  property: Property;
  currentLease: Lease;
}) => {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden p-6 flex-1 flex flex-col justify-between">
      {/* Header */}
      <div className="flex gap-5">
        {property.photoUrls?.[0] ? (
          <Image
            src={property.photoUrls[0]}
            alt={property.name}
            width={256}
            height={144}
            className="w-64 h-36 object-cover rounded-xl shrink-0"
          />
        ) : (
          <div className="w-64 h-36 bg-slate-200 rounded-xl flex items-center justify-center text-gray-400 font-medium shrink-0">
            No Image
          </div>
        )}

        <div className="flex flex-col justify-between py-1">
          <div>
            <div className="bg-green-500 w-fit text-white px-3 py-1 rounded-full text-xs font-semibold mb-2">
              Hoạt động
            </div>

            <h2 className="text-2xl font-bold my-1">{property.name}</h2>
            <div className="flex items-center text-gray-600 text-sm mb-2">
              <MapPin className="w-4 h-4 mr-1 shrink-0" />
              <span>
                {property.location?.address ? `${property.location.address}, ` : ''}
                {property.location?.city}, {property.location?.country}
              </span>
            </div>
          </div>
          <div className="text-xl font-bold text-primary-700">
            {currentLease.rent?.toLocaleString("vi-VN")}{" "}
            <span className="text-gray-500 text-sm font-normal">VNĐ / tháng</span>
          </div>
        </div>
      </div>

      {/* Dates & Action Buttons */}
      <div className="mt-6">
        <hr className="my-4 border-gray-200" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Ngày bắt đầu:</span>
            <span className="font-semibold text-gray-800">
              {new Date(currentLease.startDate).toLocaleDateString('vi-VN')}
            </span>
          </div>
          <div className="hidden sm:block border-l border-gray-300 h-4" />
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Ngày kết thúc:</span>
            <span className="font-semibold text-gray-800">
              {new Date(currentLease.endDate).toLocaleDateString('vi-VN')}
            </span>
          </div>
        </div>

        <hr className="my-4 border-gray-200" />

        {/* Buttons */}
        <div className="flex justify-end gap-3 w-full">
          <button className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md flex items-center justify-center hover:bg-primary-700 hover:text-white transition-colors text-sm font-medium">
            <User className="w-4 h-4 mr-2" />
            Liên hệ
          </button>
        </div>
      </div>
    </div>
  );
};

const BillingHistory = ({ payments }: { payments: Payment[] }) => {
  return (
    <div className="mt-8 bg-white rounded-xl shadow-md overflow-hidden p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold mb-1">Lịch sử thanh toán</h2>
          <p className="text-sm text-gray-500">
            Xem tất cả các hóa đơn và thanh toán trước đây của bạn.
          </p>
        </div>
        {/* <div>
          <button className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md flex items-center justify-center hover:bg-primary-700 hover:text-primary-50">
            <Download className="w-5 h-5 mr-2" />
            <span>Xuất file</span>
          </button>
        </div> */}
      </div>
      <hr className="mt-4 mb-1" />
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hóa đơn</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ngày thanh toán</TableHead>
              <TableHead>Số tiền</TableHead>
              <TableHead>Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id} className="h-16">
                <TableCell className="font-medium">
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    Hóa đơn #{payment.id} -{" "}
                    {new Date(payment.paymentDate).toLocaleString("default", {
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold border ${
                      payment.paymentStatus === "Paid"
                        ? "bg-green-100 text-green-800 border-green-300"
                        : "bg-yellow-100 text-yellow-800 border-yellow-300"
                    }`}
                  >
                    {payment.paymentStatus === "Paid" ? (
                      <Check className="w-4 h-4 inline-block mr-1" />
                    ) : null}
                    {payment.paymentStatus}
                  </span>
                </TableCell>
                <TableCell>
                  {new Date(payment.paymentDate).toLocaleDateString()}
                </TableCell>
                <TableCell>${payment.amountPaid.toFixed(2)}</TableCell>
                <TableCell>
                  <button className="border border-gray-300 text-gray-700 py-2 px-4 rounded-md flex items-center justify-center font-semibold hover:bg-primary-700 hover:text-primary-50">
                    <ArrowDownToLineIcon className="w-4 h-4 mr-1" />
                    Download
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

const Residence = () => {
  const { id } = useParams();
  const { data: authUser } = useGetAuthUserQuery();
  const {
    data: property,
    isLoading: propertyLoading,
    error: propertyError,
  } = useGetPropertyQuery(Number(id));

  const { data: leases, isLoading: leasesLoading } = useGetLeasesQuery(
    parseInt(authUser?.cognitoInfo?.userId || "0"),
    { skip: !authUser?.cognitoInfo?.userId }
  );
  const { data: payments, isLoading: paymentsLoading } = useGetPaymentsQuery(
    leases?.[0]?.id || 0,
    { skip: !leases?.[0]?.id }
  );

  if (propertyLoading || leasesLoading || paymentsLoading) return <Loading />;
  if (!property || propertyError) return <div>Không tìm thấy kết quả</div>;

  const currentLease = leases?.find(
    (lease) => lease.propertyId === property.id
  );

  return (
    <div className="dashboard-container">
      <div className="w-full mx-auto">
        <div className="md:flex gap-10">
          {currentLease && (
            <ResidenceCard property={property} currentLease={currentLease} />
          )}
          <PaymentMethod />
        </div>
        <BillingHistory payments={payments || []} />
      </div>
    </div>
  );
};

export default Residence;