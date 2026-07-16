import express from "express";
import cors from "cors";

const app = express();

// Explicit CORS setup as requested
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization", "x-kindergarten-id"],
  credentials: true
}));

// Route logging middleware for debugging 404/CORS errors
app.use((req, res, next) => {
  const origin = req.headers.origin || "no-origin";
  console.log(`[ROUTE-LOG] Requested Path: ${req.path} | Method: ${req.method} | Origin Header: ${origin}`);
  next();
});

export default app;
