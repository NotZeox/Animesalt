# Anime Salt API - Production Edition v5.0

## Status: 100% Production Ready - Restored Original animesalt.cc Structure

This comprehensive anime data API has been fully restored to match the original animesalt.cc data structure and scraping methodology. The API now accurately reflects the source website's section organization with proper spotlight, trending, and featured content extraction.

---

## What's New in v5.1

### Watch Page Backdrop Scraping

- **HD Backdrop Extraction**: Spotlight backdrops are now scraped directly from each item's watch page
- **Authentic bghd Div**: Extracts the `<div class="bghd">` element exactly as it appears on animesalt.cc
- **Parallel Fetching**: All watch pages are fetched concurrently using Promise.all for optimal performance
- **Fallback Support**: If watch page fetch fails, gracefully falls back to poster-based backdrop generation

### Spotlight Backdrop Features

- **Direct Page Scraping**: Each spotlight item's watch page is visited to get the actual backdrop image
- **HD Quality**: Uses the full-resolution backdrop as displayed on the source website
- **HTML Preservation**: Returns the complete `<div class="bghd">...</div>` structure for frontend use
- **Error Resilience**: Failed requests don't break the response - fallbacks are applied automatically

---

## What's New in v5.0

### Major Restoration

- **Original Structure**: Restored to match the authentic animesalt.cc homepage layout and data organization
- **Featured Section**: Properly extracted featured content using the original scraping logic
- **Trending Algorithm**: Custom mixing of most-watched series and trending content as originally designed
- **Filter System**: Comprehensive genre and network filters matching the source website
- **Endpoint Documentation**: Complete API endpoint listing available at the root `/api` endpoint
- **URL Pattern Recognition**: Enhanced pattern matching for anime links from the source

### Key Features

- **11 Core Endpoints** for complete anime data access
- **100% Coverage** of animesalt.cc content types (series, movies, cartoons)
- **Authentic Data Structure**: Matches the source website exactly
- **Comprehensive Genre Icons** with 50+ genre mappings
- **Multi-Language Support** with native names and flags
- **Production-Ready** with proper error handling and validation
- **Studio/Network Extraction** with SVG icons

---

## Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start

# The API will be available at http://localhost:4000/api
```

---

## API Endpoints

### Core Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/home` | Complete homepage data with all sections, spotlights, trending, genres, networks |
| `GET /api/info?id={id}` | Detailed anime information with metadata, languages, studio |
| `GET /api/episodes?id={id}` | Complete episode list with season grouping and sub/dub flags |
| `GET /api/stream?id={id}&episode={ep}` | Streaming links with multiple servers |
| `GET /api/search?q={query}` | Search anime by keyword |
| `GET /api/genre/{genre}` | Get anime by genre |
| `GET /api/letter/{letter}` | Get anime by first letter (A-Z, 0-9) |
| `GET /api/random` | Get random anime |

### Movie & Cartoon Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/movies` | All movies with pagination |
| `GET /api/movies/:id` | Specific movie info |
| `GET /api/cartoon` | Cartoon content (series/movies) with type filtering |
| `GET /api/category/ongoing` | Currently airing anime |

### Utility Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check with cache stats |
| `GET /api/categories` | Available categories |
| `GET /api/genres` | All genres with icons |
| `GET /api/networks` | All streaming networks with SVG icons |
| `GET /api/languages` | Available dub/sub languages |
| `GET /api/letters` | A-Z navigation letters |
| `GET /api/top-ten` | Top 10 rankings |
| `GET /api/schedule` | Release schedule |
| `GET /api/test` | Connectivity test |
| `GET /api/test-links` | Sample API testing |

---

## Enhanced Response Format

### Success Response (Home)

```json
{
  "success": true,
  "meta": {
    "source": "animesalt.cc",
    "timestamp": "2026-01-03T01:00:00.000Z",
    "itemCount": 150,
    "processingTime": "234ms",
    "sectionsDiscovered": 8
  },
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
  "genres": [...],
  "networks": [...]
}
```

### Success Response (Info)

