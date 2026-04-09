export type FinpalCategoryGroup = 'expense' | 'income';

export const EXPENSE_CATEGORIES = [
  'Groceries',
  'City Services',
  'Rent',
  'Utilities',
  'Transportation',
  'Dining',
  'Health',
  'Shopping',
  'Education',
  'Subscriptions',
  'Entertainment',
  'Other',
] as const;

export const INCOME_CATEGORIES = [
  'Work Pay',
  'Allowance',
  'Side Hustle',
  'Gift',
  'Refund',
  'Other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];

