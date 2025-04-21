const { google } = require("googleapis");
require("dotenv").config();

class GoogleMeetService {
  constructor() {
    this.oAuth2Client = null;
  }

  // Create credentials object from environment variables
  getCredentials() {
    const {
      GOOGLE_CREDENTIALS_CLIENT_ID,
      GOOGLE_CREDENTIALS_CLIENT_SECRET,
      GOOGLE_CREDENTIALS_REDIRECT_URIS,
    } = process.env;

    // Validate credentials
    if (!GOOGLE_CREDENTIALS_CLIENT_ID) {
      throw new Error("Google Client ID is missing");
    }
    if (!GOOGLE_CREDENTIALS_CLIENT_SECRET) {
      throw new Error("Google Client Secret is missing");
    }

    // Parse redirect URIs (support multiple URIs)
    const redirectUris = GOOGLE_CREDENTIALS_REDIRECT_URIS
      ? GOOGLE_CREDENTIALS_REDIRECT_URIS.split(",").map((uri) => uri.trim())
      : ["https://mee-link-m36.vercel.app/api/auth/oauth2callback"];

    return {
      web: {
        client_id: GOOGLE_CREDENTIALS_CLIENT_ID,
        client_secret: GOOGLE_CREDENTIALS_CLIENT_SECRET,
        redirect_uris: redirectUris,
      },
    };
  }

  // Initialize OAuth Client
  initializeOAuthClient() {
    try {
      const credentials = this.getCredentials();
      const { client_id, client_secret, redirect_uris } = credentials.web;

      // Create OAuth2 client
      const client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
      );

      // Retrieve and set token
      const token = this.getTokenFromEnvOrFile();

      // Validate token
      if (!token.access_token || !token.refresh_token) {
        throw new Error("Invalid token structure");
      }

      // Set credentials
      client.setCredentials(token);

      // Log token details (without exposing sensitive information)
      console.log("✅ OAuth Client Initialized");
      console.log("Token Details:");
      console.log(
        "- Access Token: " + (token.access_token ? "Present ✓" : "Missing ✗")
      );
      console.log(
        "- Refresh Token: " + (token.refresh_token ? "Present ✓" : "Missing ✗")
      );
      console.log(
        "- Expiry Date: " + new Date(token.expiry_date).toLocaleString()
      );

      return client;
    } catch (error) {
      console.error("🚨 OAuth Initialization Error:", error);
      throw error;
    }
  }

  // Secure token retrieval method
  getTokenFromEnvOrFile() {
    try {
      // Priority 1: Environment Variable
      if (process.env.GOOGLE_OAUTH_TOKEN) {
        console.log("🔑 Using token from environment variable");
        return JSON.parse(process.env.GOOGLE_OAUTH_TOKEN);
      }

      throw new Error("No valid token found");
    } catch (error) {
      console.error("❌ Token Retrieval Error:", error);
      throw new Error("Failed to retrieve OAuth token");
    }
  }

  // Generate Authorization URL
  getAuthUrl() {
    try {
      const client = this.initializeOAuthClient();
      return client.generateAuthUrl({
        access_type: "offline",
        scope: [
          "https://www.googleapis.com/auth/calendar",
          "https://www.googleapis.com/auth/calendar.events",
        ],
        prompt: "consent",
      });
    } catch (error) {
      console.error("Auth URL Generation Error:", error);
      throw error;
    }
  }

  // Token Exchange Method
  async getTokenFromCode(code) {
    try {
      const credentials = this.getCredentials();
      const { client_id, client_secret, redirect_uris } = credentials.web;

      const client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
      );

      const { tokens } = await client.getToken(code);

      console.log("✅ Tokens exchanged successfully");
      return tokens;
    } catch (error) {
      console.error("Token Exchange Error:", error);
      throw error;
    }
  }

  // Additional methods (createGoogleMeet, etc.) would follow similar patterns
}

module.exports = new GoogleMeetService();
