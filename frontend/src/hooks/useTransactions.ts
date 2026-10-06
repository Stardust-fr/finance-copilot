import { useQuery } from '@tanstack/react-query';

import { getTransactions, TransactionFilters } from '@/services/transaction.service';

export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => getTransactions(filters),
  });
}
