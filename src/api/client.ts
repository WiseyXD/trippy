import { z } from "zod";

// API base URL
const API_BASE_URL = "/api";

// Error type
export interface ApiError {
  success: false;
  error: string;
}

// Common response type
export type ApiResponse<T> =
  | {
      success: true;
      data: T;
    }
  | ApiError;

// User schemas
export const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
  createdAt: z.string(),
});

export type User = z.infer<typeof UserSchema>;

// Trip schemas
export const TripSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().optional().nullable(),
  code: z.string(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  ownerId: z.number(),
  totalBudget: z.number().optional().nullable(),
  currency: z.string().default("USD"),
  createdAt: z.string(),
});

export type Trip = z.infer<typeof TripSchema>;

// Expense schemas
export const ExpenseCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  icon: z.string().optional(),
  tripId: z.number().optional().nullable(),
});

export type ExpenseCategory = z.infer<typeof ExpenseCategorySchema>;

export const ExpenseSchema = z.object({
  id: z.number(),
  tripId: z.number(),
  payerId: z.number(),
  amount: z.number(),
  description: z.string(),
  categoryId: z.number().optional().nullable(),
  date: z.string(),
  isPersonal: z.boolean().default(false),
  receiptUrl: z.string().optional().nullable(),
  createdAt: z.string(),
});

export type Expense = z.infer<typeof ExpenseSchema>;

export const ExpenseParticipantSchema = z.object({
  userId: z.number(),
  amount: z.number(),
});

export type ExpenseParticipant = z.infer<typeof ExpenseParticipantSchema>;

export const BalanceSchema = z.object({
  userId: z.number(),
  name: z.string(),
  balance: z.number(),
});

export type Balance = z.infer<typeof BalanceSchema>;

// User API functions
export async function createUser(
  name: string,
  email?: string,
  avatarUrl?: string,
): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, email, avatarUrl }),
  });

  const data = (await response.json()) as ApiResponse<User>;

  if (!data.success) {
    throw new Error(data.error);
  }

  return data.data;
}

export async function getUsers(): Promise<User[]> {
  const response = await fetch(`${API_BASE_URL}/users`);
  const data = (await response.json()) as ApiResponse<User[]>;

  if (!data.success) {
    throw new Error(data.error);
  }

  return data.data;
}

// Trip API functions
export async function createTrip(trip: {
  name: string;
  description?: string;
  ownerId: number;
  startDate?: string;
  endDate?: string;
  totalBudget?: number;
  currency?: string;
}): Promise<Trip> {
  const response = await fetch(`${API_BASE_URL}/trips`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(trip),
  });

  const data = (await response.json()) as ApiResponse<Trip>;

  if (!data.success) {
    throw new Error(data.error);
  }

  return data.data;
}

export async function joinTrip(
  code: string,
  userId: number,
): Promise<{ trip: Trip }> {
  const response = await fetch(`${API_BASE_URL}/trips/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code, userId }),
  });

  const data = (await response.json()) as ApiResponse<{ trip: Trip }>;

  if (!data.success) {
    throw new Error(data.error);
  }

  return data.data;
}

export async function getTrip(tripId: number): Promise<{
  trip: Trip;
  members: Array<{
    id: number;
    userId: number;
    isOwner: boolean;
    joinedAt: string;
    name: string;
    email?: string;
    avatarUrl?: string;
  }>;
  expenses: Expense[];
}> {
  const response = await fetch(`${API_BASE_URL}/trips/${tripId}`);
  const data = (await response.json()) as ApiResponse<{
    trip: Trip;
    members: Array<{
      id: number;
      userId: number;
      isOwner: boolean;
      joinedAt: string;
      name: string;
      email?: string;
      avatarUrl?: string;
    }>;
    expenses: Expense[];
  }>;

  if (!data.success) {
    throw new Error(data.error);
  }

  return data.data;
}

// Expense API functions
export async function createExpense(expense: {
  tripId: number;
  payerId: number;
  amount: number;
  description: string;
  categoryId?: number;
  date?: string;
  isPersonal?: boolean;
  receiptUrl?: string;
  participants: ExpenseParticipant[];
}): Promise<Expense> {
  const response = await fetch(`${API_BASE_URL}/expenses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(expense),
  });

  const data = (await response.json()) as ApiResponse<Expense>;

  if (!data.success) {
    throw new Error(data.error);
  }

  return data.data;
}

export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
  const response = await fetch(`${API_BASE_URL}/expenses/categories`);
  const data = (await response.json()) as ApiResponse<ExpenseCategory[]>;

  if (!data.success) {
    throw new Error(data.error);
  }

  return data.data;
}

export async function getTripBalances(tripId: number): Promise<Balance[]> {
  const response = await fetch(`${API_BASE_URL}/expenses/balances/${tripId}`);
  const data = (await response.json()) as ApiResponse<Balance[]>;

  if (!data.success) {
    throw new Error(data.error);
  }

  return data.data;
}
