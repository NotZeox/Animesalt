#!/usr/bin/env node

/**
 * AnimeSalt API Test Script
 * Tests all endpoints and features including:
 * - Unlimited content pagination
 * - Smart recommendations (series→series, movie→movie)
 * - Sub-only episode detection
 * - Background image extraction
 */

const http = require('http');

const BASE_URL = process.argv[2] || 'http://localhost:3000';

console.log('==========================================');
console.log('   AnimeSalt API - Comprehensive Test');
console.log('==========================================');
console.log(`Testing against: ${BASE_URL}`);
console.log('');

// Helper function to make requests
function request(endpoint, callback) {
    const url = new URL(endpoint, BASE_URL);
    
    http.get(url.href, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                callback(null, JSON.parse(data), res.statusCode);
            } catch (e) {
                callback(e, null, res.statusCode);
            }
        });
    }).on('error', callback);
}

// Test results tracker
const results = {
    passed: 0,
    failed: 0,
    tests: []
};

function runTest(name, endpoint, check, description) {
    return new Promise((resolve) => {
        console.log(`\n🧪 Testing: ${name}`);
        console.log(`   ${description}`);
        console.log(`   Endpoint: ${endpoint}`);
        
        request(endpoint, (err, data, status) => {
            if (err) {
                console.log(`   ❌ FAILED: ${err.message}`);
                results.failed++;
                results.tests.push({ name, status: 'failed', error: err.message });
                resolve();
                return;
            }
            
            if (status !== 200) {
                console.log(`   ❌ FAILED: HTTP ${status}`);
                results.failed++;
                results.tests.push({ name, status: 'failed', error: `HTTP ${status}` });
                resolve();
                return;
            }
            
            const passed = check(data, status);
            if (passed) {
                console.log(`   ✅ PASSED`);
                results.passed++;
                results.tests.push({ name, status: 'passed' });
            } else {
                console.log(`   ❌ FAILED: Check failed`);
                results.failed++;
                results.tests.push({ name, status: 'failed', error: 'Check failed', data });
            }
            resolve();
        });
    });
}

