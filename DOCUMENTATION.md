# Anime Salt API v2.0 Documentation

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
- Multi-language support (Hindi, Tamil, Telugu, Bengali, Malayalam, Kannada, English, Japanese, Korean)
- Episode streaming link extraction with multiple servers
- Search functionality with autocomplete suggestions
- Genre, network, and language categorization
- In-memory caching for improved performance
- Rate limiting for fair usage
- Professional data format with consistent structure

### Version

- **Current Version**: 2.0.0
- **Last Updated**: December 2025

---

## Base URL

```
https://localhost:4000/api
```

For production deployment, replace `localhost:4000` with your server domain and port.

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
curl "https://localhost:4000/api/home"
```

**Example Response**:
```json
{
  "success": true,
  "cached": false,
  "results": {
    "spotlights": [
      {
        "id": "demon-slayer-kimetsu-no-yaiba-entertainment-district-arc",
        "title": "Demon Slayer: Kimetsu no Yaiba - Entertainment District Arc",
        "poster": "https://image.tmdb.org/t/p/w500/t9R8Z16f9j9DqK48fHHVKMnD5pA.jpg",
        "link": "https://animesalt.cc/series/demon-slayer-kimetsu-no-yaiba-entertainment-district-arc/",
        "japanese_title": "鬼滅の刃 遊郭編",
        "description": "After Enmu's defeat, Tanjiro and his allies receive a new mission...",
        "tvInfo": {
          "showType": "TV",
          "duration": "24 min",
          "quality": "HD"
        }
      }
    ],
    "trending": [
      {
        "id": "naruto-shippuden",
        "number": 1,
        "title": "Naruto Shippuden",
        "poster": "https://image.tmdb.org/t/p/w500/kV27j3Nz4d5z8u6mN3EJw9RiLg2.jpg",
        "link": "https://animesalt.cc/series/naruto-shippuden/",
        "japanese_title": "ナルト -疾風伝-"
      },
      {
        "id": "kaiju-no-8",
        "number": 2,
        "title": "Kaiju No. 8",
        "poster": "https://image.tmdb.org/t/p/w500/g4Da5pToG1E0moyaMhP4RewTBCl.jpg",
        "link": "https://animesalt.cc/series/kaiju-no-8/",
        "japanese_title": ""
      }
    ],
    "topSeries": [
      {
        "id": "naruto-shippuden",
        "number": 1,
        "title": "Naruto Shippuden",
        "poster": "https://image.tmdb.org/t/p/w500/kV27j3Nz4d5z8u6mN3EJw9RiLg2.jpg",
        "link": "https://animesalt.cc/series/naruto-shippuden/",
        "japanese_title": "ナルト -疾風伝-"
      }
    ],
    "topMovies": [
      {
        "id": "your-name",
        "number": 1,
        "title": "Your Name",
        "poster": "https://image.tmdb.org/t/p/w500/q719jXXEzOoYaps6babgKnONONX.jpg",
        "link": "https://animesalt.cc/movies/your-name/",
        "japanese_title": "君の名は。",
        "showType": "Movie"
      }
    ],
    "recentEpisodes": [
      {
        "id": "naruto-shippuden-1x32",
        "title": "The Fourth Great Ninja War Begins",
        "poster": "https://img.animesalt.com/images/12032/032.webp",
        "link": "https://animesalt.cc/episode/naruto-shippuden-1x32/",
        "episode": "32"
      }
    ],
    "networks": [
      {
        "id": "pierrot",
        "name": "Studio Pierrot",
        "logo": "https://animesalt.cc/wp-content/uploads/pierrot-logo.png",
        "link": "https://animesalt.cc/category/network/pierrot/"
      },
      {
        "id": "ufotable",
        "name": "Ufotable",
        "logo": "https://animesalt.cc/wp-content/uploads/ufotable-logo.png",
        "link": "https://animesalt.cc/category/network/ufotable/"
      }
    ],
    "languages": [
      {
        "code": "hindi",
        "name": "Hindi",
        "native": "हिन्दी",
        "link": "https://animesalt.cc/category/language/hindi/"
      },
      {
        "code": "tamil",
        "name": "Tamil",
        "native": "தமிழ்",
        "link": "https://animesalt.cc/category/language/tamil/"
      },
      {
        "code": "telugu",
        "name": "Telugu",
        "native": "తెలుగు",
        "link": "https://animesalt.cc/category/language/telugu/"
      }
    ],
    "genres": [
      {
        "name": "Action",
        "link": "https://animesalt.cc/category/genre/action/"
      },
      {
        "name": "Adventure",
        "link": "https://animesalt.cc/category/genre/adventure/"
      },
      {
        "name": "Comedy",
        "link": "https://animesalt.cc/category/genre/comedy/"
      }
    ]
  }
}
```

---

### GET /api/top-ten

Retrieves top 10 anime rankings categorized by time period.

**Parameters**: None required

**Example Request**:
```bash
curl "https://localhost:4000/api/top-ten"
```

**Example Response**:
```json
{
  "success": true,
  "results": {
    "topTen": {
      "today": [
        {
          "id": "naruto-shippuden",
          "number": 1,
          "title": "Naruto Shippuden",
          "poster": "https://image.tmdb.org/t/p/w500/kV27j3Nz4d5z8u6mN3EJw9RiLg2.jpg",
          "link": "https://animesalt.cc/series/naruto-shippuden/",
          "tvInfo": {
            "showType": "TV",
            "duration": "24 min",
            "quality": "HD"
          }
        }
      ],
      "week": [
        {
          "id": "demon-slayer",
          "number": 1,
          "title": "Demon Slayer",
          "poster": "https://image.tmdb.org/t/p/w500/mnpgxMLvUJYSXwydB5E1dqLukwy.jpg",
          "link": "https://animesalt.cc/series/demon-slayer/",
          "tvInfo": {
            "showType": "TV",
            "duration": "24 min",
            "quality": "HD"
          }
        }
      ],
      "month": [
        {
          "id": "solo-leveling",
          "number": 1,
          "title": "Solo Leveling",
          "poster": "https://image.tmdb.org/t/p/w500/rsOApVLbIQEcNkqSlOxNPyg3FyI.jpg",
          "link": "https://animesalt.cc/series/solo-leveling/",
          "tvInfo": {
            "showType": "TV",
            "duration": "24 min",
            "quality": "HD"
          }
        }
      ]
    }
  }
}
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
curl "https://localhost:4000/api/info?id=naruto-shippuden"
```

**Example Response**:
```json
{
  "success": true,
  "cached": false,
  "results": {
    "data": {
      "id": "naruto-shippuden",
      "data_id": 768748400,
      "title": "Naruto Shippuden",
      "japanese_title": "ナルト -疾風伝-",
      "poster": "https://image.tmdb.org/t/p/w342/kV27j3Nz4d5z8u6mN3EJw9RiLg2.jpg",
      "synopsis": "Naruto Uzumaki is a young shinobi who has a monstrous sealed beast within him known as the Nine-Tails. Treated as a pariah by the villagers, Naruto dreams of becoming the strongest ninja and becoming the Hokage, the village's leader. The story follows Naruto's journey as he trains and forms new bonds while encountering many enemies and challenges along the way.",
      "showType": "TV",
      "animeInfo": {
        "type": "TV Series",
        "status": "Completed",
        "aired": "Feb 2007 - Mar 2017",
        "premiered": "Winter 2007",
        "duration": "24 min per ep",
        "MAL_score": "8.2"
      },
      "genres": [
        {
          "name": "Action",
          "link": "https://animesalt.cc/category/genre/action/"
        },
        {
          "name": "Adventure",
          "link": "https://animesalt.cc/category/genre/adventure/"
        },
        {
          "name": "Fantasy",
          "link": "https://animesalt.cc/category/genre/fantasy/"
        },
        {
          "name": "Shounen",
          "link": "https://animesalt.cc/category/genre/shounen/"
        }
      ],
      "networks": [
        {
          "name": "Studio Pierrot",
          "link": "https://animesalt.cc/category/network/pierrot/"
        }
      ],
      "tvInfo": {
        "showType": "TV",
        "duration": "24 min",
        "releaseDate": "Feb 2007",
        "quality": "HD",
        "sub": 500,
        "dub": 500,
        "eps": 500
      },
      "seasons": [],
      "episodes": [
        {
          "episode_no": 1,
          "id": "1x1",
          "data_id": 537000466,
          "title": "Homecoming",
          "link": "https://animesalt.cc/episode/naruto-shippuden-1x1/",
          "poster": "https://img.animesalt.com/images/12032/001.webp",
          "japanese_title": ""
        }
      ],
      "related_data": [],
      "recommended_data": []
    }
  }
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
| showType | string | Type of anime (TV, Movie, OVA, etc.) |
| animeInfo | object | Detailed metadata (duration, status, score, etc.) |
| genres | array | List of genre objects with name and link |
| networks | array | List of studio/network objects |
| tvInfo | object | TV information including episode counts |
| episodes | array | List of available episodes |

---

### GET /api/random

Retrieves information about a randomly selected anime.

**Parameters**: None required

**Example Request**:
```bash
curl "https://localhost:4000/api/random"
```

**Example Response**:
```json
{
  "success": true,
  "results": {
    "data": {
      "id": "attack-on-titan",
      "data_id": 892374561,
      "title": "Attack on Titan",
      "japanese_title": "進撃の巨人",
      "poster": "https://image.tmdb.org/t/p/w500/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg",
      "link": "https://animesalt.cc/series/attack-on-titan/",
      "synopsis": "Centuries ago, mankind was slaughtered to near extinction by monstrous, humanoid Titans. Eren Yeager vows to kill every last one of them as the world comes under attack.",
      "showType": "TV",
      "animeInfo": {
        "type": "TV Series",
        "status": "Ongoing",
        "MAL_score": "9.0"
      },
      "genres": [
        {
          "name": "Action",
          "link": "https://animesalt.cc/category/genre/action/"
        },
        {
          "name": "Drama",
          "link": "https://animesalt.cc/category/genre/drama/"
        }
      ],
      "tvInfo": {
        "showType": "TV",
        "duration": "24 min",
        "quality": "HD",
        "eps": 0
      },
      "episodes": []
    }
  }
}
```

---

## Episode Endpoints

### GET /api/episodes

Retrieves the complete episode list for a specific anime with pagination support.

**Parameters**:

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| id | string | Yes | The anime ID (slug format) | - |
| page | number | No | Page number for pagination | 1 |
| pageSize | number | No | Number of episodes per page | 50 |

**Example Request**:
```bash
curl "https://localhost:4000/api/episodes?id=naruto-shippuden&page=1&pageSize=20"
```

**Example Response**:
```json
{
  "success": true,
  "cached": true,
  "results": {
    "totalEpisodes": 500,
    "currentPage": 1,
    "totalPages": 25,
    "episodes": [
      {
        "episode_no": 1,
        "id": "1x1",
        "data_id": 537000466,
        "title": "Homecoming",
        "link": "https://animesalt.cc/episode/naruto-shippuden-1x1/",
        "poster": "https://img.animesalt.com/images/12032/001.webp",
        "japanese_title": ""
      },
      {
        "episode_no": 2,
        "id": "1x2",
        "data_id": 537000497,
        "title": "The Akatsuki Makes Its Move",
        "link": "https://animesalt.cc/episode/naruto-shippuden-1x2/",
        "poster": "https://img.animesalt.com/images/12032/002.webp",
        "japanese_title": ""
      },
      {
        "episode_no": 3,
        "id": "1x3",
        "data_id": 537000528,
        "title": "The Results of Training",
        "link": "https://animesalt.cc/episode/naruto-shippuden-1x3/",
        "poster": "https://img.animesalt.com/images/12032/003.webp",
        "japanese_title": ""
      }
    ]
  }
}
```

**Episode ID Format**: Episodes are identified using the format `{season}x{episode}` (e.g., `1x1`, `1x2`, `2x1`). This format clearly indicates the season and episode number.

---

## Stream Endpoints

### GET /api/stream

Retrieves streaming links and video sources for a specific episode.

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | The anime ID (slug format) |
| episode | string | Yes | Episode identifier in format `1x1` |
| server | string | No | Specific server name (optional) |

**Example Request**:
```bash
curl "https://localhost:4000/api/stream?id=naruto-shippuden&episode=1x1"
```

**Example Response**:
```json
{
  "success": true,
  "results": {
    "streamingLink": [
      {
        "id": "abc12345",
        "server": "Server 1",
        "type": "iframe",
        "link": {
          "file": "https://play.zephyrflick.top/video/49182f81e6a13cf5eaa496d51fea6406",
          "type": "iframe"
        },
        "tracks": [
          {
            "file": "https://animesalt.cc/subtitles/en.vtt",
            "label": "English",
            "kind": "subtitles",
            "default": true
          }
        ],
        "intro": null,
        "outro": null
      },
      {
        "id": "def67890",
        "server": "Language Server 1",
        "type": "multi-lang",
        "link": {
          "file": "https://short.icu/JPRG69Z",
          "type": "iframe"
        },
        "tracks": [],
        "intro": null,
        "outro": null
      }
    ],
    "servers": [
      {
        "id": "1",
        "name": "ZephyrFlick",
        "type": "sub"
      },
      {
        "id": "2",
        "name": "Multi-Language",
        "type": "multi"
      }
    ],
    "availableServers": [
      {
        "server_id": 1,
        "server_name": "ZephyrFlick",
        "type": "sub"
      },
      {
        "server_id": 2,
        "server_name": "Multi-Language",
        "type": "multi"
      }
    ]
  }
}
```

**Field Descriptions**:

| Field | Type | Description |
|-------|------|-------------|
| streamingLink | array | List of available streaming sources |
| streamingLink.id | string | Unique identifier for the stream |
| streamingLink.server | string | Server name |
| streamingLink.link.file | string | URL to the video player/embed |
| streamingLink.link.type | string | Type of link (iframe, hls, video/mp4) |
| streamingLink.tracks | array | Subtitle and caption tracks |
| servers | array | Available server options |
| availableServers | array | Detailed server information |

---

### GET /api/stream/fallback

Retrieves fallback streaming links when primary servers are unavailable.

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | The anime ID (slug format) |
| episode | string | Yes | Episode identifier in format `1x1` |
| server | string | No | Preferred fallback server |

**Example Request**:
```bash
curl "https://localhost:4000/api/stream/fallback?id=naruto-shippuden&episode=1x1"
```

**Example Response**:
```json
{
  "success": true,
  "results": {
    "streamingLink": [
      {
        "id": "xyz99999",
        "server": "Fallback Server 1",
        "type": "iframe",
        "link": {
          "file": "https://backup-stream.example.com/embed/abc123",
          "type": "iframe"
        },
        "tracks": []
      }
    ],
    "servers": [
      {
        "id": "1",
        "name": "Backup Server",
        "type": "sub"
      }
    ]
  }
}
```

---

### GET /api/servers

Retrieves available streaming servers for a specific anime episode.

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | The anime ID (slug format) |
| episode | string | No | Episode identifier (optional) |

**Example Request**:
```bash
curl "https://localhost:4000/api/servers?id=naruto-shippuden&episode=1x1"
```

**Example Response**:
```json
{
  "success": true,
  "results": [
    {
      "id": "1",
      "name": "ZephyrFlick",
      "type": "sub"
    },
    {
      "id": "2",
      "name": "Multi-Language",
      "type": "multi"
    }
  ]
}
```

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
curl "https://localhost:4000/api/search?q=naruto&page=1&pageSize=10"
```

**Example Response**:
```json
{
  "success": true,
  "results": {
    "keyword": "naruto",
    "totalResults": 5,
    "data": [
      {
        "id": "naruto-shippuden",
        "data_id": 768748400,
        "title": "Naruto Shippuden",
        "japanese_title": "ナルト -疾風伝-",
        "poster": "https://image.tmdb.org/t/p/w500/kV27j3Nz4d5z8u6mN3EJw9RiLg2.jpg",
        "link": "https://animesalt.cc/series/naruto-shippuden/",
        "tvInfo": {
          "showType": "TV",
          "duration": "24 min"
        }
      },
      {
        "id": "naruto",
        "data_id": 123456789,
        "title": "Naruto",
        "japanese_title": "ナルト",
        "poster": "https://image.tmdb.org/t/p/w500/xppeysfvDKVx775MFuH8Z9BlpMk.jpg",
        "link": "https://animesalt.cc/series/naruto/",
        "tvInfo": {
          "showType": "TV",
          "duration": "24 min"
        }
      },
      {
        "id": "boruto-naruto-next-generations",
        "data_id": 987654321,
        "title": "Boruto: Naruto Next Generations",
        "japanese_title": "BORUTO- NARUTO NEXT GENERATIONS",
        "poster": "https://image.tmdb.org/t/p/w500/zL8fHe5XlbOgSC7OR9wSaJdHWCC.jpg",
        "link": "https://animesalt.cc/series/boruto-naruto-next-generations/",
        "tvInfo": {
          "showType": "TV",
          "duration": "24 min"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 5,
      "itemsPerPage": 10,
      "hasNext": false,
      "hasPrev": false
    }
  }
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

**Example Request**:
```bash
curl "https://localhost:4000/api/search/suggest?q=demon"
```

**Example Response**:
```json
{
  "success": true,
  "results": [
    {
      "id": "demon-slayer",
      "title": "Demon Slayer: Kimetsu no Yaiba",
      "poster": "https://image.tmdb.org/t/p/w500/mnpgxMLvUJYSXwydB5E1dqLukwy.jpg",
      "link": "https://animesalt.cc/series/demon-slayer/",
      "releaseDate": "2019",
      "showType": "TV",
      "duration": "24 min"
    },
    {
      "id": "demon-slayer-kimetsu-no-yaiba-movie-mugen-train",
      "title": "Demon Slayer: Kimetsu no Yaiba - The Movie: Mugen Train",
      "poster": "https://image.tmdb.org/t/p/w500/h8RbNnNPj4yOgsq9EUWkH6H3qZw.jpg",
      "link": "https://animesalt.cc/movies/demon-slayer-kimetsu-no-yaiba-movie-mugen-train/",
      "releaseDate": "2020",
      "showType": "Movie",
      "duration": "117 min"
    }
  ]
}
```

---

### GET /api/top-search

Retrieves popular search terms.

**Parameters**: None required

**Example Request**:
```bash
curl "https://localhost:4000/api/top-search"
```

**Example Response**:
```json
{
  "success": true,
  "results": [
    {
      "title": "Naruto Shippuden",
      "link": "https://animesalt.cc/series/naruto-shippuden/"
    },
    {
      "title": "One Piece",
      "link": "https://animesalt.cc/series/one-piece/"
    },
    {
      "title": "Dragon Ball Super",
      "link": "https://animesalt.cc/series/dragon-ball-super/"
    }
  ]
}
```

---

## Category Endpoints

### GET /api/series

Retrieves a paginated list of TV series anime.

**Parameters**:

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| page | number | No | Page number | 1 |

**Example Request**:
```bash
curl "https://localhost:4000/api/series?page=1"
```

**Example Response**:
```json
{
  "success": true,
  "results": {
    "type": "series",
    "page": 1,
    "data": [
      {
        "id": "naruto-shippuden",
        "title": "Naruto Shippuden",
        "japanese_title": "ナルト -疾風伝-",
        "poster": "https://image.tmdb.org/t/p/w500/kV27j3Nz4d5z8u6mN3EJw9RiLg2.jpg",
        "link": "https://animesalt.cc/series/naruto-shippuden/",
        "quality": "HD",
        "year": "2007",
        "type": "anime",
        "data_id": 768748400,
        "tvInfo": {
          "showType": "TV",
          "duration": "24 min"
        }
      },
      {
        "id": "one-piece",
        "title": "One Piece",
        "japanese_title": "ONE PIECE",
        "poster": "https://image.tmdb.org/t/p/w500/uiIB9ctqZFbfRXXimtpmZb5dusi.jpg",
        "link": "https://animesalt.cc/series/one-piece/",
        "quality": "HD",
        "year": "1999",
        "type": "anime",
        "data_id": 234567890,
        "tvInfo": {
          "showType": "TV",
          "duration": "24 min"
        }
      }
    ]
  }
}
```

---

### GET /api/movies

Retrieves a paginated list of anime movies.

**Parameters**:

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| page | number | No | Page number | 1 |

**Example Request**:
```bash
curl "https://localhost:4000/api/movies?page=1"
```

**Example Response**:
```json
{
  "success": true,
  "results": {
    "type": "movies",
    "page": 1,
    "data": [
      {
        "id": "your-name",
        "title": "Your Name",
        "japanese_title": "君の名は。",
        "poster": "https://image.tmdb.org/t/p/w500/q719jXXEzOoYaps6babgKnONONX.jpg",
        "link": "https://animesalt.cc/movies/your-name/",
        "quality": "HD",
        "year": "2016",
        "type": "anime",
        "data_id": 345678901,
        "tvInfo": {
          "showType": "Movie",
          "duration": "106 min"
        }
      },
      {
        "id": "weathering-with-you",
        "title": "Weathering With You",
        "japanese_title": "天気の子",
        "poster": "https://image.tmdb.org/t/p/w500/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg",
        "link": "https://animesalt.cc/movies/weathering-with-you/",
        "quality": "HD",
        "year": "2019",
        "type": "anime",
        "data_id": 456789012,
        "tvInfo": {
          "showType": "Movie",
          "duration": "112 min"
        }
      }
    ]
  }
}
```

---

## Movie Endpoints

### GET /api/movie

Retrieves detailed information about a specific movie using the dedicated movie extractor. This endpoint is optimized for movie content and returns movie-specific data including servers and download links.

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | The movie ID (slug format) |

**Example Request**:
```bash
curl "https://localhost:4000/api/movie?id=the-loud-house-movie"
```

**Example Response**:
```json
{
  "success": true,
  "cached": false,
  "results": {
    "data": {
      "id": "the-loud-house-movie",
      "data_id": 627820068,
      "type": "movie",
      "title": "The Loud House Movie",
      "japanese_title": "",
      "poster": "https://image.tmdb.org/t/p/w500/m8qr20ROuawaRWNGPA4lZinT3Xz.jpg",
      "synopsis": "",
      "releaseDate": "2024-10-27",
      "duration": "90 min",
      "animeInfo": {},
      "genres": [
        {
          "name": "Adventure",
          "link": "https://animesalt.cc/category/genre/adventure/"
        },
        {
          "name": "Comedy",
          "link": "https://animesalt.cc/category/genre/comedy/"
        },
        {
          "name": "Family",
          "link": "https://animesalt.cc/category/genre/family/"
        },
        {
          "name": "Fantasy",
          "link": "https://animesalt.cc/category/genre/fantasy/"
        }
      ],
      "languages": [
        {
          "code": "english",
          "name": "English",
          "link": "https://animesalt.cc/category/language/english/"
        },
        {
          "code": "hindi",
          "name": "Hindi",
          "link": "https://animesalt.cc/category/language/hindi/"
        }
      ],
      "networks": [],
      "quality": "HD",
      "servers": [
        {
          "id": "1",
          "name": "SERVER 1 MyStream",
          "type": "sub",
          "quality": "auto"
        },
        {
          "id": "2",
          "name": "SERVER 2 Abyss",
          "type": "sub",
          "quality": "auto"
        }
      ],
      "downloadLinks": [],
      "relatedMovies": []
    }
  }
}
```

**Field Descriptions**:

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique movie identifier (slug format) |
| data_id | number | Numeric identifier derived from movie ID |
| title | string | English title of the movie |
| type | string | Always "movie" for movie endpoints |
| duration | string | Total movie runtime (e.g., "90 min") |
| servers | array | Available streaming servers for this movie |
| relatedMovies | array | Related movie recommendations |

---

### GET /api/movie/stream

Retrieves the streaming URL for a specific movie. Unlike series content, movies don't have episode numbers, so only the movie ID is required.

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | The movie ID (slug format) |
| server | string | No | Specific server name to filter results |

**Example Request**:
```bash
curl "https://localhost:4000/api/movie/stream?id=the-loud-house-movie&server=MyStream"
```

**Example Response**:
```json
{
  "success": true,
  "results": {
    "server": "SERVER 1 MyStream",
    "url": "https://player.example.com/embed/movie-id",
    "type": "iframe"
  }
}
```

---

## Category Endpoints

### GET /api/category

A flexible category query endpoint that supports various category types. This endpoint provides a unified interface for accessing different types of category pages on the website.

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| type | string | Yes | Category type (category, letter, post-type, genre, language, network, studio) |
| value | string | Yes | Category value (e.g., cartoon, A, series, action, english) |
| page | number | No | Page number for pagination |
| pageSize | number | No | Number of items per page (default: 20) |

**Example Requests**:
```bash
# Get cartoon category
curl "https://localhost:4000/api/category?type=category&value=cartoon&page=1"

# Get action genre
curl "https://localhost:4000/api/category?type=genre&value=action&page=1"

# Get English language content
curl "https://localhost:4000/api/category?type=language&value=english&page=1"
```

**Example Response**:
```json
{
  "success": true,
  "results": {
    "type": "category",
    "value": "cartoon",
    "page": 1,
    "pageSize": 20,
    "items": [
      {
        "id": "the-bad-guys-breaking-in",
        "title": "The Bad Guys: Breaking In",
        "poster": "https://image.tmdb.org/t/p/w500/12ybD4BvgSpmhSjknFPvf1Nu7CC.jpg",
        "type": "series",
        "link": "https://animesalt.cc/series/the-bad-guys-breaking-in/",
        "year": "",
        "quality": "HD",
        "dubStatus": "",
        "data_id": 1141492850
      }
    ],
    "pagination": {
      "hasNext": false,
      "hasPrev": false,
      "currentPage": 1,
      "totalPages": 6
    }
  }
}
```

---

### GET /api/category/cartoon

Retrieves anime content from the cartoon category. This is a convenience endpoint specifically for cartoon content which is a popular category on animesalt.cc.

**Parameters**:

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| page | number | No | Page number for pagination | 1 |
| pageSize | number | No | Number of items per page | 20 |

**Example Request**:
```bash
curl "https://localhost:4000/api/category/cartoon?page=1"
```

---

### GET /api/category/letter/:letter

Retrieves anime content based on the first letter of the title. This endpoint is useful for alphabetizing content and allows users to browse anime by letter.

**Parameters**:

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| letter | string | Yes | Single letter A-Z | - |
| page | number | No | Page number for pagination | 1 |
| pageSize | number | No | Number of items per page | 20 |

**Example Request**:
```bash
curl "https://localhost:4000/api/category/letter/A?page=1"
```

**Example Response**:
```json
{
  "success": true,
  "results": {
    "type": "letter",
    "value": "A",
    "page": 1,
    "pageSize": 20,
    "items": [
      {
        "id": "a-condition-called-love",
        "title": "A Condition Called Love",
        "poster": "https://image.tmdb.org/t/p/w500/e1ao8YAdgbN0wCUSatCESTPwaAh.jpg",
        "type": "series",
        "link": "https://animesalt.cc/series/a-condition-called-love/",
        "year": "",
        "quality": "HD",
        "dubStatus": "",
        "data_id": 898643364
      },
      {
        "id": "altered-carbon-resleeved",
        "title": "Altered Carbon: Resleeved",
        "poster": "https://image.tmdb.org/t/p/w500/vlIYzx7cc4Wvaoh7ShjF2HZG45.jpg",
        "type": "movie",
        "link": "https://animesalt.cc/movies/altered-carbon-resleeved/",
        "year": "",
        "quality": "HD",
        "dubStatus": "",
        "data_id": 418681375
      }
    ],
    "pagination": {
      "hasNext": true,
      "hasPrev": false,
      "currentPage": 1,
      "totalPages": 3
    }
  }
}
```

---

### GET /api/categories

Retrieves a list of all available categories on the website. This endpoint is useful for building navigation menus or category selection interfaces.

**Parameters**: None required

**Example Request**:
```bash
curl "https://localhost:4000/api/categories"
```

**Example Response**:
```json
{
  "success": true,
  "results": [
    {
      "name": "Cartoon",
      "slug": "cartoon",
      "link": "https://animesalt.cc/category/cartoon/"
    },
    {
      "name": "Anime",
      "slug": "anime",
      "link": "https://animesalt.cc/category/anime/"
    },
    {
      "name": "Dubbed Anime",
      "slug": "dubbed-anime",
      "link": "https://animesalt.cc/category/dubbed-anime/"
    }
  ]
}
```

---

### GET /api/letters

Retrieves a list of all letters that have available content. This endpoint checks which letters (A-Z) have anime starting with that letter and returns only the available ones.

**Parameters**: None required

**Example Request**:
```bash
curl "https://localhost:4000/api/letters"
```

**Example Response**:
```json
{
  "success": true,
  "results": ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"]
}
```

**Note**: Not all letters may be returned if there is no content starting with that letter in the database.

---

### GET /api/genres

Retrieves a list of all available genres.

**Parameters**: None required

**Example Request**:
```bash
curl "https://localhost:4000/api/genres"
```

**Example Response**:
```json
{
  "success": true,
  "results": [
    {
      "name": "Action",
      "link": "https://animesalt.cc/category/genre/action/"
    },
    {
      "name": "Adventure",
      "link": "https://animesalt.cc/category/genre/adventure/"
    },
    {
      "name": "Cars",
      "link": "https://animesalt.cc/category/genre/cars/"
    },
    {
      "name": "Comedy",
      "link": "https://animesalt.cc/category/genre/comedy/"
    },
    {
      "name": "Dementia",
      "link": "https://animesalt.cc/category/genre/dementia/"
    },
    {
      "name": "Demons",
      "link": "https://animesalt.cc/category/genre/demons/"
    }
  ]
}
```

---

### GET /api/networks

Retrieves a list of all available networks/studios with their logos.

**Parameters**: None required

**Example Request**:
```bash
curl "https://localhost:4000/api/networks"
```

**Example Response**:
```json
{
  "success": true,
  "results": [
    {
      "id": "pierrot",
      "name": "Studio Pierrot",
      "logo": "https://animesalt.cc/wp-content/uploads/pierrot-logo.png",
      "link": "https://animesalt.cc/category/network/pierrot/"
    },
    {
      "id": "ufotable",
      "name": "Ufotable",
      "logo": "https://animesalt.cc/wp-content/uploads/ufotable-logo.png",
      "link": "https://animesalt.cc/category/network/ufotable/"
    },
    {
      "id": "madhouse",
      "name": "Madhouse",
      "logo": "https://animesalt.cc/wp-content/uploads/madhouse-logo.png",
      "link": "https://animesalt.cc/category/network/madhouse/"
    },
    {
      "id": "mappa",
      "name": "MAPPA",
      "logo": "https://animesalt.cc/wp-content/uploads/mappa-logo.png",
      "link": "https://animesalt.cc/category/network/mappa/"
    }
  ]
}
```

---

### GET /api/languages

Retrieves a list of all available audio languages.

**Parameters**: None required

**Example Request**:
```bash
curl "https://localhost:4000/api/languages"
```

**Example Response**:
```json
{
  "success": true,
  "results": [
    {
      "code": "hindi",
      "name": "Hindi",
      "native": "हिन्दी",
      "link": "https://animesalt.cc/category/language/hindi/"
    },
    {
      "code": "tamil",
      "name": "Tamil",
      "native": "தமிழ்",
      "link": "https://animesalt.cc/category/language/tamil/"
    },
    {
      "code": "telugu",
      "name": "Telugu",
      "native": "తెలుగు",
      "link": "https://animesalt.cc/category/language/telugu/"
    },
    {
      "code": "bengali",
      "name": "Bengali",
      "native": "বাংলা",
      "link": "https://animesalt.cc/category/language/bengali/"
    },
    {
      "code": "malayalam",
      "name": "Malayalam",
      "native": "മലയാളം",
      "link": "https://animesalt.cc/category/language/malayalam/"
    },
    {
      "code": "kannada",
      "name": "Kannada",
      "native": "ಕನ್ನಡ",
      "link": "https://animesalt.cc/category/language/kannada/"
    },
    {
      "code": "english",
      "name": "English",
      "native": "English",
      "link": "https://animesalt.cc/category/language/english/"
    },
    {
      "code": "japanese",
      "name": "Japanese",
      "native": "日本語",
      "link": "https://animesalt.cc/category/language/japanese/"
    },
    {
      "code": "korean",
      "name": "Korean",
      "native": "한국어",
      "link": "https://animesalt.cc/category/language/korean/"
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

**Example Request**:
```bash
curl "https://localhost:4000/api/language/hindi?page=1"
```

**Example Response**:
```json
{
  "success": true,
  "results": {
    "language": "hindi",
    "page": 1,
    "data": [
      {
        "id": "naruto-shippuden",
        "title": "Naruto Shippuden (Hindi Dubbed)",
        "japanese_title": "",
        "poster": "https://image.tmdb.org/t/p/w500/kV27j3Nz4d5z8u6mN3EJw9RiLg2.jpg",
        "link": "https://animesalt.cc/series/naruto-shippuden/",
        "quality": "HD",
        "year": "2007",
        "type": "anime",
        "data_id": 768748400,
        "tvInfo": {
          "showType": "TV",
          "duration": "24 min"
        }
      }
    ]
  }
}
```

---

### GET /api/genre/:genre

Retrieves anime filtered by specific genre.

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| genre | string | Yes | Genre slug (e.g., action, adventure, comedy) |
| page | query | No | Page number (default: 1) |

**Example Request**:
```bash
curl "https://localhost:4000/api/genre/action?page=1"
```

**Example Response**:
```json
{
  "success": true,
  "results": {
    "genre": "action",
    "page": 1,
    "data": [
      {
        "id": "naruto-shippuden",
        "title": "Naruto Shippuden",
        "japanese_title": "ナルト -疾風伝-",
        "poster": "https://image.tmdb.org/t/p/w500/kV27j3Nz4d5z8u6mN3EJw9RiLg2.jpg",
        "link": "https://animesalt.cc/series/naruto-shippuden/",
        "quality": "HD",
        "year": "2007",
        "type": "anime",
        "data_id": 768748400,
        "tvInfo": {
          "showType": "TV",
          "duration": "24 min"
        }
      },
      {
        "id": "attack-on-titan",
        "title": "Attack on Titan",
        "japanese_title": "進撃の巨人",
        "poster": "https://image.tmdb.org/t/p/w500/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg",
        "link": "https://animesalt.cc/series/attack-on-titan/",
        "quality": "HD",
        "year": "2013",
        "type": "anime",
        "data_id": 567890123,
        "tvInfo": {
          "showType": "TV",
          "duration": "24 min"
        }
      }
    ]
  }
}
```

---

## Schedule Endpoints

### GET /api/schedule

Retrieves the schedule of recently released and upcoming episodes.

**Parameters**: None required

**Example Request**:
```bash
curl "https://localhost:4000/api/schedule"
```

**Example Response**:
```json
{
  "success": true,
  "results": {
    "schedule": [
      {
        "id": "naruto-shippuden-1x500",
        "title": "The Final Episode",
        "episode_no": 500,
        "releaseDate": "2025-03-15",
        "time": "00:00:00"
      },
      {
        "id": "one-piece-1x1100",
        "title": "New World Adventure Continues",
        "episode_no": 1100,
        "releaseDate": "2025-03-15",
        "time": "00:00:00"
      }
    ]
  }
}
```

---

## Utility Endpoints

### GET /api/health

Retrieves server health status and statistics.

**Parameters**: None required

**Example Request**:
```bash
curl "https://localhost:4000/api/health"
```

**Example Response**:
```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2025-12-29T04:27:00.000Z",
  "uptime": 3600.5,
  "version": "2.0.0",
  "api": "anime-salt-api",
  "baseUrl": "https://animesalt.cc",
  "cache": {
    "size": 150,
    "maxSize": 1000,
    "hitRate": 0.35,
    "memoryUsage": 150000
  }
}
```

**Field Descriptions**:

| Field | Type | Description |
|-------|------|-------------|
| status | string | Server status (ok, degraded, error) |
| uptime | number | Server uptime in seconds |
| version | string | API version |
| cache.size | number | Current number of cached items |
| cache.maxSize | number | Maximum cache size |
| cache.hitRate | number | Cache hit rate (0-1) |
| cache.memoryUsage | number | Estimated memory usage in bytes |

---

### GET /

Retrieves API documentation and available endpoints.

**Parameters**: None required

**Example Request**:
```bash
curl "https://localhost:4000/"
```

**Example Response**:
```json
{
  "success": true,
  "message": "Anime Salt API v2.0.0",
  "description": "Professional Anime Scraping API for animesalt.cc",
  "version": "2.0.0",
  "author": "MiniMax Agent",
  "documentation": "/api",
  "endpoints": {
    "home": {
      "GET /api/home": "Get homepage data",
      "GET /api/top-ten": "Get top 10 anime"
    },
    "info": {
      "GET /api/info?id={anime-id}": "Get anime details",
      "GET /api/random": "Get random anime"
    },
    "episodes": {
      "GET /api/episodes?id={anime-id}": "Get episode list"
    },
    "stream": {
      "GET /api/stream": "Get streaming links",
      "GET /api/servers": "Get available servers"
    },
    "search": {
      "GET /api/search?q={keyword}": "Search anime",
      "GET /api/search/suggest?q={keyword}": "Get suggestions"
    },
    "categories": {
      "GET /api/series": "Get series",
      "GET /api/movies": "Get movies",
      "GET /api/genres": "Get genres",
      "GET /api/networks": "Get networks",
      "GET /api/languages": "Get languages"
    }
  }
}
```

---

## Response Format

All API responses follow a consistent JSON structure:

### Success Response

```json
{
  "success": true,
  "cached": false,
  "timestamp": "2025-12-29T04:27:00.000Z",
  "results": { ... }
}
```

| Field | Type | Description |
|-------|------|-------------|
| success | boolean | Always `true` for successful responses |
| cached | boolean | `true` if response served from cache |
| timestamp | string | ISO 8601 timestamp of response |
| results | object | Response data (structure varies by endpoint) |

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
| "Anime ID is required" | Missing `id` parameter | Provide the anime ID |
| "Invalid anime ID format" | Malformed ID | Use slug format (e.g., `naruto-shippuden`) |
| "Anime not found" | ID doesn't exist | Verify the anime ID |
| "Too many requests" | Rate limit exceeded | Wait and retry |
| "Search keyword is required" | Missing search query | Provide a search term |

---

## Code Examples

### JavaScript/Node.js Example

```javascript
const axios = require('axios');

async function getAnimeInfo(animeId) {
    try {
        const response = await axios.get(`https://localhost:4000/api/info`, {
            params: { id: animeId }
        });
        
        if (response.data.success) {
            const anime = response.data.results.data;
            console.log(`Title: ${anime.title}`);
            console.log(`Episodes: ${anime.episodes.length}`);
            console.log(`Genres: ${anime.genres.map(g => g.name).join(', ')}`);
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
            'https://localhost:4000/api/info',
            params={'id': anime_id}
        )
        data = response.json()
        
        if data['success']:
            anime = data['results']['data']
            print(f"Title: {anime['title']}")
            print(f"Episodes: {len(anime['episodes'])}")
            print(f"Genres: {[g['name'] for g in anime['genres']]}")
        else:
            print(f"Error: {data['error']}")
    except Exception as e:
        print(f"Error: {e}")

get_anime_info('naruto-shippuden')
```

### cURL Example

```bash
# Get anime details
curl "https://localhost:4000/api/info?id=naruto-shippuden"

# Search for anime
curl "https://localhost:4000/api/search?q=dragon"

# Get streaming links
curl "https://localhost:4000/api/stream?id=naruto-shippuden&episode=1x1"

# Get episode list
curl "https://localhost:4000/api/episodes?id=naruto-shippuden"
```

### React/Vue Example

```javascript
// Using fetch API
async function fetchAnimeEpisodes(animeId) {
    const response = await fetch(
        `https://localhost:4000/api/episodes?id=${animeId}`
    );
    const data = await response.json();
    
    if (data.success) {
        return data.results.episodes;
    }
    return [];
}

// Display episodes in your component
const episodes = await fetchAnimeEpisodes('naruto-shippuden');
episodes.forEach(ep => {
    console.log(`Episode ${ep.episode_no}: ${ep.title}`);
});
```

---

## Support

For issues, feature requests, or questions:

- Check the [GitHub Repository](#)
- Review error messages for debugging
- Ensure parameters are correctly formatted

---

## License

This API is provided for educational purposes. Data is sourced from animesalt.cc and belongs to their respective owners.

---

## Changelog

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
