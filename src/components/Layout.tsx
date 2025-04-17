import { Link, Outlet } from "@tanstack/react-router";
import { useState, useEffect } from "react";

export function Layout() {
  const [user, setUser] = useState<{ id: number; name: string } | null>(null);

  // Check if user exists in localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("trippy_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem("trippy_user");
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link
              to="/"
              className="text-2xl font-bold text-indigo-600 dark:text-indigo-400"
            >
              Trippy
            </Link>

            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-gray-700 dark:text-gray-300">
                  Hi, {user.name}
                </span>
                <button
                  onClick={() => {
                    localStorage.removeItem("trippy_user");
                    setUser(null);
                  }}
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <span className="text-gray-600 dark:text-gray-400">
                Join to get started
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <footer className="bg-white dark:bg-gray-800 shadow-inner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-gray-500 dark:text-gray-400 text-sm">
          Trippy - Split expenses with friends
        </div>
      </footer>
    </div>
  );
}
