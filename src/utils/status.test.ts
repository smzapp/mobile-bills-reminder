import type { Bill } from '@/types/domain';
import { billStatusDetail, deriveBillStatus } from '@/utils/status';

const TODAY = new Date(2026, 10, 12); // 12 Nov 2026, local time

function bill(overrides: Partial<Pick<Bill, 'status' | 'dueDate' | 'amount'>> = {}) {
  return {
    status: 'upcoming' as Bill['status'],
    dueDate: '2026-11-20',
    amount: 100_000,
    ...overrides,
  };
}

describe('deriveBillStatus', () => {
  it('reports upcoming for a future unpaid bill', () => {
    expect(deriveBillStatus(bill(), 0, TODAY)).toBe('upcoming');
  });

  it('reports due_today on the due date', () => {
    expect(deriveBillStatus(bill({ dueDate: '2026-11-12' }), 0, TODAY)).toBe('due_today');
  });

  it('reports overdue after the due date', () => {
    expect(deriveBillStatus(bill({ dueDate: '2026-11-10' }), 0, TODAY)).toBe('overdue');
  });

  it('reports paid once the full amount is covered', () => {
    expect(deriveBillStatus(bill({ dueDate: '2026-11-01' }), 100_000, TODAY)).toBe('paid');
  });

  it('treats an overpayment as paid', () => {
    expect(deriveBillStatus(bill(), 150_000, TODAY)).toBe('paid');
  });

  it('reports partially_paid when something is still owed', () => {
    expect(deriveBillStatus(bill(), 40_000, TODAY)).toBe('partially_paid');
  });

  it('still reports overdue when a partial payment is late', () => {
    expect(deriveBillStatus(bill({ dueDate: '2026-11-01' }), 40_000, TODAY)).toBe('overdue');
  });

  it('lets archived win over every other state', () => {
    expect(deriveBillStatus(bill({ status: 'archived', dueDate: '2026-01-01' }), 0, TODAY)).toBe(
      'archived',
    );
  });
});

describe('billStatusDetail', () => {
  it('counts the days a bill is overdue', () => {
    expect(billStatusDetail('overdue', '2026-11-09', TODAY)).toBe('Overdue by 3 days');
    expect(billStatusDetail('overdue', '2026-11-11', TODAY)).toBe('Overdue by 1 day');
  });

  it('describes the near future in plain words', () => {
    expect(billStatusDetail('due_today', '2026-11-12', TODAY)).toBe('Due today');
    expect(billStatusDetail('upcoming', '2026-11-13', TODAY)).toBe('Due tomorrow');
    expect(billStatusDetail('upcoming', '2026-11-19', TODAY)).toBe('Due in 7 days');
  });
});
