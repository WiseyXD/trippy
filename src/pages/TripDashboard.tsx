import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getTrip, getTripBalances, Expense, Balance } from "../api/client";
import { format } from "date-fns";

// UI components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  PlusIcon,
  ReceiptIcon,
  UsersIcon,
  WalletIcon,
  CalendarIcon,
  DollarSignIcon,
} from "lucide-react";

// Currency formatter
function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount);
}

// Get initials from name
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

export function TripDashboardComponent() {
  const { tripId } = useParams({ from: "/trip/$tripId" });
  const navigate = useNavigate();
  const [user, setUser] = useState<{ id: number; name: string } | null>(null);
  const tripIdNumber = parseInt(tripId);

  // Check if user exists in localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("trippy_user");
    if (!storedUser) {
      navigate({ to: "/" });
    } else {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem("trippy_user");
        navigate({ to: "/" });
      }
    }
  }, [navigate]);

  // Fetch trip data
  const tripQuery = useQuery({
    queryKey: ["trip", tripIdNumber],
    queryFn: () => getTrip(tripIdNumber),
    enabled: !!user,
  });

  // Fetch trip balances
  const balancesQuery = useQuery({
    queryKey: ["balances", tripIdNumber],
    queryFn: () => getTripBalances(tripIdNumber),
    enabled: !!user,
  });

  if (!user) return null;

  if (tripQuery.isLoading) {
    return (
      <div className="flex justify-center py-12">Loading trip details...</div>
    );
  }

  if (tripQuery.isError) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load trip details.
          <Button variant="link" onClick={() => tripQuery.refetch()}>
            Try Again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const trip = tripQuery.data;
  const { members, expenses } = trip;
  const balances = balancesQuery.data || [];

  // Check if current user is a member of this trip
  const currentMember = members.find((member) => member.userId === user.id);
  if (!currentMember) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>
          You are not a member of this trip.
          <Link to="/join">
            <Button variant="link">Go back to join a trip</Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  // Calculate trip statistics
  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );
  const personalExpenses = expenses
    .filter((expense) => expense.isPersonal && expense.payerId === user.id)
    .reduce((sum, expense) => sum + expense.amount, 0);
  const groupExpenses = totalExpenses - personalExpenses;

  // User's balance
  const userBalance =
    balances.find((balance) => balance.userId === user.id)?.balance || 0;

  return (
    <div className="space-y-6">
      {/* Trip Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">{trip.trip.name}</h1>
          <div className="text-muted-foreground flex flex-wrap items-center gap-2 mt-1">
            {trip.trip.startDate && (
              <div className="flex items-center gap-1">
                <CalendarIcon className="h-4 w-4" />
                <span>
                  {format(new Date(trip.trip.startDate), "MMM d, yyyy")}
                  {trip.trip.endDate &&
                    ` - ${format(new Date(trip.trip.endDate), "MMM d, yyyy")}`}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <UsersIcon className="h-4 w-4" />
              <span>{members.length} members</span>
            </div>
            {trip.trip.totalBudget && (
              <div className="flex items-center gap-1">
                <DollarSignIcon className="h-4 w-4" />
                <span>
                  Budget:{" "}
                  {formatCurrency(trip.trip.totalBudget, trip.trip.currency)}
                </span>
              </div>
            )}
          </div>
          {trip.trip.description && (
            <p className="mt-2 text-sm text-muted-foreground">
              {trip.trip.description}
            </p>
          )}
        </div>

        <div className="flex gap-2 self-end md:self-auto">
          <Button variant="outline">
            <UsersIcon className="mr-2 h-4 w-4" />
            Invite (Code: {trip.trip.code})
          </Button>
          <Link to={`/trip/${tripId}/add-expense`}>
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </Link>
        </div>
      </div>

      {/* Trip Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalExpenses, trip.trip.currency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {expenses.length} expenses recorded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Your Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${userBalance > 0 ? "text-green-600 dark:text-green-400" : userBalance < 0 ? "text-red-600 dark:text-red-400" : ""}`}
            >
              {formatCurrency(userBalance, trip.trip.currency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {userBalance > 0
                ? "You are owed money"
                : userBalance < 0
                  ? "You owe money"
                  : "You're all settled up"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Your Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(personalExpenses, trip.trip.currency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Personal expenses (not shared)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="expenses" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="balances">Balances</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4 mt-4">
          {expenses.length === 0 ? (
            <div className="text-center py-12">
              <ReceiptIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-30" />
              <h3 className="mt-4 text-lg font-medium">No expenses yet</h3>
              <p className="text-muted-foreground mt-1">
                Add your first expense to start tracking
              </p>
              <Link to={`/trip/${tripId}/add-expense`}>
                <Button className="mt-4">
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add Expense
                </Button>
              </Link>
            </div>
          ) : (
            <div className="rounded-md border">
              {expenses.map((expense: Expense) => {
                const payer = members.find((m) => m.userId === expense.payerId);
                return (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-4 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={payer?.avatarUrl || ""} />
                        <AvatarFallback>
                          {getInitials(payer?.name || "User")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{expense.description}</div>
                        <div className="text-sm text-muted-foreground">
                          Paid by {payer?.name || "Unknown"} ·{" "}
                          {format(new Date(expense.date), "MMM d, yyyy")}
                          {expense.isPersonal && (
                            <Badge className="ml-2" variant="outline">
                              Personal
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="font-semibold">
                      {formatCurrency(expense.amount, trip.trip.currency)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Balances Tab */}
        <TabsContent value="balances" className="space-y-4 mt-4">
          {balancesQuery.isLoading ? (
            <div className="text-center py-8">Loading balances...</div>
          ) : balancesQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Failed to load balances.
                <Button variant="link" onClick={() => balancesQuery.refetch()}>
                  Try Again
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border">
              <div className="p-4 border-b bg-muted/50">
                <h3 className="font-semibold">Who owes who</h3>
              </div>

              {balances.length === 0 ? (
                <div className="p-8 text-center">
                  <WalletIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-30" />
                  <h3 className="mt-4 text-lg font-medium">No balances yet</h3>
                  <p className="text-muted-foreground mt-1">
                    Add some shared expenses to see balances
                  </p>
                </div>
              ) : (
                <div>
                  {balances.map((balance: Balance) => {
                    if (balance.balance === 0) return null; // Skip settled balances

                    return (
                      <div
                        key={balance.userId}
                        className="flex items-center justify-between p-4 border-b last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={
                                members.find((m) => m.userId === balance.userId)
                                  ?.avatarUrl || ""
                              }
                            />
                            <AvatarFallback>
                              {getInitials(balance.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="font-medium">{balance.name}</div>
                        </div>
                        <div
                          className={`font-semibold ${balance.balance > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                        >
                          {balance.balance > 0
                            ? `Gets back ${formatCurrency(balance.balance, trip.trip.currency)}`
                            : `Owes ${formatCurrency(Math.abs(balance.balance), trip.trip.currency)}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4 mt-4">
          <div className="rounded-md border">
            <div className="p-4 border-b bg-muted/50">
              <h3 className="font-semibold">Trip Members ({members.length})</h3>
            </div>

            <div>
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.avatarUrl || ""} />
                      <AvatarFallback>
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {member.name}
                        {member.userId === user.id && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (You)
                          </span>
                        )}
                      </div>
                      {member.isOwner && (
                        <Badge variant="outline" className="mt-1">
                          Trip Owner
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Joined {format(new Date(member.joinedAt), "MMM d, yyyy")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