```json
{
  "success": true,
  "data": {
    "adultContent": false,
    "id": "anime-id",
    "data_id": 123456789,
    "title": "Anime Title",
    "japanese_title": "アニメタイトル",
    "poster": "https://...",
    "showType": "TV",
    "contentType": "series",
    "animeInfo": {
      "Overview": "Synopsis...",
      "Japanese": "アニメタイトル",
      "Synonyms": "Alternative Title",
      "Aired": "2024",
      "Premiered": "Winter 2024",
      "Duration": "24 min",
      "Status": "Completed",
      "MAL_Score": "8.5",
      "Genres": ["Action", "Adventure"],
      "Studios": "Studio Name",
      "Producers": ["Producer Name"]
    },
    "genres": [{"name": "Action", "icon": "⚔️"}],
    "languages": [
      {"name": "Japanese", "hasSub": true, "hasDub": false},
      {"name": "English", "hasSub": true, "hasDub": true}
    ],
    "networks": [{"id": "crunchyroll", "name": "Crunchyroll"}],
    "studio": {"name": "Studio Name", "link": "https://..."},
    "tvInfo": {"showType": "TV", "duration": "24 min", "quality": "HD", "sub": 12, "dub": 0, "eps": 12},
    "seasons": [
      {
        "id": "season-1",
        "title": "Season 1",
        "isSubOnly": false,
        "total_episodes": 12
      }
    ],
    "episodes": [
      {
        "episode_no": 1,
        "id": "anime-id-episode-1",
        "title": "Episode 1",
        "link": "https://...",
        "isSubbed": true,
        "isDubbed": false,
        "isSpecial": false
      }
    ],
    "related_data": [[...]],
    "recommended_data": [[...]]
  }
}
```

### Error Response

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error description",
  "errorCode": "VALIDATION_ERROR"
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Invalid or missing parameters |
| `NOT_FOUND` | Resource does not exist |
| `SERVER_ERROR` | Internal server error |
| `RATE_LIMIT` | Too many requests |
| `TIMEOUT` | Request timeout |
| `SCRAPING_ERROR` | Failed to fetch from target |

---

## Spotlight Section

The `spotlights` array contains featured anime with HTML-ready backdrop images scraped directly from each item's watch page. Each backdrop is extracted from the `<div class="bghd">` element found on animesalt.cc:

```json
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
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique anime identifier |
| `title` | string | Anime title |
| `poster` | string | URL to poster image (w500) |
| `backdrop` | string | HTML div with backdrop image scraped from watch page |
| `url` | string | Link to anime page |
| `type` | string | Content type (SERIES, MOVIE) |
| `ranking` | number | Spotlight ranking position (1-10) |
| `source` | string | Data source section |

### Backdrop HTML Format

The backdrop field provides the complete `<div class="bghd">` wrapper scraped from each item's watch page:

```html
<div class="bghd">
  <img class="TPostBg lazyloaded" 
       data-src="https://image.tmdb.org/t/p/w1280/..." 
       alt="Anime Title" 
       src="https://image.tmdb.org/t/p/w1280/...">
