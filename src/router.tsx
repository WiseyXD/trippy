import {
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

// Pages
import { HomeComponent } from "./pages/Home";
import { JoinTripComponent } from "./pages/JoinTrip";
import { CreateTripComponent } from "./pages/CreateTrip";
import { TripDashboardComponent } from "./pages/TripDashboard";
import { AddExpenseComponent } from "./pages/AddExpense";

// Layout
import { Layout } from "./components/Layout";

// Create routes
const rootRoute = createRootRoute({
  component: Layout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomeComponent,
});

const joinTripRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/join",
  component: JoinTripComponent,
});

const createTripRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/create",
  component: CreateTripComponent,
});

const tripDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/trip/$tripId",
  component: TripDashboardComponent,
});

const addExpenseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/trip/$tripId/add-expense",
  component: AddExpenseComponent,
});

// Create and export the router
const routeTree = rootRoute.addChildren([
  indexRoute,
  joinTripRoute,
  createTripRoute,
  tripDashboardRoute,
  addExpenseRoute,
]);

export const router = createRouter({ routeTree });

// Types
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
