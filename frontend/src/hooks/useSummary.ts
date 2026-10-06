import { useAnalytics } from './useAnalytics';

// Thin wrapper — derives summary from the analytics endpoint.
// Keeps the dashboard API surface unchanged while reusing the analytics query.
export function useSummary() {
  const { data, isLoading, isError } = useAnalytics();

  return {
    data: data
      ? {
          totalIncome: data.summary.totalIncome,
          totalExpenses: data.summary.totalExpenses,
          netSavings: data.summary.netSavings,
          savingsRate: data.summary.savingsRate,
        }
      : undefined,
    isLoading,
    isError,
  };
}
