import { cn } from '@/lib/utils';

interface Transaction {
  id: string;
  merchant: string;
  category: string;
  date: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
}

const DUMMY_TRANSACTIONS: Transaction[] = [
  { id: '1', merchant: 'Employer Inc.', category: 'Income', date: 'Jul 22', amount: 3500, type: 'INCOME' },
  { id: '2', merchant: 'Whole Foods', category: 'Food', date: 'Jul 21', amount: 87.32, type: 'EXPENSE' },
  { id: '3', merchant: 'Verizon', category: 'Bills', date: 'Jul 20', amount: 85.00, type: 'EXPENSE' },
  { id: '4', merchant: 'Delta Airlines', category: 'Travel', date: 'Jul 19', amount: 320.00, type: 'EXPENSE' },
  { id: '5', merchant: 'Nike', category: 'Shopping', date: 'Jul 18', amount: 129.95, type: 'EXPENSE' },
  { id: '6', merchant: 'Starbucks', category: 'Food', date: 'Jul 17', amount: 6.75, type: 'EXPENSE' },
  { id: '7', merchant: 'Netflix', category: 'Bills', date: 'Jul 16', amount: 15.49, type: 'EXPENSE' },
];

const CATEGORY_COLORS: Record<string, string> = {
  Income: 'bg-emerald-500/10 text-emerald-400',
  Food: 'bg-orange-500/10 text-orange-400',
  Bills: 'bg-indigo-500/10 text-indigo-400',
  Travel: 'bg-blue-500/10 text-blue-400',
  Shopping: 'bg-yellow-500/10 text-yellow-400',
  Entertainment: 'bg-pink-500/10 text-pink-400',
  Healthcare: 'bg-purple-500/10 text-purple-400',
  Education: 'bg-teal-500/10 text-teal-400',
};

export function RecentTransactions() {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800">
      <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
        <h3 className="text-sm font-semibold text-slate-300">Recent Transactions</h3>
        <span className="text-xs text-slate-500">Dummy data — upload CSV to see real data</span>
      </div>
      <div className="divide-y divide-slate-700/50">
        {DUMMY_TRANSACTIONS.map((tx) => (
          <div key={tx.id} className="flex items-center justify-between px-6 py-3.5">
            {/* Left */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-sm font-bold text-slate-300">
                {tx.merchant[0]}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{tx.merchant}</p>
                <p className="text-xs text-slate-400">{tx.date}</p>
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs font-medium',
                  CATEGORY_COLORS[tx.category] ?? 'bg-slate-700 text-slate-300',
                )}
              >
                {tx.category}
              </span>
              <span
                className={cn(
                  'w-24 text-right text-sm font-semibold',
                  tx.type === 'INCOME' ? 'text-emerald-400' : 'text-white',
                )}
              >
                {tx.type === 'INCOME' ? '+' : '-'}${tx.amount.toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
