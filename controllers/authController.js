const googleMeetService = require("../services/googleMeetService");

// Start OAuth2 flow
const login = (req, res) => {
  try {
    const authUrl = googleMeetService.getAuthUrl();
    console.log("Redirecting to Google OAuth: ", authUrl);
    res.redirect(authUrl);
  } catch (error) {
    console.error("Error generating auth URL:", error);
    res.status(500).json({ error: "Authentication service unavailable" });
  }
};

// OAuth2 callback handler
const oauth2Callback = async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: "No authorization code received" });
  }

  try {
    console.log("Received OAuth callback with code");
    await googleMeetService.getTokenFromCode(code);
    console.log("Successfully exchanged code for tokens");
    res.send("Authentication successful! You can close this window.");
  } catch (error) {
    console.error("Error in OAuth callback:", error);
    res.status(500).json({ error: "Failed to complete authentication" });
  }
};

// Check if authenticated
const checkAuthStatus = (req, res) => {
  try {
    // Check if token file exists and is valid
    const isAuthenticated = googleMeetService.initializeOAuthClient() !== null;
    console.log(
      "Authentication status check: ",
      isAuthenticated ? "Authenticated" : "Not authenticated"
    );
    res.json({ isAuthenticated });
  } catch (error) {
    console.error("Error checking authentication status:", error);
    res.json({ isAuthenticated: false });
  }
};

module.exports = {
  login,
  oauth2Callback,
  checkAuthStatus,
};
