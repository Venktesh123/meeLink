// services/googleMeetService.js
const fs = require("fs");
const { google } = require("googleapis");

// Constants
const SCOPES = [
  "https://www.googleapis.com/auth/calendar", // Full access to calendar (needed for notifications)
  "https://www.googleapis.com/auth/calendar.events",
];
const TOKEN_PATH = "token.json";

// Initialize OAuth2 client
let oAuth2Client;

const initializeOAuthClient = () => {
  try {
    // Get credentials from environment variables
    const client_id = process.env.GOOGLE_CLIENT_ID;
    const client_secret = process.env.GOOGLE_CLIENT_SECRET;
    const redirect_uri =
      process.env.GOOGLE_REDIRECT_URI ||
      "https://mee-link.vercel.app/api/auth/oauth2callback";

    if (!client_id || !client_secret) {
      throw new Error(
        "Missing Google OAuth credentials in environment variables"
      );
    }

    oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uri
    );

    // Load existing token if it exists
    try {
      if (process.env.GOOGLE_OAUTH_TOKEN) {
        const token = JSON.parse(process.env.GOOGLE_OAUTH_TOKEN);
        oAuth2Client.setCredentials(token);
      } else if (fs.existsSync(TOKEN_PATH)) {
        const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
        oAuth2Client.setCredentials(token);
      }
    } catch (error) {
      console.warn(
        "No valid token found, OAuth2 initialization will require authentication"
      );
    }

    return oAuth2Client;
  } catch (error) {
    console.error("Error loading credentials:", error);
    throw new Error("Failed to initialize OAuth client");
  }
};

// Generate auth URL for OAuth2 flow
const getAuthUrl = () => {
  if (!oAuth2Client) {
    oAuth2Client = initializeOAuthClient();
  }

  return oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent", // Force consent screen to get a new refresh token
    include_granted_scopes: true, // Include previously granted scopes
  });
};

// Exchange authorization code for tokens
const getTokenFromCode = async (code) => {
  if (!oAuth2Client) {
    oAuth2Client = initializeOAuthClient();
  }

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    // Print token details for debugging (excluding sensitive parts)
    console.log("Token received. Access token present:", !!tokens.access_token);
    console.log("Refresh token present:", !!tokens.refresh_token);
    console.log("Token expiry:", new Date(tokens.expiry_date).toLocaleString());

    // Save token for future use
    if (process.env.NODE_ENV !== "production") {
      // In development, save to file
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    } else {
      // In production, you'll need to save this to a database or secure storage
      // For now, let's log it so you can manually update your environment variables
      console.log(
        "IMPORTANT: Update GOOGLE_OAUTH_TOKEN with:",
        JSON.stringify(tokens)
      );
    }

    return tokens;
  } catch (error) {
    console.error("Error retrieving access token:", error);
    throw new Error("Error retrieving access token");
  }
};

// Rest of the file remains the same...
const createGoogleMeet = async (
  subject,
  description,
  startTime,
  endTime,
  attendees
) => {
  if (!oAuth2Client) {
    oAuth2Client = initializeOAuthClient();
  }

  const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

  // Make sure attendees is an array of valid email addresses
  const validAttendees = Array.isArray(attendees)
    ? attendees.filter(
        (email) => typeof email === "string" && email.includes("@")
      )
    : [];

  console.log(`Creating meeting with attendees: ${validAttendees.join(", ")}`);

  // Create event resource with more explicit notification settings
  const event = {
    summary: subject,
    description:
      description + "\n\nThis meeting includes a Google Meet video conference.",
    start: {
      dateTime: new Date(startTime).toISOString(),
      timeZone: "UTC",
    },
    end: {
      dateTime: new Date(endTime).toISOString(),
      timeZone: "UTC",
    },
    attendees: validAttendees.map((email) => ({
      email,
      responseStatus: "needsAction",
    })),
    // Enable Google Meet
    conferenceData: {
      createRequest: {
        requestId: `meet-${Date.now()}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
    // Email notification settings - more explicit configuration
    guestsCanInviteOthers: true,
    guestsCanSeeOtherGuests: true,
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 60 },
        { method: "popup", minutes: 10 },
      ],
    },
  };

  try {
    console.log(`Attempting to create calendar event for "${subject}"...`);

    // First check if we have valid auth
    try {
      const calList = await calendar.calendarList.list({
        maxResults: 1,
      });
      console.log(
        `Auth confirmed. User has access to ${calList.data.items.length} calendars.`
      );
    } catch (authError) {
      console.error("Authentication check failed:", authError.message);
      throw new Error(
        "Google Calendar authentication failed. Please re-authenticate."
      );
    }

    // Insert the event with explicit notification parameters
    const response = await calendar.events.insert({
      calendarId: "primary",
      resource: event,
      conferenceDataVersion: 1,
      sendNotifications: true,
      sendUpdates: "all", // This ensures all attendees get notifications
    });

    console.log(
      `Calendar event created successfully. Event ID: ${response.data.id}`
    );
    console.log(
      `Google Meet link: ${response.data.hangoutLink || "No link generated"}`
    );

    // Don't rely on the patch method for notifications
    // Instead, make sure the initial event creation has all necessary info

    return {
      ...response.data,
      notificationsSent: true,
      attendeesCount: validAttendees.length,
    };
  } catch (error) {
    console.error("Error creating Google Calendar event:", error);
    if (error.response) {
      console.error("Response error data:", error.response.data);
    }
    throw new Error(`Failed to create meeting: ${error.message}`);
  }
};

module.exports = {
  initializeOAuthClient,
  getAuthUrl,
  getTokenFromCode,
  createGoogleMeet,
};
