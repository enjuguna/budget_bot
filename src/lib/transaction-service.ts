/**
 * Clawhub Budget Planner - Transaction Service
 * Manages expense and income transactions with recurring support
 */

import { v4 as uuidv4 } from 'uuid';
import { addDays, addWeeks, addMonths, addYears } from 'date-fns';
import type { Transaction, RecurringConfig, RecurringFrequency, TransactionType, ActionResult } from '../types/index.js';
import { StorageManager } from './storage.js';
import { validateTransaction } from './validator.js';

// ============================================================================
// Transaction Service Class
// ============================================================================

export class TransactionService {
    private storage: StorageManager;

    constructor(storage: StorageManager) {
        this.storage = storage;
    }

    // --------------------------------------------------------------------------
    // Transaction CRUD
    // --------------------------------------------------------------------------

    async addTransaction(data: {
        type: TransactionType;
        amount: number;
        category: string;
        description: string;
        date?: string;
        tags?: string[];
        merchant?: string;
        notes?: string;
        isRecurring?: boolean;
        recurringConfig?: RecurringConfig;
    }): Promise<ActionResult<Transaction>> {
        const validation = validateTransaction({
            ...data,
            date: data.date || new Date().toISOString().split('T')[0],
        });

        if (!validation.valid) {
            return { success: false, message: 'Validation failed', error: validation.errors.join(', ') };
        }

        const now = new Date().toISOString();
        const transaction: Transaction = {
            id: `tx_${uuidv4().slice(0, 8)}`,
            type: data.type,
            amount: data.amount,
            category: this.normalizeCategory(data.category),
            description: data.description,
            date: data.date || now.split('T')[0],
            tags: data.tags || [],
            merchant: data.merchant,
            notes: data.notes,
            isRecurring: data.isRecurring || false,
            recurringConfig: data.recurringConfig,
            createdAt: now,
            updatedAt: now,
        };

        await this.storage.addTransaction(transaction);
        return { success: true, data: transaction, message: `Transaction added: ${data.type} of $${data.amount}` };
    }

    async addExpense(
        amount: number,
        category: string,
        description: string,
        options?: {
            date?: string;
            tags?: string[];
            merchant?: string;
            notes?: string;
        }
    ): Promise<ActionResult<Transaction>> {
        return this.addTransaction({
            type: 'expense',
            amount,
            category,
            description,
            ...options,
        });
    }

    async addIncome(
        amount: number,
        category: string,
        description: string,
        options?: {
            date?: string;
            tags?: string[];
            notes?: string;
        }
    ): Promise<ActionResult<Transaction>> {
        return this.addTransaction({
            type: 'income',
            amount,
            category,
            description,
            ...options,
        });
    }

    async updateTransaction(id: string, updates: Partial<Transaction>): Promise<ActionResult<Transaction>> {
        const existing = this.storage.getTransactionById(id);
        if (!existing) {
            return { success: false, message: 'Transaction not found', error: `No transaction with ID: ${id}` };
        }

        const updated = await this.storage.updateTransaction(id, updates);
        return { success: true, data: updated!, message: 'Transaction updated successfully' };
    }

    async deleteTransaction(id: string): Promise<ActionResult> {
        const result = await this.storage.deleteTransaction(id);
        if (!result) {
            return { success: false, message: 'Failed to delete', error: 'Transaction not found' };
        }
        return { success: true, message: 'Transaction deleted successfully' };
    }

    // --------------------------------------------------------------------------
    // Query Methods
    // --------------------------------------------------------------------------

    getTransactions(options?: {
        type?: TransactionType;
        category?: string;
        startDate?: string;
        endDate?: string;
        minAmount?: number;
        maxAmount?: number;
        tags?: string[];
        search?: string;
        limit?: number;
    }): Transaction[] {
        let transactions = this.storage.getTransactions();

        if (options?.type) {
            transactions = transactions.filter(t => t.type === options.type);
        }

        if (options?.category) {
            transactions = transactions.filter(t =>
                t.category.toLowerCase() === options.category!.toLowerCase()
            );
        }

        if (options?.startDate) {
            transactions = transactions.filter(t => t.date >= options.startDate!);
        }

        if (options?.endDate) {
            transactions = transactions.filter(t => t.date <= options.endDate!);
        }

        if (options?.minAmount !== undefined) {
            transactions = transactions.filter(t => t.amount >= options.minAmount!);
        }

        if (options?.maxAmount !== undefined) {
            transactions = transactions.filter(t => t.amount <= options.maxAmount!);
        }

        if (options?.tags && options.tags.length > 0) {
            transactions = transactions.filter(t =>
                t.tags?.some(tag => options.tags!.includes(tag))
            );
        }

        if (options?.search) {
            const searchLower = options.search.toLowerCase();
            transactions = transactions.filter(t =>
                t.description.toLowerCase().includes(searchLower) ||
                t.category.toLowerCase().includes(searchLower) ||
                t.merchant?.toLowerCase().includes(searchLower)
            );
        }

        // Sort by date descending (most recent first)
        transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        if (options?.limit) {
            transactions = transactions.slice(0, options.limit);
        }

        return transactions;
    }

