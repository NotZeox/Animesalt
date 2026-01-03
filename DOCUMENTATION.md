# Anime Salt API v5.0 Documentation

## Table of Contents

1. [Introduction](#introduction)
2. [Landing Page](#landing-page)
3. [Base URL](#base-url)
4. [Authentication](#authentication)
5. [Rate Limiting](#rate-limiting)
6. [Standardized Response Format](#standardized-response-format)
7. [Home Endpoints](#home-endpoints)
8. [Info Endpoints](#info-endpoints)
9. [Episode Endpoints](#episode-endpoints)
10. [Stream Endpoints](#stream-endpoints)
11. [Movies Endpoints](#movies-endpoints)
12. [Cartoon Endpoints](#cartoon-endpoints)
13. [Search Endpoints](#search-endpoints)
14. [Category Endpoints](#category-endpoints)
15. [Letter Endpoints](#letter-endpoints)
16. [Schedule Endpoints](#schedule-endpoints)
17. [Testing Endpoints](#testing-endpoints)
18. [Error Handling](#error-handling)
19. [Code Examples](#code-examples)

---

## Introduction

Anime Salt API is a professional REST API that scrapes and provides comprehensive anime data from animesalt.cc. The API delivers rich metadata including anime details, episodes, streaming links, genres, movies, and cartoons in a structured, standardized format.

### Key Statistics

| Metric | Value |
|--------|-------|
| Total Episodes | 6,060+ |
| Series Available | 342+ |
| Movies | 124+ |
| API Endpoints | 25+ |

### Features

- Comprehensive anime metadata extraction with standardized formats
- Multi-language support (Hindi, Tamil, Telugu, Bengali, Malayalam, Kannada, English, Japanese, Korean, Chinese)
- Episode streaming link extraction with multiple servers (StreamSB, Mp4Upload)
- Advanced search functionality with pagination
- Genre, network, and language categorization
- In-memory caching for improved performance
- Smart recommendations based on content type
- High-quality w1280 backdrop images for spotlights
- Fresh Drops extraction with episode ranges
- Professional data format with consistent JSON structure
- Sub-only filtering for accurate content availability

### Version

- **Current Version**: 5.1.0 (Production Edition)
- **Last Updated**: January 2026
- **Status**: Production Ready

---

## Landing Page

The API features a beautifully designed landing page at the root URL (`/`) that provides a modern interface for developers and users.

### Landing Page URL

```
https://your-api-domain.com/
```

### Landing Page Features

The landing page includes:

- **Hero Section**: Modern design with the AnimeSalt API branding in a lime green color scheme
- **Statistics Display**: Shows key API metrics (6,060+ episodes, 342+ series, 124+ movies, 25+ endpoints)
- **Quick Actions**: Direct links to Documentation and API testing
- **Feature Highlights**: Overview of production-grade capabilities
- **Endpoint Preview**: Interactive endpoint cards with HTTP method badges
- **Responsive Design**: Fully responsive layout for all devices
- **Smooth Animations**: Fade-in effects and hover interactions
- **Lime Theme**: Professional green color palette with glow effects

### Navigation

The landing page includes a fixed navigation bar with quick links to:

- Features section
- Endpoints section
- Documentation (`/docs`)
- Source site (animesalt.cc)

### Quick Links from Landing Page

| Link | Destination | Description |
|------|-------------|-------------|
| Read Documentation | `/docs` | Interactive API documentation |
| Try API Now | `/api/home` | Test the home endpoint |
| Features | `#features` | Feature highlights section |
| Endpoints | `#endpoints` | Available API endpoints |

---

## Base URL

```
https://your-domain.com/api
```

All API endpoints are accessed relative to this base URL. For local development:

```
http://localhost:3000/api
```

---

## Authentication

No authentication is required for this API. All endpoints are publicly accessible and free to use.

---

## Rate Limiting

The API implements rate limiting to ensure fair usage and server stability.

- **Limit**: 100 requests per minute per IP address
- **Status Code**: 429 Too Many Requests when limit exceeded
- **Reset**: Limits reset after 1 minute window

---

## Standardized Response Format

All API responses now follow a consistent JSON structure with proper status codes and data encapsulation.

### Success Response

```json
{
    "success": true,
    "statusCode": 200,
    "data": {
        // Endpoint-specific data
    },
    "timestamp": "2026-01-03T00:00:00.000Z"
}
```

### Error Response

```json
{
    "success": false,
    "statusCode": 400,
    "message": "Error message description"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| success | boolean | Indicates if the request was successful |
| statusCode | number | HTTP status code (200, 400, 404, 500) |
| data | object | Response payload (success responses only) |
| message | string | Human-readable message (error responses only) |
| timestamp | string | ISO 8601 timestamp of the response |

---

## Home Endpoints

### GET /api/home

Retrieves complete homepage data including spotlights, trending anime, top series, top movies, recent episodes, networks, languages, and genres.

**Parameters**: None required

**Example Request**:
```bash
curl "https://your-domain.com/api/home"
```

**Example Response**:
```json
{
    "success": true,
    "statusCode": 200,
    "data": {
        "spotlights": [
            {
                "id": "naruto-shippuden",
                "title": "Naruto Shippuden",
                "poster": "https://image.tmdb.org/t/p/w500/kV27j3Nz4d5z8u6mN3EJw9RiLg2.jpg",
                "backdrop": "<div class=\"bghd\"><img class=\"TPostBg lazyloaded\" data-src=\"https://image.tmdb.org/t/p/w1280/kV27j3Nz4d5z8u6mN3EJw9RiLg2.jpg\" alt=\"Naruto Shippuden\" src=\"https://image.tmdb.org/t/p/w1280/kV27j3Nz4d5z8u6mN3EJw9RiLg2.jpg\"></div>",
                "url": "https://animesalt.cc/series/naruto-shippuden/",
                "type": "SERIES",
                "ranking": 1,
                "source": "Most Watched Series"
            }
        ],
        "trending": [
            {
                "id": "one-piece",
                "number": 1,
                "title": "One Piece",
                "poster": "https://image.tmdb.org/t/p/w500/...",
                "url": "https://animesalt.cc/series/one-piece/"
            }
        ],
        "freshDrops": [
            {
                "id": "naruto-shippuden",
                "title": "Naruto Shippuden",
                "poster": "https://image.tmdb.org/t/p/w500/...",
                "url": "https://animesalt.cc/series/naruto-shippuden/",
                "type": "SERIES",
                "season": 15,
                "episode": 468,
                "latestEpisode": 467
            }
        ],
        "upcomingEpisodes": [
            {
                "id": "dragon-ball-super",
                "title": "Dragon Ball Super",
                "poster": "https://image.tmdb.org/t/p/w500/...",
                "url": "https://animesalt.cc/series/dragon-ball-super/",
                "type": "SERIES",
                "nextEpisode": 170,
                "countdown": "5h 14m"
            }
        ],
        "networks": [],
        "languages": [],
        "genres": []
    }
}
```

**Field Descriptions**:

| Field | Type | Description |
|-------|------|-------------|
| spotlights | Array | Featured anime with HTML backdrop wrapper scraped from watch pages (max 10 items, mixed from trending) |
| trending | Array | Top 10 trending anime with episode info |
| freshDrops | Array | Newly dubbed anime with season and episode ranges for tracking new releases |
| upcomingEpisodes | Array | Upcoming episodes with countdown timers showing time until release |
| networks | Array | Streaming networks with SVG icons |
| languages | Array | Available dub languages with flags |
| genres | Array | Anime genres with icons |

### Spotlight Backdrop Extraction

The spotlight backdrops are now extracted directly from each item's watch page by:

1. **Individual Page Visits**: Each spotlight item's URL is visited to fetch the actual watch page
2. **bghd Element Extraction**: The `<div class="bghd">` element is parsed from the page HTML
3. **Parallel Processing**: All 10 watch pages are fetched concurrently using Promise.all for optimal performance
4. **Fallback Generation**: If a watch page cannot be fetched, the API falls back to generating a backdrop from the poster image

This ensures that spotlight backdrops match exactly what users see on animesalt.cc, including any styling, lazy-loading attributes, and image URLs used by the source website.

---

## Info Endpoints

### GET /api/info

Retrieves detailed information about a specific anime.

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | The anime ID (slug format) |

**Example Request**:
```bash
curl "https://your-domain.com/api/info?id=naruto-shippuden"
```

**Example Response**:
```json
{
    "success": true,
    "statusCode": 200,
    "data": {
        "id": "naruto-shippuden",
        "data_id": 768748400,
        "title": "Naruto Shippuden",
        "japanese_title": "",
        "poster": "https://image.tmdb.org/t/p/w500/kV27j3Nz4d5z8u6mN3EJw9RiLg2.jpg",
        "synopsis": "It has been two and a half years since Naruto Uzumaki left Konohagakure...",
        "showType": "TV",
        "animeInfo": {
            "duration": "24 min",
            "status": "Completed",
            "released": "2007"
        },
        "genres": [
            {
                "name": "Action",
                "icon": "⚔️",
                "link": "https://animesalt.cc/category/genre/action/"
            }
        ],
        "tvInfo": {
            "showType": "TV",
            "duration": "24 min",
            "releaseDate": "2007",
            "quality": "HD",
            "sub": 500,
            "dub": 0,
            "eps": 500
        },
        "seasons": [
            {
                "id": "season-1",
                "title": "Season 1",
                "total_episodes": 23,
                "episode_range": "1-23"
            }
        ],
        "relatedAnime": []
    }
}
```

---

### GET /api/random

Retrieves information about a randomly selected anime.

**Parameters**: None required

**Example Request**:
```bash
curl "https://your-domain.com/api/random"
```

---

## Episode Endpoints

### GET /api/episodes

Retrieves the complete episode list for a specific anime.

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | The anime ID (slug format) |

**Example Request**:
```bash
curl "https://your-domain.com/api/episodes?id=naruto-shippuden"
```

**Example Response**:
```json
{
    "success": true,
    "statusCode": 200,
    "data": {
        "id": "naruto-shippuden",
        "totalEpisodes": 500,
        "totalSeasons": 1,
        "totalSeasonsCount": 1,
        "totalEpisodesCount": 500,
        "allSeasons": [
            {
                "season": 1,
                "title": "Season 1",
                "episodeCount": 500,
                "name": "Season 1"
            }
        ],
        "episodes": [
            {
                "id": "naruto-shippuden-season-1-episode-1",
                "season": 1,
                "episode": 1,
                "episodeLabel": "1xEP:1",
                "url": "https://animesalt.cc/series/naruto-shippuden?season=1&episode=1",
                "hasSub": true,
                "hasDub": false,
                "hasRegionalDub": false,
                "isGrayedOut": true,
                "releaseDate": null,
                "isPlaceholder": true
            }
        ]
    }
}
```

---

## Stream Endpoints

### GET /api/stream

Retrieves streaming links and video sources for a specific episode.

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | The anime ID (slug format) |
| episode | string | Yes | Episode number or format (e.g., `1` or `1x1`) |

**Example Request**:
```bash
# Simple episode format
curl "https://your-domain.com/api/stream?id=naruto-shippuden&episode=1"

# Season x Episode format (Recommended)
curl "https://your-domain.com/api/stream?id=naruto-shippuden&episode=1x1"
```

**Example Response**:
```json
{
    "success": true,
    "statusCode": 200,
    "data": {
        "episodeId": "naruto-shippuden-2x34",
        "episodeName": "Formation! New Team Kakashi!",
        "episodeNumber": 34,
        "seasonNumber": 2,
        "url": "https://animesalt.cc/episode/naruto-shippuden-2x34/",
        "hasSub": true,
        "hasDub": true,
        "isDualAudio": true,
        "isRegional": false,
        "language": "hindi",
        "players": [
            {
                "player": "HD 1 (Sub)",
                "url": "https://play.zephyrflick.top/video/...",
                "type": "iframe",
                "quality": "auto",
                "isSub": true,
                "isDub": false
            }
        ],
        "relatedAnime": [],
        "totalPlayers": 1
    }
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| episodeId | string | Unique episode identifier |
| episodeName | string | Episode title |
| episodeNumber | number | Episode number within season |
| seasonNumber | number | Season number |
| hasSub | boolean | Subtitle version available |
| hasDub | boolean | Dubbed version available |
| isDualAudio | boolean | Both sub and dub available |
| players | Array | Streaming player links |

---

## Movies Endpoints

### GET /api/movies

Retrieves a paginated list of anime movies.

**Parameters**:

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| page | number | No | Page number | 1 |

**Example Request**:
```bash
curl "https://your-domain.com/api/movies?page=1"
```

**Example Response**:
```json
{
    "success": true,
    "statusCode": 200,
    "data": {
        "page": 1,
        "totalPages": 5,
        "totalResults": 124,
        "results": [
            {
                "id": "jujutsu-kaisen-0",
                "title": "Jujutsu Kaisen 0",
                "poster": "https://image.tmdb.org/t/p/w500/...",
                "link": "https://animesalt.cc/movies/jujutsu-kaisen-0/",
                "type": "MOVIE"
            }
        ]
    }
}
```

---

### GET /api/movie

Retrieves detailed information about a specific movie.

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | The movie ID (slug format) |

**Example Request**:
```bash
curl "https://your-domain.com/api/movie?id=jujutsu-kaisen-0"
```

---

### GET /api/movie/stream

Retrieves streaming links for a specific movie.

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | The movie ID (slug format) |

**Example Request**:
```bash
curl "https://your-domain.com/api/movie/stream?id=jujutsu-kaisen-0"
```

---

## Cartoon Endpoints

### GET /api/cartoon

Retrieves cartoons with optional type filtering.

**Parameters**:

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| type | string | No | Filter type (`series`, `movies`, `shorts`, `specials`, `crossovers`) | all |
| page | number | No | Page number | 1 |

**Example Request**:
```bash
# Get all cartoons
curl "https://your-domain.com/api/cartoon"

# Get only cartoon series
curl "https://your-domain.com/api/cartoon?type=series"

# Get cartoon movies
curl "https://your-domain.com/api/cartoon?type=movies"
```

---

## Search Endpoints

### GET /api/search

Searches for anime by keyword with pagination support.

**Parameters**:

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| q | string | Yes | Search keyword | - |
| page | number | No | Page number | 1 |

**Example Request**:
```bash
curl "https://your-domain.com/api/search?q=naruto&page=1"
```

**Example Response**:
```json
{
    "success": true,
    "statusCode": 200,
    "data": {
        "keyword": "naruto",
        "totalResults": 5,
        "page": 1,
        "pageSize": 20,
        "results": [
            {
                "id": "naruto-shippuden",
                "title": "Naruto Shippuden",
                "poster": "https://image.tmdb.org/t/p/w500/...",
                "link": "https://animesalt.cc/series/naruto-shippuden/",
                "showType": "TV"
            }
        ]
    }
}
```

---

## Category Endpoints

### GET /api/genre/:genre

Retrieves anime filtered by specific genre.

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| genre | string | Yes | Genre slug (e.g., action, adventure, comedy) |
| page | number | No | Page number |

**Example Request**:
```bash
curl "https://your-domain.com/api/genre/shounen"
```

---

### GET /api/language/:lang

Retrieves anime filtered by specific language.

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| lang | string | Yes | Language code (e.g., hindi, tamil, telugu) |
| page | number | No | Page number |

**Example Request**:
```bash
curl "https://your-domain.com/api/language/hindi"
```

---

### GET /api/genres

Retrieves a list of all available genres.

**Parameters**: None required

**Example Request**:
```bash
curl "https://your-domain.com/api/genres"
```

**Example Response**:
```json
{
    "success": true,
    "statusCode": 200,
    "data": {
        "genres": [
            {
                "name": "Action",
                "icon": "⚔️",
                "link": "https://animesalt.cc/category/genre/action/"
            }
        ]
    }
}
```

---

### GET /api/languages

Retrieves a list of all available audio languages.

**Parameters**: None required

**Example Request**:
```bash
curl "https://your-domain.com/api/languages"
```

---

### GET /api/networks

Retrieves a list of all available networks/studios.

**Parameters**: None required

---

## Letter Endpoints

### GET /api/letter/:letter

Retrieves anime content based on the first letter of the title.

**Parameters**:

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| letter | string | Yes | Single letter A-Z | - |
| page | number | No | Page number | 1 |

**Example Request**:
```bash
curl "https://your-domain.com/api/letter/a"
```

---

### GET /api/letters

Retrieves a list of all letters that have available content.

**Parameters**: None required

---

## Schedule Endpoints

### GET /api/schedule

Retrieves the schedule of recently released and upcoming episodes.

**Parameters**: None required

---

## Testing Endpoints

### GET /api/test

Test endpoint to verify API functionality against sample links.

**Parameters**: None required

**Example Request**:
```bash
curl "https://your-domain.com/api/test"
```

---

## Error Handling

The API uses standard HTTP status codes to indicate success or failure.

### HTTP Status Codes

| Status Code | Meaning | Description |
|-------------|---------|-------------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid parameters or missing required fields |
| 404 | Not Found | Resource not found |
| 500 | Internal Server Error | Server error |

### Error Response Format

```json
{
    "success": false,
    "statusCode": 400,
    "message": "ID parameter is required"
}
```

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "ID parameter is required" | Missing `id` parameter | Provide the anime ID |
| "Anime ID is invalid" | Invalid ID format | Check the anime ID format |
| "Episode not found" | Invalid episode number | Verify the episode exists |
| "Search keyword is required" | Missing search query | Provide a search term |
| "Invalid letter parameter" | Invalid letter format | Use single letter A-Z |

---

## Code Examples

### JavaScript/Node.js Example

```javascript
const axios = require('axios');

async function getAnimeInfo(animeId) {
    try {
        const response = await axios.get(`https://your-domain.com/api/info`, {
            params: { id: animeId }
        });

        if (response.data.success) {
            const anime = response.data.data;
            console.log(`Title: ${anime.title}`);
            console.log(`Type: ${anime.showType}`);
            console.log(`Episodes: ${anime.tvInfo?.eps || 'N/A'}`);
        }
    } catch (error) {
        console.error('Error fetching anime:', error.message);
    }
}

getAnimeInfo('naruto-shippuden');
```

### Python Example

```python
import requests

def get_anime_info(anime_id):
    try:
        response = requests.get(
            'https://your-domain.com/api/info',
            params={'id': anime_id}
        )
        data = response.json()

        if data['success']:
            anime = data['data']
            print(f"Title: {anime['title']}")
            print(f"Type: {anime['showType']}")
        else:
            print(f"Error: {data['message']}")
    except Exception as e:
        print(f"Error: {e}")

get_anime_info('naruto-shippuden')
```

### cURL Examples

```bash
# Get anime details
curl "https://your-domain.com/api/info?id=naruto-shippuden"

# Search for anime
curl "https://your-domain.com/api/search?q=dragon"

# Get streaming links
curl "https://your-domain.com/api/stream?id=naruto-shippuden&episode=1x1"

# Get episode list
curl "https://your-domain.com/api/episodes?id=naruto-shippuden"

# Get homepage data
curl "https://your-domain.com/api/home"
```

### React Example

```javascript
// Using fetch API
async function fetchAnimeEpisodes(animeId) {
    const response = await fetch(
        `https://your-domain.com/api/episodes?id=${animeId}`
    );
    const data = await response.json();

    if (data.success) {
        return data.data.episodes;
    }
    return [];
}

// Display episodes
const episodes = await fetchAnimeEpisodes('naruto-shippuden');
episodes.forEach(ep => {
    console.log(`Episode ${ep.episode}: ${ep.episodeLabel}`);
});
```

---

## Support

For issues, feature requests, or questions:

- Review error messages for debugging
- Ensure parameters are correctly formatted
- Check the API documentation at `/docs`
- Visit the landing page at `/` for quick reference

---

## License

This API is provided for educational purposes. Data is sourced from animesalt.cc and belongs to their respective owners.

---

## Changelog

### v5.1.0 (January 2026) - Watch Page Backdrop Scraping

- **HD Backdrop Extraction**: Spotlight backdrops are now scraped directly from each item's watch page
  - Fetches each spotlight item's detail page to extract the authentic backdrop image
  - Returns the complete `<div class="bghd">...</div>` structure exactly as it appears on animesalt.cc
  - Preserves all image attributes including lazy-loading classes and data-src URLs
- **Parallel Processing**: All watch page requests run concurrently using Promise.all
  - Minimizes total request time despite extra network calls
  - Each request includes retry logic for reliability
- **Fallback Support**: Graceful degradation when watch pages cannot be fetched
  - Automatically falls back to poster-based backdrop generation
  - No empty or broken backdrops in API response
- **Error Handling**: Individual backdrop fetch failures don't break the entire response
  - Failed requests are logged for monitoring
  - Fallback backdrops are generated with proper w1280 image sizing

### v5.0.1 (January 2026) - Feature Update

- **Fresh Drops Enhancement**: Added `season` and `episode` fields to provide precise tracking of newly released content
  - `season`: The season number for the latest release (e.g., 15)
  - `episode`: The episode number for the latest release (e.g., 468)
  - Handles multiple format variations: "Season X", "Seasons X-Y", "EP:X", "X episodes"
- **Upcoming Episodes Enhancement**: Added countdown timer functionality
  - `countdown`: Human-readable time until release (e.g., "5h 14m", "2d 3h")
  - `nextEpisode`: The episode number of the upcoming release
- **Spotlight Improvements**: 
  - Limited to exactly 10 items for curated content display
  - Mixed content from trending and most-watched sections
  - Strategic movie placement at positions 2 and 6 for content variety
  - Backdrop images now use direct `<img>` tag for frontend flexibility
  - Uses w1280 image size for high-quality backdrop display with HTTPS protocol
- **Bug Fixes**:
  - Fixed year extraction - now returns null instead of defaulting to current year when not found
  - Corrected content type filtering to prevent movies appearing in series sections
  - Resolved data format variations for anime with different episode naming conventions

### v5.0.0 (January 2026) - Production Edition

- **Landing Page**: New beautiful lime-themed landing page at root URL (`/`)
- **Modern UI Design**: Animated backgrounds, glassmorphism effects, responsive layout
- **Statistics Display**: Shows 6,060+ episodes, 342+ series, 124+ movies
- **Quick Actions**: Direct links to documentation and API testing
- **Standardized Responses**: Consistent JSON structure with `success`, `statusCode`, `data`/`message`
- **Input Validation**: Centralized validation with XSS protection
- **Sub-Only Filtering**: Enhanced pattern matching for content availability detection
- **New Letter Endpoint**: Added `/api/letter/:letter` for alphabet-based browsing
- **Cartoon Categories**: Filter cartoons by Series, Movies, Shorts, Specials, Crossovers
- **Error Handler**: New standardized error handling with `ApiError` class
- **Code Refactoring**: Modular architecture with dedicated parsers and utilities

### v4.0.0 (January 2026) - Refactor Update

- **Modular Architecture**: Complete rewrite with dedicated parser modules
- **Home Parser**: New `homeParser.js` for clean homepage extraction
- **Cache System**: Enhanced in-memory caching with proper TTL
- **Validation Middleware**: Centralized input sanitization and validation
- **Documentation Update**: Comprehensive README and DOCUMENTATION

### v3.1.0 (January 2026) - Feature Update

- **Language Selection**: Added `?lang` query parameter support
- **Smart Player Naming**: Intelligent player labeling based on content type
- **Content Detection**: Enhanced sub/dub/regional detection
- **Related Anime**: New extraction of recommended anime from watch pages

### v3.0.0 (December 2025) - Masterpiece Edition

- **Spotlight Enhancements**: 8 items with w1280 backdrop images
- **Smart Recommendations**: Up to 20 related anime suggestions
- **Fresh Drops**: New extraction of newly dubbed content
- **URL Format Update**: Query parameter format for episodes

---

**End of Documentation**
