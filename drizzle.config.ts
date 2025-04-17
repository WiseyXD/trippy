// import type { Config } from "drizzle-kit";

// const config: Config = {
//   dialect: "sqlite",
//   driver: "d1-http",
//   dbCredentials: {
//     accountId: process.env.ACCOUNT_ID!,
//     databaseId: process.env.DB_ID!,
//     token: process.env.D1_TOKEN!,
//   },
//   tablesFilter: ["!_cf_KV"],
// };

// export default config satisfies Config;
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations/",
  driver: "d1-http",
  dbCredentials: {
    accountId: process.env.ACCOUNT_ID!,
    databaseId: process.env.DB_ID!,
    token: process.env.D1_TOKEN!,
  },
});
