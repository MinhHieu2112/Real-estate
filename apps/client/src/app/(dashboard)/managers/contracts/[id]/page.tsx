"use client";

import Header from "@/components/Header";
import {
  useGetLeaseDetailQuery,
  useSendContractMutation,
  useSignManagerContractMutation,
  useUpdateLeaseContentMutation,
} from "@/state/api";
import { Lease, LeaseStatus } from "@shared/types";
import {
  ArrowLeft,
  Building,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Lock,
  Mail,
  MapPin,
  PenLine,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  User,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useRef, useState } from "react";

// ─────────────────────────────────────────────
// Signature Canvas (Manager)
// ─────────────────────────────────────────────
const SignatureCanvas = ({
  onSigned,
}: {
  onSigned: (base64: string | null) => void;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  const getPos = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1e3a8a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    setHasSigned(true);
  };

  const endDraw = () => {
    setIsDrawing(false);
    if (hasSigned && canvasRef.current) {
      onSigned(canvasRef.current.toDataURL("image/png"));
    }
  };

  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
    onSigned(null);
  };

  return (
    <div className="space-y-2">
      <div className="relative border-2 border-dashed border-primary-300 rounded-xl overflow-hidden bg-primary-50/30">
        <canvas
          ref={canvasRef}
          width={600}
          height={150}
          className="w-full cursor-crosshair touch-none"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {!hasSigned && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-gray-400 flex items-center gap-2">
              <PenLine className="w-4 h-4" /> Ký tên vào đây
            </p>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={clear}
        className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1 transition-colors"
      >
        <RefreshCw className="w-3 h-3" /> Vẽ lại chữ ký
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────
// Contract Form
// ─────────────────────────────────────────────
interface ContractFormProps {
  lease: Lease;
  leaseId: number;
}

const ContractForm = ({ lease, leaseId }: ContractFormProps) => {
  const [updateLeaseContent, { isLoading: isUpdating }] =
    useUpdateLeaseContentMutation();
  const [sendContract, { isLoading: isSending }] = useSendContractMutation();
  const [signManagerContract, { isLoading: isSigning }] =
    useSignManagerContractMutation();

  const [startDate, setStartDate] = useState(
    lease.startDate
      ? new Date(lease.startDate).toISOString().split("T")[0]
      : ""
  );
  const [endDate, setEndDate] = useState(
    lease.endDate ? new Date(lease.endDate).toISOString().split("T")[0] : ""
  );
  const [rent, setRent] = useState(lease.rent || 0);
  const [deposit, setDeposit] = useState(lease.deposit || 0);
  const [signatureBase64, setSignatureBase64] = useState<string | null>(null);
  const [showSignPad, setShowSignPad] = useState(false);

  const isEditable = lease.status === LeaseStatus.Draft;
  const alreadyManagerSigned = !!lease.managerSignedAt;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateLeaseContent({
        id: leaseId,
        startDate,
        endDate,
        rent,
        deposit,
      }).unwrap();
    } catch (err) {
      console.error("Cập nhật thất bại", err);
    }
  };

  const handleManagerSign = async () => {
    try {
      await signManagerContract({
        id: leaseId,
        signatureBase64: signatureBase64 ?? undefined,
      }).unwrap();
      setShowSignPad(false);
    } catch (err) {
      console.error("Ký hợp đồng thất bại", err);
    }
  };

  const handleSend = async () => {
    try {
      await sendContract(leaseId).unwrap();
    } catch (err) {
      console.error("Gửi hợp đồng thất bại", err);
    }
  };

  return (
    <div className="space-y-5">
      {/* ── Contract Clauses Editor ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between border-b pb-4 mb-6">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-600" /> Điều khoản hợp đồng
          </h2>
          {isEditable ? (
            <span className="text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Có thể chỉnh sửa (DRAFT)
            </span>
          ) : (
            <span className="text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md font-medium flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" /> Đã khóa chỉnh sửa
            </span>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">
                Ngày bắt đầu thuê
              </label>
              <input
                type="date"
                disabled={!isEditable}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">
                Ngày kết thúc thuê
              </label>
              <input
                type="date"
                disabled={!isEditable}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">
                Tiền thuê (VNĐ)
              </label>
              <input
                type="number"
                disabled={!isEditable}
                value={rent}
                onChange={(e) => setRent(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-600 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">
                Tiền cọc an toàn (VNĐ)
              </label>
              <input
                type="number"
                disabled={!isEditable}
                value={deposit}
                onChange={(e) => setDeposit(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-600 font-semibold"
              />
            </div>
          </div>

          {isEditable && (
            <div className="pt-4 flex items-center justify-end border-t">
              <button
                type="submit"
                disabled={isUpdating}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" /> Lưu thay đổi
              </button>
            </div>
          )}
        </form>
      </div>

      {/* ── Manager Signature Section ── */}
      {isEditable && (
        <div
          className={`border rounded-2xl p-6 shadow-sm transition-colors ${
            alreadyManagerSigned
              ? "bg-emerald-50 border-emerald-200"
              : "bg-white border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <PenLine className="w-5 h-5 text-primary-600" />
              Chữ ký Quản lý
            </h3>
            {alreadyManagerSigned && (
              <span className="text-xs text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Đã ký
              </span>
            )}
          </div>

          {alreadyManagerSigned ? (
            <div className="space-y-3">
              <p className="text-sm text-emerald-800">
                ✓ Bạn đã ký hợp đồng này lúc{" "}
                <strong>
                  {new Date(lease.managerSignedAt!).toLocaleString("vi-VN")}
                </strong>
                . Giờ bạn có thể gửi cho Tenant.
              </p>
              <button
                type="button"
                onClick={() => setShowSignPad(!showSignPad)}
                className="text-xs text-gray-500 hover:text-primary-600 underline transition-colors"
              >
                Ký lại
              </button>
              {showSignPad && (
                <div className="pt-3 space-y-3 border-t border-emerald-200">
                  <SignatureCanvas onSigned={setSignatureBase64} />
                  <button
                    type="button"
                    onClick={handleManagerSign}
                    disabled={isSigning}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    <PenLine className="w-4 h-4" />
                    {isSigning ? "Đang xử lý..." : "Xác nhận ký lại"}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleSend}
                disabled={isSending}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                <Send className="w-4 h-4" />
                {isSending ? "Đang gửi..." : "Gửi hợp đồng cho Tenant"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Vui lòng xem lại điều khoản và ký tên vào bên dưới trước khi gửi hợp đồng cho Tenant.
              </p>
              <SignatureCanvas onSigned={setSignatureBase64} />
              <button
                type="button"
                onClick={handleManagerSign}
                disabled={isSigning}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                <PenLine className="w-4 h-4" />
                {isSigning ? "Đang xử lý..." : "Xác nhận ký hợp đồng"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pending_signature: chỉ hiện trạng thái */}
      {lease.status === LeaseStatus.Pending_signature && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="text-sm text-amber-800 flex items-center gap-2 font-medium">
            <Clock className="w-4 h-4" />
            Đã gửi hợp đồng – đang chờ Tenant ký (
            {lease.tenant?.name || "Tenant"})
          </p>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// Contract Detail Page
// ─────────────────────────────────────────────
const ContractDetailPage = () => {
  const params = useParams();
  const leaseId = Number(params?.id);

  const {
    data: lease,
    isLoading,
    isError,
  } = useGetLeaseDetailQuery(leaseId, {
    skip: !leaseId,
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Đang tải chi tiết hợp đồng...
      </div>
    );
  }

  if (isError || !lease) {
    return (
      <div className="p-8 text-center text-red-500">
        Không tìm thấy hợp đồng.
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <Link
        href="/managers/contracts"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Quay lại danh sách hợp đồng
      </Link>

      <Header
        title={`Hợp đồng #${lease.id}`}
        subtitle={`Chi tiết điều khoản và trạng thái của hợp đồng thuê.`}
      />

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Contract Editor / View */}
        <div className="lg:col-span-2 space-y-6">
          <ContractForm key={lease.id} lease={lease} leaseId={leaseId} />

          {/* Electronic Audit Trail (If signed) */}
          {(lease.tenantSignedAt || lease.managerSignedAt) && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-2 mb-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600" /> Nhật ký
                chữ ký điện tử
              </h3>
              <div className="space-y-2 text-xs text-emerald-800">
                {lease.managerSignedAt && (
                  <p>
                    ✓ <strong>Quản lý:</strong> Ký lúc{" "}
                    {new Date(lease.managerSignedAt).toLocaleString("vi-VN")}
                    {lease.managerSignedIp && ` (IP: ${lease.managerSignedIp})`}
                  </p>
                )}
                {lease.tenantSignedAt && (
                  <p>
                    ✓ <strong>Người thuê ({lease.tenant?.name}):</strong> Ký lúc{" "}
                    {new Date(lease.tenantSignedAt).toLocaleString("vi-VN")} (IP:{" "}
                    {lease.tenantSignedIp || "127.0.0.1"})
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Info Cards */}
        <div className="space-y-6">
          {/* Property Card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Dự án bất động sản
            </h3>
            <div className="flex items-start gap-3">
              <Building className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-gray-900 text-sm">
                  {lease.property?.name}
                </p>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />{" "}
                  {lease.property?.location?.address}
                </p>
              </div>
            </div>
          </div>

          {/* Tenant Card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Người thuê (Tenant)
            </h3>
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-gray-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-gray-900 text-sm">
                  {lease.tenant?.name}
                </p>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  <Mail className="w-3.5 h-3.5 shrink-0" /> {lease.tenant?.email}
                </p>
              </div>
            </div>
          </div>

          {/* Action Download */}
          {lease.leaseAgreementUrl && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <a
                href={lease.leaseAgreementUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                <Download className="w-4 h-4" /> Xem / Tải hợp đồng PDF
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractDetailPage;
