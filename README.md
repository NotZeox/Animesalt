# Anime Salt API Documentation

## Overview

This API provides comprehensive access to anime information from animesalt.cc. It offers endpoints for retrieving homepage data, anime details, episodes, streaming links, search functionality, and more. The API includes network icons, genre icons, and detailed metadata for building anime streaming websites.

**Base URL:** `https://your-api-domain.com/api`

**Response Format:** All responses are returned in JSON format with the following structure:

```json
{
  "success": true,
  "data": { /* endpoint-specific data */ }
}
```

**Error Response:**

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

---

## Table of Contents

1. [Homepage Endpoints](#homepage-endpoints)
2. [Anime Info Endpoints](#anime-info-endpoints)
3. [Episode & Streaming Endpoints](#episode--streaming-endpoints)
4. [Search & Discovery Endpoints](#search--discovery-endpoints)
5. [Category Endpoints](#category-endpoints)
6. [Utility Endpoints](#utility-endpoints)
7. [Response Examples](#response-examples)
8. [Icons & Media](#icons--media)

---

## Homepage Endpoints

### Get Homepage Data

Retrieves all homepage sections including spotlights, trending, top series, top movies, upcoming episodes with countdown timers, and more.

**Endpoint:** `GET /api/home`

**Example Request:**
```
GET https://your-api.com/api/home
```

**Response Data:**

| Field | Type | Description |
|-------|------|-------------|
| `spotlights` | Array | Top 8 featured anime (4 movies + 4 series, shuffled together) with high-quality w1280 backdrop images |
| `trending` | Array | Top 10 trending anime with episode info |
| `topSeries` | Array | Top rated series (50 items) |
| `topMovies` | Array | Top rated movies (50 items) |
| `upcomingEpisodes` | Array | Upcoming episodes with countdown timers |
| `networks` | Array | Streaming networks with SVG icons |
| `languages` | Array | Available dub languages with flags |
| `genres` | Array | Anime genres with icons (33 total) |
| `freshDrops` | Array | Newly dubbed anime with season and episode ranges |
| `onAir` | Array | Currently airing anime |
| `latestEpisodesSeries` | Array | Latest episodes from series |
| `latestMoviesSeries` | Array | Latest movies and series |
| `freshCartoonFilms` | Array | Fresh animated films |
| `letters` | Array | A-Z navigation letters |

### Spotlight Item Structure

Each spotlight item includes high-quality w1280 backdrop images (from TPostBg on watch pages):

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

**Note:** Spotlights now contain 8 items total (4 movies + 4 series) that are shuffled together for true randomization. All posters use w1280 high-resolution backdrop images fetched from the anime's watch page.

### Fresh Drops Structure

The `freshDrops` array contains newly released anime with detailed episode information:

```json
{
  "id": "anime-id",
  "title": "Anime Title",
  "poster": "https://image.tmdb.org/t/p/w500/...",
  "url": "https://animesalt.cc/series/anime-id/",
  "season": "Season 1",
  "episodeRange": "1-5",
  "episodeCount": 5
}
```

### Upcoming Episodes Structure

Upcoming episodes include countdown timer data:

```json
{
  "id": "anime-id",
  "title": "Anime Title",
  "poster": "https://image.tmdb.org/...",
  "url": "https://animesalt.cc/series/anime-id/",
  "type": "SERIES",
  "nextEpisode": "5",
  "countdownTimer": 1767155460,
  "countdownDisplay": "5h 50m",
  "quality": "HD",
  "year": "2024"
}
```

---

## Anime Info Endpoints

### Get Anime Information

Retrieves detailed information about a specific anime.

**Endpoint:** `GET /api/info`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | String | Yes | Anime ID (e.g., `naruto-shippuden`) |

**Example Request:**
```
GET https://your-api.com/api/info?id=naruto-shippuden
```

**Response Data:**

```json
{
  "success": true,
  "id": "naruto-shippuden",
  "title": "Naruto Shippuden",
  "otherNames": ["Naruto Shippuden", "Naruto: Hurricane Chronicles"],
  "poster": "https://image.tmdb.org/t/p/w500/kV27j3Nz4d5z8u6mN3EJw9RiLg2.jpg",
  "backgroundImage": "https://image.tmdb.org/t/p/w1280/z0YhJvomqedHF85bplUJEotkN5l.jpg",
  "synopsis": "It has been two and a half years since Naruto Uzumaki left Konohagakure...",
  "type": "SERIES",
  "status": "Completed",
  "releaseDate": "2007",
  "releaseYear": "2007",
  "duration": "25 min",
  "quality": "HD",
  "genres": [...],
  "languages": [...],
  "networks": [...],
  "relatedAnime": [...],
  "totalEpisodes": 500
}
```

**Enhanced Fields:**
- `otherNames`: Alternative titles extracted from breadcrumbs
- `backgroundImage`: High-quality backdrop image (w1280) from watch page
- `releaseYear`: Release year (e.g., "2007", "2021")
- `duration`: Episode/movie duration (e.g., "25 min" for series, "1h 45m" for movies)
- `status`: Current status (Ongoing, Completed, Released)
- `quality`: Video quality (480p, 720p, 1080p, HD)
- `relatedAnime`: Up to 50 smart recommendations (series→series, movie→movie, cartoon→cartoon)

**Smart Recommendations:** The `relatedAnime` array now includes up to **50 smart recommendations** based on type matching (series recommends series, movies recommend movies, cartoons recommend cartoons).

**Background Image:** The `/info` endpoint now returns a `backgroundImage` field with high-quality backdrop images from the watch page (TMDB w1280 images). This is useful for setting the background when displaying anime details.

### Get Episode List

Retrieves all episodes for a specific anime.

**Endpoint:** `GET /api/episodes`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | String | Yes | Anime ID |
| `page` | Integer | No | Ignored - all episodes returned at once |
| `pageSize` | Integer | No | Ignored - all episodes returned at once |

**Example Request:**
```
GET https://your-api.com/api/episodes?id=naruto-shippuden
```

**Note:** The `page` and `pageSize` parameters are not needed. All episodes are returned in a single response without pagination.

**Sub-Only Detection:** Episodes that are only available in sub (no regional dub) are automatically detected and marked with `isSubOnly: true`. This includes:
- Episodes in seasons labeled "(Sub)"
- Episodes appearing after a "Below episodes aren't dubbed in regional languages" separator
- Episodes without video links that contain "sub" in their title or context

Episodes marked as `isSubOnly: true` will also have `isGrayedOut: true` so your frontend can visually indicate they cannot be played with regional dubs.

**Response Data:**

```json
{
  "success": true,
  "id": "naruto-shippuden",
  "backgroundImage": "https://image.tmdb.org/t/p/w1280/z0YhJvomqedHF85bplUJEotkN5l.jpg",
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
      "isSubOnly": true,
      "releaseDate": null,
      "isPlaceholder": true
    }
  ]
}
```

**New Fields:**
- `backgroundImage` (in `/info` response): High-quality backdrop image URL for watch page background
- `isSubOnly` (in episodes): Boolean flag indicating episode is sub-only (no regional dub)
- `isUpcoming` (in episodes): Boolean flag indicating episode hasn't aired yet
- `timerSeconds` (in episodes): Countdown timer in seconds for upcoming episodes

**Sub-Only Separator Detection:** When anime has a mix of dubbed and sub-only episodes (like Naruto Shippuden where episodes 346+ are sub-only), the API detects the separator div that says "Below episodes aren't dubbed in regional languages" and marks all subsequent episodes as `isSubOnly: true`.

**Episode URL Format:** Episode URLs now use the query parameter format: `/series/{id}?season={season}&episode={episode}`

---

## Episode & Streaming Endpoints

### Get Episode Streaming Links

Retrieves streaming links and video sources for an episode. Returns clean, properly formatted URLs without duplicate parameters.

**Endpoint:** `GET /api/stream`

**Features:**
- Automatically cleans malformed URLs
- Handles duplicate episode parameters correctly
- Returns proper JSON even on errors
- Supports both simple and season x episode formats

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | String | Yes | Anime ID (e.g., `naruto-shippuden`) |
| `episode` | String | Yes | Episode number or format (e.g., `1` or `1x1`) |

**Example Request:**
```
GET https://your-api.com/api/stream?id=naruto-shippuden&episode=1
GET https://your-api.com/api/stream?id=naruto-shippuden&episode=1x1
GET https://your-api.com/api/stream?id=naruto-shippuden&episode=2x34
```

**Note:** The `episode` parameter supports two formats:
- Simple number: `episode=1` (episode 1 of season 1)
- Season x Episode format: `episode=1x1` (season 1, episode 1) - Recommended

**Response Data:**

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

**Response Fields:**
- `episodeId`: Unique episode identifier (e.g., `naruto-shippuden-2x34`)
- `episodeName`: Episode title (e.g., `Formation! New Team Kakashi!`)
- `episodeNumber`: Episode number within the season
- `seasonNumber`: Season number
- `url`: Direct link to the episode page

**Stream URL Format:** The endpoint uses animesalt.cc native slug format: `https://animesalt.cc/episode/{id}-{season}x{episode}/`

**Supported Players:** ZephyrFlick, MultiLang, StreamSB, Mp4Upload

### Get Movie Streaming Links

Retrieves streaming links for a movie.

**Endpoint:** `GET /api/movie/stream`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | String | Yes | Movie ID (e.g., `jujutsu-kaisen-0`) |

**Example Request:**
```
GET https://your-api.com/api/movie/stream?id=jujutsu-kaisen-0
GET https://your-api.com/api/movie/stream?id=demon-slayer-movie-mugen-train
```

**Response Data:**

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

**Response Fields:**
- `movieId`: Unique movie identifier
- `movieName`: Movie title (e.g., `Jujutsu Kaisen 0`)
- `url`: Direct link to the movie page

### Get Fallback Stream

Gets alternative streaming links if primary streams are unavailable.

**Endpoint:** `GET /api/stream/fallback`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | String | Yes | Episode ID |

### Get Servers

Lists available streaming servers for an episode.

**Endpoint:** `GET /api/servers`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | String | Yes | Episode ID |

### Get Movie Stream

Gets streaming links for a movie.

**Endpoint:** `GET /api/movie/stream`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | String | Yes | Movie ID (e.g., `demon-slayer-movie-mugen-train`) |

**Note:** The `/api/info` endpoint works for both series AND movies. For movies, use the same endpoint with the movie ID:

```
GET https://your-api.com/api/info?id=demon-slayer-movie-mugen-train
```

Movies return the same fields as series, plus additional movie-specific fields:

```json
{
  "type": "MOVIE",
  "releaseYear": "2020",
  "duration": "1h 57m",
  "backgroundImage": "https://image.tmdb.org/t/p/w1280/...",
  "relatedAnime": [...]
}
```

---

## Search & Discovery Endpoints

### Search Anime

Searches for anime by keyword.

**Endpoint:** `GET /api/search`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `keyword` | String | Yes | Search query |
| `page` | Integer | No | Page number (default: 1) |
| `pageSize` | Integer | No | Results per page (default: 20) |

**Example Request:**
```
GET https://your-api.com/api/search?keyword=naruto&page=1&pageSize=20
```

**Response Data:**

```json
{
  "keyword": "naruto",
  "totalResults": 5,
  "page": 1,
  "pageSize": 20,
  "results": [
    {
      "id": "naruto",
      "title": "Naruto",
      "poster": "https://image.tmdb.org/...",
      "link": "https://animesalt.cc/series/naruto/",
      "showType": "TV"
    }
  ]
}
```

### Get Search Suggestions

Returns quick search suggestions as user types.

**Endpoint:** `GET /api/search/suggest`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `keyword` | String | Yes | Partial search query |

### Get Top Search

Returns the most searched anime.

**Endpoint:** `GET /api/top-search`

**Example Request:**
```
GET https://your-api.com/api/top-search
```

### Get Random Anime

Returns a random anime from the database.

**Endpoint:** `GET /api/random`

**Example Request:**
```
GET https://your-api.com/api/random
```

---

## Category Endpoints

### Get All Categories

Returns all available category types.

**Endpoint:** `GET /api/categories`

**Example Request:**
```
GET https://your-api.com/api/categories
```

**Response Data:**

```json
{
  "categories": [
    { "id": "series", "name": "Series", "link": "/series/" },
    { "id": "movies", "name": "Movies", "link": "/movies/" },
    { "id": "anime", "name": "Anime", "link": "/category/anime/" },
    { "id": "cartoon", "name": "Cartoon", "link": "/category/cartoon/" }
  ]
}
```

### Get Ongoing Anime

Returns currently airing/ongoing anime series.

**Endpoint:** `GET /api/category/ongoing`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | Integer | No | Page number (default: 1) |

### Get Anime by Type

Returns anime filtered by type.

**Endpoint:** `GET /api/category/anime`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | String | No | Filter type (`series` or `movies`) |
| `page` | Integer | No | Page number (default: 1) |

### Get Cartoon by Type

Returns cartoons filtered by type.

**Endpoint:** `GET /api/category/cartoon-type`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | String | No | Filter type (`series` or `movies`) |
| `page` | Integer | No | Page number (default: 1) |

### Get All Genres

Returns all available genres with emoji icons. Each genre includes an icon for visual display.

**Endpoint:** `GET /api/genres`

**Features:**
- Returns 30+ genres with emoji icons
- Icons are automatically assigned based on genre type
- All genres are extracted from the website (no limit)

**Example Request:**
```
GET https://your-api.com/api/genres
```

**Response Data:**

```json
{
  "genres": [
    {
      "name": "Action",
      "icon": "⚔️",
      "link": "https://animesalt.cc/category/genre/action/"
    },
    {
      "name": "Adventure",
      "icon": "🗺️",
      "link": "https://animesalt.cc/category/genre/adventure/"
    }
  ]
}
```

### Get Genre Anime

Returns anime from a specific genre.

**Endpoint:** `GET /api/genre/:genre`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `genre` | String | Yes | Genre name (e.g., `action`) |
| `page` | Integer | No | Page number (default: 1) |

**Example Request:**
```
GET https://your-api.com/api/genre/action?page=1
```

### Get All Networks

Returns all available streaming networks.

**Endpoint:** `GET /api/networks`

**Example Request:**
```
GET https://your-api.com/api/networks
```

**Response Data:**

```json
{
  "networks": [
    {
      "id": "crunchyroll",
      "name": "Crunchyroll",
      "logo": "https://...",
      "icon": "<svg>...</svg>",
      "link": "https://animesalt.cc/category/network/crunchyroll/"
    }
  ]
}
```

### Get Network Anime

Returns anime from a specific network.

**Endpoint:** `GET /api/network/:network`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network` | String | Yes | Network name (e.g., `crunchyroll`) |
| `page` | Integer | No | Page number (default: 1) |

### Get All Languages

Returns all available dub languages.

**Endpoint:** `GET /api/languages`

**Example Request:**
```
GET https://your-api.com/api/languages
```

**Response Data:**

```json
{
  "languages": [
    {
      "code": "hindi",
      "name": "Hindi",
      "native": "हिन्दी",
      "flag": "🇮🇳",
      "link": "https://animesalt.cc/category/language/hindi/"
    },
    {
      "code": "tamil",
      "name": "Tamil",
      "native": "தமிழ்",
      "flag": "🇮🇳",
      "link": "https://animesalt.cc/category/language/tamil/"
    }
  ]
}
```

### Get Anime by Language

Returns anime dubbed in a specific language.

**Endpoint:** `GET /api/language/:lang`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `lang` | String | Yes | Language code (e.g., `hindi`) |
| `page` | Integer | No | Page number (default: 1) |

### Get All Series

Returns **all series** with unlimited pagination. The endpoint automatically fetches multiple pages to return complete results.

**Endpoint:** `GET /api/series`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | Integer | No | Ignored - all pages fetched automatically |
| `pageSize` | Integer | No | Ignored - unlimited results |

**Note:** This endpoint now returns ALL series by automatically following pagination (up to 20 pages, fetching 340+ series).

### Get All Movies

Returns **all movies** with unlimited pagination. The endpoint automatically fetches multiple pages to return complete results.

**Endpoint:** `GET /api/movies`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | Integer | No | Ignored - all pages fetched automatically |
| `pageSize` | Integer | No | Ignored - unlimited results |

**Note:** This endpoint now returns ALL movies by automatically following pagination (up to 20 pages, fetching 115+ movies). The response includes a `fetchedPages` field showing how many pages were collected.

### Get Category Anime (Series or Movies)

Returns all anime from a specific category type (series or movies) with unlimited pagination.

**Endpoint:** `GET /api/category/anime`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | String | No | Category type - use `series` for TV series or `movies` for movies. Default: `series` |
| `page` | Integer | No | Ignored - all pages fetched automatically |
| `pageSize` | Integer | No | Ignored - unlimited results |

**Example Requests:**
```
GET https://your-api.com/api/category/anime?type=series
GET https://your-api.com/api/category/anime?type=movies
```

### Get Category Cartoon

Returns all cartoon content (series or movies) with unlimited pagination.

**Endpoint:** `GET /api/category/cartoon`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | String | No | Content type - use `series` for cartoon series or `movies` for cartoon movies. Default: `series` |
| `page` | Integer | No | Ignored - all pages fetched automatically |
| `pageSize` | Integer | No | Ignored - unlimited results |

**Example Requests:**
```
GET https://your-api.com/api/category/cartoon?type=series
GET https://your-api.com/api/category/cartoon?type=movies
```

### Get Category Ongoing

Returns all ongoing/updating anime series with unlimited pagination.

**Endpoint:** `GET /api/category/ongoing`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | Integer | No | Ignored - all pages fetched automatically |
| `pageSize` | Integer | No | Ignored - unlimited results |

### Get A-Z List

Returns anime filtered by first letter with full pagination support.

**Endpoint:** `GET /api/letter/:letter`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `letter` | String | Yes | Letter (A-Z or # for numbers) |
| `page` | Integer | No | Page number (default: 1) |
| `pageSize` | Integer | No | Items per page (default: 20) |

**Example Requests:**
```
GET https://your-api.com/api/letter/A
GET https://your-api.com/api/letter/A?page=1
GET https://your-api.com/api/letter/B?page=2
GET https://your-api.com/api/letter/#?page=1
```

**Response Data:**

```json
{
  "type": "letter",
  "value": "A",
  "page": 1,
  "pageSize": 20,
  "items": [
    {
      "id": "anime-title",
      "title": "Anime Title",
      "poster": "https://image.tmdb.org/...",
      "type": "series",
      "link": "https://animesalt.cc/series/anime-title/",
      "year": "2024",
      "quality": "HD"
    }
  ],
  "pagination": {
    "hasNext": true,
    "hasPrev": false,
    "currentPage": 1,
    "totalPages": 5
  }
}
```

### Get A-Z List (Alternative Route)

Same as above, with alternative endpoint path.

**Endpoint:** `GET /api/category/letter/:letter`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `letter` | String | Yes | Letter (A-Z or # for numbers) |
| `page` | Integer | No | Page number (default: 1) |

### Get All Letters

Returns available A-Z navigation letters.

**Endpoint:** `GET /api/letters`

### Get Top Ten

Returns top 10 anime rankings.

**Endpoint:** `GET /api/top-ten`

### Get Schedule

Returns anime release schedule.

**Endpoint:** `GET /api/schedule`

**Example Request:**
```
GET https://your-api.com/api/schedule
```

---

## Utility Endpoints

### Health Check

Checks if the API is running.

**Endpoint:** `GET /api/health`

**Example Request:**
```
GET https://your-api.com/api/health
```

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2025-12-29T03:00:00.000Z"
}
```

---

## Response Examples

### Complete Homepage Response

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
  "networks": [
    {
      "id": "crunchyroll",
      "name": "Crunchyroll",
      "logo": "https://...",
      "icon": "<svg viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M4.5 4.5h15v12h-15z\"/><path d=\"M4.5 16.5h15v3h-15z\"/></svg>",
      "color": "#F47521",
      "link": "https://animesalt.cc/category/network/crunchyroll/"
    }
  ],
  "languages": [
    {
      "code": "hindi",
      "name": "Hindi",
      "native": "हिन्दी",
      "flag": "🇮🇳",
      "link": "https://animesalt.cc/category/language/hindi/"
    }
  ],
  "genres": [
    {
      "name": "Action",
      "icon": "⚔️",
      "link": "https://animesalt.cc/category/genre/action/"
    }
  ],
  "seasons": [
    {
      "id": "season-1",
      "title": "Season 1",
      "total_episodes": 23,
      "episode_range": "1-23"
    }
  ]
}
```

---

## Icons & Media

### Genre Icons

The API includes emoji icons for each genre:

| Genre | Icon |
|-------|------|
| Action | ⚔️ |
| Adventure | 🗺️ |
| Comedy | 😂 |
| Drama | 🎭 |
| Ecchi | 😏 |
| Fantasy | 🧙 |
| Harem | 👥 |
| Horror | 👻 |
| Isekai | 🔄 |
| Josei | 👩 |
| Kids | 👶 |
| Magic | ✨ |
| Martial Arts | 🥋 |
| Mecha | 🤖 |
| Military | 🎖️ |
| Music | 🎵 |
| Mystery | 🔍 |
| Psychological | 🧠 |
| Romance | 💕 |
| Samurai | 🎎 |
| School | 🏫 |
| Sci-Fi | 🚀 |
| Seinen | 👨 |
| Shoujo | 👧 |
| Shounen | 👦 |
| Slice of Life | ☕ |
| Sports | ⚽ |
| Supernatural | 🔮 |
| Thriller | 😱 |

### Network Icons

The API includes SVG icons for streaming networks:

| Network | Icon | Color |
|---------|------|-------|
| Crunchyroll | SVG | #F47521 |
| Netflix | SVG | #E50914 |
| Funimation | SVG | #5B3E96 |
| HiDive | SVG | #00D4FF |
| Disney+ | SVG | #113CCF |
| Hulu | SVG | #1CE783 |
| Prime Video | SVG | #00A8E1 |
| Apple TV+ | SVG | #1D1D1F |
| Wakanim | SVG | #FF6B6B |
| AnimeLab | SVG | #00D4A1 |
| Muse Asia | SVG | #FF6B6B |
| Bilibili | SVG | #00A1D6 |

### Language Flags

| Language | Flag | Native Name |
|----------|------|-------------|
| Hindi | 🇮🇳 | हिन्दी |
| Tamil | 🇮🇳 | தமிழ் |
| Telugu | 🇮🇳 | తెలుగు |
| English | 🌐 | English |
| Japanese | 🇯🇵 | 日本語 |
| Bengali | 🇧🇩 | বাংলা |
| Malayalam | 🇮🇳 | മലയാളം |
| Kannada | 🇮🇳 | ಕನ್ನಡ |
| Korean | 🇰🇷 | 한국어 |
| Chinese | 🇨🇳 | 中文 |

---

## Rate Limiting

The API does not currently implement rate limiting. However, please be respectful when making requests to avoid overloading the server.

---

## Caching

API responses are cached to improve performance. Cache duration is approximately 1 hour for most endpoints. Use the `cached` field in responses to determine if data was served from cache.

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Missing required parameters |
| 404 | Not Found - Resource does not exist |
| 500 | Internal Server Error |

---

## Support

For issues or questions, please open an issue on the GitHub repository.

---

## License

This API is provided for educational purposes. Please respect the terms of service of animesalt.cc when using this API.
