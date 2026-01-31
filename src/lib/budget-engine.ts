/**
 * Clawhub Budget Planner - Budget Engine
 * Handles budget calculations, alerts, and status tracking
 */

import { v4 as uuidv4 } from 'uuid';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import type { Budget, BudgetStatus, BudgetPeriod, ActionResult } from '../types/index.js';
import { StorageManager } from './storage.js';
import { validateBudget } from './validator.js';

// ============================================================================
// Budget Engine Class
// ============================================================================

export class BudgetEngine {
    private storage: StorageManager;

    constructor(storage: StorageManager) {
        this.storage = storage;
    }

    // --------------------------------------------------------------------------
    // Budget CRUD Operations
    // --------------------------------------------------------------------------

    async createBudget(data: {
        name: string;
        category: string;
        limit: number;
        period: BudgetPeriod;
        alertThreshold?: number;
    }): Promise<ActionResult<Budget>> {
        const validation = validateBudget(data);
        if (!validation.valid) {
            return { success: false, message: 'Validation failed', error: validation.errors.join(', ') };
        }

        const now = new Date().toISOString();
        const budget: Budget = {
            id: `budget_${uuidv4().slice(0, 8)}`,
            name: data.name,
            category: data.category,
            limit: data.limit,
            spent: 0,
            period: data.period,
            alertThreshold: data.alertThreshold ?? 0.8,
            startDate: now.split('T')[0],
            isActive: true,
            createdAt: now,
            updatedAt: now,
        };

        await this.storage.addBudget(budget);
        return { success: true, data: budget, message: `Budget "${budget.name}" created successfully` };
    }

    async updateBudget(id: string, updates: Partial<Budget>): Promise<ActionResult<Budget>> {
        const budget = this.storage.getBudgetById(id);
        if (!budget) {
            return { success: false, message: 'Budget not found', error: `No budget with ID: ${id}` };
        }

        const updated = await this.storage.updateBudget(id, updates);
        return { success: true, data: updated!, message: 'Budget updated successfully' };
    }

    async deleteBudget(id: string): Promise<ActionResult> {
        const result = await this.storage.deleteBudget(id);
        if (!result) {
            return { success: false, message: 'Failed to delete budget', error: 'Budget not found' };
        }
        return { success: true, message: 'Budget deleted successfully' };
    }

    // --------------------------------------------------------------------------
    // Budget Status & Calculations
    // --------------------------------------------------------------------------

    getBudgetStatus(budgetId?: string): BudgetStatus[] {
        const budgets = budgetId
            ? [this.storage.getBudgetById(budgetId)].filter(Boolean) as Budget[]
            : this.storage.getBudgets().filter(b => b.isActive);

        return budgets.map(budget => this.calculateBudgetStatus(budget));
    }

    private calculateBudgetStatus(budget: Budget): BudgetStatus {
        const { start, end } = this.getPeriodRange(budget.period);
        const transactions = this.storage.getTransactions().filter(t =>
            t.type === 'expense' &&
            t.category.toLowerCase() === budget.category.toLowerCase() &&
            isWithinInterval(new Date(t.date), { start, end })
        );

        const spent = transactions.reduce((sum, t) => sum + t.amount, 0);
        const remaining = Math.max(0, budget.limit - spent);
        const percentageUsed = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;

        let status: 'under' | 'warning' | 'exceeded' = 'under';
        if (percentageUsed >= 100) {
            status = 'exceeded';
        } else if (percentageUsed >= budget.alertThreshold * 100) {
            status = 'warning';
        }

        return {
            budgetId: budget.id,
            budgetName: budget.name,
            category: budget.category,
            limit: budget.limit,
            spent,
            remaining,
            percentageUsed,
            status,
        };
    }

    private getPeriodRange(period: BudgetPeriod): { start: Date; end: Date } {
        const now = new Date();
        switch (period) {
            case 'daily':
                return { start: startOfDay(now), end: endOfDay(now) };
            case 'weekly':
                return { start: startOfWeek(now), end: endOfWeek(now) };
            case 'monthly':
                return { start: startOfMonth(now), end: endOfMonth(now) };
            case 'yearly':
                return { start: startOfYear(now), end: endOfYear(now) };
        }
    }

    // --------------------------------------------------------------------------
    // Budget Alerts
    // --------------------------------------------------------------------------

    checkBudgetAlerts(): { budget: Budget; status: BudgetStatus; message: string }[] {
        const alerts: { budget: Budget; status: BudgetStatus; message: string }[] = [];
        const budgets = this.storage.getBudgets().filter(b => b.isActive);

        for (const budget of budgets) {
            const status = this.calculateBudgetStatus(budget);

            if (status.status === 'exceeded') {
                alerts.push({
                    budget,
                    status,
                    message: `🔴 EXCEEDED: "${budget.name}" budget exceeded by ${(status.percentageUsed - 100).toFixed(1)}%`,
                });
            } else if (status.status === 'warning') {
                alerts.push({
                    budget,
                    status,
                    message: `🟡 WARNING: "${budget.name}" budget at ${status.percentageUsed.toFixed(1)}% (${budget.alertThreshold * 100}% threshold)`,
                });
            }
        }

        return alerts;
    }

    // --------------------------------------------------------------------------
    // Budget Suggestions
    // --------------------------------------------------------------------------

    suggestBudgetLimits(): { category: string; suggested: number; average: number; max: number }[] {
        const transactions = this.storage.getTransactions().filter(t => t.type === 'expense');
        const categorySpending: Record<string, number[]> = {};

        // Group expenses by category and month
        for (const t of transactions) {
            if (!categorySpending[t.category]) {
                categorySpending[t.category] = [];
            }
            categorySpending[t.category].push(t.amount);
        }

        return Object.entries(categorySpending).map(([category, amounts]) => {
            const average = amounts.reduce((a, b) => a + b, 0) / amounts.length;
            const max = Math.max(...amounts);
            // Suggest 20% buffer above average
            const suggested = Math.ceil(average * 1.2);

            return { category, suggested, average, max };
        });
    }
}

// Factory function
export function createBudgetEngine(storage: StorageManager): BudgetEngine {
    return new BudgetEngine(storage);
}
