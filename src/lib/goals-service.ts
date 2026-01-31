/**
 * Clawhub Budget Planner - Goals Service
 * Savings goals management with contribution tracking
 */

import { v4 as uuidv4 } from 'uuid';
import type { SavingsGoal, GoalContribution, GoalPriority, GoalProgress, ActionResult } from '../types/index.js';
import { StorageManager } from './storage.js';
import { validateGoal } from './validator.js';

// ============================================================================
// Goals Service Class
// ============================================================================

export class GoalsService {
    private storage: StorageManager;

    constructor(storage: StorageManager) {
        this.storage = storage;
    }

    // --------------------------------------------------------------------------
    // Goal CRUD Operations
    // --------------------------------------------------------------------------

    async createGoal(data: {
        name: string;
        description?: string;
        targetAmount: number;
        currentAmount?: number;
        deadline?: string;
        priority?: GoalPriority;
    }): Promise<ActionResult<SavingsGoal>> {
        const validation = validateGoal(data);
        if (!validation.valid) {
            return { success: false, message: 'Validation failed', error: validation.errors.join(', ') };
        }

        const now = new Date().toISOString();
        const goal: SavingsGoal = {
            id: `goal_${uuidv4().slice(0, 8)}`,
            name: data.name,
            description: data.description,
            targetAmount: data.targetAmount,
            currentAmount: data.currentAmount || 0,
            deadline: data.deadline,
            priority: data.priority || 'medium',
            contributions: [],
            isCompleted: false,
            createdAt: now,
            updatedAt: now,
        };

        await this.storage.addGoal(goal);
        return { success: true, data: goal, message: `Goal "${goal.name}" created successfully` };
    }

    async updateGoal(id: string, updates: Partial<SavingsGoal>): Promise<ActionResult<SavingsGoal>> {
        const goal = this.storage.getGoalById(id);
        if (!goal) {
            return { success: false, message: 'Goal not found', error: `No goal with ID: ${id}` };
        }

        const updated = await this.storage.updateGoal(id, updates);
        return { success: true, data: updated!, message: 'Goal updated successfully' };
    }

    async deleteGoal(id: string): Promise<ActionResult> {
        const result = await this.storage.deleteGoal(id);
        if (!result) {
            return { success: false, message: 'Failed to delete', error: 'Goal not found' };
        }
        return { success: true, message: 'Goal deleted successfully' };
    }

    // --------------------------------------------------------------------------
    // Contribution Management
    // --------------------------------------------------------------------------

    async addContribution(
        goalId: string,
        amount: number,
        note?: string
    ): Promise<ActionResult<SavingsGoal>> {
        const goal = this.storage.getGoalById(goalId);
        if (!goal) {
            return { success: false, message: 'Goal not found', error: `No goal with ID: ${goalId}` };
        }

        if (amount <= 0) {
            return { success: false, message: 'Invalid amount', error: 'Contribution must be positive' };
        }

        const contribution: GoalContribution = {
            id: `contrib_${uuidv4().slice(0, 8)}`,
            amount,
            date: new Date().toISOString().split('T')[0],
            note,
        };

        const newCurrentAmount = goal.currentAmount + amount;
        const isCompleted = newCurrentAmount >= goal.targetAmount;

        const updated = await this.storage.updateGoal(goalId, {
            currentAmount: newCurrentAmount,
            isCompleted,
            contributions: [...goal.contributions, contribution],
        });

        let message = `Added $${amount} to "${goal.name}"`;
        if (isCompleted && !goal.isCompleted) {
            message += ` 🎉 Goal completed!`;
        }

        return { success: true, data: updated!, message };
    }

    async withdrawFromGoal(
        goalId: string,
        amount: number,
        note?: string
    ): Promise<ActionResult<SavingsGoal>> {
        const goal = this.storage.getGoalById(goalId);
        if (!goal) {
            return { success: false, message: 'Goal not found', error: `No goal with ID: ${goalId}` };
        }

        if (amount <= 0) {
            return { success: false, message: 'Invalid amount', error: 'Withdrawal must be positive' };
        }

        if (amount > goal.currentAmount) {
            return { success: false, message: 'Insufficient funds', error: `Only $${goal.currentAmount} available` };
        }

        const contribution: GoalContribution = {
            id: `contrib_${uuidv4().slice(0, 8)}`,
            amount: -amount, // Negative for withdrawal
            date: new Date().toISOString().split('T')[0],
            note: note ? `Withdrawal: ${note}` : 'Withdrawal',
        };

        const newCurrentAmount = goal.currentAmount - amount;

        const updated = await this.storage.updateGoal(goalId, {
            currentAmount: newCurrentAmount,
            isCompleted: false, // Reset if was completed
            contributions: [...goal.contributions, contribution],
        });

        return { success: true, data: updated!, message: `Withdrew $${amount} from "${goal.name}"` };
    }

