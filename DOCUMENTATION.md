# Anime Salt API v3.0 Documentation

## Table of Contents

1. [Introduction](#introduction)
2. [Base URL](#base-url)
3. [Authentication](#authentication)
4. [Rate Limiting](#rate-limiting)
5. [Home Endpoints](#home-endpoints)
6. [Info Endpoints](#info-endpoints)
7. [Episode Endpoints](#episode-endpoints)
8. [Stream Endpoints](#stream-endpoints)
9. [Search Endpoints](#search-endpoints)
10. [Category Endpoints](#category-endpoints)
11. [Schedule Endpoints](#schedule-endpoints)
12. [Utility Endpoints](#utility-endpoints)
13. [Response Format](#response-format)
14. [Error Handling](#error-handling)
15. [Code Examples](#code-examples)

---

## Introduction

Anime Salt API is a professional REST API that scrapes and provides comprehensive anime data from animesalt.cc. The API is designed to deliver rich metadata including anime details, episodes, streaming links, genres, and more in a structured format inspired by industry-standard APIs.

### Features

- Comprehensive anime metadata extraction
- Multi-language support (Hindi, Tamil, Telugu, Bengali, Malayalam, Kannada, English, Japanese, Korean, Chinese)
- Episode streaming link extraction with multiple servers (StreamSB, Mp4Upload)
- Search functionality with autocomplete suggestions
- Genre, network, and language categorization
- In-memory caching for improved performance
- Smart recommendations based on content type
- High-quality w1280 backdrop images for spotlights
- Fresh Drops extraction with episode ranges
- Professional data format with consistent structure

### Version

- **Current Version**: 3.0.0
- **Last Updated**: December 2025
- **Masterpiece Edition**

---

## Base URL

```
https://localhost:3000/api
```

For production deployment, replace `localhost:3000` with your server domain and port.

---

## Authentication

No authentication is required for this API. All endpoints are publicly accessible.

---

## Rate Limiting

The API implements rate limiting to ensure fair usage and server stability.

- **Limit**: 100 requests per minute per IP address
- **Status Code**: 429 Too Many Requests when limit exceeded
- **Reset**: Limits reset after 1 minute window

---

## Home Endpoints

### GET /api/home

Retrieves complete homepage data including spotlights, trending anime, top series, top movies, recent episodes, networks, languages, and genres.

**Parameters**: None required

**Example Request**:
```bash
curl "https://localhost:3000/api/home"
```

**Example Response**:
```json
{
  "success": true,
  "spotlights": [
    {
      "id": "naruto-shippuden",
      "title": "Naruto Shippuden",
      "poster": "https://image.tmdb.org/t/p/w1280/z0YhJvomqedHF85bplUJEotkN5l.jpg",
      "url": "https://animesalt.cc/series/naruto-shippuden/",
      "type": "SERIES",
      "latestEpisode": null,
      "source": "Most Watched Series"
    },
    {
      "id": "chainsaw-man-the-movie-reze-arc",
      "title": "Chainsaw Man the Movie: Reze Arc",
      "poster": "https://image.tmdb.org/t/p/w1280/dh0dLVLDLqUKhtytCFjkf3EHeJI.jpg",
      "url": "https://animesalt.cc/movies/chainsaw-man-the-movie-reze-arc/",
      "type": "MOVIE",
      "latestEpisode": null,
      "source": "Most Watched Films"
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
      "id": "anime-id",
      "title": "Fresh Anime Title",
      "poster": "https://image.tmdb.org/t/p/w500/...",
      "url": "https://animesalt.cc/series/anime-id/",
      "season": "Season 1",
      "episodeRange": "1-5",
      "episodeCount": 5
    }
  ],
  "upcomingEpisodes": [],
  "networks": [],
  "languages": [],
  "genres": []
}
```

**Field Descriptions**:

| Field | Type | Description |
|-------|------|-------------|
| `spotlights` | Array | Top 8 featured anime (4 movies + 4 series, shuffled together) with high-quality w1280 backdrop images |
| `trending` | Array | Top 10 trending anime with episode info |
| `freshDrops` | Array | Newly dubbed anime with season and episode ranges |
| `upcomingEpisodes` | Array | Upcoming episodes with countdown timers |
| `networks` | Array | Streaming networks with SVG icons |
| `languages` | Array | Available dub languages with flags |
| `genres` | Array | Anime genres with icons (33 total) |

**Spotlight Item Structure**:

```json
{
  "id": "anime-id",
  "title": "Anime Title",
  "poster": "https://image.tmdb.org/t/p/w1280/...",  // High-quality backdrop
  "url": "https://animesalt.cc/series/anime-id/",
  "type": "SERIES",  // or "MOVIE"
  "latestEpisode": null,
  "source": "Most Watched Series"
}
```

**Note**: Spotlights now contain 8 items total (4 movies + 4 series) that are shuffled together for true randomization. All posters use w1280 high-resolution backdrop images fetched from the anime's watch page (TPostBg element).

---

### GET /api/top-ten

Retrieves top 10 anime rankings categorized by time period.

**Parameters**: None required

**Example Request**:
```bash
curl "https://localhost:3000/api/top-ten"
```

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
curl "https://localhost:3000/api/info?id=naruto-shippuden"
```

**Example Response**:
```json
{
  "success": true,
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
  "networks": [],
  "tvInfo": {
    "showType": "TV",
    "duration": "24 min",
    "releaseDate": "2007",
    "quality": "HD",
    "sub": 0,
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
  "episodes": [],
  "relatedAnime": [
    {
      "id": "anime-id",
      "title": "Related Anime",
      "poster": "https://image.tmdb.org/...",
      "type": "SERIES",
      "url": "https://animesalt.cc/series/anime-id/"
    }
  ]
}
```

**Field Descriptions**:

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique anime identifier (slug format) |
| data_id | number | Numeric identifier derived from anime ID |
| title | string | English title of the anime |
| japanese_title | string | Original Japanese title |
| poster | string | URL to the anime poster image |
| synopsis | string | Plot summary and description |
| showType | string | Type of anime (TV, Movie) |
| animeInfo | object | Detailed metadata (duration, status, score, etc.) |
| genres | array | List of genre objects with name, icon, and link |
| networks | array | List of studio/network objects |
| tvInfo | object | TV information including episode counts |
| relatedAnime | array | Up to 20 smart recommendations based on type matching |

**Smart Recommendations**: The `relatedAnime` array now includes up to 20 smart recommendations based on type matching (series recommends series, movies recommends movies, cartoons recommend cartoons).

---

### GET /api/random

Retrieves information about a randomly selected anime.

**Parameters**: None required

**Example Request**:
```bash
curl "https://localhost:3000/api/random"
```

---

## Episode Endpoints

### GET /api/episodes

Retrieves the complete episode list for a specific anime. All episodes are returned in a single response without pagination.

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | The anime ID (slug format) |
| page | number | No | Ignored - all episodes returned at once |
| pageSize | number | No | Ignored - all episodes returned at once |

**Example Request**:
```bash
curl "https://localhost:3000/api/episodes?id=naruto-shippuden"
```

**Note**: The `page` and `pageSize` parameters are not needed. All episodes are returned in a single response without pagination.

**Example Response**:
```json
{
  "success": true,
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
```

**Episode URL Format**: Episode URLs now use the query parameter format: `/series/{id}?season={season}&episode={episode}`

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
curl "https://localhost:3000/api/stream?id=naruto-shippuden&episode=1"

# Season x Episode format (Recommended)
curl "https://localhost:3000/api/stream?id=naruto-shippuden&episode=1x1"

# With episode name
curl "https://localhost:3000/api/stream?id=naruto-shippuden&episode=2x34"
```

**Note**: The `episode` parameter supports two formats:
- Simple number: `episode=1` (episode 1 of season 1)
- Season x Episode format: `episode=1x1` (season 1, episode 1) - Recommended

**Example Response**:
```json
{
  "success": true,
  "episodeId": "naruto-shippuden-2x34",
  "episodeName": "Formation! New Team Kakashi!",
  "episodeNumber": 34,
  "seasonNumber": 2,
  "url": "https://animesalt.cc/episode/naruto-shippuden-2x34/",
  "players": [
    {
      "name": "ZephyrFlick",
      "url": "https://play.zephyrflick.top/video/...",
      "type": "iframe",
      "quality": "auto"
    },
    {
      "name": "MultiLang",
      "url": "https://animesalt.cc/multi-lang-plyr/player.php?data=...",
      "type": "iframe",
      "quality": "auto"
    }
  ],
  "totalPlayers": 2
}
```

**Response Fields**:
- `episodeId`: Unique episode identifier (e.g., `naruto-shippuden-2x34`)
- `episodeName`: Episode title extracted from the page (e.g., `Formation! New Team Kakashi!`)
- `episodeNumber`: Episode number within the season (e.g., `34`)
- `seasonNumber`: Season number (e.g., `2`)
- `url`: Direct link to the episode page on animesalt.cc

**Stream URL Format**: The endpoint uses animesalt.cc native slug format: `https://animesalt.cc/episode/{id}-{season}x{episode}/`

**Supported Players**: ZephyrFlick, MultiLang, StreamSB, Mp4Upload

---

### GET /api/movie/stream

Retrieves streaming links for a specific movie.

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | The movie ID (slug format, e.g., `jujutsu-kaisen-0`) |

**Example Request**:
```bash
# Get movie stream
curl "https://localhost:3000/api/movie/stream?id=jujutsu-kaisen-0"
```

**Example Response**:
```json
{
  "success": true,
  "movieId": "jujutsu-kaisen-0",
  "movieName": "Jujutsu Kaisen 0",
  "url": "https://animesalt.cc/movies/jujutsu-kaisen-0/",
  "players": [
    {
      "name": "ZephyrFlick",
      "url": "https://play.zephyrflick.top/video/...",
      "type": "iframe",
      "quality": "auto"
    },
    {
      "name": "MultiLang",
      "url": "https://animesalt.cc/multi-lang-plyr/player.php?data=...",
      "type": "iframe",
      "quality": "auto"
    }
  ],
  "totalPlayers": 2
}
```

**Response Fields**:
- `movieId`: Unique movie identifier
- `movieName`: Movie title extracted from the page
- `url`: Direct link to the movie page on animesalt.cc

---

### GET /api/stream/fallback

Retrieves fallback streaming links when primary servers are unavailable.

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | The anime ID (slug format) |
| episode | string | Yes | Episode identifier |

---

### GET /api/servers

Retrieves available streaming servers for a specific anime episode.

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | The anime ID (slug format) |
| episode | string | No | Episode identifier (optional) |

---

### GET /api/movie/stream

Retrieves the streaming URL for a specific movie.

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | The movie ID (slug format) |

---

## Search Endpoints

### GET /api/search

Searches for anime by keyword with pagination support.

**Parameters**:

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| q | string | Yes | Search keyword | - |
| keyword | string | Yes | Alternative parameter for search keyword | - |
| page | number | No | Page number for pagination | 1 |
| pageSize | number | No | Results per page | 20 |

**Example Request**:
```bash
curl "https://localhost:3000/api/search?q=naruto&page=1&pageSize=10"
```

**Example Response**:
```json
{
  "success": true,
  "keyword": "naruto",
  "totalResults": 5,
  "page": 1,
  "pageSize": 20,
  "results": [
    {
      "id": "naruto-shippuden",
      "title": "Naruto Shippuden",
      "poster": "https://image.tmdb.org/...",
      "link": "https://animesalt.cc/series/naruto-shippuden/",
      "showType": "TV"
    }
  ]
}
```

---

### GET /api/search/suggest

Retrieves search suggestions for autocomplete functionality.

**Parameters**:

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| q | string | Yes | Search keyword (min 2 characters) | - |
| keyword | string | Yes | Alternative parameter | - |
| limit | number | No | Maximum number of suggestions | 10 |

---

### GET /api/top-search

Retrieves popular search terms.

**Parameters**: None required

---

### GET /api/cartoon

Retrieves cartoons filtered by type.

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| type | string | No | Filter type (`series` or `movies`) |

---

## Category Endpoints

### GET /api/series

Retrieves a paginated list of TV series anime.

**Parameters**:

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| page | number | No | Page number | 1 |

---

### GET /api/movies

Retrieves a paginated list of anime movies.

**Parameters**:

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| page | number | No | Page number | 1 |

---

### GET /api/movie

Retrieves detailed information about a specific movie.

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | The movie ID (slug format) |

---

### GET /api/category

A flexible category query endpoint that supports various category types.

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| type | string | Yes | Category type (category, letter, post-type, genre, language, network, studio) |
| value | string | Yes | Category value (e.g., cartoon, A, series, action, english) |
| page | number | No | Page number for pagination |
| pageSize | number | No | Number of items per page (default: 20) |

---

### GET /api/category/cartoon

Retrieves anime content from the cartoon category.

**Parameters**:

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| page | number | No | Page number for pagination | 1 |

---

### GET /api/category/letter/:letter

Retrieves anime content based on the first letter of the title.

**Parameters**:

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| letter | string | Yes | Single letter A-Z | - |
| page | number | No | Page number for pagination | 1 |
| pageSize | number | No | Number of items per page | 20 |

---

### GET /api/categories

Retrieves a list of all available categories on the website.

**Parameters**: None required

---

### GET /api/letters

Retrieves a list of all letters that have available content.

**Parameters**: None required

---

### GET /api/genres

Retrieves a list of all available genres.

**Parameters**: None required

**Example Response**:
```json
{
  "success": true,
  "genres": [
    {
      "name": "Action",
      "icon": "⚔️",
      "link": "https://animesalt.cc/category/genre/action/"
    }
  ]
}
```

---

### GET /api/networks

Retrieves a list of all available networks/studios with their logos.

**Parameters**: None required

---

### GET /api/languages

Retrieves a list of all available audio languages.

**Parameters**: None required

**Example Response**:
```json
{
  "success": true,
  "languages": [
    {
      "code": "hindi",
      "name": "Hindi",
      "native": "हिन्दी",
      "flag": "🇮🇳",
      "link": "https://animesalt.cc/category/language/hindi/"
    }
  ]
}
```

---

### GET /api/language/:lang

Retrieves anime filtered by specific language.

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| lang | string | Yes | Language code (e.g., hindi, tamil, telugu) |
| page | query | No | Page number (default: 1) |

---

### GET /api/genre/:genre

Retrieves anime filtered by specific genre.

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| genre | string | Yes | Genre slug (e.g., action, adventure, comedy) |
| page | query | No | Page number (default: 1) |

---

## Schedule Endpoints

### GET /api/schedule

Retrieves the schedule of recently released and upcoming episodes.

**Parameters**: None required

---

## Utility Endpoints

### GET /api/health

Retrieves server health status and statistics.

**Parameters**: None required

**Example Response**:
```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2025-12-31T06:00:00.000Z"
}
```

---

### GET /api

Retrieves API documentation and available endpoints.

**Parameters**: None required

---

### GET /docs

Returns a professional HTML documentation page with interactive examples.

**Parameters**: None required

**Example Request**:
```bash
curl "https://localhost:3000/docs"
```

---

## Response Format

All API responses follow a consistent JSON structure:

### Success Response

```json
{
  "success": true,
  "timestamp": "2025-12-31T06:00:00.000Z",
  ...
}
```

| Field | Type | Description |
|-------|------|-------------|
| success | boolean | Always `true` for successful responses |
| timestamp | string | ISO 8601 timestamp of response |

### Error Response

```json
{
  "success": false,
  "error": "Error message description"
}
```

| Field | Type | Description |
|-------|------|-------------|
| success | boolean | Always `false` for error responses |
| error | string | Human-readable error message |

---

## Error Handling

The API uses standard HTTP status codes to indicate success or failure.

| Status Code | Meaning | Description |
|-------------|---------|-------------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid parameters |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "ID parameter required" | Missing `id` parameter | Provide the anime ID |
| "Episode page not found - please check the episode ID" | Invalid episode ID | Verify the anime ID and episode format |
| "Search keyword is required" | Missing search query | Provide a search term |

---

## Code Examples

### JavaScript/Node.js Example

```javascript
const axios = require('axios');

async function getAnimeInfo(animeId) {
    try {
        const response = await axios.get(`https://localhost:3000/api/info`, {
            params: { id: animeId }
        });
        
        if (response.data.success) {
            const anime = response.data;
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
            'https://localhost:3000/api/info',
            params={'id': anime_id}
        )
        data = response.json()
        
        if data['success']:
            anime = data
            print(f"Title: {anime['title']}")
            print(f"Type: {anime['showType']}")
        else:
            print(f"Error: {data['error']}")
    except Exception as e:
        print(f"Error: {e}")

get_anime_info('naruto-shippuden')
```

### cURL Example

```bash
# Get anime details
curl "https://localhost:3000/api/info?id=naruto-shippuden"

# Search for anime
curl "https://localhost:3000/api/search?q=dragon"

# Get streaming links with 1x1 format
curl "https://localhost:3000/api/stream?id=naruto-shippuden&episode=1x1"

# Get episode list (no pagination needed)
curl "https://localhost:3000/api/episodes?id=naruto-shippuden"

# Get homepage with spotlights
curl "https://localhost:3000/api/home"
```

### React/Vue Example

```javascript
// Using fetch API
async function fetchAnimeEpisodes(animeId) {
    const response = await fetch(
        `https://localhost:3000/api/episodes?id=${animeId}`
    );
    const data = await response.json();
    
    if (data.success) {
        return data.episodes;
    }
    return [];
}

// Display episodes in your component
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

---

## License

This API is provided for educational purposes. Data is sourced from animesalt.cc and belongs to their respective owners.

---

## Changelog

### v3.0.0 (December 2025) - Masterpiece Edition

- **Spotlight Enhancements**:
  - Spotlights now contain 8 items (4 movies + 4 series)
  - Movies and series are shuffled together for true randomization
  - All spotlights use high-quality w1280 backdrop images from TPostBg element

- **Smart Recommendations**:
  - Up to 20 related anime recommendations
  - Type matching: series recommends series, movies recommends movies, cartoons recommend cartoons

- **Fresh Drops**:
  - New extraction of newly dubbed anime
  - Includes season name, episode range, and episode count

- **Episode URL Format**:
  - Updated to use query parameter format: `/series/{id}?season={season}&episode={episode}`

- **Stream Endpoint Improvements**:
  - Added support for `1x1` episode format (season x episode)
  - Proper URL construction with query parameters
  - Returns players array with StreamSB and Mp4Upload

- **API Cleanup**:
  - Episodes endpoint no longer requires pagination parameters
  - All episodes returned in a single response

- **Documentation**:
  - New interactive HTML documentation at `/docs`
  - Comprehensive README.md with all endpoint examples

### v2.0.0 (December 2025)

- Complete rewrite with modular architecture
- Added professional data format matching industry standards
- Implemented in-memory caching system
- Added rate limiting
- New endpoints: search/suggest, top-search, networks, languages
- Improved streaming link extraction
- Added multi-language player support
- Enhanced error handling
- Comprehensive documentation

---

**End of Documentation**
