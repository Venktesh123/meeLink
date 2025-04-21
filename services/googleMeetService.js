const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
require("dotenv").config(); // Ensure environment variables are loaded

// OAuth Scopes
const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];

class GoogleMeetService {
  constructor() {
    this.oAuth2Client = null;
    this.credentialsPath = path.join(process.cwd(), "credentials.json");
    this.tokenPath = path.join(process.cwd(), "token.json");
  }

  // Validate environment variables
  validateCredentials() {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } =
      process.env;

    if (!GOOGLE_CLIENT_ID) {
      console.error("❌ GOOGLE_CLIENT_ID is missing");
      throw new Error("GOOGLE_CLIENT_ID is required");
    }

    if (!GOOGLE_CLIENT_SECRET) {
      console.error("❌ GOOGLE_CLIENT_SECRET is missing");
      throw new Error("GOOGLE_CLIENT_SECRET is required");
    }

    if (!GOOGLE_REDIRECT_URI) {
      console.error("❌ GOOGLE_REDIRECT_URI is missing");
      throw new Error("GOOGLE_REDIRECT_URI is required");
    }
  }

  // Initialize OAuth2 Client
  initializeOAuthClient() {
    try {
      // Validate credentials first
      this.validateCredentials();

      const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } =
        process.env;

      const client = new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        GOOGLE_REDIRECT_URI
      );

      // Try to load existing token
      try {
        if (process.env.GOOGLE_OAUTH_TOKEN) {
          const token = JSON.parse(process.env.GOOGLE_OAUTH_TOKEN);
          client.setCredentials(token);
        } else if (fs.existsSync(this.tokenPath)) {
          const token = JSON.parse(fs.readFileSync(this.tokenPath));
          client.setCredentials(token);
        }
      } catch (tokenError) {
        console.warn(
          "No valid token found. Authentication will be required.",
          tokenError
        );
      }

      return client;
    } catch (error) {
      console.error("OAuth Client Initialization Error:", error.message);
      throw error;
    }
  }

  // Generate Authorization URL
  getAuthUrl() {
    try {
      const client = this.initializeOAuthClient();
      return client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
        prompt: "consent",
      });
    } catch (error) {
      console.error("Error generating auth URL:", error);
      throw error;
    }
  }

  // Exchange Code for Tokens
  async getTokenFromCode(code) {
    try {
      const client = this.initializeOAuthClient();
      const { tokens } = await client.getToken(code);

      // Log token details for debugging
      console.log("Token Details:");
      console.log(
        "Access Token:",
        tokens.access_token ? "Received" : "Missing"
      );
      console.log(
        "Refresh Token:",
        tokens.refresh_token ? "Received" : "Missing"
      );
      console.log("Expiry:", new Date(tokens.expiry_date).toLocaleString());

      // Save tokens locally for development
      if (process.env.NODE_ENV !== "production") {
        fs.writeFileSync(this.tokenPath, JSON.stringify(tokens));
      }

      return tokens;
    } catch (error) {
      console.error("Token Exchange Error:", error);
      throw error;
    }
  }

  // Additional methods for Meet creation would follow...
}

module.exports = new GoogleMeetService();
