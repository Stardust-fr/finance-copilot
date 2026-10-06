import { useQuery } from '@tanstack/react-query';

import { getBudgets } from '@/services/budget.service';

export function useBudgets() {
  return useQuery({
    queryKey: ['budgets'],
    queryFn: getBudgets,
  });
}
