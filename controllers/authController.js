// controllers/authController.js
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
    const tokens = await googleMeetService.getTokenFromCode(code);
    console.log("Successfully exchanged code for tokens");

    // Format token for environment variable - create a single line JSON string
    const formattedToken = JSON.stringify(tokens);

    // In a production environment, save tokens to database or display for manual configuration
    if (process.env.NODE_ENV === "production") {
      console.log(
        "Please update GOOGLE_OAUTH_TOKEN environment variable with:",
        formattedToken
      );
    }

    res.send(`
      <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 40px auto;
              padding: 20px;
              line-height: 1.6;
            }
            .container {
              border: 1px solid #ddd;
              padding: 20px;
              border-radius: 5px;
            }
            h3 {
              color: #4CAF50;
            }
            code {
              background: #f4f4f4;
              padding: 5px 10px;
              border-radius: 4px;
              display: block;
              overflow-x: auto;
              white-space: nowrap;
              font-size: 14px;
              margin: 15px 0;
            }
            .instructions {
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #eee;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h3>Authentication successful!</h3>
            <p>You can close this window now.</p>
            
            <div class="instructions">
              <p><strong>IMPORTANT:</strong> Update your GOOGLE_OAUTH_TOKEN environment variable with the following value:</p>
              <code>${formattedToken}</code>
              <p>Make sure to copy the entire string as a single line with no extra spaces or quotes around it.</p>
            </div>
            
            <script>
              function copyToken() {
                const tokenStr = '${formattedToken.replace(/'/g, "\\'")}';
                navigator.clipboard.writeText(tokenStr)
                  .then(() => alert('Token copied to clipboard!'))
                  .catch(err => console.error('Failed to copy: ', err));
              }
              
              window.onload = function() {
                const codeBlock = document.querySelector('code');
                const btn = document.createElement('button');
                btn.textContent = 'Copy to Clipboard';
                btn.onclick = copyToken;
                btn.style.marginTop = '10px';
                codeBlock.parentNode.insertBefore(btn, codeBlock.nextSibling);
              };
            </script>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Error in OAuth callback:", error);
    res.status(500).json({ error: "Failed to complete authentication" });
  }
};

// Check if authenticated
const checkAuthStatus = (req, res) => {
  try {
    // Check if OAuth client can be initialized with valid credentials
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
