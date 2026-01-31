/**
 * Clawhub Budget Planner - Cross-Platform Storage Manager
 * Handles persistent JSON file storage with automatic backup
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { ClawhubData, ClawhubConfig, Transaction, Budget, Category, SavingsGoal, LLMInsight } from '../types/index.js';

// ============================================================================
// Storage Path Resolution (Cross-Platform)
// ============================================================================

/**
 * Gets the Clawhub data directory path
 * Priority: ENV var > config > platform-specific default
 */
export function getStoragePath(): string {
    // 1. Check environment variable
    if (process.env.CLAWHUB_DATA_PATH) {
        return process.env.CLAWHUB_DATA_PATH;
    }

    // 2. Check for local project config
    const localConfig = path.join(process.cwd(), '.clawhub');
    if (fs.existsSync(localConfig)) {
        return localConfig;
    }

    // 3. Platform-specific default
    const platform = os.platform();
    const homedir = os.homedir();

    switch (platform) {
        case 'win32':
            // Windows: %APPDATA%\clawhub or %LOCALAPPDATA%\clawhub
            return path.join(process.env.APPDATA || path.join(homedir, 'AppData', 'Roaming'), 'clawhub');
        case 'darwin':
            // macOS: ~/Library/Application Support/clawhub
            return path.join(homedir, 'Library', 'Application Support', 'clawhub');
        default:
            // Linux/Unix: ~/.local/share/clawhub or ~/.clawhub
            const xdgData = process.env.XDG_DATA_HOME || path.join(homedir, '.local', 'share');
            return path.join(xdgData, 'clawhub');
    }
}

// ============================================================================
// Storage Manager Class
// ============================================================================

export class StorageManager {
    private dataPath: string;
    private data: ClawhubData;

    constructor(customPath?: string) {
        this.dataPath = customPath || getStoragePath();
        this.data = this.getDefaultData();
    }

    // --------------------------------------------------------------------------
    // Initialization
    // --------------------------------------------------------------------------

    /**
     * Initialize storage - create directories and load data
     */
    async initialize(): Promise<void> {
        await this.ensureDirectories();
        await this.loadData();
    }

