---
name: clawhub-budget
description: Comprehensive personal budget planner with expense tracking, income management, budget creation, savings goals, and AI-powered insights for financial management
---

# Clawhub Budget Planner

A powerful TypeScript-based personal budget management skill for MoltBot with intelligent expense tracking, income management, budget creation, and advanced analytics.

## Features

### Core Features
- **Expense Tracking** - Log and categorize all expenses with tags and merchants
- **Income Management** - Track multiple income sources and frequencies
- **Budget Creation** - Set spending limits per category with alerts at thresholds
- **Savings Goals** - Create and track progress toward financial goals
- **Recurring Transactions** - Automate tracking for bills, subscriptions, salary

### Smart Features (LLM-Powered)
- **Natural Language Input** - Parse "spent $50 on groceries yesterday"
- **Auto-Categorization** - Smart category detection from descriptions
- **Anomaly Detection** - Alerts for unusual spending patterns
- **Spending Insights** - Trend analysis and savings recommendations
- **Budget Suggestions** - Recommended limits based on spending history

---

## Installation

```bash
cd budget_bot
npm install
npm run build
```

---

## Usage

### Initialize the Budget Planner

```typescript
import { clawhub } from './dist/index.js';

// Initialize (required before any operations)
await clawhub.initialize();

// Or with custom storage path
await clawhub.initialize('/path/to/data');
```

### Expense Tracking

```typescript
// Add an expense
await clawhub.addExpense(50, 'Food & Dining', 'Grocery shopping', {
  date: '2026-01-31',
  tags: ['weekly', 'essentials'],
  merchant: 'Whole Foods'
});

// Natural language input
await clawhub.addFromNaturalLanguage('spent $45 on uber yesterday');

// Get recent expenses
const expenses = clawhub.getExpenses({ limit: 10 });

// Filter by category and date range
const foodExpenses = clawhub.getExpenses({
  category: 'Food & Dining',
  startDate: '2026-01-01',
  endDate: '2026-01-31'
});
```

### Income Tracking

```typescript
// Add income
await clawhub.addIncome(5000, 'Salary', 'January salary', {
  date: '2026-01-15'
});

// Add freelance income
await clawhub.addIncome(500, 'Freelance', 'Website project');

// Get all income
const income = clawhub.getIncome();
```

### Budget Management

```typescript
// Create a monthly budget
await clawhub.createBudget('Food Budget', 'Food & Dining', 500, 'monthly', 0.8);

// Check budget status
const status = clawhub.getBudgetStatus();
// Returns: [{ budgetName, spent, limit, remaining, percentageUsed, status }]

// Get budget alerts
const alerts = clawhub.checkBudgetAlerts();
// Returns warnings when threshold or limit exceeded

// Get smart budget suggestions
const suggestions = clawhub.suggestBudgetLimits();
// Returns: [{ category, suggested, average, max }]
```

### Savings Goals

```typescript
// Create a savings goal
await clawhub.createGoal('Emergency Fund', 10000, {
  description: '6 months expenses',
  deadline: '2026-12-31',
  priority: 'high'
});

// Add contribution
await clawhub.contributeToGoal('goal_abc123', 500, 'January savings');

// Check progress
const progress = clawhub.getGoalProgress();
// Returns: [{ goalName, targetAmount, currentAmount, percentageComplete, daysRemaining, onTrack }]
```

### Analytics & Reports

```typescript
// Monthly spending summary
const summary = clawhub.getSpendingSummary();
// Returns: { totalExpenses, totalIncome, netSavings, expensesByCategory, incomeByCategory }

// View monthly trends
const trends = clawhub.getMonthlyTrends(12);
// Returns: [{ date, expenses, income, netSavings }]

// Full monthly report
const report = clawhub.generateMonthlyReport(2026, 1);

// Compare to last month
const comparison = clawhub.compareToLastMonth();
// Returns: { expenseChange, incomeChange, topIncreases, topDecreases }
```

### Smart Insights

```typescript
// Generate AI-powered insights
const insights = await clawhub.generateInsights();
// Returns insights like:
// - "⚠️ Your dining expenses are 3x higher than usual"
// - "💡 Cancel unused subscriptions to save $50/month"
// - "🏆 You've tracked expenses for 7 consecutive days!"

// Get unread insights
const unreadInsights = clawhub.getInsights();
```

### Recurring Transactions

