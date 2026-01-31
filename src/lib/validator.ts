/**
 * Clawhub Budget Planner - Data Validation Utilities
 */

import type { Transaction, Budget, SavingsGoal, Category, TransactionType, BudgetPeriod, GoalPriority } from '../types/index.js';

// ============================================================================
// Validation Result Types
// ============================================================================

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

// ============================================================================
// Transaction Validation
// ============================================================================

export function validateTransaction(data: Partial<Transaction>): ValidationResult {
    const errors: string[] = [];

    if (!data.type || !['expense', 'income'].includes(data.type)) {
        errors.push('Type must be "expense" or "income"');
    }

    if (data.amount === undefined || data.amount === null) {
        errors.push('Amount is required');
    } else if (typeof data.amount !== 'number' || data.amount <= 0) {
        errors.push('Amount must be a positive number');
    }

    if (!data.category || typeof data.category !== 'string') {
        errors.push('Category is required');
    }

    if (!data.description || typeof data.description !== 'string') {
        errors.push('Description is required');
    }

    if (!data.date || !isValidDate(data.date)) {
        errors.push('Valid date is required (YYYY-MM-DD format)');
    }

    if (data.tags && !Array.isArray(data.tags)) {
        errors.push('Tags must be an array of strings');
    }

    return { valid: errors.length === 0, errors };
}

// ============================================================================
// Budget Validation
// ============================================================================

export function validateBudget(data: Partial<Budget>): ValidationResult {
    const errors: string[] = [];

    if (!data.name || typeof data.name !== 'string') {
        errors.push('Budget name is required');
    }

    if (!data.category || typeof data.category !== 'string') {
        errors.push('Category is required');
    }

    if (data.limit === undefined || data.limit === null) {
        errors.push('Limit is required');
    } else if (typeof data.limit !== 'number' || data.limit <= 0) {
        errors.push('Limit must be a positive number');
    }

    const validPeriods: BudgetPeriod[] = ['daily', 'weekly', 'monthly', 'yearly'];
    if (!data.period || !validPeriods.includes(data.period)) {
        errors.push('Period must be one of: daily, weekly, monthly, yearly');
    }

    if (data.alertThreshold !== undefined) {
        if (typeof data.alertThreshold !== 'number' || data.alertThreshold < 0 || data.alertThreshold > 1) {
            errors.push('Alert threshold must be a number between 0 and 1');
        }
    }

    return { valid: errors.length === 0, errors };
}

// ============================================================================
// Goal Validation
// ============================================================================

export function validateGoal(data: Partial<SavingsGoal>): ValidationResult {
    const errors: string[] = [];

    if (!data.name || typeof data.name !== 'string') {
        errors.push('Goal name is required');
    }

    if (data.targetAmount === undefined || data.targetAmount === null) {
        errors.push('Target amount is required');
    } else if (typeof data.targetAmount !== 'number' || data.targetAmount <= 0) {
        errors.push('Target amount must be a positive number');
    }

    if (data.currentAmount !== undefined) {
        if (typeof data.currentAmount !== 'number' || data.currentAmount < 0) {
            errors.push('Current amount must be a non-negative number');
        }
    }

    if (data.deadline && !isValidDate(data.deadline)) {
        errors.push('Invalid deadline format (use YYYY-MM-DD)');
    }

    const validPriorities: GoalPriority[] = ['low', 'medium', 'high'];
    if (data.priority && !validPriorities.includes(data.priority)) {
        errors.push('Priority must be one of: low, medium, high');
    }

    return { valid: errors.length === 0, errors };
}

// ============================================================================
// Category Validation
// ============================================================================

export function validateCategory(data: Partial<Category>): ValidationResult {
    const errors: string[] = [];

    if (!data.name || typeof data.name !== 'string') {
        errors.push('Category name is required');
    }

    const validTypes: (TransactionType | 'both')[] = ['expense', 'income', 'both'];
    if (!data.type || !validTypes.includes(data.type)) {
        errors.push('Type must be one of: expense, income, both');
    }

    return { valid: errors.length === 0, errors };
}

// ============================================================================
// Utility Functions
// ============================================================================

export function isValidDate(dateString: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;

    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
}

export function isValidAmount(value: unknown): value is number {
    return typeof value === 'number' && !isNaN(value) && value > 0;
}

export function sanitizeString(str: string): string {
    return str.trim().replace(/[<>]/g, '');
}

export function parseAmount(input: string): number | null {
    // Remove currency symbols and whitespace
    const cleaned = input.replace(/[$€£¥₹,\s]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : Math.abs(num);
}

export function parseDateString(input: string): string | null {
    const today = new Date();
    const lowered = input.toLowerCase().trim();

    // Handle relative dates
    if (lowered === 'today') {
        return formatDate(today);
    }
    if (lowered === 'yesterday') {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return formatDate(yesterday);
    }
    if (lowered === 'tomorrow') {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return formatDate(tomorrow);
    }

    // Try to parse as date
    const parsed = new Date(input);
    if (!isNaN(parsed.getTime())) {
        return formatDate(parsed);
    }

    return null;
}

function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}
