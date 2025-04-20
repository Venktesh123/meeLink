const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Import database connection
const connectDB = require("./config/db");

// Import routes
const authRoutes = require("./routes/authRoutes");
const meetingRoutes = require("./routes/meetingRoutes");

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/meetings", meetingRoutes);

// Root route
app.get("/", (req, res) => {
  res.send("Meeting Scheduler API is running");
});

// PORT
const PORT = process.env.PORT || 3000;

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("Available endpoints:");
  console.log("- GET  /api/auth/login         : Start OAuth2 flow");
  console.log(
    "- GET  /api/auth/oauth2callback : OAuth2 callback URL (redirect_uri)"
  );
  console.log("- GET  /api/auth/status        : Check authentication status");
  console.log("- GET  /api/meetings           : Get all meetings");
  console.log("- GET  /api/meetings/:id       : Get meeting by ID");
  console.log("- POST /api/meetings           : Create a new meeting");
  console.log("- PUT  /api/meetings/:id       : Update a meeting");
  console.log("- DELETE /api/meetings/:id     : Delete a meeting");
});
