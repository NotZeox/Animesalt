/**
 * Express App - Main application setup
 */

const express = require('express');
const path = require('path');
const createApiRouter = require('./routes/api');
const createDocsRouter = require('./routes/docs');
const {
    errorHandler,
    notFoundHandler,
    requestLogger,
    corsMiddleware,
} = require('./middleware/errorHandler');

/**
 * Create and configure Express app
 */
function createApp() {
    const app = express();

    // Basic middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // CORS
    app.use(corsMiddleware);

    // Request logging
    app.use(requestLogger);

    // Static files (for landing page assets)
    app.use(express.static(path.join(__dirname, '../public')));

    // API routes
    app.use('/api', createApiRouter());

    // Docs routes
    app.use('/docs', createDocsRouter());

    // API info endpoint
    app.get('/api', (req, res) => {
        res.json({
            name: 'AnimeSalt API Production Edition',
            version: '5.0.0',
            baseUrl: '/api',
            docs: '/docs',
            message: 'Visit /docs for complete API documentation',
            endpoints: [
                { method: 'GET', path: '/api/home', description: 'Get homepage data' },
                { method: 'GET', path: '/api/info', description: 'Get anime info' },
                { method: 'GET', path: '/api/episodes', description: 'Get episode list' },
                { method: 'GET', path: '/api/stream', description: 'Get stream links' },
                { method: 'GET', path: '/api/movies', description: 'Get movies list' },
                { method: 'GET', path: '/api/movies/:id', description: 'Get movie info' },
                { method: 'GET', path: '/api/cartoon', description: 'Get cartoons' },
                { method: 'GET', path: '/api/search', description: 'Search anime' },
                { method: 'GET', path: '/api/genre/:genre', description: 'Get anime by genre' },
                { method: 'GET', path: '/api/random', description: 'Get random anime' },
                { method: 'GET', path: '/api/test-links', description: 'Test API with sample links' },
            ],
        });
    });

    // Health check
    app.get('/health', (req, res) => {
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: '5.0.0',
        });
    });

    // Landing page - serve static HTML file
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '../public/index.html'));
    });

    // 404 handler
    app.use(notFoundHandler);

    // Error handler
    app.use(errorHandler);

    return app;
}

/**
 * Generate landing page HTML
 */
function generateLandingPage() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AnimeSalt API - Production Edition</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
            --primary: #8b5cf6;
            --primary-dark: #7c3aed;
            --secondary: #ec4899;
            --background: #0f0f13;
            --surface: #1a1a24;
            --surface-light: #252532;
            --text: #f3f4f6;
            --text-muted: #9ca3af;
            --success: #10b981;
            --warning: #f59e0b;
        }
        body {
            font-family: 'Outfit', sans-serif;
            background: var(--background);
            color: var(--text);
            min-height: 100vh;
            overflow-x: hidden;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
        .hero {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 60px 0;
            text-align: center;
        }
        .logo {
            font-family: 'Space Grotesk', sans-serif;
            font-size: clamp(48px, 10vw, 80px);
            font-weight: 800;
            margin-bottom: 16px;
            background: linear-gradient(135deg, var(--text) 0%, var(--primary) 50%, var(--secondary) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .tagline {
            font-size: clamp(16px, 3vw, 20px);
            color: var(--text-muted);
            margin-bottom: 48px;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
        }
        .btn {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 16px 32px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.3s ease;
            border: none;
            cursor: pointer;
        }
        .btn-primary {
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
            color: white;
        }
        .btn-secondary {
            background: var(--surface);
            color: var(--text);
            border: 1px solid var(--surface-light);
        }
        .btn:hover { transform: translateY(-4px); }
        .cta-buttons { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; margin-bottom: 64px; }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 24px;
            max-width: 800px;
            margin: 0 auto;
        }
        .stat-card {
            background: var(--surface);
            border-radius: 16px;
            padding: 24px;
            text-align: center;
            border: 1px solid var(--surface-light);
        }
        .stat-value {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 36px;
            font-weight: 700;
            color: var(--primary);
            margin-bottom: 8px;
        }
        .stat-label { font-size: 14px; color: var(--text-muted); text-transform: uppercase; }
        .features { padding: 80px 0; }
        .section-title {
            font-family: 'Space Grotesk', sans-serif;
            font-size: clamp(32px, 5vw, 48px);
            font-weight: 700;
            text-align: center;
            margin-bottom: 64px;
        }
        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 24px;
        }
        .feature-card {
            background: var(--surface);
            border-radius: 20px;
            padding: 32px;
            border: 1px solid var(--surface-light);
        }
        .feature-icon {
            font-size: 40px;
            margin-bottom: 20px;
        }
        .feature-title { font-size: 20px; font-weight: 600; margin-bottom: 12px; }
        .feature-desc { color: var(--text-muted); line-height: 1.6; }
        .footer {
            text-align: center;
            padding: 40px 0;
            border-top: 1px solid var(--surface-light);
            color: var(--text-muted);
        }
        .footer a { color: var(--primary); text-decoration: none; }
        @media (max-width: 768px) {
            .cta-buttons { flex-direction: column; align-items: center; }
            .btn { width: 100%; max-width: 300px; justify-content: center; }
        }
    </style>
</head>
<body>
    <section class="hero">
        <div class="container">
            <h1 class="logo">AnimeSalt API</h1>
            <p class="tagline">
                The most comprehensive anime data API powered by animesalt.cc.
                Extract everything - episodes, streams, genres, movies, cartoons.
            </p>
            <div class="cta-buttons">
                <a href="/docs" class="btn btn-primary">Read Documentation</a>
                <a href="/api/home" class="btn btn-secondary">Try API</a>
            </div>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">25+</div>
                    <div class="stat-label">Endpoints</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">2</div>
                    <div class="stat-label">Players</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">100%</div>
                    <div class="stat-label">Coverage</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">v5.0</div>
                    <div class="stat-label">Version</div>
                </div>
            </div>
        </div>
    </section>

    <section class="features">
        <div class="container">
            <h2 class="section-title">Production Features</h2>
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon">📺</div>
                    <h3 class="feature-title">Episode Management</h3>
                    <p class="feature-desc">Extract all episodes with proper Season x Episode format and availability status.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🎬</div>
                    <h3 class="feature-title">Download Links</h3>
                    <p class="feature-desc">Extract download links from multiple file hosts with quality indicators.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🏷️</div>
                    <h3 class="feature-title">Regional Availability</h3>
                    <p class="feature-desc">Detects when episodes are not available in certain languages.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🎯</div>
                    <h3 class="feature-title">Movies Endpoint</h3>
                    <p class="feature-desc">Complete movie listing with pagination and genre filtering.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">📚</div>
                    <h3 class="feature-title">Cartoon Sub-Categories</h3>
                    <p class="feature-desc">Filter cartoons by Series, Movies, Shorts, Specials, and Crossovers.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🧪</div>
                    <h3 class="feature-title">Testing Endpoint</h3>
                    <p class="feature-desc">Test API against sample links to verify production readiness.</p>
                </div>
            </div>
        </div>
    </section>

    <footer class="footer">
        <div class="container">
            <p>Powered by <a href="https://animesalt.cc" target="_blank">animesalt.cc</a> | Built with love</p>
        </div>
    </footer>
</body>
</html>
    `;
}

module.exports = createApp;
