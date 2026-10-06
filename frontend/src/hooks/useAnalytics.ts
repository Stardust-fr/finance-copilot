import { useQuery } from '@tanstack/react-query';

import { AnalyticsFilters, getAnalytics } from '@/services/analytics.service';

export function useAnalytics(filters: AnalyticsFilters = {}) {
  return useQuery({
    queryKey: ['analytics', filters],
    queryFn: () => getAnalytics(filters),
  });
}
