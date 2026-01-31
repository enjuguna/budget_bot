/**
 * Clawhub Budget Planner - Output Formatting Utilities
 */

import type { Transaction, Budget, SavingsGoal, SpendingSummary, BudgetStatus, LLMInsight } from '../types/index.js';

// ============================================================================
// Currency Formatting
// ============================================================================

export function formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

export function formatCompactCurrency(amount: number, currency: string = 'USD'): string {
    if (amount >= 1000000) {
        return `${currency === 'USD' ? '$' : currency}${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
        return `${currency === 'USD' ? '$' : currency}${(amount / 1000).toFixed(1)}K`;
    }
    return formatCurrency(amount, currency);
}

// ============================================================================
// Date Formatting
// ============================================================================

export function formatDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export function formatDateShort(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
}

export function formatRelativeDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
}

// ============================================================================
// Percentage Formatting
// ============================================================================

export function formatPercentage(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
}

export function formatPercentageInt(value: number): string {
    return `${Math.round(value * 100)}%`;
}

// ============================================================================
// Transaction Formatting
// ============================================================================

export function formatTransaction(t: Transaction): string {
    const icon = t.type === 'expense' ? '📤' : '📥';
    const sign = t.type === 'expense' ? '-' : '+';
    return `${icon} ${formatDate(t.date)} | ${sign}${formatCurrency(t.amount)} | ${t.category} | ${t.description}`;
}

export function formatTransactionCompact(t: Transaction): string {
    const sign = t.type === 'expense' ? '-' : '+';
    return `${sign}${formatCurrency(t.amount)} ${t.category}`;
}

// ============================================================================
// Budget Formatting
// ============================================================================

export function formatBudgetStatus(b: BudgetStatus): string {
    const statusIcon = b.status === 'exceeded' ? '🔴' : b.status === 'warning' ? '🟡' : '🟢';
    const progressBar = createProgressBar(b.percentageUsed / 100, 20);
    return `${statusIcon} ${b.budgetName} (${b.category})
   ${progressBar} ${formatPercentageInt(b.percentageUsed / 100)}
   Spent: ${formatCurrency(b.spent)} / ${formatCurrency(b.limit)} (${formatCurrency(b.remaining)} remaining)`;
}

export function formatBudget(b: Budget): string {
    const percent = b.limit > 0 ? b.spent / b.limit : 0;
    const progressBar = createProgressBar(percent, 15);
    return `📊 ${b.name} | ${b.category} | ${progressBar} ${formatCurrency(b.spent)}/${formatCurrency(b.limit)}`;
}

// ============================================================================
// Goal Formatting
// ============================================================================

export function formatGoal(g: SavingsGoal): string {
    const percent = g.targetAmount > 0 ? g.currentAmount / g.targetAmount : 0;
    const progressBar = createProgressBar(percent, 15);
    const completed = g.isCompleted ? '✅' : '🎯';
    return `${completed} ${g.name} | ${progressBar} ${formatCurrency(g.currentAmount)}/${formatCurrency(g.targetAmount)} (${formatPercentageInt(percent)})`;
}

// ============================================================================
// Insight Formatting
// ============================================================================

export function formatInsight(i: LLMInsight): string {
    const icons: Record<string, string> = {
        warning: '⚠️',
        tip: '💡',
        achievement: '🏆',
        anomaly: '🔍',
    };
    const icon = icons[i.type] || '📌';
    return `${icon} ${i.title}: ${i.message}${i.suggestedAction ? `\n   → ${i.suggestedAction}` : ''}`;
}

// ============================================================================
// Summary Formatting
// ============================================================================

export function formatSpendingSummary(summary: SpendingSummary): string {
    const lines: string[] = [
        '═══════════════════════════════════════════',
        '                 SUMMARY                    ',
        '═══════════════════════════════════════════',
        `📥 Total Income:   ${formatCurrency(summary.totalIncome).padStart(15)}`,
        `📤 Total Expenses: ${formatCurrency(summary.totalExpenses).padStart(15)}`,
        `💰 Net Savings:    ${formatCurrency(summary.netSavings).padStart(15)}`,
        '───────────────────────────────────────────',
    ];

    if (summary.expensesByCategory.length > 0) {
        lines.push('📊 Expenses by Category:');
        for (const cat of summary.expensesByCategory.slice(0, 5)) {
            lines.push(`   ${cat.category.padEnd(20)} ${formatCurrency(cat.total).padStart(10)} (${formatPercentageInt(cat.percentage / 100)})`);
        }
    }

    return lines.join('\n');
}

// ============================================================================
// Progress Bar Helper
// ============================================================================

export function createProgressBar(percent: number, length: number = 20): string {
    const clamped = Math.min(1, Math.max(0, percent));
    const filled = Math.round(clamped * length);
    const empty = length - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

// ============================================================================
// Table Formatting
// ============================================================================

export function formatTable(headers: string[], rows: string[][]): string {
    const colWidths = headers.map((h, i) => {
        const maxRowWidth = Math.max(...rows.map(row => (row[i] || '').length));
        return Math.max(h.length, maxRowWidth);
    });

    const separator = colWidths.map(w => '─'.repeat(w + 2)).join('┼');
    const headerRow = headers.map((h, i) => h.padEnd(colWidths[i])).join(' │ ');
    const dataRows = rows.map(row =>
        row.map((cell, i) => (cell || '').padEnd(colWidths[i])).join(' │ ')
    );

    return [headerRow, separator, ...dataRows].join('\n');
}
