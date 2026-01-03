/**
 * Server Entry Point - AnimeSalt API for Vercel Serverless Deployment
 */

// Export the Express app for Vercel serverless functions
const createApp = require('./app');

const app = createApp();

// Only start server if not in Vercel serverless environment
const PORT = process.env.PORT || 3000;
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`🚀 AnimeSalt API server running on http://localhost:${PORT}`);
        console.log(`📚 Documentation: http://localhost:${PORT}/docs`);
        console.log(`🏠 API Home: http://localhost:${PORT}/api/home`);
    });
}

// Export for Vercel
module.exports = app;