    private async ensureDirectories(): Promise<void> {
        const dirs = [
            this.dataPath,
            path.join(this.dataPath, 'backups'),
        ];

        for (const dir of dirs) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        }
    }

    private getDefaultData(): ClawhubData {
        return {
            transactions: [],
            budgets: [],
            categories: this.getDefaultCategories(),
            goals: [],
            insights: [],
            config: this.getDefaultConfig(),
        };
    }

    private getDefaultConfig(): ClawhubConfig {
        return {
            currency: 'USD',
            dateFormat: 'yyyy-MM-dd',
            defaultCategories: true,
            version: '1.0.0',
        };
    }

    private getDefaultCategories(): Category[] {
        const now = new Date().toISOString();
        return [
            // Expense categories
            { id: 'cat_food', name: 'Food & Dining', type: 'expense', icon: '🍔', color: '#FF6B6B', isDefault: true, createdAt: now },
            { id: 'cat_transport', name: 'Transportation', type: 'expense', icon: '🚗', color: '#4ECDC4', isDefault: true, createdAt: now },
            { id: 'cat_shopping', name: 'Shopping', type: 'expense', icon: '🛍️', color: '#45B7D1', isDefault: true, createdAt: now },
            { id: 'cat_bills', name: 'Bills & Utilities', type: 'expense', icon: '💡', color: '#96CEB4', isDefault: true, createdAt: now },
            { id: 'cat_entertainment', name: 'Entertainment', type: 'expense', icon: '🎬', color: '#FFEAA7', isDefault: true, createdAt: now },
            { id: 'cat_health', name: 'Health & Fitness', type: 'expense', icon: '💪', color: '#DDA0DD', isDefault: true, createdAt: now },
            { id: 'cat_education', name: 'Education', type: 'expense', icon: '📚', color: '#98D8C8', isDefault: true, createdAt: now },
            { id: 'cat_personal', name: 'Personal Care', type: 'expense', icon: '💄', color: '#F7DC6F', isDefault: true, createdAt: now },
            { id: 'cat_subscriptions', name: 'Subscriptions', type: 'expense', icon: '📱', color: '#BB8FCE', isDefault: true, createdAt: now },
            { id: 'cat_other_exp', name: 'Other Expenses', type: 'expense', icon: '📦', color: '#85C1E9', isDefault: true, createdAt: now },
            // Income categories
            { id: 'cat_salary', name: 'Salary', type: 'income', icon: '💰', color: '#2ECC71', isDefault: true, createdAt: now },
            { id: 'cat_freelance', name: 'Freelance', type: 'income', icon: '💻', color: '#3498DB', isDefault: true, createdAt: now },
            { id: 'cat_investments', name: 'Investments', type: 'income', icon: '📈', color: '#9B59B6', isDefault: true, createdAt: now },
            { id: 'cat_gifts', name: 'Gifts', type: 'income', icon: '🎁', color: '#E74C3C', isDefault: true, createdAt: now },
            { id: 'cat_other_inc', name: 'Other Income', type: 'income', icon: '💵', color: '#1ABC9C', isDefault: true, createdAt: now },
        ];
    }

    // --------------------------------------------------------------------------
    // File Operations
    // --------------------------------------------------------------------------

    private getFilePath(filename: string): string {
        return path.join(this.dataPath, filename);
    }

    private async loadData(): Promise<void> {
        const dataFile = this.getFilePath('data.json');

        if (fs.existsSync(dataFile)) {
            try {
                const raw = fs.readFileSync(dataFile, 'utf-8');
                const loaded = JSON.parse(raw) as ClawhubData;
                this.data = { ...this.getDefaultData(), ...loaded };
            } catch {
                console.error('Error loading data, using defaults');
                this.data = this.getDefaultData();
            }
        }
    }

    async saveData(): Promise<void> {
        const dataFile = this.getFilePath('data.json');
        fs.writeFileSync(dataFile, JSON.stringify(this.data, null, 2), 'utf-8');
    }

    async createBackup(): Promise<string> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(this.dataPath, 'backups', `backup-${timestamp}.json`);
        fs.writeFileSync(backupFile, JSON.stringify(this.data, null, 2), 'utf-8');
        this.data.config.lastBackup = new Date().toISOString();
        await this.saveData();
        return backupFile;
    }

    // --------------------------------------------------------------------------
    // Transaction Operations
    // --------------------------------------------------------------------------

    getTransactions(): Transaction[] {
        return this.data.transactions;
    }

    getTransactionById(id: string): Transaction | undefined {
        return this.data.transactions.find(t => t.id === id);
    }

    async addTransaction(transaction: Transaction): Promise<Transaction> {
        this.data.transactions.push(transaction);
        await this.saveData();
        return transaction;
    }

    async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | null> {
        const index = this.data.transactions.findIndex(t => t.id === id);
        if (index === -1) return null;

        this.data.transactions[index] = {
            ...this.data.transactions[index],
            ...updates,
            updatedAt: new Date().toISOString(),
        };
        await this.saveData();
        return this.data.transactions[index];
    }

    async deleteTransaction(id: string): Promise<boolean> {
        const index = this.data.transactions.findIndex(t => t.id === id);
        if (index === -1) return false;

        this.data.transactions.splice(index, 1);
        await this.saveData();
        return true;
    }

    // --------------------------------------------------------------------------
    // Budget Operations
    // --------------------------------------------------------------------------

    getBudgets(): Budget[] {
        return this.data.budgets;
    }

    getBudgetById(id: string): Budget | undefined {
        return this.data.budgets.find(b => b.id === id);
    }

    async addBudget(budget: Budget): Promise<Budget> {
        this.data.budgets.push(budget);
        await this.saveData();
        return budget;
    }

    async updateBudget(id: string, updates: Partial<Budget>): Promise<Budget | null> {
        const index = this.data.budgets.findIndex(b => b.id === id);
        if (index === -1) return null;

        this.data.budgets[index] = {
            ...this.data.budgets[index],
            ...updates,
            updatedAt: new Date().toISOString(),
        };
        await this.saveData();
        return this.data.budgets[index];
    }

    async deleteBudget(id: string): Promise<boolean> {
        const index = this.data.budgets.findIndex(b => b.id === id);
        if (index === -1) return false;

        this.data.budgets.splice(index, 1);
        await this.saveData();
        return true;
    }

    // --------------------------------------------------------------------------
    // Category Operations
    // --------------------------------------------------------------------------

    getCategories(): Category[] {
        return this.data.categories;
    }

    getCategoryByName(name: string): Category | undefined {
        return this.data.categories.find(c => c.name.toLowerCase() === name.toLowerCase());
    }

    async addCategory(category: Category): Promise<Category> {
        this.data.categories.push(category);
        await this.saveData();
        return category;
    }

    async deleteCategory(id: string): Promise<boolean> {
        const index = this.data.categories.findIndex(c => c.id === id && !c.isDefault);
        if (index === -1) return false;

        this.data.categories.splice(index, 1);
        await this.saveData();
        return true;
    }

    // --------------------------------------------------------------------------
    // Goals Operations
    // --------------------------------------------------------------------------

    getGoals(): SavingsGoal[] {
        return this.data.goals;
    }

    getGoalById(id: string): SavingsGoal | undefined {
        return this.data.goals.find(g => g.id === id);
    }

    async addGoal(goal: SavingsGoal): Promise<SavingsGoal> {
        this.data.goals.push(goal);
        await this.saveData();
        return goal;
    }

    async updateGoal(id: string, updates: Partial<SavingsGoal>): Promise<SavingsGoal | null> {
        const index = this.data.goals.findIndex(g => g.id === id);
        if (index === -1) return null;

        this.data.goals[index] = {
            ...this.data.goals[index],
            ...updates,
            updatedAt: new Date().toISOString(),
        };
        await this.saveData();
        return this.data.goals[index];
    }

    async deleteGoal(id: string): Promise<boolean> {
        const index = this.data.goals.findIndex(g => g.id === id);
        if (index === -1) return false;

        this.data.goals.splice(index, 1);
        await this.saveData();
        return true;
    }

    // --------------------------------------------------------------------------
    // Insights Operations
    // --------------------------------------------------------------------------

    getInsights(): LLMInsight[] {
        return this.data.insights;
    }

    async addInsight(insight: LLMInsight): Promise<LLMInsight> {
        this.data.insights.push(insight);
        await this.saveData();
        return insight;
    }

    async markInsightRead(id: string): Promise<boolean> {
        const insight = this.data.insights.find(i => i.id === id);
        if (!insight) return false;
        insight.isRead = true;
        await this.saveData();
        return true;
    }

    // --------------------------------------------------------------------------
    // Config Operations
    // --------------------------------------------------------------------------

    getConfig(): ClawhubConfig {
        return this.data.config;
    }

    async updateConfig(updates: Partial<ClawhubConfig>): Promise<ClawhubConfig> {
        this.data.config = { ...this.data.config, ...updates };
        await this.saveData();
        return this.data.config;
    }

    // --------------------------------------------------------------------------
    // Data Export
    // --------------------------------------------------------------------------

    async exportToJSON(): Promise<string> {
        return JSON.stringify(this.data, null, 2);
    }

    async exportTransactionsToCSV(): Promise<string> {
        const headers = ['ID', 'Type', 'Amount', 'Category', 'Description', 'Date', 'Tags'];
        const rows = this.data.transactions.map(t => [
            t.id,
            t.type,
            t.amount.toString(),
            t.category,
            `"${t.description.replace(/"/g, '""')}"`,
            t.date,
            (t.tags || []).join(';'),
        ]);

        return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }

    // --------------------------------------------------------------------------
    // Utility Methods
    // --------------------------------------------------------------------------

    getDataPath(): string {
        return this.dataPath;
    }

    async clearAllData(): Promise<void> {
        this.data = this.getDefaultData();
        await this.saveData();
    }
}

// Export singleton instance
let storageInstance: StorageManager | null = null;

export function getStorage(customPath?: string): StorageManager {
    if (!storageInstance) {
        storageInstance = new StorageManager(customPath);
    }
    return storageInstance;
}

export async function initializeStorage(customPath?: string): Promise<StorageManager> {
    const storage = getStorage(customPath);
    await storage.initialize();
    return storage;
}
