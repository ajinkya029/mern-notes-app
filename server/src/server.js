import dotenv from "dotenv";
dotenv.config();
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/authRoutes.js";
import noteRoutes from "./routes/noteRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/notes", noteRoutes);

const clientDist = path.resolve(__dirname, "../../client/dist");
app.use(express.static(clientDist));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(clientDist, "index.html"), (err) => {
    if (err) res.status(404).json({ message: "Frontend build not found. Run npm run build." });
  });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Server error" });
});

mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/mern_notes")
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });
