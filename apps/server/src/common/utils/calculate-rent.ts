export function calculateRentalDays(
  startDate: Date | string,
  endDate: Date | string,
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 0;
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diffTime = end.getTime() - start.getTime();
  if (diffTime < 0) return 0;

  // Chênh lệch theo ms đổi sang số ngày (+1 để tính bao gồm cả ngày bắt đầu)
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
}

/**
 * Tính tổng chi phí thuê = đơn giá 1 ngày (pricePerDay) * thời gian thuê (số ngày)
 * @param startDate Ngày bắt đầu thuê
 * @param endDate Ngày kết thúc thuê
 * @param pricePerDay Đơn giá thuê 1 ngày (VNĐ/ngày)
 */
export function calculateTotalRent(
  startDate: Date | string,
  endDate: Date | string,
  pricePerDay: number,
): {
  totalDays: number;
  pricePerDay: number;
  totalRent: number;
} {
  const totalDays = calculateRentalDays(startDate, endDate);

  if (totalDays <= 0 || pricePerDay <= 0) {
    return {
      totalDays: 0,
      pricePerDay: 0,
      totalRent: 0,
    };
  }

  // Công thức chuẩn: Số tiền thuê = Đơn giá 1 ngày * Thời gian thuê (ngày)
  const totalRent = Math.round(totalDays * pricePerDay);

  return {
    totalDays,
    pricePerDay,
    totalRent,
  };
}