    getRecentTransactions(count: number = 10): Transaction[] {
        return this.getTransactions({ limit: count });
    }

    getExpenses(options?: Parameters<typeof this.getTransactions>[0]): Transaction[] {
        return this.getTransactions({ ...options, type: 'expense' });
    }

    getIncome(options?: Parameters<typeof this.getTransactions>[0]): Transaction[] {
        return this.getTransactions({ ...options, type: 'income' });
    }

    // --------------------------------------------------------------------------
    // Recurring Transaction Processing
    // --------------------------------------------------------------------------

    async processRecurringTransactions(): Promise<ActionResult<Transaction[]>> {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const createdTransactions: Transaction[] = [];

        const recurringTx = this.storage.getTransactions().filter(t => t.isRecurring && t.recurringConfig);

        for (const tx of recurringTx) {
            const config = tx.recurringConfig!;

            // Check if end date passed
            if (config.endDate && config.endDate < todayStr) continue;

            // Check if next date is today or earlier
            if (config.nextDate <= todayStr) {
                // Create new transaction
                const result = await this.addTransaction({
                    type: tx.type,
                    amount: tx.amount,
                    category: tx.category,
                    description: `${tx.description} (auto)`,
                    date: config.nextDate,
                    tags: tx.tags,
                    merchant: tx.merchant,
                    notes: `Generated from recurring: ${tx.id}`,
                });

                if (result.success && result.data) {
                    createdTransactions.push(result.data);
                }

                // Update next date
                const nextDate = this.calculateNextDate(new Date(config.nextDate), config.frequency);
                await this.storage.updateTransaction(tx.id, {
                    recurringConfig: {
                        ...config,
                        nextDate: nextDate.toISOString().split('T')[0],
                        occurrences: config.occurrences ? config.occurrences - 1 : undefined,
                    },
                });
            }
        }

        return {
            success: true,
            data: createdTransactions,
            message: `Processed ${createdTransactions.length} recurring transactions`,
        };
    }

    async createRecurringTransaction(
        type: TransactionType,
        amount: number,
        category: string,
        description: string,
        frequency: RecurringFrequency,
        options?: {
            startDate?: string;
            endDate?: string;
            occurrences?: number;
        }
    ): Promise<ActionResult<Transaction>> {
        const startDate = options?.startDate || new Date().toISOString().split('T')[0];

        return this.addTransaction({
            type,
            amount,
            category,
            description,
            date: startDate,
            isRecurring: true,
            recurringConfig: {
                frequency,
                nextDate: startDate,
                endDate: options?.endDate,
                occurrences: options?.occurrences,
            },
        });
    }

    private calculateNextDate(current: Date, frequency: RecurringFrequency): Date {
        switch (frequency) {
            case 'daily': return addDays(current, 1);
            case 'weekly': return addWeeks(current, 1);
            case 'biweekly': return addWeeks(current, 2);
            case 'monthly': return addMonths(current, 1);
            case 'yearly': return addYears(current, 1);
        }
    }

    // --------------------------------------------------------------------------
    // Statistics
    // --------------------------------------------------------------------------

    getTransactionStats(options?: { startDate?: string; endDate?: string }): {
        totalTransactions: number;
        totalExpenses: number;
        totalIncome: number;
        netSavings: number;
        avgExpense: number;
        avgIncome: number;
        topCategory: string | null;
    } {
        const transactions = this.getTransactions(options);
        const expenses = transactions.filter(t => t.type === 'expense');
        const income = transactions.filter(t => t.type === 'income');

        const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
        const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);

        // Find top expense category
        const categoryTotals: Record<string, number> = {};
        for (const exp of expenses) {
            categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
        }
        const topCategory = Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

        return {
            totalTransactions: transactions.length,
            totalExpenses,
            totalIncome,
            netSavings: totalIncome - totalExpenses,
            avgExpense: expenses.length > 0 ? totalExpenses / expenses.length : 0,
            avgIncome: income.length > 0 ? totalIncome / income.length : 0,
            topCategory,
        };
    }

    // --------------------------------------------------------------------------
    // Utility Methods
    // --------------------------------------------------------------------------

    private normalizeCategory(category: string): string {
        // Check if category exists in storage
        const existing = this.storage.getCategoryByName(category);
        return existing?.name || category;
    }
}

// Factory function
export function createTransactionService(storage: StorageManager): TransactionService {
    return new TransactionService(storage);
}