    // --------------------------------------------------------------------------
    // Query Methods
    // --------------------------------------------------------------------------

    getGoals(options?: {
        priority?: GoalPriority;
        isCompleted?: boolean;
        sortBy?: 'name' | 'progress' | 'deadline' | 'priority';
    }): SavingsGoal[] {
        let goals = this.storage.getGoals();

        if (options?.priority) {
            goals = goals.filter(g => g.priority === options.priority);
        }

        if (options?.isCompleted !== undefined) {
            goals = goals.filter(g => g.isCompleted === options.isCompleted);
        }

        if (options?.sortBy) {
            switch (options.sortBy) {
                case 'name':
                    goals.sort((a, b) => a.name.localeCompare(b.name));
                    break;
                case 'progress':
                    goals.sort((a, b) => {
                        const progressA = a.currentAmount / a.targetAmount;
                        const progressB = b.currentAmount / b.targetAmount;
                        return progressB - progressA;
                    });
                    break;
                case 'deadline':
                    goals.sort((a, b) => {
                        if (!a.deadline && !b.deadline) return 0;
                        if (!a.deadline) return 1;
                        if (!b.deadline) return -1;
                        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
                    });
                    break;
                case 'priority':
                    const priorityOrder = { high: 0, medium: 1, low: 2 };
                    goals.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
                    break;
            }
        }

        return goals;
    }

    getActiveGoals(): SavingsGoal[] {
        return this.getGoals({ isCompleted: false, sortBy: 'priority' });
    }

    getCompletedGoals(): SavingsGoal[] {
        return this.getGoals({ isCompleted: true });
    }

    // --------------------------------------------------------------------------
    // Progress Tracking
    // --------------------------------------------------------------------------

    getGoalProgress(goalId: string): GoalProgress | null {
        const goal = this.storage.getGoalById(goalId);
        if (!goal) return null;

        const now = new Date();
        const percentageComplete = (goal.currentAmount / goal.targetAmount) * 100;

        let daysRemaining: number | undefined;
        let onTrack = true;

        if (goal.deadline) {
            const deadline = new Date(goal.deadline);
            daysRemaining = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

            // Calculate expected progress based on time
            const totalDays = Math.ceil((deadline.getTime() - new Date(goal.createdAt).getTime()) / (1000 * 60 * 60 * 24));
            const daysPassed = totalDays - daysRemaining;
            const expectedProgress = daysPassed / totalDays;

            onTrack = (percentageComplete / 100) >= expectedProgress * 0.8; // 80% buffer
        }

        return {
            goalId: goal.id,
            goalName: goal.name,
            targetAmount: goal.targetAmount,
            currentAmount: goal.currentAmount,
            percentageComplete,
            daysRemaining,
            onTrack,
        };
    }

    getAllGoalProgress(): GoalProgress[] {
        return this.storage.getGoals()
            .map(g => this.getGoalProgress(g.id))
            .filter((p): p is GoalProgress => p !== null);
    }

    // --------------------------------------------------------------------------
    // Summary & Statistics
    // --------------------------------------------------------------------------

    getGoalsSummary(): {
        totalGoals: number;
        activeGoals: number;
        completedGoals: number;
        totalSaved: number;
        totalTarget: number;
        overallProgress: number;
    } {
        const goals = this.storage.getGoals();
        const activeGoals = goals.filter(g => !g.isCompleted);
        const completedGoals = goals.filter(g => g.isCompleted);

        const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
        const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);

        return {
            totalGoals: goals.length,
            activeGoals: activeGoals.length,
            completedGoals: completedGoals.length,
            totalSaved,
            totalTarget,
            overallProgress: totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0,
        };
    }

    // --------------------------------------------------------------------------
    // Suggestions
    // --------------------------------------------------------------------------

    suggestContributionAmount(goalId: string): number | null {
        const goal = this.storage.getGoalById(goalId);
        if (!goal || !goal.deadline || goal.isCompleted) return null;

        const now = new Date();
        const deadline = new Date(goal.deadline);
        const remaining = goal.targetAmount - goal.currentAmount;

        const monthsRemaining = Math.max(1,
            (deadline.getFullYear() - now.getFullYear()) * 12 +
            (deadline.getMonth() - now.getMonth())
        );

        return Math.ceil(remaining / monthsRemaining);
    }
}

// Factory function
export function createGoalsService(storage: StorageManager): GoalsService {
    return new GoalsService(storage);
}
