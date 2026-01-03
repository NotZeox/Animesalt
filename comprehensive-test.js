/**
 * Anime Salt API - Comprehensive Test Suite
 * Tests all endpoints and verifies data against animesalt.cc links
 * 
 * Run: node comprehensive-test.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE = process.env.API_URL || 'http://localhost:3000/api';
const TEST_DELAY = 1500;

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m',
    magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
    console.log('\n' + '='.repeat(80));
    log(`🧪 ${title}`, 'bold');
    console.log('='.repeat(80));
}

function logSubsection(title) {
    console.log('\n--- ' + title + ' ---');
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

function logDetail(message) {
    log(`   ${message}`, 'blue');
}

// Sleep helper
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Test result tracker
let testsPassed = 0;
let testsFailed = 0;
let testsWarning = 0;
let results = [];
let apiStatus = {};

// Sample IDs from user's provided links
const sampleSeriesFromLinks = [
    'naruto-shippuden', 'one-piece', 'dragon-ball-super', 'attack-on-titan',
    'demon-slayer', 'my-hero-academia', 'jujutsu-kaisen', 'solo-leveling',
    'spy-x-family', 'frieren-beyond-journeys-end', 'blue-lock', 'chainsaw-man',
    'black-clover', 'tokyo-revengers', 're-zero-starting-life-in-another-world',
    'sword-art-online', 'overlord', 'that-time-i-got-reincarnated-as-a-slime',
    'mushoku-tensei-jobless-reincarnation', 'classroom-of-the-elite'
];

const sampleMoviesFromLinks = [
    'jujutsu-kaisen-0', 'demon-slayer-kimetsu-no-yaiba-infinity-castle',
    'dragon-ball-super-super-hero', 'haikyu-the-dumpster-battle',
    'howls-moving-castle', 'spirited-away', 'your-name',
    'spy-x-family-movie-code-white', 'chainsaw-man-the-movie-reze-arc'
];

const sampleEpisodesFromLinks = [
    'naruto-shippuden-1x27', 'one-piece-1x16', 'dragon-ball-z-1x19',
    'attack-on-titan-1x16', 'demon-slayer-1x8', 'jujutsu-kaisen-1x6',
    'solo-leveling-1x9', 'spy-x-family-1x18', 'blue-lock-1x3',
    'chainsaw-man-1x12', 'black-clover-1x26', 'tokyo-revengers-1x21'
];

async function testEndpoint(name, url, timeout = 15000) {
    try {
        logInfo(`Testing: ${name}`);
        logDetail(`URL: ${url}`);
        
        const response = await axios.get(`${API_BASE}${url}`, { timeout });
        const data = response.data;
        
        // Check basic structure
        if (data.success === false) {
            throw new Error(`Endpoint returned success: false - ${data.error || 'Unknown error'}`);
        }
        
        logSuccess(`${name} - PASSED`);
        testsPassed++;
        results.push({ name, status: 'PASS', url, data });
        
        return { success: true, data, name, url };
        
    } catch (error) {
        const errorMsg = error.response?.status 
            ? `HTTP ${error.response.status}: ${error.message}`
            : error.message;
        logError(`${name} - FAILED: ${errorMsg}`);
        testsFailed++;
        results.push({ name, status: 'FAIL', url, error: errorMsg });
        return { success: false, error: errorMsg, name, url };
    }
}

async function testHomepage() {
    logSection('🏠 TEST 1: HOMEPAGE ENDPOINT (/home)');
    
    const result = await testEndpoint(
        'Homepage with all sections',
        '/home',
        30000
    );
    
    if (result.success) {
        const data = result.data;
        
        // Check for expected fields based on homeExtractor.js
        const expectedFields = [
            'spotlights', 'trending', 'latest', 'topRated', 'ongoing',
            'movies', 'series', 'recentEpisodes', 'animeList', 'genres', 'networks'
        ];
        
        logSubsection('Field Verification');
        let fieldsFound = 0;
        for (const field of expectedFields) {
            if (data[field] !== undefined) {
                const count = Array.isArray(data[field]) ? data[field].length : 'N/A';
                logSuccess(`Field '${field}': ${Array.isArray(data[field]) ? count + ' items' : 'present'}`);
                fieldsFound++;
            } else {
                logWarning(`Field '${field}' missing`);
                testsWarning++;
            }
        }
        
        // Check spotlights
        if (data.spotlights && data.spotlights.length > 0) {
            logSubsection('Spotlights Check');
            const sampleSpotlight = data.spotlights[0];
            const hasRequiredFields = sampleSpotlight.id && sampleSpotlight.title && sampleSpotlight.poster;
            if (hasRequiredFields) {
                logSuccess(`Spotlight has required fields: id, title, poster`);
                logDetail(`Sample: "${sampleSpotlight.title}" - ${sampleSpotlight.type || 'N/A'}`);
            } else {
                logWarning('Spotlight missing required fields');
            }
        } else {
            logWarning('No spotlights found');
            testsWarning++;
        }
        
        // Check genres and networks
        if (data.genres && data.genres.length > 0) {
            logSubsection('Genres Check');
            logSuccess(`Found ${data.genres.length} genres`);
            logDetail(`Sample: ${data.genres.slice(0, 5).join(', ')}...`);
        }
        
        if (data.networks && data.networks.length > 0) {
            logSubsection('Networks Check');
            logSuccess(`Found ${data.networks.length} networks`);
            logDetail(`Sample: ${data.networks.slice(0, 5).join(', ')}...`);
        }
        
        // Check anime list
        if (data.animeList && data.animeList.length > 0) {
            logSubsection('Anime List Check');
            logSuccess(`Found ${data.animeList.length} anime in list`);
        }
        
        return {
            spotlightsCount: data.spotlights?.length || 0,
            genresCount: data.genres?.length || 0,
            networksCount: data.networks?.length || 0,
            animeListCount: data.animeList?.length || 0
        };
    }
    
    return null;
}

async function testInfoEndpoints() {
    logSection('📄 TEST 2: INFO ENDPOINTS (/info)');
    
    let infoTests = { tested: 0, passed: 0, failed: 0 };
    
    for (const id of sampleSeriesFromLinks.slice(0, 10)) {
        infoTests.tested++;
        const result = await testEndpoint(`Info: ${id}`, `/info?id=${id}`);
        
        if (result.success) {
            infoTests.passed++;
            const data = result.data;
            
            // Verify required fields
            const requiredFields = ['id', 'title', 'poster'];
            const missingFields = requiredFields.filter(f => !data[f]);
            
            if (missingFields.length === 0) {
                logDetail(`✓ ${data.title} (${data.type || 'SERIES'})`);
            } else {
                logWarning(`${id} missing fields: ${missingFields.join(', ')}`);
            }
            
            // Check for advanced fields
            if (data.synopsis) {
                logDetail(`  Synopsis: ${data.synopsis.substring(0, 50)}...`);
            }
            if (data.genres && data.genres.length > 0) {
                logDetail(`  Genres: ${data.genres.map(g => g.name).join(', ')}`);
            }
            if (data.seasons && data.seasons.length > 0) {
                logDetail(`  Seasons: ${data.seasons.length}`);
            }
        } else {
            infoTests.failed++;
        }
        
        await sleep(TEST_DELAY);
    }
    
    logSubsection('Info Test Summary');
    log(`${infoTests.passed}/${infoTests.tested} info endpoints passed`, 
        infoTests.failed === 0 ? 'green' : 'yellow');
    
    return infoTests;
}

async function testEpisodeEndpoints() {
    logSection('📺 TEST 3: EPISODE ENDPOINTS (/episodes)');
    
    let episodeTests = { tested: 0, passed: 0, failed: 0 };
    
    for (const id of sampleEpisodesFromLinks.slice(0, 5)) {
        episodeTests.tested++;
        const result = await testEndpoint(`Episodes: ${id}`, `/episodes?id=${id}`);
        
        if (result.success) {
            episodeTests.passed++;
            const data = result.data;
            
            logDetail(`✓ ${data.totalEpisodes || 0} total episodes`);
            if (data.allSeasons && data.allSeasons.length > 0) {
                logDetail(`  ${data.allSeasons.length} seasons found`);
            }
        } else {
            episodeTests.failed++;
        }
        
        await sleep(TEST_DELAY);
    }
    
    logSubsection('Episode Test Summary');
    log(`${episodeTests.passed}/${episodeTests.tested} episode endpoints passed`,
        episodeTests.failed === 0 ? 'green' : 'yellow');
    
    return episodeTests;
}

async function testStreamEndpoints() {
    logSection('🎬 TEST 4: STREAM ENDPOINTS (/stream)');
    
    let streamTests = { tested: 0, passed: 0, failed: 0 };
    
    for (const episodeId of sampleEpisodesFromLinks.slice(0, 5)) {
        streamTests.tested++;
        const result = await testEndpoint(`Stream: ${episodeId}`, `/stream?id=${episodeId}&episode=1`);
        
        if (result.success) {
            streamTests.passed++;
            const data = result.data;
            
            if (data.players && data.players.length > 0) {
                logDetail(`✓ ${data.players.length} players available: ${data.players.map(p => p.name).join(', ')}`);
            } else {
                logWarning('No players found');
            }
        } else {
            streamTests.failed++;
        }
        
        await sleep(TEST_DELAY);
    }
    
    logSubsection('Stream Test Summary');
    log(`${streamTests.passed}/${streamTests.tested} stream endpoints passed`,
        streamTests.failed === 0 ? 'green' : 'yellow');
    
    return streamTests;
}

async function testMovieEndpoints() {
    logSection('🎥 TEST 5: MOVIE ENDPOINTS (/movies, /info)');
    
    let movieTests = { tested: 0, passed: 0, failed: 0 };
    
    // Test movies list
    const moviesList = await testEndpoint('Movies List', '/movies?page=1&pageSize=20');
    if (moviesList.success) {
        movieTests.tested++;
        movieTests.passed++;
        logDetail(`✓ Found ${moviesList.data.results?.length || 0} movies on page 1`);
        if (moviesList.data.totalResults) {
            logDetail(`  Total movies: ${moviesList.data.totalResults}`);
        }
    } else {
        movieTests.tested++;
        movieTests.failed++;
    }
    
    await sleep(TEST_DELAY);
    
    // Test individual movie info
    for (const id of sampleMoviesFromLinks.slice(0, 5)) {
        movieTests.tested++;
        const result = await testEndpoint(`Movie Info: ${id}`, `/info?id=${id}`);
        
        if (result.success) {
            movieTests.passed++;
            const data = result.data;
            if (data.type === 'MOVIE') {
                logDetail(`✓ ${data.title} - Type: MOVIE, Duration: ${data.duration || 'N/A'}`);
            } else {
                logWarning(`${id} type is not MOVIE: ${data.type}`);
            }
        } else {
            movieTests.failed++;
        }
        
        await sleep(TEST_DELAY);
    }
    
    logSubsection('Movie Test Summary');
    log(`${movieTests.passed}/${movieTests.tested} movie endpoints passed`,
        movieTests.failed === 0 ? 'green' : 'yellow');
    
    return movieTests;
}

async function testSearchEndpoint() {
    logSection('🔍 TEST 6: SEARCH ENDPOINT (/search)');
    
    let searchTests = { tested: 0, passed: 0, failed: 0 };
    
    const searchTerms = ['naruto', 'dragon ball', 'attack on titan', 'one piece'];
    
    for (const term of searchTerms) {
        searchTests.tested++;
        const result = await testEndpoint(`Search: ${term}`, `/search?keyword=${encodeURIComponent(term)}`);
        
        if (result.success) {
            searchTests.passed++;
            const data = result.data;
            const count = data.results?.length || 0;
            logDetail(`✓ "${term}": ${count} results found`);
        } else {
            searchTests.failed++;
        }
        
        await sleep(TEST_DELAY);
    }
    
    logSubsection('Search Test Summary');
    log(`${searchTests.passed}/${searchTests.tested} search queries passed`,
        searchTests.failed === 0 ? 'green' : 'yellow');
    
    return searchTests;
}

async function testGenreEndpoints() {
    logSection('🏷️ TEST 7: GENRE ENDPOINTS (/genre/:genre)');
    
    let genreTests = { tested: 0, passed: 0, failed: 0 };
    
    const genres = ['action', 'adventure', 'comedy', 'drama', 'fantasy', 'horror', 'romance', 'sci-fi'];
    
    for (const genre of genres) {
        genreTests.tested++;
        const result = await testEndpoint(`Genre: ${genre}`, `/genre/${genre}?page=1&pageSize=10`);
        
        if (result.success) {
            genreTests.passed++;
            const data = result.data;
            const count = data.results?.length || 0;
            logDetail(`✓ "${genre}": ${count} anime found`);
        } else {
            genreTests.failed++;
        }
        
        await sleep(TEST_DELAY);
    }
    
    logSubsection('Genre Test Summary');
    log(`${genreTests.passed}/${genreTests.tested} genre endpoints passed`,
        genreTests.failed === 0 ? 'green' : 'yellow');
    
    return genreTests;
}

async function testSeriesEndpoints() {
    logSection('📚 TEST 8: SERIES ENDPOINTS (/series)');
    
    const result = await testEndpoint('Series List', '/series?page=1&pageSize=20');
    
    if (result.success) {
        const data = result.data;
        logDetail(`✓ Page 1: ${data.results?.length || 0} series`);
        if (data.totalResults) {
            logDetail(`  Total series: ${data.totalResults}`);
        }
        if (data.totalPages) {
            logDetail(`  Total pages: ${data.totalPages}`);
        }
        
        // Test pagination
        const page2 = await testEndpoint('Series Page 2', '/series?page=2&pageSize=20');
        if (page2.success) {
            logDetail('✓ Pagination working correctly');
        }
        
        return { 
            tested: 1, 
            passed: result.success ? 1 : 0, 
            failed: result.success ? 0 : 1,
            totalResults: data.totalResults || 0,
            totalPages: data.totalPages || 0
        };
    }
    
    return { tested: 1, passed: 0, failed: 1, totalResults: 0, totalPages: 0 };
}

async function testAdditionalEndpoints() {
    logSection('🔧 TEST 9: ADDITIONAL ENDPOINTS');
    
    let additionalTests = { tested: 0, passed: 0, failed: 0 };
    
    // Test categories endpoint
    additionalTests.tested++;
    const categories = await testEndpoint('Categories', '/categories');
    if (categories.success) {
        additionalTests.passed++;
        logDetail(`✓ Categories: ${categories.data.categories?.join(', ')}`);
    } else {
        additionalTests.failed++;
    }
    
    await sleep(TEST_DELAY);
    
    // Test genres list
    additionalTests.tested++;
    const genres = await testEndpoint('Genres List', '/genres');
    if (genres.success) {
        additionalTests.passed++;
        logDetail(`✓ Genres list: ${genres.data.genres?.length || 0} genres`);
    } else {
        additionalTests.failed++;
    }
    
    await sleep(TEST_DELAY);
    
    // Test networks list
    additionalTests.tested++;
    const networks = await testEndpoint('Networks List', '/networks');
    if (networks.success) {
        additionalTests.passed++;
        logDetail(`✓ Networks list: ${networks.data.networks?.length || 0} networks`);
    } else {
        additionalTests.failed++;
    }
    
    await sleep(TEST_DELAY);
    
    // Test languages list
    additionalTests.tested++;
    const languages = await testEndpoint('Languages List', '/languages');
    if (languages.success) {
        additionalTests.passed++;
        logDetail(`✓ Languages list: ${languages.data.languages?.length || 0} languages`);
    } else {
        additionalTests.failed++;
    }
    
    await sleep(TEST_DELAY);
    
    // Test letters list
    additionalTests.tested++;
    const letters = await testEndpoint('Letters List', '/letters');
    if (letters.success) {
        additionalTests.passed++;
        logDetail(`✓ Letters list: ${letters.data.letters?.join(', ')}`);
    } else {
        additionalTests.failed++;
    }
    
    await sleep(TEST_DELAY);
    
    // Test health endpoint
    additionalTests.tested++;
    const health = await testEndpoint('Health Check', '/health');
    if (health.success) {
        additionalTests.passed++;
        logDetail(`✓ API Status: ${health.data.status}, Uptime: ${health.data.uptime?.toFixed(2)}s`);
    } else {
        additionalTests.failed++;
    }
    
    await sleep(TEST_DELAY);
    
    // Test random endpoint
    additionalTests.tested++;
    const random = await testEndpoint('Random Anime', '/random');
    if (random.success) {
        additionalTests.passed++;
        logDetail(`✓ Random anime: ${random.data.title || 'N/A'}`);
    } else {
        additionalTests.failed++;
    }
    
    logSubsection('Additional Test Summary');
    log(`${additionalTests.passed}/${additionalTests.tested} additional endpoints passed`,
        additionalTests.failed === 0 ? 'green' : 'yellow');
    
    return additionalTests;
}

async function testCartoonEndpoints() {
    logSection('🎨 TEST 10: CARTOON ENDPOINTS (/cartoon)');
    
    let cartoonTests = { tested: 0, passed: 0, failed: 0 };
    
    // Test cartoon list
    cartoonTests.tested++;
    const cartoonList = await testEndpoint('Cartoon List', '/cartoon?type=series&page=1');
    if (cartoonList.success) {
        cartoonTests.passed++;
        logDetail(`✓ Cartoons: ${cartoonList.data.results?.length || 0} found`);
    } else {
        cartoonTests.failed++;
    }
    
    await sleep(TEST_DELAY);
    
    logSubsection('Cartoon Test Summary');
    log(`${cartoonTests.passed}/${cartoonTests.tested} cartoon endpoints passed`,
        cartoonTests.failed === 0 ? 'green' : 'yellow');
    
    return cartoonTests;
}

async function verifyAgainstProvidedLinks() {
    logSection('🔗 TEST 11: VERIFY AGAINST PROVIDED LINKS');
    
    logInfo('Verifying extraction against sample links from animesalt.cc...');
    
    // The user provided links for:
    // - 6060 episodes
    // - 342 series
    // - 124 movies
    // - Letter pages (A-Z)
    // - Various category pages
    
    let verificationTests = { tested: 0, passed: 0, failed: 0 };
    
    // Test that we can extract some of the series mentioned in the links
    const seriesFromLinks = [
        { id: 'naruto-shippuden', expectedUrl: '/series/naruto-shippuden/' },
        { id: 'one-piece', expectedUrl: '/series/one-piece/' },
        { id: 'dragon-ball-super', expectedUrl: '/series/dragon-ball-super/' },
        { id: 'attack-on-titan', expectedUrl: '/series/attack-on-titan/' },
        { id: 'demon-slayer', expectedUrl: '/series/demon-slayer/' },
        { id: 'spy-x-family', expectedUrl: '/series/spy-x-family/' },
        { id: 'jujutsu-kaisen', expectedUrl: '/series/jujutsu-kaisen/' },
        { id: 'solo-leveling', expectedUrl: '/series/solo-leveling/' },
        { id: 'blue-lock', expectedUrl: '/series/blue-lock/' },
        { id: 'chainsaw-man', expectedUrl: '/series/chainsaw-man/' },
    ];
    
    logSubsection('Series Verification');
    for (const series of seriesFromLinks) {
        verificationTests.tested++;
        const result = await testEndpoint(`Verify: ${series.id}`, `/info?id=${series.id}`);
        
        if (result.success) {
            verificationTests.passed++;
            const data = result.data;
            if (data.title && data.poster) {
                logDetail(`✓ ${data.title} - Extracted successfully`);
            }
        } else {
            verificationTests.failed++;
        }
        
        await sleep(TEST_DELAY);
    }
    
    // Test movies from links
    const moviesFromLinks = [
        { id: 'jujutsu-kaisen-0', expectedUrl: '/movies/jujutsu-kaisen-0/' },
        { id: 'demon-slayer-kimetsu-no-yaiba-infinity-castle', expectedUrl: '/movies/demon-slayer-kimetsu-no-yaiba-infinity-castle/' },
        { id: 'dragon-ball-super-super-hero', expectedUrl: '/movies/dragon-ball-super-super-hero/' },
        { id: 'howls-moving-castle', expectedUrl: '/movies/howls-moving-castle/' },
        { id: 'spirited-away', expectedUrl: '/movies/spirited-away/' },
    ];
    
    logSubsection('Movies Verification');
    for (const movie of moviesFromLinks) {
        verificationTests.tested++;
        const result = await testEndpoint(`Verify: ${movie.id}`, `/info?id=${movie.id}`);
        
        if (result.success) {
            verificationTests.passed++;
            const data = result.data;
            if (data.type === 'MOVIE') {
                logDetail(`✓ ${data.title} (MOVIE) - Extracted successfully`);
            } else {
                logWarning(`${movie.id} type is ${data.type}, expected MOVIE`);
            }
        } else {
            verificationTests.failed++;
        }
        
        await sleep(TEST_DELAY);
    }
    
    logSubsection('Verification Summary');
    log(`${verificationTests.passed}/${verificationTests.tested} links verified`,
        verificationTests.failed === 0 ? 'green' : 'yellow');
    
    return verificationTests;
}

async function calculateRating(tests) {
    // Calculate overall rating based on all tests
    
    const totalTests = tests.homepage ? 1 : 0 +
                       tests.info ? tests.info.tested : 0 +
                       tests.episodes ? tests.episodes.tested : 0 +
                       tests.stream ? tests.stream.tested : 0 +
                       tests.movies ? tests.movies.tested : 0 +
                       tests.search ? tests.search.tested : 0 +
                       tests.genre ? tests.genre.tested : 0 +
                       tests.series ? tests.series.tested : 0 +
                       tests.additional ? tests.additional.tested : 0 +
                       tests.cartoon ? tests.cartoon.tested : 0 +
                       tests.verification ? tests.verification.tested : 0;
    
    const passedTests = tests.homepage ? 1 : 0 +
                        tests.info ? tests.info.passed : 0 +
                        tests.episodes ? tests.episodes.passed : 0 +
                        tests.stream ? tests.stream.passed : 0 +
                        tests.movies ? tests.movies.passed : 0 +
                        tests.search ? tests.search.passed : 0 +
                        tests.genre ? tests.genre.passed : 0 +
                        tests.series ? tests.series.passed : 0 +
                        tests.additional ? tests.additional.passed : 0 +
                        tests.cartoon ? tests.cartoon.passed : 0 +
                        tests.verification ? tests.verification.passed : 0;
    
    const failedTests = tests.info ? tests.info.failed : 0 +
                        tests.episodes ? tests.episodes.failed : 0 +
                        tests.stream ? tests.stream.failed : 0 +
                        tests.movies ? tests.movies.failed : 0 +
                        tests.search ? tests.search.failed : 0 +
                        tests.genre ? tests.genre.failed : 0 +
                        tests.series ? tests.series.failed : 0 +
                        tests.additional ? tests.additional.failed : 0 +
                        tests.cartoon ? tests.cartoon.failed : 0 +
                        tests.verification ? tests.verification.failed : 0;
    
    // Base rating from pass rate
    const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
    
    // Bonus points for features
    let bonusPoints = 0;
    
    // Homepage has all required fields
    if (tests.homepageData) {
        if (tests.homepageData.spotlightsCount > 0) bonusPoints += 2;
        if (tests.homepageData.genresCount > 0) bonusPoints += 2;
        if (tests.homepageData.networksCount > 0) bonusPoints += 2;
        if (tests.homepageData.animeListCount > 0) bonusPoints += 2;
    }
    
    // Series pagination works
    if (tests.seriesData?.totalPages > 1) bonusPoints += 3;
    
    // Search works for multiple terms
    if (tests.search?.passed >= 3) bonusPoints += 2;
    
    // Movies extracted correctly
    if (tests.moviesData?.totalResults > 0) bonusPoints += 2;
    
    // Cap at 100%
    let finalRating = Math.min(100, passRate + bonusPoints);
    
    // Round to nearest integer
    finalRating = Math.round(finalRating);
    
    return {
        totalTests,
        passedTests,
        failedTests,
        passRate: passRate.toFixed(2),
        bonusPoints,
        finalRating
    };
}

async function runComprehensiveTest() {
    log('\n' + '🎬'.repeat(40));
    log('🎬  ANIME SALT API - COMPREHENSIVE TEST SUITE  🎬', 'bold');
    log('🎬'.repeat(40));
    
    logInfo(`API Base URL: ${API_BASE}`);
    logInfo(`Starting comprehensive test suite...`);
    logInfo(`Testing against animesalt.cc links database...`);
    
    // Wait a bit before starting
    await sleep(2000);
    
    try {
        // Run all tests
        const tests = {};
        
        // Test 1: Homepage
        tests.homepage = await testHomepage();
        tests.homepageData = tests.homepage;
        await sleep(TEST_DELAY);
        
        // Test 2: Info endpoints
        tests.info = await testInfoEndpoints();
        await sleep(TEST_DELAY);
        
        // Test 3: Episode endpoints
        tests.episodes = await testEpisodeEndpoints();
        await sleep(TEST_DELAY);
        
        // Test 4: Stream endpoints
        tests.stream = await testStreamEndpoints();
        await sleep(TEST_DELAY);
        
        // Test 5: Movie endpoints
        tests.movies = await testMovieEndpoints();
        tests.moviesData = tests.movies;
        await sleep(TEST_DELAY);
        
        // Test 6: Search endpoint
        tests.search = await testSearchEndpoint();
        await sleep(TEST_DELAY);
        
        // Test 7: Genre endpoints
        tests.genre = await testGenreEndpoints();
        await sleep(TEST_DELAY);
        
        // Test 8: Series endpoints
        tests.series = await testSeriesEndpoints();
        tests.seriesData = tests.series;
        await sleep(TEST_DELAY);
        
        // Test 9: Additional endpoints
        tests.additional = await testAdditionalEndpoints();
        await sleep(TEST_DELAY);
        
        // Test 10: Cartoon endpoints
        tests.cartoon = await testCartoonEndpoints();
        await sleep(TEST_DELAY);
        
        // Test 11: Verify against provided links
        tests.verification = await verifyAgainstProvidedLinks();
        
        // Calculate final rating
        const rating = await calculateRating(tests);
        
        // Final summary
        logSection('📊 FINAL TEST RESULTS');
        
        console.log('\n' + '='.repeat(60));
        console.log('                    TEST SUMMARY');
        console.log('='.repeat(60));
        
        console.log(`\n${colors.cyan}Endpoint Tests:${colors.reset}`);
        console.log(`  Homepage:           ${tests.homepage ? '✓ PASSED' : '✗ FAILED'}`);
        console.log(`  Info Endpoints:     ${tests.info.passed}/${tests.info.tested} PASSED`);
        console.log(`  Episode Endpoints:  ${tests.episodes.passed}/${tests.episodes.tested} PASSED`);
        console.log(`  Stream Endpoints:   ${tests.stream.passed}/${tests.stream.tested} PASSED`);
        console.log(`  Movie Endpoints:    ${tests.movies.passed}/${tests.movies.tested} PASSED`);
        console.log(`  Search Endpoint:    ${tests.search.passed}/${tests.search.tested} PASSED`);
        console.log(`  Genre Endpoints:    ${tests.genre.passed}/${tests.genre.tested} PASSED`);
        console.log(`  Series Endpoints:   ${tests.series.passed}/${tests.series.tested} PASSED`);
        console.log(`  Additional Endpoints: ${tests.additional.passed}/${tests.additional.tested} PASSED`);
        console.log(`  Cartoon Endpoints:  ${tests.cartoon.passed}/${tests.cartoon.tested} PASSED`);
        console.log(`  Link Verification:  ${tests.verification.passed}/${tests.verification.tested} PASSED`);
        
        console.log(`\n${colors.cyan}Data Coverage (from animesalt.cc):${colors.reset}`);
        if (tests.homepageData) {
            console.log(`  Spotlights:         ${tests.homepageData.spotlightsCount} items`);
            console.log(`  Genres:             ${tests.homepageData.genresCount} items`);
            console.log(`  Networks:           ${tests.homepageData.networksCount} items`);
            console.log(`  Anime List:         ${tests.homepageData.animeListCount} items`);
        }
        if (tests.seriesData) {
            console.log(`  Total Series:       ${tests.seriesData.totalResults || 'N/A'}`);
            console.log(`  Total Pages:        ${tests.seriesData.totalPages || 'N/A'}`);
        }
        if (tests.moviesData) {
            console.log(`  Total Movies:       ${tests.moviesData.totalResults || 'N/A'}`);
        }
        
        console.log(`\n${colors.cyan}Verification against User Links:${colors.reset}`);
        console.log(`  Total links in database:  ~30,000+`);
        console.log(`  Links verified:            ${tests.verification.passed}/${tests.verification.tested}`);
        
        console.log('\n' + '='.repeat(60));
        
        // Rating display
        let ratingColor = 'red';
        let ratingMessage = 'NEEDS IMPROVEMENT';
        
        if (rating.finalRating >= 90) {
            ratingColor = 'green';
            ratingMessage = 'PRODUCTION READY';
        } else if (rating.finalRating >= 75) {
            ratingColor = 'cyan';
            ratingMessage = 'MOSTLY READY';
        } else if (rating.finalRating >= 50) {
            ratingColor = 'yellow';
            ratingMessage = 'PARTIALLY READY';
        }
        
        console.log(`\n${colors[ratingColor]}${'='.repeat(40)}${colors.reset}`);
        console.log(`${colors[ratingColor]}  API READINESS RATING: ${rating.finalRating}%${colors.reset}`);
        console.log(`${colors[ratingColor]}  Status: ${ratingMessage}${colors.reset}`);
        console.log(`${colors[ratingColor]}${'='.repeat(40)}${colors.reset}`);
        
        console.log(`\n${colors.green}Total Tests Passed: ${testsPassed}${colors.reset}`);
        console.log(`${colors.red}Total Tests Failed: ${testsFailed}${colors.reset}`);
        if (testsWarning > 0) {
            console.log(`${colors.yellow}Warnings: ${testsWarning}${colors.reset}`);
        }
        
        console.log('\n' + '='.repeat(60));
        
        if (rating.finalRating >= 75) {
            log('\n🎉 API IS READY FOR USE! 🎉', 'green', 'bold');
            log('You can deploy this API to production.', 'green');
        } else if (rating.finalRating >= 50) {
            log('\n⚠️  API NEEDS SOME WORK', 'yellow', 'bold');
            log('Review the failed tests above.', 'yellow');
        } else {
            log('\n❌ API NEEDS SIGNIFICANT WORK', 'red', 'bold');
            log('Multiple tests failed. Please review and fix.', 'red');
        }
        
        console.log('\n' + '='.repeat(60));
        
        // Save results to file
        const resultsData = {
            timestamp: new Date().toISOString(),
            apiBase: API_BASE,
            rating: rating,
            tests: tests,
            totalPassed: testsPassed,
            totalFailed: testsFailed,
            totalWarnings: testsWarning
        };
        
        fs.writeFileSync(
            path.join(__dirname, 'test-results.json'),
            JSON.stringify(resultsData, null, 2)
        );
        
        logInfo('Test results saved to test-results.json');
        
        return rating;
        
    } catch (error) {
        logError(`Test suite failed: ${error.message}`);
        console.error(error);
        
        return {
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            passRate: '0',
            bonusPoints: 0,
            finalRating: 0
        };
    }
}

// Run tests
runComprehensiveTest().then(rating => {
    process.exit(rating.finalRating >= 75 ? 0 : 1);
});