</div>
```

### How Backdrops Are Fetched

1. Each spotlight item's URL is visited individually
2. The `<div class="bghd">` element is extracted from the page
3. All watch pages are fetched in parallel for optimal performance
4. If fetching fails, a fallback is generated using the poster image converted to backdrop size

---

## Fresh Drops and Upcoming Episodes

### Fresh Drops

The `freshDrops` array contains newly released anime content with detailed season and episode information:

```json
{
  "id": "naruto-shippuden",
  "title": "Naruto Shippuden",
  "poster": "https://image.tmdb.org/t/p/w500/kV27j3Nz4d5z8u6mN3EJw9RiLg2.jpg",
  "url": "https://animesalt.cc/series/naruto-shippuden/",
  "type": "SERIES",
  "season": 15,
  "episode": 468,
  "latestEpisode": 467
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique anime identifier |
| `title` | string | Anime title |
| `poster` | string | URL to poster image (w500) |
| `url` | string | Link to anime page |
| `type` | string | Content type (SERIES, MOVIE) |
| `season` | number | Current season number |
| `episode` | number | Latest episode number |
| `latestEpisode` | number | Previously released episode number |

### Upcoming Episodes

The `upcomingEpisodes` array contains scheduled releases with countdown timers:

```json
{
  "id": "dragon-ball-super",
  "title": "Dragon Ball Super",
  "poster": "https://image.tmdb.org/t/p/w500/...",
  "url": "https://animesalt.cc/series/dragon-ball-super/",
  "type": "SERIES",
  "nextEpisode": 170,
  "countdown": "5h 14m"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique anime identifier |
| `title` | string | Anime title |
| `poster` | string | URL to poster image (w500) |
| `url` | string | Link to anime page |
| `type` | string | Content type (SERIES, MOVIE) |
| `nextEpisode` | number | Upcoming episode number |
| `countdown` | string | Human-readable time until release |

---

## Sub/Dub Differentiation

The API now provides detailed information about episode availability:

### Episode Fields

| Field | Type | Description |
|-------|------|-------------|
| `isSubbed` | boolean | True if subtitle version is available |
| `isDubbed` | boolean | True if dubbed version is available |
| `isSpecial` | boolean | True if this is a special/OVA episode |

### Language Information

```json
{
  "name": "English",
  "hasSub": true,
  "hasDub": true
}
```

### Sub-Only Season Detection

Seasons now include an `isSubOnly` flag:

```json
{
  "id": "season-2",
  "title": "Season 2",
  "isSubOnly": true,
  "total_episodes": 12
}
```

---

## Cartoon Content Type

The API automatically detects and categorizes content types:

- **`series`**: Regular anime TV series
- **`movie`**: Anime movies
- **`cartoon`**: Cartoon/animated content (detected from `/cartoon/` URLs or page text)

### Content Type Detection

The `contentType` field is automatically set based on:
1. URL pattern (`/series/`, `/movies/`, `/cartoon/`)
2. Page text analysis for cartoon indicators

---

## Input Validation

All endpoints include comprehensive input validation:

### ID Validation
- Alphanumeric characters, hyphens, and underscores only
- No path traversal or injection patterns
- Maximum length enforced

### Pagination
- Page numbers: 1 to 100 (configurable)
- Page size: 1 to 100 items
- Invalid values default to safe values

### Search Query
- Minimum 2 characters
- Maximum 200 characters
- XSS sanitization applied

### Letter Parameter
- Single character A-Z or 0-9
- Case insensitive

---

## Non-Empty Array Guarantee

All data arrays now include fallback strategies to prevent empty responses:

- `episodes` → Falls back to extracting any episode links
- `seasons` → Returns at least one season entry
- `genres` → Returns common fallback genres
- `languages` → Returns Japanese and English defaults
- `recommended_data` → Returns empty array structure
- `related_data` → Returns empty array structure

---

## Caching

### Cache Configuration

```javascript
{
  ttl: 300000,        // 5 minutes
  maxSize: 1000,      // Maximum cache entries
  checkperiod: 600    // Cleanup interval (seconds)
}
```

### Cache Stats
The `/api/health` endpoint returns cache statistics:
- `size`: Current cache entries
- `maxSize`: Maximum allowed entries
- `hits`: Cache hit count
- `misses`: Cache miss count
- `hitRate`: Percentage of cache hits

---

## Genre Icons

The API includes emoji icons for all genres:

| Genre | Icon | Genre | Icon |
|-------|------|-------|------|
| Action | ⚔️ | Martial Arts | 🥋 |
| Adventure | 🗺️ | Mecha | 🤖 |
| Comedy | 😂 | Mystery | 🔍 |
| Drama | 🎭 | Psychological | 🧠 |
| Fantasy | 🧙 | Romance | 💕 |
| Horror | 👻 | School | 🏫 |
| Isekai | 🌍 | Sci-Fi | 🚀 |
| Magic | ✨ | Shounen | 👦 |
| Slice of Life | ☕ | Sports | ⚽ |
| Supernatural | 👁️ | Thriller | 😱 |

---

## Language Support

| Language | Code | Flag | Native Name |
|----------|------|------|-------------|
| Hindi | hi | 🇮🇳 | हिन्दी |
| English | en | 🇺🇸 | English |
| Tamil | ta | 🇮🇳 | தமிழ் |
| Telugu | te | 🇮🇳 | తెలుగు |
| Malayalam | ml | 🇮🇳 | മലയാളം |
| Bengali | bn | 🇧🇩 | বাংলা |
| Japanese | ja | 🇯🇵 | 日本語 |
| Korean | ko | 🇰🇷 | 한국어 |
| Chinese | zh | 🇨🇳 | 中文 |

---

## Configuration

All configuration is centralized in `config/config.js`:

```javascript
module.exports = {
    server: { port: 4000, host: '0.0.0.0' },
    baseUrl: 'https://animesalt.cc',
    request: { timeout: 15000, retries: 3 },
    cache: { ttl: 300000, maxSize: 1000 },
    validGenres: [...],
    genreIcons: {...},
    fallbackNetworks: [...],
    fallbackGenres: [...],
    subOnlyPatterns: [...],
    limits: {...}
};
```

---

## Project Structure

```
anime-api/
├── config/
│   └── config.js          # Centralized configuration
├── public/
│   └── index.html         # Landing page
├── src/
│   ├── app.js             # Express app setup
│   ├── server.js          # Entry point
│   ├── controllers/
│   │   └── apiController.js
│   ├── routes/
│   │   └── api.js         # All API endpoints
│   ├── parsers/
│   │   ├── index.js
│   │   ├── homeParser.js
│   │   ├── anime.js
│   │   ├── cartoon.js
│   │   ├── movies.js
│   │   └── extractors/
│   │       ├── infoExtractor.js     # Enhanced with sub/dub
│   │       ├── episodeExtractor.js
│   │       └── streamExtractor.js
│   ├── middleware/
│   │   └── errorHandler.js
│   └── utils/
│       ├── request.js
│       ├── helpers.js
│       └── validator.js
└── package.json
```

---

## Testing

### Connectivity Test
```bash
GET /api/test
```

### Sample Links Test
```bash
GET /api/test-links?sampleSize=12
```

### Health Check with Cache Stats
```bash
GET /api/health
```

---

## Deployment

### Vercel (Serverless)
```bash
# Deploy automatically on push to main
vercel
```

### Traditional Server
```bash
npm start
# Server runs on port 4000
```

### Environment Variables
```bash
PORT=4000                    # Server port
HOST=0.0.0.0                # Server host
NODE_ENV=production         # Environment
LOG_LEVEL=info              # Logging level
```

---

## GitHub Upload Commands

```bash
# Initialize git repository (if not already initialized)
git init

# Add all files
git add .

# Create commit with description
git commit -m "AnimeSalt API v5.1 - Enhanced with sub/dub differentiation, cartoon detection, and comprehensive scraping"

# Add remote repository (replace with your repository URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to main branch
git push -u origin main

# For subsequent updates
git add .
git commit -m "Your commit message here"
git push origin main
```

### Setting Up SSH Key (Recommended)

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"

# Start SSH agent
eval "$(ssh-agent -s)"

# Add SSH key to agent
ssh-add ~/.ssh/id_ed25519

# Copy public key to GitHub
cat ~/.ssh/id_ed25519.pub
# Add this to GitHub > Settings > SSH Keys
```

### Clone and Deploy Commands

```bash
# Clone repository
git clone git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME

# Install dependencies
npm install

# Start server
npm start
```

---

## Error Handling

The API implements a comprehensive error handling strategy:

1. **Validation Errors**: Return 400 with specific error message
2. **Not Found Errors**: Return 404 with resource type
3. **Scraping Errors**: Return 503 with error details
4. **Timeout Errors**: Return 504 with timeout info
5. **Server Errors**: Return 500 with stack trace (dev only)

---

## Rate Limiting

The API includes configurable rate limiting:

```javascript
{
  windowMs: 60000,  // 1 minute window
  max: 100          // 100 requests per window
}
```

---

## Performance

- **Cache Hit Rate**: Monitored via `/api/health`
- **Response Times**: ~100-500ms for cached responses
- **Concurrent Requests**: Up to 5 concurrent fetches
- **Memory Usage**: Capped at 1000 cache entries

---

## Security

- **Input Sanitization**: All inputs validated and sanitized
- **XSS Prevention**: Special characters escaped
- **Path Traversal Protection**: Invalid path characters rejected
- **No SQL Injection**: No database queries (scraping API)

---

## Limitations

- Depends on animesalt.cc availability
- Rate limited by target website
- No persistent cache (in-memory only)
- Single instance (no distributed caching)

---

## Future Enhancements

- [ ] Persistent cache with Redis
- [ ] GraphQL API layer
- [ ] Webhook notifications
- [ ] Rate limiting per user
- [ ] Request queuing
- [ ] Multi-source scraping

---

## Credits

Built with love for the anime streaming community

**Powered by**: animesalt.cc

---

## License

This API is provided for educational purposes. Please respect the terms of service of animesalt.cc when using this API.

---

## Support

For issues or questions, please review the error messages and check the documentation at `/docs` for troubleshooting guidance.
