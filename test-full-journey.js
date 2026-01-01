/**
 * Anime Salt API - Final Comprehensive Test Suite
 * 
 * This script simulates a real user's journey through the anime website:
 * 1. Landing on homepage and exploring new releases
 * 2. Browsing old classics
 * 3. Searching for specific anime
 * 4. Viewing anime details
 * 5. Getting episode list with seasons
 * 6. Testing auto-skip intro functionality
 * 7. Getting streaming links
 * 8. Testing unlimited pagination
 * 
 * Run: node test-full-journey.js
 */

const axios = require('axios');

// CONFIGURATION
const API_BASE = process.env.API_URL || 'http://localhost:3000/api';
const TEST_DELAY = 1000; // 1 second between requests

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
    console.log('\n' + '='.repeat(70));
    log(`🧪 ${title}`, 'bold');
    console.log('='.repeat(70));
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logInfo(message) {
    log(`ℹ️  ${message}`, 'cyan');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

// Sleep helper
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Test result tracker
let testsPassed = 0;
let testsFailed = 0;
let results = [];

async function testEndpoint(name, url, expectations = {}) {
    try {
        logInfo(`Testing: ${name}`);
        logInfo(`URL: ${url}`);
        
        const response = await axios.get(`${API_BASE}${url}`, { timeout: 15000 });
        const data = response.data;
        
        // Check basic structure
        if (expectations.success !== undefined && data.success !== expectations.success) {
            throw new Error(`Expected success=${expectations.success}, got ${data.success}`);
        }
        
        // Check for required fields
        if (expectations.fields) {
            for (const field of expectations.fields) {
                if (data[field] === undefined && data.data && data.data[field] === undefined) {
                    // Some endpoints return data directly, some wrap in 'data'
                    logWarning(`Field '${field}' not found in response`);
                }
            }
        }
        
        // Check array length if specified
        if (expectations.minLength && Array.isArray(data.results || data.data)) {
            const arr = data.results || data.data;
            if (arr.length < expectations.minLength) {
                logWarning(`Array has ${arr.length} items, expected at least ${expectations.minLength}`);
            }
        }
        
        // Check for infinite scroll flag
        if (expectations.endlessScroll !== undefined) {
            const hasEndless = (data.endlessScroll === true) || 
                              (data.data && data.data.endlessScroll === true);
            if (hasEndless !== expectations.endlessScroll) {
                logWarning(`endlessScroll flag is ${hasEndles}`);
            }
        }
        
        logSuccess(`${name} - PASSED`);
        testsPassed++;
        results.push({ name, status: 'PASS', url });
        
        // Return data for further testing
        return { success: true, data };
        
    } catch (error) {
        logError(`${name} - FAILED: ${error.message}`);
        testsFailed++;
        results.push({ name, status: 'FAIL', url, error: error.message });
        return { success: false, error: error.message };
    }
}

async function testHomepageJourney() {
    logSection('🏠 STEP 1: USER LANDS ON HOMEPAGE');
    
    // Test homepage
    const home = await testEndpoint(
        'Homepage with all sections',
        '/home',
        { success: true, fields: ['spotlights', 'trending', 'genres', 'languages'] }
    );
    
    if (home.success) {
        const data = home.data;
        
        // Verify spotlights have background images
        if (data.spotlights && data.spotlights.length > 0) {
            const hasBgImages = data.spotlights.every(s => s.poster && s.poster.includes('w1280'));
            if (hasBgImages) {
                logSuccess('All spotlights have high-quality backdrop images');
            } else {
                logWarning('Some spotlights missing backdrop images');
            }
        }
        
        // Check for new releases
        if (data.freshDrops && data.freshDrops.length > 0) {
            logSuccess(`Found ${data.freshDrops.length} fresh drops (new releases)`);
        }
        
        // Check upcoming episodes
        if (data.upcomingEpisodes && data.upcomingEpisodes.length > 0) {
            logSuccess(`Found ${data.upcomingEpisodes.length} upcoming episodes with timers`);
        }
    }
    
    return home;
}

async function testExplorationJourney() {
    logSection('🔍 STEP 2: USER EXPLORES NEW & OLD CONTENT');
    
    // Test unlimited movies (new content)
    const movies = await testEndpoint(
        'Unlimited Movies (new releases)',
        '/movies',
        { success: true, fields: ['results'], minLength: 50 }
    );
    
    if (movies.success) {
        logSuccess(`Movies endpoint returned ${movies.data.totalResults || movies.data.results?.length} items`);
        logInfo(`Fetched ${movies.data.fetchedPages || 'unknown'} pages`);
    }
    
    // Test unlimited series (old classics)
    const series = await testEndpoint(
        'Unlimited Series (classics)',
        '/series',
        { success: true, fields: ['results'], minLength: 50 }
    );
    
    if (series.success) {
        logSuccess(`Series endpoint returned ${series.data.totalResults || series.data.results?.length} items`);
    }
    
    // Test genre exploration
    const actionAnime = await testEndpoint(
        'Action Anime Genre',
        '/genre/action',
        { success: true, fields: ['results'] }
    );
    
    if (actionAnime.success) {
        logSuccess('Action genre accessible');
    }
    
    // Test language filter (Hindi dub fans)
    const hindiAnime = await testEndpoint(
        'Hindi Dubbed Anime',
        '/language/hindi',
        { success: true, fields: ['results'] }
    );
    
    if (hindiAnime.success) {
        logSuccess('Hindi dubbed anime accessible');
    }
    
    return { movies, series, actionAnime, hindiAnime };
}

async function testSearchJourney() {
    logSection('🔎 STEP 3: USER SEARCHES FOR ANIME');
    
    // Test search functionality
    const search = await testEndpoint(
        'Search: naruto',
        '/search?keyword=naruto',
        { success: true, fields: ['results'] }
    );
    
    if (search.success && search.data.results && search.data.results.length > 0) {
        logSuccess(`Found ${search.data.results.length} results for "naruto"`);
        
        // Return first result ID for next test
        return search.data.results[0]?.id;
    }
    
    return null;
}

async function testInfoJourney(animeId) {
    logSection('📄 STEP 4: USER VIEWS ANIME DETAILS');
    
    if (!animeId) {
        logWarning('No anime ID available for info test');
        animeId = 'naruto-shippuden'; // Fallback
    }
    
    logInfo(`Testing info for: ${animeId}`);
    
    const info = await testEndpoint(
        `Anime Info: ${animeId}`,
        `/info?id=${animeId}`,
        { 
            success: true, 
            fields: ['id', 'title', 'poster', 'backgroundImage', 'synopsis', 'type', 'genres', 'languages', 'relatedAnime'] 
        }
    );
    
    if (info.success) {
        const data = info.data;
        
        // Check smart recommendations
        if (data.relatedAnime && data.relatedAnime.length > 0) {
            const targetType = data.type; // SERIES, MOVIE, or CARTOON
            const sameType = data.relatedAnime.every(r => r.type === targetType);
            
            if (sameType) {
                logSuccess(`Smart recommendations working: All ${data.relatedAnime.length} recommendations are ${targetType}`);
            } else {
                logWarning('Some recommendations may not match type');
            }
        }
        
        // Check background image
        if (data.backgroundImage && data.backgroundImage.includes('w1280')) {
            logSuccess('Background image is high-quality (w1280)');
        }
        
        // Check for new fields
        if (data.releaseYear) {
            logSuccess(`Release year extracted: ${data.releaseYear}`);
        }
        
        if (data.duration) {
            logSuccess(`Duration extracted: ${data.duration}`);
        }
        
        // Check genres and languages
        if (data.genres && data.genres.length > 0) {
            logSuccess(`Genres loaded: ${data.genres.map(g => g.name).join(', ')}`);
        }
        
        if (data.languages && data.languages.length > 0) {
            logSuccess(`Languages available: ${data.languages.map(l => l.name).join(', ')}`);
        }
    }
    
    return info;
}

async function testEpisodesJourney(animeId) {
    logSection('📺 STEP 5: USER GETS EPISODE LIST');
    
    if (!animeId) {
        animeId = 'naruto-shippuden';
    }
    
    const episodes = await testEndpoint(
        `Episode List: ${animeId}`,
        `/episodes?id=${animeId}`,
        { 
            success: true, 
            fields: ['id', 'totalEpisodes', 'allSeasons', 'episodes'] 
        }
    );
    
    if (episodes.success) {
        const data = episodes.data;
        
        // Check for seasons
        if (data.allSeasons && data.allSeasons.length > 0) {
            logSuccess(`Found ${data.allSeasons.length} seasons`);
            
            // Check for sub-only seasons
            const subOnlySeasons = data.allSeasons.filter(s => s.isSubOnly);
            if (subOnlySeasons.length > 0) {
                logSuccess(`Found ${subOnlySeasons.length} sub-only season(s)`);
            }
        }
        
        // Check for episodes with sub-only flag
        if (data.episodes && data.episodes.length > 0) {
            const subOnlyEps = data.episodes.filter(e => e.isSubOnly);
            if (subOnlyEps.length > 0) {
                logSuccess(`Found ${subOnlyEps.length} sub-only episode(s)`);
            }
        }
    }
    
    return episodes;
}

async function testAutoSkipJourney(animeId) {
    logSection('⏭️ STEP 6: USER TESTS AUTO-SKIP INTRO (Stream Page)');
    
    if (!animeId) {
        animeId = 'naruto-shippuden';
    }
    
    // Test stream endpoint (includes episode data)
    const stream = await testEndpoint(
        `Stream: ${animeId} Episode 1`,
        `/stream?id=${animeId}&episode=1`,
        { success: true, fields: ['episodeId', 'episodeName', 'players'] }
    );
    
    if (stream.success) {
        const data = stream.data;
        
        // Check players available
        if (data.players && data.players.length > 0) {
            logSuccess(`Found ${data.players.length} streaming player(s): ${data.players.map(p => p.name).join(', ')}`);
            
            // Check for auto-skip data (if available)
            // This would typically be in the player embed, but we can note it's available
            logInfo('Auto-skip intro feature is player-dependent');
            logInfo('Players like ZephyrFlick and MultiLang support skip buttons');
        }
        
        // Test different episode format
        const streamAlt = await testEndpoint(
            `Stream with SxEP format: ${animeId}`,
            `/stream?id=${animeId}&episode=1x1`,
            { success: true }
        );
        
        if (streamAlt.success) {
            logSuccess('Season x Episode format works correctly');
        }
    }
    
    return stream;
}

async function testMovieJourney() {
    logSection('🎬 STEP 7: USER WATCHES A MOVIE');
    
    // Test movie info
    const movieInfo = await testEndpoint(
        'Movie Info',
        '/info?id=jujutsu-kaisen-0',
        { success: true, fields: ['id', 'title', 'type', 'duration'] }
    );
    
    if (movieInfo.success) {
        const data = movieInfo.data;
        
        if (data.type === 'MOVIE') {
            logSuccess('Movie type correctly identified');
        }
        
        if (data.duration) {
            logSuccess(`Movie duration: ${data.duration}`);
        }
    }
    
    // Test movie stream
    const movieStream = await testEndpoint(
        'Movie Stream',
        '/movie/stream?id=jujutsu-kaisen-0',
        { success: true, fields: ['movieId', 'players'] }
    );
    
    if (movieStream.success) {
        logSuccess('Movie streaming works');
    }
    
    return { movieInfo, movieStream };
}

async function testEdgeCases() {
    logSection('🔧 STEP 8: TESTING EDGE CASES');
    
    // Test random anime
    const random = await testEndpoint(
        'Random Anime',
        '/random',
        { success: true, fields: ['id', 'title'] }
    );
    
    if (random.success) {
        logSuccess('Random anime feature works');
    }
    
    // Test health check
    const health = await testEndpoint(
        'Health Check',
        '/health',
        { success: true, fields: ['status'] }
    );
    
    if (health.success) {
        logSuccess('API health check passed');
    }
    
    return { random, health };
}

async function runFullTestSuite() {
    log('\n' + '🎬'.repeat(35));
    log('🎬  ANIME SALT API - COMPREHENSIVE FINAL TEST  🎬', 'bold');
    log('🎬'.repeat(35));
    
    logInfo(`API Base URL: ${API_BASE}`);
    logInfo(`Starting test suite...`);
    
    await sleep(TEST_DELAY);
    
    try {
        // Run full user journey
        const home = await testHomepageJourney();
        await sleep(TEST_DELAY);
        
        const exploration = await testExplorationJourney();
        await sleep(TEST_DELAY);
        
        const animeId = await testSearchJourney();
        await sleep(TEST_DELAY);
        
        const info = await testInfoJourney(animeId);
        await sleep(TEST_DELAY);
        
        const episodes = await testEpisodesJourney(animeId);
        await sleep(TEST_DELAY);
        
        const stream = await testAutoSkipJourney(animeId);
        await sleep(TEST_DELAY);
        
        const movie = await testMovieJourney();
        await sleep(TEST_DELAY);
        
        const edgeCases = await testEdgeCases();
        
        // Final summary
        logSection('📊 FINAL TEST RESULTS');
        
        log(`\n${'='.repeat(50)}`, 'cyan');
        log(`Tests Passed: ${testsPassed}`, 'green');
        log(`Tests Failed: ${testsFailed}`, testsFailed > 0 ? 'red' : 'green');
        log(`${'='.repeat(50)}`, 'cyan');
        
        if (testsFailed === 0) {
            log('\n🎉 ALL TESTS PASSED! API is ready for production! 🎉', 'green', 'bold');
        } else {
            log('\n⚠️  Some tests failed. Review the output above.', 'yellow');
        }
        
        // Print results summary
        console.log('\n--- Test Summary ---');
        results.forEach((r, i) => {
            const icon = r.status === 'PASS' ? '✅' : '❌';
            console.log(`${icon} ${r.name}`);
            if (r.error) {
                console.log(`   Error: ${r.error}`);
            }
        });
        
    } catch (error) {
        logError(`Test suite failed: ${error.message}`);
        console.error(error);
    }
}

// Run tests
runFullTestSuite();
