"use client";

import Navbar from "@/components/Navbar";
import {
  useGetSigningPageQuery,
  useSignContractMutation,
} from "@/state/api";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Eraser,
  FileText,
  Lock,
  PenTool,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";

function SigningContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const { data, isLoading, isError } = useGetSigningPageQuery(token, {
    skip: !token,
  });

  const [signContract, { isLoading: isSigning }] = useSignContractMutation();

  const sigCanvasRef = useRef<SignatureCanvas | null>(null);
  const [activeTab, setActiveTab] = useState<"draw" | "upload">("draw");
  const [uploadedSignatureUrl, setUploadedSignatureUrl] = useState<string | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [penColor, setPenColor] = useState<string>("#1e3a8a"); // Navy Blue
  const [agreed, setAgreed] = useState(false);
  const [signedSuccess, setSignedSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (!data?.expiresAt) return;

    const interval = setInterval(() => {
      const expTime = new Date(data.expiresAt).getTime();
      const now = new Date().getTime();
      const diff = expTime - now;

      if (diff <= 0) {
        setTimeLeft("Đã hết hạn");
        clearInterval(interval);
      } else {
        const minutes = Math.floor(diff / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes}m ${seconds < 10 ? "0" : ""}${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [data?.expiresAt]);

  // Handle signature upload image file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Vui lòng tải lên tập tin hình ảnh (PNG, JPG)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setUploadedSignatureUrl(base64);
      setSignatureDataUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  // Save drawn canvas signature
  const saveDrawnSignature = () => {
    if (sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
      const base64 = sigCanvasRef.current.getTrimmedCanvas().toDataURL("image/png");
      setSignatureDataUrl(base64);
    }
  };

  // Clear canvas
  const clearCanvas = () => {
    if (sigCanvasRef.current) {
      sigCanvasRef.current.clear();
      setSignatureDataUrl(null);
    }
  };

  const handleSign = async () => {
    if (!agreed) return;

    // Get final signature data URL
    let finalSignature = signatureDataUrl;
    if (activeTab === "draw" && sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
      finalSignature = sigCanvasRef.current.getTrimmedCanvas().toDataURL("image/png");
    }

    try {
      await signContract({
        token,
        signatureBase64: finalSignature || undefined,
      }).unwrap();
      setSignedSuccess(true);
    } catch (err) {
      console.error("Lỗi khi ký hợp đồng", err);
    }
  };

  if (!token) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Thiếu mã xác nhận ký hợp đồng</h2>
        <p className="text-sm text-gray-500 mt-2 max-w-md">
          Vui lòng kiểm tra email của bạn và nhấp vào liên kết ký hợp đồng được gửi từ hệ thống.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <Clock className="w-10 h-10 text-primary-600 animate-spin mb-3" />
        <p className="text-base font-medium text-gray-700">
          Đang tải nội dung hợp đồng và kiểm tra mã xác thực bảo mật...
        </p>
      </div>
    );
  }

  if (isError || !data?.lease) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Liên kết đã hết hạn hoặc không hợp lệ</h2>
        <p className="text-sm text-gray-500 mt-2 max-w-md">
          Liên kết ký hợp đồng này chỉ có hiệu lực trong vòng <strong>15 phút</strong>. Vui lòng liên hệ với Quản lý bất động sản để nhận liên kết mới.
        </p>
      </div>
    );
  }

  const { lease } = data;

  if (signedSuccess || lease.status === "Pending_payment" || lease.status === "Active") {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-6 shadow-lg animate-pulse">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">
          Ký hợp đồng trực tuyến thành công!
        </h1>
        <p className="text-sm text-gray-600 mt-3 leading-relaxed">
          Bạn đã hoàn tất ký điện tử hợp đồng thuê cho bất động sản <strong>{lease.property?.name}</strong>. Bản PDF đã được nhúng chữ ký & mã băm SHA-256 bảo mật.
        </p>

        {lease.leaseAgreementUrl && (
          <div className="mt-6">
            <a
              href={lease.leaseAgreementUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-50 text-primary-700 text-sm font-bold rounded-xl border border-primary-200 hover:bg-primary-100 transition-colors"
            >
              <Download className="w-4 h-4" /> Tải bản hợp đồng đã ký (PDF)
            </a>
          </div>
        )}

        <div className="mt-8">
          <Link
            href="/tenants/applications"
            className="px-6 py-3 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 transition-all shadow-md"
          >
            Quản lý đơn thuê của tôi
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 my-4">
      {/* Header Banner */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-5 p-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                <ShieldCheck className="h-4 w-4" />
                Đã xác thực chữ ký điện tử
              </div>

              <span className="text-sm text-slate-500">
                Audit Trail SHA-256
              </span>
            </div>

            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Hợp đồng thuê
              </h1>

              <p className="mt-1 text-lg text-slate-700">
                {lease.property?.name}
              </p>
            </div>

            <p className="max-w-3xl text-sm leading-6 text-slate-500">
              Vui lòng kiểm tra toàn bộ nội dung hợp đồng trước khi ký điện tử.
              Sau khi hoàn tất, chữ ký cùng thông tin xác thực sẽ được ghi vào
              tài liệu PDF và không thể chỉnh sửa.
            </p>
          </div>

          {timeLeft && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-700">
                <Clock className="h-4 w-4" />
                Thời gian còn lại
              </div>

              <div className="mt-1 text-2xl font-bold text-amber-900">
                {timeLeft}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Web PDF Viewer */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col h-[600px]">
            <div className="flex items-center justify-between border-b pb-3 mb-3">
              <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
                <FileText className="w-4 h-4 text-primary-600" />
                <span>Nội dung tài liệu PDF</span>
              </div>
              <div className="flex items-center gap-2">
                {lease.leaseAgreementUrl && (
                  <a
                    href={lease.leaseAgreementUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary-600 bg-primary-50 px-3 py-1.5 rounded-lg hover:bg-primary-100 font-medium transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Tải về PDF
                  </a>
                )}
              </div>
            </div>

            {/* Web Inline PDF Viewer via Object / iframe */}
            <div className="flex-1 bg-gray-100 rounded-xl overflow-hidden relative border border-gray-200">
              {lease.leaseAgreementUrl ? (
                <iframe
                  src={`${lease.leaseAgreementUrl}#toolbar=0&navpanes=0`}
                  className="w-full h-full border-none"
                  title="Contract PDF Preview"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center text-gray-500">
                  <FileText className="w-12 h-12 text-gray-400 mb-2" />
                  <p className="text-sm font-medium">Tài liệu PDF đang được chuẩn bị trên S3...</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Summary Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-xs text-gray-600 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <span className="text-gray-400 block">Bên cho thuê</span>
              <strong className="text-gray-800 text-sm truncate block">
                {lease.property?.manager?.name || "Bất động sản"}
              </strong>
            </div>
            <div>
              <span className="text-gray-400 block">Bên thuê</span>
              <strong className="text-gray-800 text-sm truncate block">
                {lease.tenant?.name}
              </strong>
            </div>
            <div>
              <span className="text-gray-400 block">Tiền thuê / tháng</span>
              <strong className="text-primary-700 text-sm block font-bold">
                {lease.rent?.toLocaleString("vi-VN")} VNĐ
              </strong>
            </div>
            <div>
              <span className="text-gray-400 block">Tiền cọc</span>
              <strong className="text-gray-800 text-sm block font-bold">
                {lease.deposit?.toLocaleString("vi-VN")} VNĐ
              </strong>
            </div>
          </div>
        </div>

        {/* Right Column: E-Signature Canvas & Controls */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border-2 border-primary-200 rounded-3xl p-6 shadow-md space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <PenTool className="w-5 h-5 text-primary-600" /> Ký điện tử hợp đồng
              </h2>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded-full">
                Audit Trail SHA-256
              </span>
            </div>

            {/* Signature Method Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setActiveTab("draw")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "draw"
                    ? "bg-white text-primary-700 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <PenTool className="w-3.5 h-3.5" /> Vẽ chữ ký
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("upload")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "upload"
                    ? "bg-white text-primary-700 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" /> Tải ảnh chữ ký
              </button>
            </div>

            {/* Tab 1: Draw Signature Canvas */}
            {activeTab === "draw" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-medium">Vẽ chữ ký của bạn trong khung bên dưới:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPenColor("#1e3a8a")}
                      className={`w-4 h-4 rounded-full bg-blue-900 border ${
                        penColor === "#1e3a8a" ? "ring-2 ring-primary-600" : ""
                      }`}
                      title="Màu xanh đậm"
                    />
                    <button
                      type="button"
                      onClick={() => setPenColor("#000000")}
                      className={`w-4 h-4 rounded-full bg-black border ${
                        penColor === "#000000" ? "ring-2 ring-primary-600" : ""
                      }`}
                      title="Màu đen"
                    />
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 ml-2 font-medium"
                    >
                      <Eraser className="w-3.5 h-3.5" /> Xóa vẽ lại
                    </button>
                  </div>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-2xl bg-slate-50 relative overflow-hidden h-44 hover:border-primary-400 transition-colors">
                  <SignatureCanvas
                    ref={sigCanvasRef}
                    penColor={penColor}
                    canvasProps={{
                      className: "w-full h-full cursor-crosshair",
                    }}
                    onEnd={saveDrawnSignature}
                  />
                  <span className="absolute bottom-2 right-3 text-[10px] text-gray-400 pointer-events-none select-none">
                    Chữ ký điện tử hợp pháp
                  </span>
                </div>
              </div>
            )}

            {/* Tab 2: Upload Signature Image */}
            {activeTab === "upload" && (
              <div className="space-y-3">
                <span className="text-xs text-gray-500 font-medium block">
                  Tải lên file ảnh chữ ký của bạn (PNG, JPG nền trắng/trong suốt):
                </span>
                <label className="border-2 border-dashed border-gray-300 hover:border-primary-500 rounded-2xl bg-slate-50 p-6 flex flex-col items-center justify-center cursor-pointer transition-colors group">
                  <input
                    type="file"
                    accept="image/png, image/jpeg"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <UploadCloud className="w-8 h-8 text-gray-400 group-hover:text-primary-600 mb-2 transition-colors" />
                  <span className="text-xs font-bold text-gray-700 group-hover:text-primary-700">
                    Nhấp để chọn ảnh chữ ký
                  </span>
                  <span className="text-[10px] text-gray-400 mt-1">PNG hoặc JPG (tối đa 5MB)</span>
                </label>

                {uploadedSignatureUrl && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={uploadedSignatureUrl}
                        alt="Signature Preview"
                        className="h-10 max-w-[120px] object-contain border bg-white rounded p-1"
                      />
                      <span className="text-xs text-emerald-800 font-semibold">
                        Đã nạp hình ảnh chữ ký
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedSignatureUrl(null);
                        setSignatureDataUrl(null);
                      }}
                      className="text-gray-400 hover:text-rose-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Live Preview Box */}
            {signatureDataUrl && (
              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[11px] font-bold text-gray-600 block">Xem trước chữ ký sẽ nhúng vào PDF:</span>
                <div className="bg-white p-2 rounded border border-gray-200 flex items-center justify-center">
                  <img
                    src={signatureDataUrl}
                    alt="Current Signature Preview"
                    className="h-10 object-contain"
                  />
                </div>
              </div>
            )}

            {/* Legal Agreement Checkbox */}
            <div className="pt-2 border-t space-y-3">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-gray-300"
                />
                <span className="text-xs text-gray-700 leading-relaxed group-hover:text-gray-900">
                  Tôi xác nhận là <strong>{lease.tenant?.name}</strong>, đồng ý với toàn bộ điều khoản hợp đồng và ủy quyền nhúng chữ ký & thông tin Audit (IP, thời gian, SHA-256) vào file PDF.
                </span>
              </label>

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleSign}
                disabled={!agreed || isSigning}
                className="w-full py-3.5 px-6 text-sm font-extrabold text-white bg-primary-600 hover:bg-primary-700 rounded-2xl disabled:opacity-50 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-5 h-5" />
                {isSigning ? "Đang nhúng chữ ký & sinh mã SHA-256..." : "Ký & Hoàn tất hợp đồng"}
              </button>
            </div>
          </div>

          {/* Security & Audit Info Footer */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-slate-900">
              <Lock className="w-4 h-4 text-emerald-600" /> Quy trình ký bảo mật chuẩn PDF-Lib & AWS S3
            </div>
            <p className="leading-relaxed">
              Mọi hoạt động ký kết đều ghi nhận dấu vết pháp lý (Audit Trail): địa chỉ IP, mốc thời gian chuẩn UTC+7 và mã băm mật mã SHA-256 được lưu vết vĩnh viễn trên S3.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TenantSignPage() {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <Navbar />
      <Suspense fallback={<div className="p-8 text-center text-gray-500">Đang nạp hệ thống ký hợp đồng...</div>}>
        <SigningContent />
      </Suspense>
    </div>
  );
}