```typescript
// Create recurring expense (e.g., Netflix subscription)
await clawhub.createRecurring(
  'expense', 15.99, 'Subscriptions', 'Netflix', 'monthly',
  { startDate: '2026-02-01' }
);

// Create recurring income (e.g., salary)
await clawhub.createRecurring(
  'income', 5000, 'Salary', 'Monthly salary', 'monthly'
);

// Process due recurring transactions
await clawhub.processRecurring();
```

### Data Management

```typescript
// Get statistics
const stats = clawhub.getStats();
// Returns: { totalTransactions, totalExpenses, totalIncome, netSavings, avgExpense, topCategory }

// Get available categories
const categories = clawhub.getCategories();

// Export data
const jsonData = await clawhub.exportData();

// Create backup
const backupPath = await clawhub.backup();

// Get storage location
const dataPath = clawhub.getDataPath();
```

---

## Default Categories

### Expense Categories
| Category | Icon | Color |
|----------|------|-------|
| Food & Dining | 🍔 | #FF6B6B |
| Transportation | 🚗 | #4ECDC4 |
| Shopping | 🛍️ | #45B7D1 |
| Bills & Utilities | 💡 | #96CEB4 |
| Entertainment | 🎬 | #FFEAA7 |
| Health & Fitness | 💪 | #DDA0DD |
| Education | 📚 | #98D8C8 |
| Personal Care | 💄 | #F7DC6F |
| Subscriptions | 📱 | #BB8FCE |

### Income Categories
| Category | Icon | Color |
|----------|------|-------|
| Salary | 💰 | #2ECC71 |
| Freelance | 💻 | #3498DB |
| Investments | 📈 | #9B59B6 |
| Gifts | 🎁 | #E74C3C |

---

## Cross-Platform Storage

Data is stored in platform-specific locations:

| Platform | Default Path |
|----------|-------------|
| Windows | `%APPDATA%\clawhub` |
| macOS | `~/Library/Application Support/clawhub` |
| Linux | `~/.local/share/clawhub` |

Override with environment variable:
```bash
export CLAWHUB_DATA_PATH=/custom/path
```

Or use local project storage:
```bash
mkdir .clawhub  # Creates local storage in project directory
```

---

## Data Files

```
clawhub/
├── data.json         # All transactions, budgets, goals
└── backups/          # Timestamped backup files
    └── backup-2026-01-31T12-00-00.json
```

---

## Example Workflow

```typescript
import { clawhub } from './dist/index.js';

async function main() {
  // 1. Initialize
  await clawhub.initialize();

  // 2. Add today's expenses using natural language
  await clawhub.addFromNaturalLanguage('spent $12 on lunch');
  await clawhub.addFromNaturalLanguage('paid $50 for gas');

  // 3. Check budget status
  const budgets = clawhub.getBudgetStatus();
  for (const b of budgets) {
    console.log(`${b.budgetName}: ${b.percentageUsed.toFixed(0)}% used`);
  }

  // 4. Get monthly summary
  const summary = clawhub.getSpendingSummary();
  console.log(`Net savings: $${summary.netSavings.toFixed(2)}`);

  // 5. Generate insights
  const insights = await clawhub.generateInsights();
  for (const insight of insights) {
    console.log(`${insight.type}: ${insight.message}`);
  }
}

main().catch(console.error);
```

---

## API Reference Summary

| Method | Description |
|--------|-------------|
| `initialize(path?)` | Initialize the budget planner |
| `addExpense(amount, category, description, options?)` | Add expense |
| `addIncome(amount, category, description, options?)` | Add income |
| `addFromNaturalLanguage(text)` | Parse and add from natural language |
| `createBudget(name, category, limit, period, threshold?)` | Create budget |
| `getBudgetStatus()` | Get all budget statuses |
| `checkBudgetAlerts()` | Get budget warnings/alerts |
| `createGoal(name, target, options?)` | Create savings goal |
| `contributeToGoal(goalId, amount, note?)` | Add to goal |
| `getGoalProgress()` | Get all goal progress |
| `getSpendingSummary(start?, end?)` | Get spending breakdown |
| `getMonthlyTrends(months?)` | Get monthly trend data |
| `generateMonthlyReport(year?, month?)` | Generate full report |
| `generateInsights()` | Generate AI insights |
| `createRecurring(type, amount, category, desc, freq, options?)` | Create recurring |
| `processRecurring()` | Process due recurring transactions |
| `getStats()` | Get transaction statistics |
| `exportData()` | Export all data as JSON |
| `backup()` | Create timestamped backup |
