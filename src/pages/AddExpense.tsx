import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getTrip, getExpenseCategories, createExpense } from "../api/client";
import { format } from "date-fns";

// UI components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CalendarIcon, ReceiptIcon, MinusIcon, PlusIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// Get initials from name
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

// Form schema
const expenseFormSchema = z.object({
  description: z.string().min(2, {
    message: "Description must be at least 2 characters.",
  }),
  amount: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Amount must be a positive number",
    }),
  categoryId: z.string().optional(),
  date: z.date().default(() => new Date()),
  payerId: z.string(),
  isPersonal: z.boolean().default(false),
  participants: z
    .array(
      z.object({
        userId: z.string(),
        amount: z
          .string()
          .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
            message: "Amount must be zero or positive",
          }),
      }),
    )
    .refine((participants) => participants.length > 0, {
      message: "At least one participant must be selected",
    }),
  splitEvenly: z.boolean().default(true),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export function AddExpenseComponent() {
  const { tripId } = useParams({ from: "/trip/$tripId/add-expense" });
  const navigate = useNavigate();
  const [user, setUser] = useState<{ id: number; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  // Fetch expense categories
  const categoriesQuery = useQuery({
    queryKey: ["expenseCategories"],
    queryFn: getExpenseCategories,
    enabled: !!user,
  });

  // Form with zod validation
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      description: "",
      amount: "",
      date: new Date(),
      payerId: user?.id.toString() || "",
      isPersonal: false,
      splitEvenly: true,
      participants: [],
    },
  });

  // Field array for participants
  const { fields, append, remove, update } = useFieldArray({
    name: "participants",
    control: form.control,
  });

  // If trip data is loaded, initialize form with all members as participants
  useEffect(() => {
    if (tripQuery.data && user && fields.length === 0) {
      const { members } = tripQuery.data;

      // Set current user as payer
      form.setValue("payerId", user.id.toString());

      // Add all members as participants with initial amount of 0
      members.forEach((member) => {
        append({
          userId: member.userId.toString(),
          amount: "0",
        });
      });
    }
  }, [tripQuery.data, user, fields.length, append, form]);

  // Watch for changes to relevant form fields
  const watchAmount = form.watch("amount");
  const watchIsPersonal = form.watch("isPersonal");
  const watchSplitEvenly = form.watch("splitEvenly");
  const watchPayerId = form.watch("payerId");
  const watchParticipants = form.watch("participants");

  // Recalculate split amounts when necessary
  useEffect(() => {
    if (watchAmount && watchSplitEvenly && !watchIsPersonal) {
      const totalAmount = parseFloat(watchAmount);
      if (isNaN(totalAmount)) return;

      const participantIds = watchParticipants.map((p) => p.userId);
      const participantCount = participantIds.length;

      if (participantCount === 0) return;

      // Calculate each person's share
      const amountPerPerson = (totalAmount / participantCount).toFixed(2);

      // Update each participant's amount
      watchParticipants.forEach((participant, index) => {
        update(index, {
          userId: participant.userId,
          amount: amountPerPerson,
        });
      });
    }
  }, [
    watchAmount,
    watchSplitEvenly,
    watchIsPersonal,
    watchParticipants,
    update,
  ]);

  // Create expense mutation
  const createExpenseMutation = useMutation({
    mutationFn: (values: ExpenseFormValues) => {
      if (!user) throw new Error("User not found");

      const totalAmount = parseFloat(values.amount);

      // For personal expenses, only include the payer as participant
      const participants = values.isPersonal
        ? [{ userId: parseInt(values.payerId), amount: totalAmount }]
        : values.participants.map((p) => ({
            userId: parseInt(p.userId),
            amount: parseFloat(p.amount),
          }));

      return createExpense({
        tripId: tripIdNumber,
        payerId: parseInt(values.payerId),
        amount: totalAmount,
        description: values.description,
        categoryId: values.categoryId ? parseInt(values.categoryId) : undefined,
        date: values.date.toISOString(),
        isPersonal: values.isPersonal,
        participants,
      });
    },
    onSuccess: () => {
      navigate({ to: `/trip/${tripId}` });
    },
    onError: (error: Error) => {
      setError(error.message || "Failed to create expense. Please try again.");
    },
  });

  // Form submission handler
  function onSubmit(values: ExpenseFormValues) {
    setError(null);

    // Validate that the sum of participant amounts equals the total amount
    // (Skip this validation for personal expenses)
    if (!values.isPersonal) {
      const totalAmount = parseFloat(values.amount);
      const participantSum = values.participants.reduce(
        (sum, p) => sum + parseFloat(p.amount),
        0,
      );

      // Allow for small floating point differences
      if (Math.abs(totalAmount - participantSum) > 0.01) {
        setError(
          `The sum of participant amounts (${participantSum.toFixed(2)}) must equal the total expense amount (${totalAmount.toFixed(2)})`,
        );
        return;
      }
    }

    createExpenseMutation.mutate(values);
  }

  if (!user) return null;

  if (tripQuery.isLoading || categoriesQuery.isLoading) {
    return <div className="flex justify-center py-12">Loading...</div>;
  }

  if (tripQuery.isError || categoriesQuery.isError) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {tripQuery.isError
            ? "Failed to load trip details."
            : "Failed to load expense categories."}
          <Button
            variant="link"
            onClick={() => {
              tripQuery.isError && tripQuery.refetch();
              categoriesQuery.isError && categoriesQuery.refetch();
            }}
          >
            Try Again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const trip = tripQuery.data;
  const { members } = trip;
  const categories = categoriesQuery.data || [];

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

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="w-full max-w-2xl">
        <Card>
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Add Expense</CardTitle>
                <CardDescription>
                  Record an expense for your trip: {trip.trip.name}
                </CardDescription>
              </div>
              <Link to={`/trip/${tripId}`}>
                <Button variant="outline">Cancel</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input placeholder="Dinner at Restaurant" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="100.00"
                            step="0.01"
                            min="0.01"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem
                                key={category.id}
                                value={category.id.toString()}
                              >
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground",
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="payerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Paid by</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Who paid?" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {members.map((member) => (
                              <SelectItem
                                key={member.userId}
                                value={member.userId.toString()}
                              >
                                {member.name}{" "}
                                {member.userId === user.id ? "(You)" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="isPersonal"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Personal Expense</FormLabel>
                        <FormDescription>
                          This expense is just for you and won't be split with
                          others
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {!watchIsPersonal && (
                  <>
                    <FormField
                      control={form.control}
                      name="splitEvenly"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Split Equally</FormLabel>
                            <FormDescription>
                              Split the expense equally among all participants
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <div>
                      <h3 className="text-sm font-medium mb-3">
                        Participants & Amounts
                      </h3>
                      <div className="space-y-2">
                        {fields.map((field, index) => {
                          const member = members.find(
                            (m) => m.userId.toString() === field.userId,
                          );
                          if (!member) return null;

                          return (
                            <div
                              key={field.id}
                              className="flex items-center space-x-4 rounded-md border p-3"
                            >
                              <div className="flex items-center space-x-3 flex-1">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={member.avatarUrl || ""} />
                                  <AvatarFallback>
                                    {getInitials(member.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium">
                                    {member.name}{" "}
                                    {member.userId === user.id ? "(You)" : ""}
                                  </p>
                                </div>
                              </div>

                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                className="w-24"
                                value={watchParticipants[index]?.amount}
                                onChange={(e) => {
                                  update(index, {
                                    userId: field.userId,
                                    amount: e.target.value,
                                  });
                                  // If manual amount is entered, disable split evenly
                                  if (watchSplitEvenly) {
                                    form.setValue("splitEvenly", false);
                                  }
                                }}
                                disabled={watchSplitEvenly}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createExpenseMutation.isPending}
                >
                  {createExpenseMutation.isPending
                    ? "Creating..."
                    : "Add Expense"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
