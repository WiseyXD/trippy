import { Hono } from "hono";
import { cors } from "hono/cors";
import { drizzle } from "drizzle-orm/d1";
import { users } from "../drizzle/schema";

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

// Define user routes
function userRoutes() {
  const userRouter = new Hono<{ Bindings: Env }>();

  // Get all users
  userRouter.get("/", async (c) => {
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

  return userRouter;
}

export default app;
