/**
 * Clawhub Budget Planner - Analytics Engine
 * Generates spending reports, trends, and financial insights
 */

import { startOfMonth, endOfMonth, endOfWeek, subMonths, format, isWithinInterval, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import type { Transaction, SpendingSummary, CategoryTotal, TrendData, MonthlyReport, DateRange } from '../types/index.js';
import { StorageManager } from './storage.js';
import { BudgetEngine } from './budget-engine.js';

// ============================================================================
// Analytics Engine Class
// ============================================================================

export class AnalyticsEngine {
    private storage: StorageManager;
    private budgetEngine: BudgetEngine;

    constructor(storage: StorageManager, budgetEngine: BudgetEngine) {
        this.storage = storage;
        this.budgetEngine = budgetEngine;
    }

    // --------------------------------------------------------------------------
    // Spending Summary
    // --------------------------------------------------------------------------

    getSpendingSummary(dateRange?: DateRange): SpendingSummary {
        const range = dateRange || this.getCurrentMonthRange();
        const transactions = this.getTransactionsInRange(range);

        const expenses = transactions.filter(t => t.type === 'expense');
        const income = transactions.filter(t => t.type === 'income');

        const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
        const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);

        return {
            totalExpenses,
            totalIncome,
            netSavings: totalIncome - totalExpenses,
            expensesByCategory: this.calculateCategoryTotals(expenses, totalExpenses),
            incomeByCategory: this.calculateCategoryTotals(income, totalIncome),
            period: {
                start: range.start.toISOString().split('T')[0],
                end: range.end.toISOString().split('T')[0],
            },
        };
    }

    private calculateCategoryTotals(transactions: Transaction[], total: number): CategoryTotal[] {
        const categoryMap: Record<string, { total: number; count: number }> = {};

        for (const t of transactions) {
            if (!categoryMap[t.category]) {
                categoryMap[t.category] = { total: 0, count: 0 };
            }
            categoryMap[t.category].total += t.amount;
            categoryMap[t.category].count += 1;
        }

        return Object.entries(categoryMap)
            .map(([category, data]) => ({
                category,
                total: data.total,
                count: data.count,
                percentage: total > 0 ? (data.total / total) * 100 : 0,
            }))
            .sort((a, b) => b.total - a.total);
    }

    // --------------------------------------------------------------------------
    // Trend Analysis
    // --------------------------------------------------------------------------

    getDailyTrends(days: number = 30): TrendData[] {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - days);

        const interval = { start, end };
        const dates = eachDayOfInterval(interval);
        const transactions = this.storage.getTransactions();

        return dates.map(date => {
            const dateStr = format(date, 'yyyy-MM-dd');
            const dayTx = transactions.filter(t => t.date === dateStr);

            const expenses = dayTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
            const income = dayTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);

            return {
                date: dateStr,
                expenses,
                income,
                netSavings: income - expenses,
            };
        });
    }

    getWeeklyTrends(weeks: number = 12): TrendData[] {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - weeks * 7);

        const weekStarts = eachWeekOfInterval({ start, end });
        const transactions = this.storage.getTransactions();

        return weekStarts.map(weekStart => {
            const weekEnd = endOfWeek(weekStart);
            const weekInterval = { start: weekStart, end: weekEnd };

            const weekTx = transactions.filter(t =>
                isWithinInterval(new Date(t.date), weekInterval)
            );

            const expenses = weekTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
            const income = weekTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);

            return {
                date: format(weekStart, 'yyyy-MM-dd'),
                expenses,
                income,
                netSavings: income - expenses,
            };
        });
    }

    getMonthlyTrends(months: number = 12): TrendData[] {
        const end = new Date();
        const start = subMonths(end, months);

        const monthStarts = eachMonthOfInterval({ start, end });
        const transactions = this.storage.getTransactions();

        return monthStarts.map(monthStart => {
            const monthEnd = endOfMonth(monthStart);
            const monthInterval = { start: monthStart, end: monthEnd };

            const monthTx = transactions.filter(t =>
                isWithinInterval(new Date(t.date), monthInterval)
            );

            const expenses = monthTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
            const income = monthTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);

            return {
                date: format(monthStart, 'yyyy-MM'),
                expenses,
                income,
                netSavings: income - expenses,
            };
        });
    }

    // --------------------------------------------------------------------------
    // Monthly Report
    // --------------------------------------------------------------------------

    generateMonthlyReport(year?: number, month?: number): MonthlyReport {
        const now = new Date();
        const targetYear = year ?? now.getFullYear();
        const targetMonth = month ?? now.getMonth() + 1;

        const monthStart = new Date(targetYear, targetMonth - 1, 1);
        const monthEnd = endOfMonth(monthStart);

        const summary = this.getSpendingSummary({ start: monthStart, end: monthEnd });
        const budgetStatus = this.budgetEngine.getBudgetStatus();

        const goals = this.storage.getGoals();
        const goalProgress = goals.map(g => ({
            goalId: g.id,
            goalName: g.name,
            targetAmount: g.targetAmount,
            currentAmount: g.currentAmount,
            percentageComplete: g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0,
            daysRemaining: g.deadline ? Math.max(0, Math.ceil((new Date(g.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : undefined,
            onTrack: !g.deadline || (g.currentAmount / g.targetAmount) >= (1 - (Math.ceil((new Date(g.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) / 30)),
        }));

        const insights = this.storage.getInsights().filter(i => !i.isRead);

        return {
            month: format(monthStart, 'MMMM'),
            year: targetYear,
            summary,
            budgetStatus,
            goalProgress,
            insights,
            trends: this.getDailyTrends(30),
        };
    }

    // --------------------------------------------------------------------------
    // Comparison Analysis
    // --------------------------------------------------------------------------

    compareToLastMonth(): {
        expenseChange: number;
        incomeChange: number;
        savingsChange: number;
        topIncreases: { category: string; change: number }[];
        topDecreases: { category: string; change: number }[];
    } {
        const currentMonth = this.getSpendingSummary(this.getCurrentMonthRange());
        const lastMonth = this.getSpendingSummary(this.getLastMonthRange());

        const expenseChange = currentMonth.totalExpenses - lastMonth.totalExpenses;
        const incomeChange = currentMonth.totalIncome - lastMonth.totalIncome;
        const savingsChange = currentMonth.netSavings - lastMonth.netSavings;

        // Calculate category changes
        const changes: { category: string; change: number }[] = [];
        const allCategories = new Set([
            ...currentMonth.expensesByCategory.map(c => c.category),
            ...lastMonth.expensesByCategory.map(c => c.category),
        ]);

        for (const cat of allCategories) {
            const current = currentMonth.expensesByCategory.find(c => c.category === cat)?.total || 0;
            const last = lastMonth.expensesByCategory.find(c => c.category === cat)?.total || 0;
            changes.push({ category: cat, change: current - last });
        }

        changes.sort((a, b) => b.change - a.change);

        return {
            expenseChange,
            incomeChange,
            savingsChange,
            topIncreases: changes.filter(c => c.change > 0).slice(0, 3),
            topDecreases: changes.filter(c => c.change < 0).slice(0, 3),
        };
    }

    // --------------------------------------------------------------------------
    // Utility Methods
    // --------------------------------------------------------------------------

    private getTransactionsInRange(range: DateRange): Transaction[] {
        return this.storage.getTransactions().filter(t =>
            isWithinInterval(new Date(t.date), range)
        );
    }

    private getCurrentMonthRange(): DateRange {
        const now = new Date();
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }

    private getLastMonthRange(): DateRange {
        const lastMonth = subMonths(new Date(), 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    }

    // --------------------------------------------------------------------------
    // Top Statistics
    // --------------------------------------------------------------------------

    getTopExpenseCategories(limit: number = 5): CategoryTotal[] {
        const summary = this.getSpendingSummary();
        return summary.expensesByCategory.slice(0, limit);
    }

    getTopIncomeCategories(limit: number = 5): CategoryTotal[] {
        const summary = this.getSpendingSummary();
        return summary.incomeByCategory.slice(0, limit);
    }

    getAverageDailyExpense(days: number = 30): number {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - days);

        const transactions = this.getTransactionsInRange({ start, end });
        const totalExpenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        return totalExpenses / days;
    }
}

// Factory function
export function createAnalyticsEngine(storage: StorageManager, budgetEngine: BudgetEngine): AnalyticsEngine {
    return new AnalyticsEngine(storage, budgetEngine);
}
