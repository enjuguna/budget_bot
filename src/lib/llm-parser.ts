/**
 * Clawhub Budget Planner - LLM Parser
 * Natural language processing for transaction input and smart insights
 */

import type { ParsedTransaction, TransactionType, LLMInsight, Transaction } from '../types/index.js';
import { StorageManager } from './storage.js';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Natural Language Parser
// ============================================================================

/**
 * Parse natural language input into structured transaction data
 * Examples:
 * - "spent $50 on groceries yesterday"
 * - "received $2000 salary on Jan 15"
 * - "paid $120 for electricity bill"
 */
export function parseNaturalLanguage(input: string): ParsedTransaction | null {
    const normalized = input.toLowerCase().trim();

    // Determine transaction type
    const type = determineTransactionType(normalized);
    if (!type) return null;

    // Extract amount
    const amount = extractAmount(normalized);
    if (amount === null) return null;

    // Extract category
    const category = extractCategory(normalized);

    // Extract date
    const date = extractDate(normalized);

    // Extract description
    const description = extractDescription(normalized, category);

    return {
        type,
        amount,
        category,
        description,
        date,
        confidence: calculateConfidence(amount, category, date),
        rawInput: input,
    };
}

// ============================================================================
// Type Detection
// ============================================================================

const EXPENSE_KEYWORDS = [
    'spent', 'paid', 'bought', 'purchased', 'cost', 'charged',
    'expense', 'bill', 'payment', 'subscription', 'fee',
];

const INCOME_KEYWORDS = [
    'received', 'earned', 'got', 'income', 'salary', 'wage',
    'payment from', 'refund', 'bonus', 'commission', 'dividend',
];

function determineTransactionType(input: string): TransactionType | null {
    const hasExpense = EXPENSE_KEYWORDS.some(kw => input.includes(kw));
    const hasIncome = INCOME_KEYWORDS.some(kw => input.includes(kw));

    if (hasIncome && !hasExpense) return 'income';
    if (hasExpense && !hasIncome) return 'expense';
    if (hasExpense && hasIncome) {
        // Default to expense if ambiguous
        return 'expense';
    }

    // Default heuristics
    if (input.includes('from')) return 'income';
    if (input.includes('on') || input.includes('for')) return 'expense';

    return null;
}

// ============================================================================
// Amount Extraction
// ============================================================================

function extractAmount(input: string): number | null {
    // Match currency patterns: $50, 50$, $50.00, 50 dollars, etc.
    const patterns = [
        /\$\s*([\d,]+(?:\.\d{2})?)/,           // $50 or $50.00
        /([\d,]+(?:\.\d{2})?)\s*\$/,           // 50$ or 50.00$
        /([\d,]+(?:\.\d{2})?)\s*(?:dollars?|usd|bucks)/i,  // 50 dollars
        /(?:spent|paid|received|got|earned)\s*\$?\s*([\d,]+(?:\.\d{2})?)/i,
        /([\d,]+(?:\.\d{2})?)\s*(?:for|on)/i,
    ];

    for (const pattern of patterns) {
        const match = input.match(pattern);
        if (match) {
            const cleaned = match[1].replace(/,/g, '');
            const num = parseFloat(cleaned);
            if (!isNaN(num) && num > 0) return num;
        }
    }

    // Fallback: find any number
    const anyNumber = input.match(/(\d+(?:\.\d{2})?)/);
    if (anyNumber) {
        const num = parseFloat(anyNumber[1]);
        if (!isNaN(num) && num > 0) return num;
    }

    return null;
}

// ============================================================================
// Category Extraction
// ============================================================================

const CATEGORY_KEYWORDS: Record<string, string[]> = {
    'Food & Dining': ['food', 'groceries', 'grocery', 'restaurant', 'dinner', 'lunch', 'breakfast', 'coffee', 'meal', 'eating', 'snack'],
    'Transportation': ['uber', 'lyft', 'taxi', 'gas', 'fuel', 'bus', 'train', 'metro', 'parking', 'car', 'transport', 'ride'],
    'Shopping': ['shopping', 'clothes', 'clothing', 'amazon', 'store', 'mall', 'shoes', 'purchase'],
    'Bills & Utilities': ['bill', 'electricity', 'electric', 'water', 'internet', 'phone', 'utility', 'utilities', 'rent', 'mortgage'],
    'Entertainment': ['movie', 'netflix', 'spotify', 'gaming', 'concert', 'entertainment', 'show', 'theater', 'music'],
    'Health & Fitness': ['gym', 'health', 'medicine', 'doctor', 'pharmacy', 'fitness', 'workout', 'medical', 'hospital'],
    'Education': ['education', 'course', 'book', 'books', 'training', 'school', 'tuition', 'class'],
    'Subscriptions': ['subscription', 'monthly', 'premium', 'membership', 'annual'],
    'Salary': ['salary', 'wage', 'paycheck', 'pay'],
    'Freelance': ['freelance', 'gig', 'contract', 'client', 'project'],
    'Investments': ['dividend', 'interest', 'investment', 'stock', 'crypto'],
};

