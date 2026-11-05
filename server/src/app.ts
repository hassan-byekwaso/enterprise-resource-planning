import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errors";
import { requireTrustedOrigin } from "./middleware/origin";
import { authRouter } from "./routes/auth";
import { financeRouter } from "./routes/finance";
import { inventoryRouter } from "./routes/inventory";
import { reportsRouter } from "./routes/reports";
import { usersRouter } from "./routes/users";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: "16kb" }));
app.use(cookieParser());
app.use(requireTrustedOrigin);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/finance", financeRouter);
app.use("/api", inventoryRouter);
app.use("/api", reportsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});
app.use(errorHandler);
