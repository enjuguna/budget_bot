/**
 * Clawhub Budget Planner - Main Entry Point
 * CLI interface for budget management
 */

import {
    initializeStorage,
    createTransactionService,
    createBudgetEngine,
    createAnalyticsEngine,
    createGoalsService,
    createInsightsEngine,
    parseNaturalLanguage,
    formatCurrency,
    formatTransaction,
    formatBudget,
    formatGoal,
    formatInsight,
    formatSpendingSummary,
    formatBudgetStatus,
    createProgressBar,
} from './lib/index.js';
import type { StorageManager, TransactionService, BudgetEngine, AnalyticsEngine, GoalsService, InsightsEngine } from './lib/index.js';

// ============================================================================
// Clawhub Budget Planner Class
// ============================================================================

export class ClawhubBudget {
    private storage!: StorageManager;
    private transactions!: TransactionService;
    private budgets!: BudgetEngine;
    private analytics!: AnalyticsEngine;
    private goals!: GoalsService;
    private insights!: InsightsEngine;
    private initialized = false;

    /**
     * Initialize the Clawhub Budget Planner
     * Must be called before using any other methods
     */
    async initialize(customPath?: string): Promise<void> {
        if (this.initialized) return;

        this.storage = await initializeStorage(customPath);
        this.transactions = createTransactionService(this.storage);
        this.budgets = createBudgetEngine(this.storage);
        this.analytics = createAnalyticsEngine(this.storage, this.budgets);
        this.goals = createGoalsService(this.storage);
        this.insights = createInsightsEngine(this.storage);
        this.initialized = true;
    }

    private ensureInitialized(): void {
        if (!this.initialized) {
            throw new Error('Clawhub not initialized. Call initialize() first.');
        }
    }

    // ==========================================================================
    // EXPENSE TRACKING
    // ==========================================================================

    /**
     * Add an expense transaction
     */
    async addExpense(
        amount: number,
        category: string,
        description: string,
        options?: { date?: string; tags?: string[]; merchant?: string }
    ) {
        this.ensureInitialized();
        return this.transactions.addExpense(amount, category, description, options);
    }

    /**
     * Get all expenses with optional filters
     */
    getExpenses(options?: {
        category?: string;
        startDate?: string;
        endDate?: string;
        limit?: number;
    }) {
        this.ensureInitialized();
        return this.transactions.getExpenses(options);
    }

    // ==========================================================================
    // INCOME TRACKING
    // ==========================================================================

    /**
     * Add an income transaction
     */
    async addIncome(
        amount: number,
        category: string,
        description: string,
        options?: { date?: string; tags?: string[] }
    ) {
        this.ensureInitialized();
        return this.transactions.addIncome(amount, category, description, options);
    }

    /**
     * Get all income with optional filters
     */
    getIncome(options?: {
        category?: string;
        startDate?: string;
        endDate?: string;
        limit?: number;
    }) {
        this.ensureInitialized();
        return this.transactions.getIncome(options);
    }

    // ==========================================================================
    // NATURAL LANGUAGE INPUT
    // ==========================================================================

    /**
     * Parse and add a transaction from natural language
     * Example: "spent $50 on groceries yesterday"
     */
    async addFromNaturalLanguage(input: string) {
        this.ensureInitialized();
        const parsed = parseNaturalLanguage(input);

        if (!parsed) {
            return { success: false, message: 'Could not parse input', error: 'Unrecognized format' };
        }

        if (parsed.type === 'expense') {
            return this.addExpense(parsed.amount, parsed.category, parsed.description, { date: parsed.date });
        } else {
            return this.addIncome(parsed.amount, parsed.category, parsed.description, { date: parsed.date });
        }
    }

    // ==========================================================================
    // BUDGET MANAGEMENT
    // ==========================================================================

    /**
     * Create a new budget
     */
    async createBudget(
        name: string,
        category: string,
        limit: number,
        period: 'daily' | 'weekly' | 'monthly' | 'yearly',
        alertThreshold?: number
    ) {
        this.ensureInitialized();
        return this.budgets.createBudget({ name, category, limit, period, alertThreshold });
    }

    /**
     * Get budget status for all active budgets
     */
    getBudgetStatus() {
        this.ensureInitialized();
        return this.budgets.getBudgetStatus();
    }

    /**
     * Check for budget alerts (exceeded or warning)
     */
    checkBudgetAlerts() {
        this.ensureInitialized();
        return this.budgets.checkBudgetAlerts();
    }

