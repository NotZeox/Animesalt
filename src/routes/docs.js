/**
 * Documentation Routes - API documentation endpoints
 */

const express = require('express');
const config = require('../config');

/**
 * Create documentation router
 */
function createDocsRouter() {
    const router = express.Router();

    // API info endpoint (JSON)
    router.get('/', (req, res) => {
        res.json({
            success: true,
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

    // HTML Documentation
    router.get('/full', (req, res) => {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(generateDocsHtml());
    });

    return router;
}

/**
 * Generate API documentation HTML
 */
function generateDocsHtml() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AnimeSalt API Documentation</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #fff;
            min-height: 100vh;
            padding: 40px 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            background: linear-gradient(90deg, #e94560, #0f3460);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .subtitle { color: #a0a0a0; margin-bottom: 40px; font-size: 1.1em; }
        .section {
            background: rgba(255,255,255,0.05);
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 30px;
            border: 1px solid rgba(255,255,255,0.1);
        }
        .section h2 { color: #e94560; margin-bottom: 20px; font-size: 1.5em; }
        .endpoint {
            background: rgba(0,0,0,0.3);
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 15px;
            border-left: 4px solid #e94560;
        }
        .method {
            display: inline-block;
            background: #e94560;
            color: #fff;
            padding: 5px 12px;
            border-radius: 5px;
            font-weight: bold;
            font-size: 0.8em;
            margin-right: 10px;
        }
        .path { font-family: monospace; font-size: 1.1em; color: #4ecdc4; }
        .description { color: #a0a0a0; margin: 10px 0; }
        .params { margin-top: 15px; }
        .param {
            background: rgba(255,255,255,0.05);
            padding: 10px 15px;
            border-radius: 5px;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
        }
        .param-name { font-weight: bold; color: #4ecdc4; margin-right: 10px; min-width: 120px; }
        .param-type { color: #e94560; font-size: 0.85em; margin-right: 10px; }
        .param-required { color: #ff6b6b; font-size: 0.75em; margin-left: 5px; }
        .feature {
            display: inline-block;
            background: linear-gradient(90deg, #e94560, #0f3460);
            padding: 8px 15px;
            border-radius: 20px;
            margin: 5px;
            font-size: 0.9em;
        }
        .response-field {
            background: rgba(78, 205, 196, 0.1);
            padding: 8px 12px;
            border-radius: 5px;
            margin: 5px 0;
            font-family: monospace;
            font-size: 0.9em;
        }
        code { background: rgba(0,0,0,0.3); padding: 2px 8px; border-radius: 4px; color: #4ecdc4; }
        .example { background: rgba(0,0,0,0.5); padding: 15px; border-radius: 8px; margin-top: 10px; font-family: monospace; overflow-x: auto; }
        a { color: #e94560; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <h1>AnimeSalt API</h1>
        <p class="subtitle">Version 5.0.0 | Production-Grade Anime Data Extraction API</p>

        <div class="section">
            <h2>Key Features</h2>
            <span class="feature">Complete Data Extraction</span>
            <span class="feature">Episode Management</span>
            <span class="feature">Download Links</span>
            <span class="feature">Regional Availability</span>
            <span class="feature">Movies Endpoint</span>
            <span class="feature">Cartoon Support</span>
            <span class="feature">API Testing</span>
        </div>

        <div class="section">
            <h2>Available Endpoints</h2>

            <div class="endpoint">
                <span class="method">GET</span>
                <span class="path">/api/home</span>
                <p class="description">Get homepage data with spotlights, trending, networks, genres, and languages</p>
            </div>

            <div class="endpoint">
                <span class="method">GET</span>
                <span class="path">/api/info?id={anime_id}</span>
                <p class="description">Get detailed information about a specific anime</p>
                <div class="params">
                    <div class="param">
                        <span class="param-name">id</span>
                        <span class="param-type">string</span>
                        <span class="param-required">required</span>
                        <span style="color: #a0a0a0; margin-left: 10px;">Example: <code>naruto-shippuden</code></span>
                    </div>
                </div>
            </div>

            <div class="endpoint">
                <span class="method">GET</span>
                <span class="path">/api/episodes?id={anime_id}</span>
                <p class="description">Get complete episode list with availability status</p>
                <div class="params">
                    <div class="param">
                        <span class="param-name">id</span>
                        <span class="param-type">string</span>
                        <span class="param-required">required</span>
                        <span style="color: #a0a0a0; margin-left: 10px;">Example: <code>naruto-shippuden</code></span>
                    </div>
                </div>
            </div>

            <div class="endpoint">
                <span class="method">GET</span>
                <span class="path">/api/stream?id={anime_id}&episode={number}</span>
                <p class="description">Get streaming links and download links for a specific episode</p>
                <div class="params">
                    <div class="param">
                        <span class="param-name">id</span>
                        <span class="param-type">string</span>
                        <span class="param-required">required</span>
                    </div>
                    <div class="param">
                        <span class="param-name">episode</span>
                        <span class="param-type">number</span>
                        <span style="color: #a0a0a0; margin-left: 10px;">Optional (default: 1)</span>
                    </div>
                </div>
            </div>

            <div class="endpoint">
                <span class="method">GET</span>
                <span class="path">/api/movies?page={number}&pageSize={number}</span>
                <p class="description">Get all movies with pagination support</p>
            </div>

            <div class="endpoint">
                <span class="method">GET</span>
                <span class="path">/api/movies/{id}</span>
                <p class="description">Get detailed information about a specific movie</p>
            </div>

            <div class="endpoint">
                <span class="method">GET</span>
                <span class="path">/api/cartoon?type={series/movies}&subCategory={name}</span>
                <p class="description">Get cartoon series or movies with sub-category support</p>
            </div>

            <div class="endpoint">
                <span class="method">GET</span>
                <span class="path">/api/search?q={keyword}</span>
                <p class="description">Search for anime by keyword</p>
            </div>

            <div class="endpoint">
                <span class="method">GET</span>
                <span class="path">/api/genre/{genre_name}</span>
                <p class="description">Get anime by genre</p>
            </div>

            <div class="endpoint">
                <span class="method">GET</span>
                <span class="path">/api/random</span>
                <p class="description">Get a random anime from trending</p>
            </div>

            <div class="endpoint">
                <span class="method">GET</span>
                <span class="path">/api/test-links?sampleSize={number}</span>
                <p class="description">Test API against a sample of links</p>
            </div>

            <div class="endpoint">
                <span class="method">GET</span>
                <span class="path">/api/health</span>
                <p class="description">Health check endpoint</p>
            </div>
        </div>

        <div class="section">
            <h2>Quick Examples</h2>
            <div class="endpoint">
                <p style="margin-bottom: 10px;"><strong>Get Home Data:</strong></p>
                <div class="example"><code>GET /api/home</code></div>
            </div>
            <div class="endpoint">
                <p style="margin-bottom: 10px;"><strong>Get Anime Info:</strong></p>
                <div class="example"><code>GET /api/info?id=naruto-shippuden</code></div>
            </div>
            <div class="endpoint">
                <p style="margin-bottom: 10px;"><strong>Get Episodes:</strong></p>
                <div class="example"><code>GET /api/episodes?id=naruto-shippuden</code></div>
            </div>
            <div class="endpoint">
                <p style="margin-bottom: 10px;"><strong>Get Stream:</strong></p>
                <div class="example"><code>GET /api/stream?id=naruto-shippuden&episode=1</code></div>
            </div>
            <div class="endpoint">
                <p style="margin-bottom: 10px;"><strong>Search Anime:</strong></p>
                <div class="example"><code>GET /api/search?q=naruto</code></div>
            </div>
        </div>

        <p style="text-align: center; color: #a0a0a0; margin-top: 40px;">
            Made with love for anime lovers | <a href="${config.baseUrl}" target="_blank">Visit animesalt.cc</a>
        </p>
    </div>
</body>
</html>
    `;
}

module.exports = createDocsRouter;
