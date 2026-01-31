/**
 * Clawhub Budget Planner - Type Definitions
 * Cross-platform personal finance management for MoltBot
 */

// ============================================================================
// Core Transaction Types
// ============================================================================

export type TransactionType = 'expense' | 'income';

export type RecurringFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export type BudgetPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type GoalPriority = 'low' | 'medium' | 'high';

export type InsightType = 'warning' | 'tip' | 'achievement' | 'anomaly';

// ============================================================================
// Transaction Interface
// ============================================================================

export interface RecurringConfig {
    frequency: RecurringFrequency;
    nextDate: string;
    endDate?: string;
    occurrences?: number;
}

export interface Transaction {
    id: string;
    type: TransactionType;
    amount: number;
    category: string;
    description: string;
    date: string;
    tags?: string[];
    isRecurring?: boolean;
    recurringConfig?: RecurringConfig;
    merchant?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

// ============================================================================
// Budget Interface
// ============================================================================

export interface Budget {
    id: string;
    name: string;
    category: string;
    limit: number;
    spent: number;
    period: BudgetPeriod;
    alertThreshold: number; // 0.0 to 1.0 (e.g., 0.8 = 80%)
    startDate: string;
    endDate?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

// ============================================================================
// Category Interface
// ============================================================================

export interface Category {
    id: string;
    name: string;
    type: TransactionType | 'both';
    icon?: string;
    color?: string;
    parentId?: string;
    isDefault: boolean;
    createdAt: string;
}

// ============================================================================
// Savings Goal Interface
// ============================================================================

export interface SavingsGoal {
    id: string;
    name: string;
    description?: string;
    targetAmount: number;
    currentAmount: number;
    deadline?: string;
    priority: GoalPriority;
    contributions: GoalContribution[];
    isCompleted: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface GoalContribution {
    id: string;
    amount: number;
    date: string;
    note?: string;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface SpendingSummary {
    totalExpenses: number;
    totalIncome: number;
    netSavings: number;
    expensesByCategory: CategoryTotal[];
    incomeByCategory: CategoryTotal[];
    period: {
        start: string;
        end: string;
    };
}

export interface CategoryTotal {
    category: string;
    total: number;
    count: number;
    percentage: number;
}

export interface TrendData {
    date: string;
    expenses: number;
    income: number;
    netSavings: number;
}

// ============================================================================
// LLM Insight Types
// ============================================================================

export interface LLMInsight {
    id: string;
    type: InsightType;
    title: string;
    message: string;
    suggestedAction?: string;
    relatedTransactions?: string[];
    priority: number; // 1-10
    createdAt: string;
    isRead: boolean;
}

export interface ParsedTransaction {
    type: TransactionType;
    amount: number;
    category: string;
    description: string;
    date: string;
    confidence: number; // 0.0 to 1.0
    rawInput: string;
}

// ============================================================================
// Storage Types
// ============================================================================

export interface ClawhubData {
    transactions: Transaction[];
    budgets: Budget[];
    categories: Category[];
    goals: SavingsGoal[];
    insights: LLMInsight[];
    config: ClawhubConfig;
}

export interface ClawhubConfig {
    storagePath?: string;
    currency: string;
    dateFormat: string;
    defaultCategories: boolean;
    lastBackup?: string;
    version: string;
}

// ============================================================================
// Report Types
// ============================================================================

export interface MonthlyReport {
    month: string;
    year: number;
    summary: SpendingSummary;
    budgetStatus: BudgetStatus[];
    goalProgress: GoalProgress[];
    insights: LLMInsight[];
    trends: TrendData[];
}

export interface BudgetStatus {
    budgetId: string;
    budgetName: string;
    category: string;
    limit: number;
    spent: number;
    remaining: number;
    percentageUsed: number;
    status: 'under' | 'warning' | 'exceeded';
}

export interface GoalProgress {
    goalId: string;
    goalName: string;
    targetAmount: number;
    currentAmount: number;
    percentageComplete: number;
    daysRemaining?: number;
    onTrack: boolean;
}

// ============================================================================
// Command/Action Types
// ============================================================================

export interface ActionResult<T = unknown> {
    success: boolean;
    data?: T;
    message: string;
    error?: string;
}

export type DateRange = {
    start: Date;
    end: Date;
};