    /**
     * Get suggested budget limits based on spending history
     */
    suggestBudgetLimits() {
        this.ensureInitialized();
        return this.budgets.suggestBudgetLimits();
    }

    // ==========================================================================
    // SAVINGS GOALS
    // ==========================================================================

    /**
     * Create a new savings goal
     */
    async createGoal(
        name: string,
        targetAmount: number,
        options?: {
            description?: string;
            deadline?: string;
            priority?: 'low' | 'medium' | 'high';
        }
    ) {
        this.ensureInitialized();
        return this.goals.createGoal({ name, targetAmount, ...options });
    }

    /**
     * Add money to a savings goal
     */
    async contributeToGoal(goalId: string, amount: number, note?: string) {
        this.ensureInitialized();
        return this.goals.addContribution(goalId, amount, note);
    }

    /**
     * Get all goals with optional filters
     */
    getGoals(options?: { isCompleted?: boolean; priority?: 'low' | 'medium' | 'high' }) {
        this.ensureInitialized();
        return this.goals.getGoals(options);
    }

    /**
     * Get progress for all goals
     */
    getGoalProgress() {
        this.ensureInitialized();
        return this.goals.getAllGoalProgress();
    }

    // ==========================================================================
    // ANALYTICS & REPORTS
    // ==========================================================================

    /**
     * Get spending summary for current month or date range
     */
    getSpendingSummary(startDate?: string, endDate?: string) {
        this.ensureInitialized();
        if (startDate && endDate) {
            return this.analytics.getSpendingSummary({
                start: new Date(startDate),
                end: new Date(endDate),
            });
        }
        return this.analytics.getSpendingSummary();
    }

    /**
     * Get monthly trends
     */
    getMonthlyTrends(months: number = 12) {
        this.ensureInitialized();
        return this.analytics.getMonthlyTrends(months);
    }

    /**
     * Generate a full monthly report
     */
    generateMonthlyReport(year?: number, month?: number) {
        this.ensureInitialized();
        return this.analytics.generateMonthlyReport(year, month);
    }

    /**
     * Compare spending to last month
     */
    compareToLastMonth() {
        this.ensureInitialized();
        return this.analytics.compareToLastMonth();
    }

    // ==========================================================================
    // SMART INSIGHTS
    // ==========================================================================

    /**
     * Generate smart insights based on spending patterns
     */
    async generateInsights() {
        this.ensureInitialized();
        return this.insights.generateInsights();
    }

    /**
     * Get all unread insights
     */
    getInsights() {
        this.ensureInitialized();
        return this.storage.getInsights().filter(i => !i.isRead);
    }

    // ==========================================================================
    // RECURRING TRANSACTIONS
    // ==========================================================================

    /**
     * Create a recurring transaction
     */
    async createRecurring(
        type: 'expense' | 'income',
        amount: number,
        category: string,
        description: string,
        frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly',
        options?: { startDate?: string; endDate?: string }
    ) {
        this.ensureInitialized();
        return this.transactions.createRecurringTransaction(
            type, amount, category, description, frequency, options
        );
    }

    /**
     * Process due recurring transactions
     */
    async processRecurring() {
        this.ensureInitialized();
        return this.transactions.processRecurringTransactions();
    }

    // ==========================================================================
    // DATA MANAGEMENT
    // ==========================================================================

    /**
     * Get transaction statistics
     */
    getStats() {
        this.ensureInitialized();
        return this.transactions.getTransactionStats();
    }

    /**
     * Get recently transactions
     */
    getRecentTransactions(count: number = 10) {
        this.ensureInitialized();
        return this.transactions.getRecentTransactions(count);
    }

    /**
     * Delete a transaction
     */
    async deleteTransaction(id: string) {
        this.ensureInitialized();
        return this.transactions.deleteTransaction(id);
    }

    /**
     * Get all categories
     */
    getCategories() {
        this.ensureInitialized();
        return this.storage.getCategories();
    }

    /**
     * Export all data as JSON
     */
    async exportData() {
        this.ensureInitialized();
        return this.storage.exportToJSON();
    }

    /**
     * Create a backup
     */
    async backup() {
        this.ensureInitialized();
        return this.storage.createBackup();
    }

    /**
     * Get storage path
     */
    getDataPath() {
        this.ensureInitialized();
        return this.storage.getDataPath();
    }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const clawhub = new ClawhubBudget();

// Default export
export default clawhub;

// Re-export types and utilities
export * from './types/index.js';
export { formatCurrency, formatTransaction, formatBudget, formatGoal, formatInsight, formatSpendingSummary, formatBudgetStatus, createProgressBar };
