import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { createUser } from "../api/client";

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

// Form schema
const userFormSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email().optional().or(z.literal("")),
});

type UserFormValues = z.infer<typeof userFormSchema>;

export function HomeComponent() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  // Check if user exists in localStorage
  useEffect(() => {
    const user = localStorage.getItem("trippy_user");
    if (user) {
      navigate({ to: "/join" });
    }
  }, [navigate]);

  // Form with zod validation
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  });

  // User creation mutation
  const createUserMutation = useMutation({
    mutationFn: (values: UserFormValues) =>
      createUser(values.name, values.email || undefined),
    onSuccess: (user) => {
      localStorage.setItem(
        "trippy_user",
        JSON.stringify({
          id: user.id,
          name: user.name,
        }),
      );
      navigate({ to: "/join" });
    },
    onError: (error: Error) => {
      setError(error.message || "Failed to create user. Please try again.");
    },
  });

  // Form submission handler
  function onSubmit(values: UserFormValues) {
    setError(null);
    createUserMutation.mutate(values);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">
              Welcome to Trippy
            </CardTitle>
            <CardDescription className="text-center">
              The simple way to share expenses with friends during trips
            </CardDescription>
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
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your name" {...field} />
                      </FormControl>
                      <FormDescription>
                        This is how you'll appear to others in your trips.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="your@email.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        Your email will only be used for trip notifications.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createUserMutation.isPending}
                >
                  {createUserMutation.isPending ? "Creating..." : "Get Started"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-gray-500">
              No sign-up required. Just enter your name to get started.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
