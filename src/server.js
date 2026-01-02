/**
 * Server Entry Point - Start the AnimeSalt API server
 */

const createApp = require('./app');
const config = require('./config');

const app = createApp();
const PORT = config.server.port;
const HOST = config.server.host;

const server = app.listen(PORT, HOST, () => {
    console.log('========================================');
    console.log('   AnimeSalt API - Production Edition v5.0');
    console.log('========================================');
    console.log(`Server running on port ${PORT}`);
    console.log(`API Base URL: ${config.baseUrl}`);
    console.log('');
    console.log('Main Pages:');
    console.log(`   Landing Page: http://localhost:${PORT}/`);
    console.log(`   API Docs:     http://localhost:${PORT}/docs`);
    console.log(`   API Info:     http://localhost:${PORT}/api`);
    console.log('');
    console.log('Key Endpoints:');
    console.log('   GET /api/home          - Homepage with all content');
    console.log('   GET /api/info          - Anime details with availability');
    console.log('   GET /api/episodes      - Complete episode list');
    console.log('   GET /api/stream        - Stream + download links');
    console.log('   GET /api/movies        - Movies with pagination');
    console.log('   GET /api/movies/:id    - Movie details');
    console.log('   GET /api/cartoon       - Cartoons with sub-categories');
    console.log('   GET /api/search        - Search anime');
    console.log('   GET /api/test-links    - Test API with sample links');
    console.log('');
    console.log('Press Ctrl+C to stop\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

module.exports = server;
