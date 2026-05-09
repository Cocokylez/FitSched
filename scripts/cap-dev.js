#!/usr/bin/env node
// Sets Capacitor dev mode and syncs to Android
// Usage: node scripts/cap-dev.js

const { execSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");

console.log("📱 Setting Capacitor to DEV mode (localhost:3000)...");
console.log("   Make sure 'npm run dev' is running in another terminal.\n");

try {
  execSync("npx cap copy android", {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, CAP_DEV: "true", CAP_SERVER_URL: "http://localhost:3000" },
  });
  console.log("\n✅ Done! Open Android Studio and run the app.");
  console.log("   App will connect to http://localhost:3000.\n");
} catch (err) {
  console.error("\n❌ Sync failed:", err.message);
  process.exit(1);
}