function extractCategory(input: string): string {
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (keywords.some(kw => input.includes(kw))) {
            return category;
        }
    }
    return 'Other Expenses';
}

// ============================================================================
// Date Extraction
// ============================================================================

function extractDate(input: string): string {
    const today = new Date();

    // Relative dates
    if (input.includes('today')) {
        return formatDateISO(today);
    }
    if (input.includes('yesterday')) {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return formatDateISO(yesterday);
    }
    if (input.includes('last week')) {
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);
        return formatDateISO(lastWeek);
    }

    // Month names with dates
    const monthPattern = /(?:on\s+)?(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?/i;
    const monthMatch = input.match(monthPattern);
    if (monthMatch) {
        const monthName = monthMatch[1];
        const day = parseInt(monthMatch[2]);
        const year = monthMatch[3] ? parseInt(monthMatch[3]) : today.getFullYear();

        const monthIndex = getMonthIndex(monthName);
        if (monthIndex !== -1) {
            return formatDateISO(new Date(year, monthIndex, day));
        }
    }

    // MM/DD or MM-DD patterns
    const datePattern = /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/;
    const dateMatch = input.match(datePattern);
    if (dateMatch) {
        const month = parseInt(dateMatch[1]) - 1;
        const day = parseInt(dateMatch[2]);
        let year = dateMatch[3] ? parseInt(dateMatch[3]) : today.getFullYear();
        if (year < 100) year += 2000;
        return formatDateISO(new Date(year, month, day));
    }

    // Default to today
    return formatDateISO(today);
}

function getMonthIndex(monthName: string): number {
    const months = ['january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'];
    const shortMonths = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
        'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

    const lower = monthName.toLowerCase();
    let index = months.indexOf(lower);
    if (index === -1) index = shortMonths.indexOf(lower);
    return index;
}

function formatDateISO(date: Date): string {
    return date.toISOString().split('T')[0];
}

// ============================================================================
// Description Extraction
// ============================================================================

