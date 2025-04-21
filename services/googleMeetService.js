// services/googleMeetService.js
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

  // Secure token retrieval method with improved formatting handling
  getTokenFromEnvOrFile() {
    try {
      // Priority 1: Environment Variable
      if (process.env.GOOGLE_OAUTH_TOKEN) {
        console.log("🔑 Using token from environment variable");

        // Get the token string and clean it
        let tokenStr = process.env.GOOGLE_OAUTH_TOKEN;

        // Clean up the token string - trim whitespace and handle potential formatting issues
        tokenStr = tokenStr.trim();

        // Parse the JSON token
        try {
          return JSON.parse(tokenStr);
        } catch (parseError) {
          console.error("❌ Error parsing token JSON:", parseError);

          // Additional error handling for common issues
          if (tokenStr.startsWith("'") || tokenStr.startsWith('"')) {
            // Try removing extra quotes that might be wrapping the JSON
            try {
              const unwrappedToken = tokenStr.substring(1, tokenStr.length - 1);
              return JSON.parse(unwrappedToken);
            } catch (e) {
              console.error("❌ Failed to parse token after unwrapping quotes");
            }
          }

          throw new Error("Invalid token format in environment variable");
        }
      }

      throw new Error("No valid token found");
    } catch (error) {
      console.error("❌ Token Retrieval Error:", error);
      throw new Error("Failed to retrieve OAuth token: " + error.message);
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

      // Log the properly formatted token for copy-paste into env variables
      const formattedToken = JSON.stringify(tokens);
      console.log(
        "📋 Copy this token to your GOOGLE_OAUTH_TOKEN environment variable:"
      );
      console.log(formattedToken);

      return tokens;
    } catch (error) {
      console.error("Token Exchange Error:", error);
      throw error;
    }
  }

  // Create a Google Meet event
  async createGoogleMeet(
    subject,
    description,
    startTime,
    endTime,
    attendees = []
  ) {
    try {
      // Initialize the OAuth client if it doesn't exist
      if (!this.oAuth2Client) {
        this.oAuth2Client = this.initializeOAuthClient();
      }

      // Create Calendar API instance
      const calendar = google.calendar({
        version: "v3",
        auth: this.oAuth2Client,
      });

      // Format attendees for Google Calendar API
      const formattedAttendees = attendees.map((email) => ({ email }));

      // Prepare event details
      const event = {
        summary: subject,
        description: description,
        start: {
          dateTime: new Date(startTime).toISOString(),
          timeZone: "UTC",
        },
        end: {
          dateTime: new Date(endTime).toISOString(),
          timeZone: "UTC",
        },
        attendees: formattedAttendees,
        conferenceData: {
          createRequest: {
            requestId: `${Date.now()}-${Math.random()
              .toString(36)
              .substring(2, 11)}`,
            conferenceSolutionKey: {
              type: "hangoutsMeet",
            },
          },
        },
      };

      // Insert event and create Google Meet
      const response = await calendar.events.insert({
        calendarId: "primary",
        resource: event,
        conferenceDataVersion: 1,
        sendNotifications: true,
      });

      console.log("📅 Google Meet created successfully");
      return response.data;
    } catch (error) {
      console.error("❌ Error creating Google Meet:", error);
      throw error;
    }
  }
}

module.exports = new GoogleMeetService();
