/**
 * Calculates the next payment date based on the lease start date.
 * Iterates month-by-month from the start date until finding the first date in the future relative to `today`.
 *
 * @param startDate The lease start date
 * @returns The next payment date
 */
export function calculateNextPaymentDate(startDate: Date): Date {
  const today = new Date();
  const nextPaymentDate = new Date(startDate);
  while (nextPaymentDate <= today) {
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
  }
  return nextPaymentDate;
}
