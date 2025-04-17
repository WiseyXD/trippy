import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { joinTrip } from "../api/client";

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
const joinTripSchema = z.object({
  code: z.string().length(6, {
    message: "Trip code must be exactly 6 characters",
  }),
});

type JoinTripFormValues = z.infer<typeof joinTripSchema>;

export function JoinTripComponent() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: number; name: string } | null>(null);

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

  // Form with zod validation
  const form = useForm<JoinTripFormValues>({
    resolver: zodResolver(joinTripSchema),
    defaultValues: {
      code: "",
    },
  });

  // Trip joining mutation
  const joinTripMutation = useMutation({
    mutationFn: (values: JoinTripFormValues) => {
      if (!user) throw new Error("User not found");
      return joinTrip(values.code.toUpperCase(), user.id);
    },
    onSuccess: (data) => {
      navigate({ to: `/trip/${data.trip.id}` });
    },
    onError: (error: Error) => {
      setError(
        error.message ||
          "Failed to join trip. Please check the code and try again.",
      );
    },
  });

  // Form submission handler
  function onSubmit(values: JoinTripFormValues) {
    setError(null);
    joinTripMutation.mutate(values);
  }

  // Navigate to create trip page
  const handleCreateTrip = () => {
    navigate({ to: "/create" });
  };

  if (!user) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Join a Trip</CardTitle>
            <CardDescription className="text-center">
              Enter a trip code to join your friends
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
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trip Code</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="ABCDEF"
                          {...field}
                          onChange={(e) =>
                            field.onChange(e.target.value.toUpperCase())
                          }
                          className="text-center text-lg tracking-wider uppercase"
                          maxLength={6}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter the 6-character code shared by your friend
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={joinTripMutation.isPending}
                >
                  {joinTripMutation.isPending ? "Joining..." : "Join Trip"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <div className="w-full flex items-center gap-4 before:h-px before:flex-1 before:bg-gray-200 before:dark:bg-gray-700 after:h-px after:flex-1 after:bg-gray-200 after:dark:bg-gray-700">
              <span className="text-sm text-gray-500">OR</span>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleCreateTrip}
            >
              Create a New Trip
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
