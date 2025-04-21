// token-formatter.js
// A utility script to format a Google OAuth token for environment variables

// Usage: node token-formatter.js 'your-raw-token-json-here'

/**
 * Formats a Google OAuth token string for use in environment variables
 * @param {string} rawToken - The raw token JSON string that needs formatting
 * @returns {string} - Properly formatted token for environment variables
 */
function formatToken(rawToken) {
  try {
    // Trim whitespace
    let tokenStr = rawToken.trim();

    // Handle case where token is wrapped in quotes
    if (
      (tokenStr.startsWith("'") && tokenStr.endsWith("'")) ||
      (tokenStr.startsWith('"') && tokenStr.endsWith('"'))
    ) {
      tokenStr = tokenStr.substring(1, tokenStr.length - 1);
    }

    // Parse as JSON to validate and normalize
    const tokenObj = JSON.parse(tokenStr);

    // Convert back to a clean, single-line JSON string
    return JSON.stringify(tokenObj);
  } catch (error) {
    console.error("Error formatting token:", error.message);
    return null;
  }
}

// When run directly from command line
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("❌ Error: No token provided");
    console.log("Usage: node token-formatter.js 'your-raw-token-json-here'");
    process.exit(1);
  }

  const rawToken = args[0];
  const formattedToken = formatToken(rawToken);

  if (formattedToken) {
    console.log("\n✅ Formatted token for environment variable:");
    console.log("-------------------------------------------");
    console.log(`GOOGLE_OAUTH_TOKEN=${formattedToken}`);
    console.log("-------------------------------------------\n");
    console.log(
      "Copy the entire line above into your .env file or Vercel environment variables."
    );
    console.log("Make sure there are no extra spaces or quotes around it.");
  } else {
    console.error("❌ Failed to format token. Please check your input.");
  }
}

module.exports = { formatToken };
