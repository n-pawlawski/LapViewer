import { initDatabase, closeDatabase } from "../src/db/database.js";
import { seedDevUserIfNeeded } from "../src/db/devSeed.js";
import { authenticateUser } from "../src/services/auth.js";
import { getUserByEmail } from "../src/db/users.js";

initDatabase();
seedDevUserIfNeeded();
const user = getUserByEmail("root");
console.log("found user:", user?.email, "has hash:", !!user?.passwordHash);
const authed = await authenticateUser("root", "root");
console.log("authenticated:", authed?.email ?? "FAILED");
closeDatabase();
