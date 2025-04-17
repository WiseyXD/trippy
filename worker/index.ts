import { Hono } from "hono";
import { cors } from "hono/cors";
import { drizzle } from "drizzle-orm/d1";
import { nanoid } from "nanoid";
import {
  users,
  trips,
  tripMembers,
  expenses,
  expenseParticipants,
  expenseCategories,
} from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

// Define the environment type with our bindings
interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
}

// Create Hono app
const app = new Hono<{ Bindings: Env }>();

// Add CORS middleware
app.use("/*", cors());

// Add API routes
app.get("/api", (c) => {
  return c.json({
    name: "Trippy API",
    version: "1.0.0",
  });
});

// User routes
app.route("/api/users", userRoutes());
app.route("/api/trips", tripRoutes());
app.route("/api/expenses", expenseRoutes());

// Define user routes
function userRoutes() {
  const router = new Hono<{ Bindings: Env }>();

  // Get all users
  router.get("/", async (c) => {
    try {
      const db = drizzle(c.env.DB);
      const allUsers = await db.select().from(users);

      return c.json({
        success: true,
        data: allUsers,
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      return c.json(
        {
          success: false,
          error: "Failed to fetch users",
        },
        500,
      );
    }
  });

  // Create a new user (simple, no auth)
  router.post("/", async (c) => {
    try {
      const body = await c.req.json();
      const db = drizzle(c.env.DB);

      // Simple validation
      if (!body.name) {
        return c.json(
          {
            success: false,
            error: "Name is required",
          },
          400,
        );
      }

      const newUser = await db
        .insert(users)
        .values({
          name: body.name,
          email: body.email,
          avatarUrl: body.avatarUrl,
          createdAt: new Date().toISOString(),
        })
        .returning();

      return c.json(
        {
          success: true,
          data: newUser[0],
        },
        201,
      );
    } catch (error) {
      console.error("Error creating user:", error);
      return c.json(
        {
          success: false,
          error: "Failed to create user",
        },
        500,
      );
    }
  });

  return router;
}

// Define trip routes
function tripRoutes() {
  const router = new Hono<{ Bindings: Env }>();

  // Get all trips
  router.get("/", async (c) => {
    try {
      const db = drizzle(c.env.DB);
      const allTrips = await db.select().from(trips);

      return c.json({
        success: true,
        data: allTrips,
      });
    } catch (error) {
      console.error("Error fetching trips:", error);
      return c.json(
        {
          success: false,
          error: "Failed to fetch trips",
        },
        500,
      );
    }
  });

  // Get a specific trip by ID
  router.get("/:id", async (c) => {
    try {
      const tripId = parseInt(c.req.param("id"));
      const db = drizzle(c.env.DB);

      const trip = await db.select().from(trips).where(eq(trips.id, tripId));

      if (trip.length === 0) {
        return c.json(
          {
            success: false,
            error: "Trip not found",
          },
          404,
        );
      }

      // Get members of this trip
      const members = await db
        .select({
          id: tripMembers.id,
          userId: tripMembers.userId,
          isOwner: tripMembers.isOwner,
          joinedAt: tripMembers.joinedAt,
          name: users.name,
          email: users.email,
          avatarUrl: users.avatarUrl,
        })
        .from(tripMembers)
        .innerJoin(users, eq(tripMembers.userId, users.id))
        .where(eq(tripMembers.tripId, tripId));

      // Get expenses for this trip
      const tripExpenses = await db
        .select()
        .from(expenses)
        .where(eq(expenses.tripId, tripId));

      return c.json({
        success: true,
        data: {
          ...trip[0],
          members,
          expenses: tripExpenses,
        },
      });
    } catch (error) {
      console.error("Error fetching trip:", error);
      return c.json(
        {
          success: false,
          error: "Failed to fetch trip details",
        },
        500,
      );
    }
  });

  // Create a new trip
  router.post("/", async (c) => {
    try {
      const body = await c.req.json();
      const db = drizzle(c.env.DB);

      // Simple validation
      if (!body.name || !body.ownerId) {
        return c.json(
          {
            success: false,
            error: "Name and owner ID are required",
          },
          400,
        );
      }

      // Generate a unique code for the trip
      const tripCode = nanoid(6).toUpperCase();

      // Create the trip
      const newTrip = await db
        .insert(trips)
        .values({
          name: body.name,
          description: body.description || "",
          code: tripCode,
          startDate: body.startDate,
          endDate: body.endDate,
          ownerId: body.ownerId,
          totalBudget: body.totalBudget,
          currency: body.currency || "USD",
          createdAt: new Date().toISOString(),
        })
        .returning();

      // Add the owner as a member of the trip
      await db.insert(tripMembers).values({
        tripId: newTrip[0].id,
        userId: body.ownerId,
        isOwner: true,
        joinedAt: new Date().toISOString(),
      });

      return c.json(
        {
          success: true,
          data: newTrip[0],
        },
        201,
      );
    } catch (error) {
      console.error("Error creating trip:", error);
      return c.json(
        {
          success: false,
          error: "Failed to create trip",
        },
        500,
      );
    }
  });

  // Join a trip with a code
  router.post("/join", async (c) => {
    try {
      const body = await c.req.json();
      const db = drizzle(c.env.DB);

      // Simple validation
      if (!body.code || !body.userId) {
        return c.json(
          {
            success: false,
            error: "Trip code and user ID are required",
          },
          400,
        );
      }

      // Find the trip by code
      const trip = await db
        .select()
        .from(trips)
        .where(eq(trips.code, body.code));

      if (trip.length === 0) {
        return c.json(
          {
            success: false,
            error: "Invalid trip code",
          },
          404,
        );
      }

      // Check if user is already a member
      const existingMember = await db
        .select()
        .from(tripMembers)
        .where(
          and(
            eq(tripMembers.tripId, trip[0].id),
            eq(tripMembers.userId, body.userId),
          ),
        );

      if (existingMember.length > 0) {
        return c.json(
          {
            success: false,
            error: "User is already a member of this trip",
          },
          400,
        );
      }

      // Add the user as a member
      const newMember = await db
        .insert(tripMembers)
        .values({
          tripId: trip[0].id,
          userId: body.userId,
          isOwner: false,
          joinedAt: new Date().toISOString(),
        })
        .returning();

      return c.json({
        success: true,
        data: {
          trip: trip[0],
          membership: newMember[0],
        },
      });
    } catch (error) {
      console.error("Error joining trip:", error);
      return c.json(
        {
          success: false,
          error: "Failed to join trip",
        },
        500,
      );
    }
  });

  return router;
}

// Define expense routes
function expenseRoutes() {
  const router = new Hono<{ Bindings: Env }>();

  // Create a new expense
  router.post("/", async (c) => {
    try {
      const body = await c.req.json();
      const db = drizzle(c.env.DB);

      // Validate required fields
      if (!body.tripId || !body.payerId || !body.amount || !body.description) {
        return c.json(
          {
            success: false,
            error: "Trip ID, payer ID, amount, and description are required",
          },
          400,
        );
      }

      // Validate participants
      if (
        !body.participants ||
        !Array.isArray(body.participants) ||
        body.participants.length === 0
      ) {
        return c.json(
          {
            success: false,
            error: "At least one participant is required",
          },
          400,
        );
      }

      // Create the expense
      const newExpense = await db
        .insert(expenses)
        .values({
          tripId: body.tripId,
          payerId: body.payerId,
          amount: body.amount,
          description: body.description,
          categoryId: body.categoryId,
          date: body.date || new Date().toISOString(),
          isPersonal: body.isPersonal || false,
          receiptUrl: body.receiptUrl,
          createdAt: new Date().toISOString(),
        })
        .returning();

      // Add participants
      const participantPromises = body.participants.map(
        async (participant: { userId: number; amount: number }) => {
          return db.insert(expenseParticipants).values({
            expenseId: newExpense[0].id,
            userId: participant.userId,
            amount: participant.amount,
            isPaid: participant.userId === body.payerId, // Auto-mark as paid if the participant is the payer
            paidAt:
              participant.userId === body.payerId
                ? new Date().toISOString()
                : null,
          });
        },
      );

      await Promise.all(participantPromises);

      return c.json(
        {
          success: true,
          data: newExpense[0],
        },
        201,
      );
    } catch (error) {
      console.error("Error creating expense:", error);
      return c.json(
        {
          success: false,
          error: "Failed to create expense",
        },
        500,
      );
    }
  });

  // Get expense categories
  router.get("/categories", async (c) => {
    try {
      const db = drizzle(c.env.DB);
      const categories = await db
        .select()
        .from(expenseCategories)
        .where(eq(expenseCategories.tripId, null));

      return c.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      console.error("Error fetching categories:", error);
      return c.json(
        {
          success: false,
          error: "Failed to fetch expense categories",
        },
        500,
      );
    }
  });

  // Get balances for a trip
  router.get("/balances/:tripId", async (c) => {
    try {
      const tripId = parseInt(c.req.param("tripId"));
      const db = drizzle(c.env.DB);

      // Get all trip members
      const members = await db
        .select({
          userId: tripMembers.userId,
          name: users.name,
        })
        .from(tripMembers)
        .innerJoin(users, eq(tripMembers.userId, users.id))
        .where(eq(tripMembers.tripId, tripId));

      // Get all expenses for this trip
      const tripExpenses = await db
        .select()
        .from(expenses)
        .where(eq(expenses.tripId, tripId));

      // Get all expense participants
      const allParticipations = await db
        .select()
        .from(expenseParticipants)
        .innerJoin(expenses, eq(expenseParticipants.expenseId, expenses.id))
        .where(eq(expenses.tripId, tripId));

      // Calculate balances
      const balances: Record<number, number> = {};

      // Initialize balances for all members
      members.forEach((member) => {
        balances[member.userId] = 0;
      });

      // Process payments made
      tripExpenses.forEach((expense) => {
        // Add what was paid by each person
        balances[expense.payerId] += expense.amount;
      });

      // Process what each person owes
      allParticipations.forEach((participation) => {
        balances[participation.expense_participants.userId] -=
          participation.expense_participants.amount;
      });

      // Format the result
      const balanceResults = members.map((member) => ({
        userId: member.userId,
        name: member.name,
        balance: balances[member.userId] || 0,
      }));

      return c.json({
        success: true,
        data: balanceResults,
      });
    } catch (error) {
      console.error("Error calculating balances:", error);
      return c.json(
        {
          success: false,
          error: "Failed to calculate balances",
        },
        500,
      );
    }
  });

  return router;
}

// Static assets handler
// app.get("*", async (c) => {
//   return await c.env.ASSETS.fetch(c.req);
// });

export default app;
