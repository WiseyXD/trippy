import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// Users table (without auth)
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email"),
  avatarUrl: text("avatar_url"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// Trips table
export const trips = sqliteTable("trips", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  code: text("code").notNull().unique(), // Shareable code for joining
  startDate: text("start_date"),
  endDate: text("end_date"),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => users.id),
  totalBudget: real("total_budget"),
  currency: text("currency").default("USD"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// Trip members (users in a trip)
export const tripMembers = sqliteTable("trip_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tripId: integer("trip_id")
    .notNull()
    .references(() => trips.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  isOwner: integer("is_owner", { mode: "boolean" }).default(false),
  joinedAt: text("joined_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// Categories for expenses
export const expenseCategories = sqliteTable("expense_categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  icon: text("icon").default("receipt"),
  tripId: integer("trip_id").references(() => trips.id), // null means default category
});

// Expenses
export const expenses = sqliteTable("expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tripId: integer("trip_id")
    .notNull()
    .references(() => trips.id),
  payerId: integer("payer_id")
    .notNull()
    .references(() => users.id), // Who paid
  amount: real("amount").notNull(),
  description: text("description").notNull(),
  categoryId: integer("category_id").references(() => expenseCategories.id),
  date: text("date")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  isPersonal: integer("is_personal", { mode: "boolean" }).default(false),
  receiptUrl: text("receipt_url"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// Expense participants (who's involved in each expense)
export const expenseParticipants = sqliteTable("expense_participants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  expenseId: integer("expense_id")
    .notNull()
    .references(() => expenses.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  amount: real("amount").notNull(), // Their share
  isPaid: integer("is_paid", { mode: "boolean" }).default(false),
  paidAt: text("paid_at"),
});

// Types for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Trip = typeof trips.$inferSelect;
export type NewTrip = typeof trips.$inferInsert;

export type TripMember = typeof tripMembers.$inferSelect;
export type NewTripMember = typeof tripMembers.$inferInsert;

export type ExpenseCategory = typeof expenseCategories.$inferSelect;
export type NewExpenseCategory = typeof expenseCategories.$inferInsert;

export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;

export type ExpenseParticipant = typeof expenseParticipants.$inferSelect;
export type NewExpenseParticipant = typeof expenseParticipants.$inferInsert;
