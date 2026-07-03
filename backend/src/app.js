import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import { notFound, errorHandler } from "./middleware/error.js";
import { uploadDir } from "./middleware/upload.js";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import companyRoutes from "./routes/companies.js";
import memberRoutes from "./routes/members.js";
import projectRoutes from "./routes/projects.js";
import lotRoutes from "./routes/lots.js";
import reserveRoutes from "./routes/reserves.js";
import documentRoutes from "./routes/documents.js";
import photoRoutes from "./routes/photos.js";
import taskRoutes from "./routes/tasks.js";
import meetingRoutes from "./routes/meetings.js";
import financeRoutes from "./routes/finance.js";
import materialRoutes from "./routes/materials.js";
import supplierRoutes from "./routes/suppliers.js";
import supplyRoutes from "./routes/supply.js";
import orderRoutes from "./routes/orders.js";
import stockRoutes from "./routes/stock.js";
import dashboardRoutes from "./routes/dashboard.js";
import miscRoutes from "./routes/misc.js";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN?.split(",") || "*",
    credentials: true,
  })
);
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));

// Fichiers uploadés
app.use("/uploads", express.static(uploadDir));

// Healthcheck
app.get("/api/health", (req, res) => res.json({ status: "ok", service: "ViaBTP API", time: new Date() }));

// Routes API
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/lots", lotRoutes);
app.use("/api/reserves", reserveRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/photos", photoRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/supply", supplyRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api", miscRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
