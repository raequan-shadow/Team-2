import "dotenv/config";

export function assertLocalDevelopmentDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL must be set to the local smartpark_dev database.");
  }

  let url;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error("DATABASE_URL must be a valid URL for the local smartpark_dev database.");
  }

  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(host);
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));

  if (!isLocalHost || database !== "smartpark_dev") {
    throw new Error("Refusing to run: DATABASE_URL must target local smartpark_dev.");
  }
}