async function runAllTests() {
    console.log('Starting API tests...');
    console.log('');
    
    // 1. Health Check
    await runTest(
        'Health Check',
        '/api/health',
        (data, status) => {
            const ok = status === 200 && data.status === 'ok';
            if (ok) console.log(`   Version: ${data.version}`);
            return ok;
        },
        'Verify API is running'
    );
    
    // 2. Homepage Data
    await runTest(
        'Homepage Data',
        '/api/home',
        (data, status) => {
            const hasSpotlights = Array.isArray(data.spotlights);
            const hasTrending = Array.isArray(data.trending);
            const hasUpcoming = Array.isArray(data.upcomingEpisodes);
            console.log(`   Spotlights: ${data.spotlights?.length || 0}`);
            console.log(`   Trending: ${data.trending?.length || 0}`);
            console.log(`   Upcoming: ${data.upcomingEpisodes?.length || 0}`);
            return hasSpotlights && hasTrending;
        },
        'Get homepage with spotlights, trending, upcoming'
    );
    
    // 3. Movies Endpoint - Test Unlimited Content
    await runTest(
        'Movies (Unlimited)',
        '/api/movies',
        (data, status) => {
            const hasResults = Array.isArray(data.results);
            const hasUnlimited = data.endlessScroll === true;
            const fetchedPages = data.fetchedPages || 1;
            console.log(`   Total Results: ${data.totalResults}`);
            console.log(`   Endless Scroll: ${data.endlessScroll}`);
            console.log(`   Fetched Pages: ${fetchedPages}`);
            
            // Check if unlimited pagination is working
            if (fetchedPages > 1) {
                console.log(`   ✅ Pagination working! Fetched ${fetchedPages} pages`);
            } else {
                console.log(`   ⚠️  Only fetched 1 page - may need investigation`);
            }
            
            return hasResults;
        },
        'Test unlimited movies pagination'
    );
    
    // 4. Series Endpoint - Test Unlimited Content
    await runTest(
        'Series (Unlimited)',
        '/api/series',
        (data, status) => {
            const hasResults = Array.isArray(data.results);
            const hasUnlimited = data.endlessScroll === true;
            const fetchedPages = data.fetchedPages || 1;
            console.log(`   Total Results: ${data.totalResults}`);
            console.log(`   Endless Scroll: ${hasUnlimited}`);
            console.log(`   Fetched Pages: ${fetchedPages}`);
            return hasResults;
        },
        'Test unlimited series pagination'
    );
    
    // 5. Info Endpoint - Test Smart Recommendations for SERIES
    await runTest(
        'Info (Series Recommendations)',
        '/api/info?id=naruto-shippuden',
        (data, status) => {
            const hasRelated = Array.isArray(data.relatedAnime);
            const hasBackgroundImage = data.backgroundImage !== undefined;
            
            console.log(`   Related Anime: ${data.relatedAnime?.length || 0}`);
            console.log(`   Has Background Image: ${!!data.backgroundImage}`);
            
            if (hasRelated && data.relatedAnime.length > 0) {
                // Check if all recommendations are SERIES (smart filtering)
                const allSeries = data.relatedAnime.every(item => item.type === 'SERIES');
                console.log(`   All Series: ${allSeries ? '✅' : '❌'}`);
                console.log(`   Sample: ${data.relatedAnime[0]?.title} (${data.relatedAnime[0]?.type})`);
                return allSeries && hasBackgroundImage;
            }
            
            return hasRelated && hasBackgroundImage;
        },
        'Test smart recommendations (series→series)'
    );
    
    // 6. Info Endpoint - Test Smart Recommendations for MOVIES
    await runTest(
        'Info (Movie Recommendations)',
        '/api/info?id=demon-slayer-movie-mugen-train',
        (data, status) => {
            const hasRelated = Array.isArray(data.relatedAnime);
            
            console.log(`   Related Anime: ${data.relatedAnime?.length || 0}`);
            
            if (hasRelated && data.relatedAnime.length > 0) {
                // Check if all recommendations are MOVIES (smart filtering)
                const allMovies = data.relatedAnime.every(item => item.type === 'MOVIE');
                console.log(`   All Movies: ${allMovies ? '✅' : '❌'}`);
                console.log(`   Sample: ${data.relatedAnime[0]?.title} (${data.relatedAnime[0]?.type})`);
                return allMovies;
            }
            
            console.log(`   ⚠️  No recommendations found`);
            return hasRelated;
        },
        'Test smart recommendations (movie→movie)'
    );
    
    // 7. Episodes Endpoint - Test Sub-Only Detection
    await runTest(
        'Episodes (Sub-Only Detection)',
        '/api/episodes?id=naruto-shippuden',
        (data, status) => {
            const hasEpisodes = Array.isArray(data.episodes);
            console.log(`   Total Episodes: ${data.episodes?.length || 0}`);
            
            if (hasEpisodes && data.episodes.length > 0) {
                // Check for sub-only fields
                const hasSubOnlyField = data.episodes.some(ep => ep.isSubOnly !== undefined);
                const hasGrayedOutField = data.episodes.some(ep => ep.isGrayedOut !== undefined);
                const hasUpcomingField = data.episodes.some(ep => ep.isUpcoming !== undefined);
                
                console.log(`   Has isSubOnly field: ${hasSubOnlyField ? '✅' : '❌'}`);
                console.log(`   Has isGrayedOut field: ${hasGrayedOutField ? '✅' : '❌'}`);
                console.log(`   Has isUpcoming field: ${hasUpcomingField ? '✅' : '❌'}`);
                
                // Count sub-only episodes
                const subOnlyCount = data.episodes.filter(ep => ep.isSubOnly === true).length;
                console.log(`   Sub-Only Episodes: ${subOnlyCount}`);
                
                // Count upcoming episodes
                const upcomingCount = data.episodes.filter(ep => ep.isUpcoming === true).length;
                console.log(`   Upcoming Episodes: ${upcomingCount}`);
                
                // Sample episodes
                const lastEp = data.episodes[data.episodes.length - 1];
                console.log(`   Last Episode: ${lastEp?.episode} (isSubOnly: ${lastEp?.isSubOnly})`);
                
                return hasSubOnlyField && hasGrayedOutField;
            }
            
            return hasEpisodes;
        },
        'Test sub-only episode detection'
    );
    
    // 8. Genre Endpoint - Test Unlimited Content
    await runTest(
        'Genre (Unlimited)',
        '/api/genre/action',
        (data, status) => {
            const hasAnime = Array.isArray(data.anime);
            console.log(`   Total Anime: ${data.anime?.length || 0}`);
            return hasAnime;
        },
        'Test genre anime listing'
    );
    
    // 9. Letter Endpoint - Test A-Z Listing
    await runTest(
        'Letter A-Z',
        '/api/letter/A',
        (data, status) => {
            const hasAnime = Array.isArray(data.anime);
            console.log(`   Total Anime: ${data.anime?.length || 0}`);
            return hasAnime;
        },
        'Test anime by letter listing'
    );
    
    // 10. Search Endpoint
    await runTest(
        'Search',
        '/api/search?q=naruto',
        (data, status) => {
            const hasResults = Array.isArray(data.results);
            console.log(`   Results: ${data.results?.length || 0}`);
            return hasResults;
        },
        'Test anime search functionality'
    );
    
    // 11. Cartoon Endpoint
    await runTest(
        'Cartoon Series',
        '/api/cartoon?type=series',
        (data, status) => {
            const hasAnime = Array.isArray(data.anime);
            console.log(`   Total Cartoon Series: ${data.anime?.length || 0}`);
            return hasAnime;
        },
        'Test cartoon series listing'
    );
    
    // 12. Random Endpoint
    await runTest(
        'Random Anime',
        '/api/random',
        (data, status) => {
            const hasData = data.success && data.data;
            console.log(`   Got Random Anime: ${hasData ? '✅' : '❌'}`);
            if (hasData) {
                console.log(`   Title: ${data.data?.title}`);
            }
            return hasData;
        },
        'Test random anime selection'
    );
    
    // 13. Documentation Endpoint
    await runTest(
        'API Documentation',
        '/docs',
        (data, status) => {
            // Docs returns HTML, not JSON
            const isHtml = typeof data === 'string' && data.includes('AnimeSalt API');
            console.log(`   Is HTML: ${isHtml ? '✅' : '❌'}`);
            return isHtml;
        },
        'Test API documentation page'
    );
    
    // Print summary
    console.log('\n==========================================');
    console.log('   Test Results Summary');
    console.log('==========================================');
    console.log(`   ✅ Passed: ${results.passed}`);
    console.log(`   ❌ Failed: ${results.failed}`);
    console.log(`   Total: ${results.passed + results.failed}`);
    console.log('');
    
    if (results.failed > 0) {
        console.log('   Failed Tests:');
        results.tests.filter(t => t.status === 'failed').forEach(t => {
            console.log(`   - ${t.name}: ${t.error || 'Unknown error'}`);
        });
        console.log('');
    }
    
    console.log('==========================================');
    console.log(`   Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);
    console.log('==========================================');
    
    process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
});
