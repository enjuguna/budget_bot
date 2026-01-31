# 💰 Agent Money Tracker

A TypeScript library for AI agents to track expenses, income, budgets, and savings goals with LLM-powered natural language parsing.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)

## Overview

**Agent Money Tracker** is designed specifically for AI agents and bots (like MoltBot) to manage personal finances programmatically. No frontend required - just import and use in your agent's code.

## Installation

```bash
npm install agent-money-tracker
```

## Quick Start

```typescript
import { clawhub } from 'agent-money-tracker';

// Initialize
await clawhub.initialize();

// Natural language input
await clawhub.addFromNaturalLanguage('spent $50 on groceries yesterday');

// Get summary
const summary = clawhub.getSpendingSummary();
console.log(`Net savings: $${summary.netSavings}`);
```

## Features

| Feature | Description |
|---------|-------------|
| **Expense Tracking** | Log expenses with category, amount, date, tags |
| **Income Management** | Track multiple income sources |
| **Budget Creation** | Set spending limits with alerts |
| **Savings Goals** | Create and track financial goals |
| **Natural Language** | Parse "spent $50 on food" automatically |
| **Smart Insights** | Anomaly detection, trends, recommendations |
| **Recurring** | Auto-track bills and subscriptions |

## API Reference

### Transactions
```typescript
await clawhub.addExpense(amount, category, description, options?)
await clawhub.addIncome(amount, category, description, options?)
await clawhub.addFromNaturalLanguage(text)
clawhub.getExpenses(options?)
clawhub.getIncome(options?)
```

### Budgets
```typescript
await clawhub.createBudget(name, category, limit, period, threshold?)
clawhub.getBudgetStatus()
clawhub.checkBudgetAlerts()
clawhub.suggestBudgetLimits()
```

### Goals
```typescript
await clawhub.createGoal(name, targetAmount, options?)
await clawhub.contributeToGoal(goalId, amount, note?)
clawhub.getGoalProgress()
```

### Analytics
```typescript
clawhub.getSpendingSummary(startDate?, endDate?)
clawhub.getMonthlyTrends(months?)
clawhub.compareToLastMonth()
clawhub.generateMonthlyReport(year?, month?)
```

### Insights
```typescript
await clawhub.generateInsights()
clawhub.getInsights()
```

## Storage

Data is stored in platform-specific locations:

| Platform | Path |
|----------|------|
| Windows | `%APPDATA%\clawhub` |
| macOS | `~/Library/Application Support/clawhub` |
| Linux | `~/.local/share/clawhub` |

Override with environment variable:
```bash
export CLAWHUB_DATA_PATH=/custom/path
```

## Documentation

See [skills/SKILL.md](skills/SKILL.md) for complete API documentation.

## License

MIT
