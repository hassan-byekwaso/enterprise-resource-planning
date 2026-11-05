import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./db";

let server: ReturnType<typeof app.listen> | undefined;
let shutdownPromise: Promise<void> | undefined;

function shutdown(reason: string, exitCode = 0): Promise<void> {
  if (shutdownPromise) return shutdownPromise;

  shutdownPromise = (async () => {
    console.info(`Shutting down ERP API: ${reason}`);
    process.exitCode = exitCode;

    const forceExitTimer = setTimeout(() => {
      console.error("ERP API shutdown timed out; forcing process exit");
      process.exit(1);
    }, 10_000);

    if (server?.listening) {
      await new Promise<void>((resolve) => {
        server?.close((error) => {
          if (error) {
            console.error("Error while closing HTTP server:", error);
            process.exitCode = 1;
          }
          resolve();
        });
      });
    }

    try {
      await prisma.$disconnect();
    } catch (error) {
      console.error("Error while disconnecting Prisma:", error);
      process.exitCode = 1;
    } finally {
      clearTimeout(forceExitTimer);
    }
  })();

  return shutdownPromise;
}

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  void shutdown("unhandled promise rejection", 1);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception thrown:", error);
  void shutdown("uncaught exception", 1);
});

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

async function startServer() {
  try {
    await prisma.$connect();
    server = app.listen(env.SERVER_PORT, () => {
      console.log(`ERP API listening on port ${env.SERVER_PORT}`);
    });
    server.on("error", (error) => {
      console.error(`HTTP server failed on port ${env.SERVER_PORT}:`, error);
      void shutdown("HTTP server error", 1);
    });
  } catch (error) {
    console.error("ERP API startup failed:", error);
    await shutdown("startup failure", 1);
  }
}

void startServer();