function extractDescription(input: string, category: string): string {
    // Remove common verbs and prepositions
    let desc = input
        .replace(/\b(spent|paid|received|got|earned|bought|for|on|at|from)\b/gi, '')
        .replace(/\$[\d,.]+/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    // Capitalize first letter
    if (desc) {
        desc = desc.charAt(0).toUpperCase() + desc.slice(1);
    }

    return desc || category;
}

// ============================================================================
// Confidence Calculation
// ============================================================================

function calculateConfidence(amount: number | null, category: string, date: string): number {
    let confidence = 0.5;

    if (amount !== null && amount > 0) confidence += 0.2;
    if (category !== 'Other Expenses') confidence += 0.2;
    if (date !== formatDateISO(new Date())) confidence += 0.1;

    return Math.min(1, confidence);
}

// ============================================================================
// Smart Insights Generator
// ============================================================================

export class InsightsEngine {
    private storage: StorageManager;

    constructor(storage: StorageManager) {
        this.storage = storage;
    }

    /**
     * Generate smart insights based on spending patterns
     */
    async generateInsights(): Promise<LLMInsight[]> {
        const insights: LLMInsight[] = [];
        const transactions = this.storage.getTransactions();

        // Anomaly detection: unusual spending
        const anomalies = this.detectAnomalies(transactions);
        insights.push(...anomalies);

        // Trend analysis
        const trends = this.analyzeTrends(transactions);
        insights.push(...trends);

        // Savings tips
        const tips = this.generateSavingsTips(transactions);
        insights.push(...tips);

        // Achievement tracking
        const achievements = this.checkAchievements(transactions);
        insights.push(...achievements);

        // Save new insights
        for (const insight of insights) {
            await this.storage.addInsight(insight);
        }

        return insights;
    }

    private detectAnomalies(transactions: Transaction[]): LLMInsight[] {
        const insights: LLMInsight[] = [];
        const now = new Date().toISOString();

        // Group by category and calculate averages
        const categoryStats: Record<string, { total: number; count: number; avg: number }> = {};

        for (const t of transactions) {
            if (t.type !== 'expense') continue;
            if (!categoryStats[t.category]) {
                categoryStats[t.category] = { total: 0, count: 0, avg: 0 };
            }
            categoryStats[t.category].total += t.amount;
            categoryStats[t.category].count += 1;
        }

        for (const cat of Object.keys(categoryStats)) {
            categoryStats[cat].avg = categoryStats[cat].total / categoryStats[cat].count;
        }

        // Check recent transactions for anomalies
        const recentWeek = transactions.filter(t => {
            const daysDiff = (Date.now() - new Date(t.date).getTime()) / (1000 * 60 * 60 * 24);
            return daysDiff <= 7 && t.type === 'expense';
        });

        for (const t of recentWeek) {
            const stats = categoryStats[t.category];
            if (stats && t.amount > stats.avg * 2) {
                insights.push({
                    id: `insight_${uuidv4().slice(0, 8)}`,
                    type: 'anomaly',
                    title: 'Unusual Spending Detected',
                    message: `${t.description} (${t.category}) was ${(t.amount / stats.avg).toFixed(1)}x your average`,
                    suggestedAction: `Review if this ${t.category} expense was necessary`,
                    relatedTransactions: [t.id],
                    priority: 7,
                    createdAt: now,
                    isRead: false,
                });
            }
        }

        return insights;
    }

    private analyzeTrends(transactions: Transaction[]): LLMInsight[] {
        const insights: LLMInsight[] = [];
        const now = new Date();
        const nowStr = now.toISOString();

        // Compare this month vs last month
        const thisMonth = transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
        });

        const lastMonth = new Date(now);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const lastMonthTx = transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate.getMonth() === lastMonth.getMonth() && tDate.getFullYear() === lastMonth.getFullYear();
        });

        const thisMonthExpenses = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const lastMonthExpenses = lastMonthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

        if (lastMonthExpenses > 0) {
            const change = ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100;
            if (Math.abs(change) > 15) {
                insights.push({
                    id: `insight_${uuidv4().slice(0, 8)}`,
                    type: change > 0 ? 'warning' : 'achievement',
                    title: change > 0 ? 'Spending Increased' : 'Spending Decreased',
                    message: `Your expenses ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(1)}% compared to last month`,
                    priority: Math.abs(change) > 30 ? 8 : 5,
                    createdAt: nowStr,
                    isRead: false,
                });
            }
        }

        return insights;
    }

    private generateSavingsTips(transactions: Transaction[]): LLMInsight[] {
        const insights: LLMInsight[] = [];
        const now = new Date().toISOString();

        // Find recurring expenses that could be optimized
        const subscriptions = transactions.filter(t =>
            t.category === 'Subscriptions' || t.isRecurring
        );

        if (subscriptions.length > 3) {
            const total = subscriptions.reduce((s, t) => s + t.amount, 0);
            insights.push({
                id: `insight_${uuidv4().slice(0, 8)}`,
                type: 'tip',
                title: 'Review Subscriptions',
                message: `You have ${subscriptions.length} subscriptions totaling potential savings`,
                suggestedAction: `Consider reviewing and canceling unused subscriptions to save up to $${total.toFixed(2)}/month`,
                priority: 6,
                createdAt: now,
                isRead: false,
            });
        }

        return insights;
    }

    private checkAchievements(transactions: Transaction[]): LLMInsight[] {
        const insights: LLMInsight[] = [];
        const now = new Date().toISOString();

        // Achievement: First 10 transactions logged
        if (transactions.length === 10) {
            insights.push({
                id: `insight_${uuidv4().slice(0, 8)}`,
                type: 'achievement',
                title: '🎉 Getting Started!',
                message: 'You\'ve logged your first 10 transactions',
                priority: 3,
                createdAt: now,
                isRead: false,
            });
        }

        // Achievement: Consistent tracking (7 days in a row)
        const lastWeek = new Set<string>();
        for (const t of transactions) {
            const daysDiff = (Date.now() - new Date(t.date).getTime()) / (1000 * 60 * 60 * 24);
            if (daysDiff <= 7) {
                lastWeek.add(t.date);
            }
        }

        if (lastWeek.size >= 7) {
            insights.push({
                id: `insight_${uuidv4().slice(0, 8)}`,
                type: 'achievement',
                title: '🔥 Streak Master!',
                message: 'You\'ve tracked expenses for 7 consecutive days',
                priority: 4,
                createdAt: now,
                isRead: false,
            });
        }

        return insights;
    }
}

// Factory function
export function createInsightsEngine(storage: StorageManager): InsightsEngine {
    return new InsightsEngine(storage);
}
