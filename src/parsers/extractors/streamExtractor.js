/**
 * Stream Extractor - Extract streaming links and download links from episode pages
 */

const BaseExtractor = require('./base');
const { normalizeUrl, getPlayerName, getSmartPlayerName, isRegionalContent, detectLanguage, cleanText } = require('../../utils/helpers');
const config = require('../../config');

/**
 * Stream Extractor class for extracting stream URLs and download links
 */
class StreamExtractor extends BaseExtractor {
    /**
     * Extract stream data from episode ID
     * @param {string} episodeId - Episode ID (format: id-1x1)
     * @param {string} preferredLang - Preferred language (default: 'hindi')
     * @returns {object} - Extracted stream data
     */
    async extract(episodeId, preferredLang = 'hindi') {
        const cacheKey = `stream:${episodeId}:${preferredLang}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const url = `${this.baseUrl}/watch/${episodeId}`;
            const html = await this.fetchHTML(url);
            const $ = this.cheerio.load(html);

            const result = await this.extractStream($, episodeId, preferredLang);
            this.setCache(cacheKey, result, config.cache.stream);
            return result;
        } catch (error) {
            console.error(`[Stream Extractor] Error extracting stream for ${episodeId}:`, error.message);
            return { success: false, error: error.message, episodeId };
        }
    }

    /**
     * Extract stream from Cheerio instance
     * @param {object} $ - Cheerio instance
     * @param {string} episodeId - Episode ID
     * @param {string} preferredLang - Preferred language
     * @returns {object} - Extracted stream data
     */
    async extractStream($, episodeId, preferredLang = 'hindi') {
        try {
            const result = {
                success: true,
                episodeId: episodeId,
                animeId: episodeId.split('-')[0],
                episode: this.extractEpisodeNumber(episodeId),
                sources: [],
                downloadLinks: [],
                message: 'Stream data extracted successfully',
            };

            // Extract anime title
            result.title = $('h1.entry-title, h1.title, .anime-title h1, .TPost .Title, h1').first().text().trim() ||
                $('meta[property="og:title"]').attr('content') || '';

            // Get page text for language detection
            const pageText = $('body').text();
            const pageTextLower = pageText.toLowerCase();

            // Detect sub/dub availability from server grid HTML (most reliable method)
            const serverInfoTypes = [];
            $('.server-grid .server-btn .server-info').each((i, el) => {
                const infoText = $(el).text().trim().toLowerCase();
                serverInfoTypes.push(infoText);
            });

            // Determine if content has sub/dub based on server-info text
            // If server-info shows "sub" or "dub", it's dual audio content
            // If server-info shows server names like "MyStream", "Abyss", it's regional
            const hasSubServer = serverInfoTypes.includes('sub');
            const hasDubServer = serverInfoTypes.includes('dub');
            const isDualAudio = hasSubServer || hasDubServer;

            // Detect if content is regional (no sub/dub distinction)
            // Regional content has server-info showing server names instead of sub/dub
            const isRegional = !isDualAudio && serverInfoTypes.length > 0;

            // Detect language availability and resolve to preferred or fallback
            const langInfo = detectLanguage(pageTextLower, preferredLang);

            // Store availability info in result
            result.hasSub = hasSubServer;
            result.hasDub = hasDubServer;
            result.isDualAudio = isDualAudio;
            result.isRegional = isRegional;
            result.servers = serverInfoTypes;
            result.language = {
                preferred: langInfo.preferred,
                resolved: langInfo.resolved,
                resolvedLabel: langInfo.resolvedLabel,
                available: {
                    hindi: langInfo.hasHindi,
                    english: langInfo.hasEnglish,
                    japanese: langInfo.hasJapanese,
                    tamil: langInfo.hasTamil,
                    telugu: langInfo.hasTelugu,
                },
            };

            // Extract video sources with smart player naming
            const sources = await this.extractVideoSources($, serverInfoTypes, isDualAudio, isRegional);
            result.sources = sources;

            // Extract download links
            result.downloadLinks = this.extractDownloadLinks($);

            // Extract related/recommended anime from carousel
            result.relatedAnime = this.extractRelatedAnime($);

            // If no sources found, try alternative methods
            if (result.sources.length === 0) {
                result.sources = await this.extractAlternativeSources($, serverInfoTypes, isDualAudio, isRegional);
            }

            // Add message based on availability
            if (result.sources.length === 0) {
                result.message = 'No streaming sources found';
            } else if (isRegional) {
                result.message = `Found ${result.sources.length} streaming source(s) in ${langInfo.resolvedLabel}`;
            } else if (isDualAudio) {
                const audioType = hasSubServer && hasDubServer ? 'Sub and Dub' : (hasSubServer ? 'Sub' : 'Dub');
                result.message = `Found ${result.sources.length} streaming source(s) - ${audioType}`;
            } else {
                result.message = `Found ${result.sources.length} streaming source(s)`;
            }

            return result;
        } catch (error) {
            console.error('[Stream Extractor] Error in extractStream:', error.message);
            return { success: false, error: error.message, episodeId };
        }
    }

    /**
     * Extract episode number from episode ID
     * @param {string} episodeId - Episode ID
     * @returns {number} - Episode number
     */
    extractEpisodeNumber(episodeId) {
        const match = episodeId.match(/-(\d+)x(\d+)$/i);
        if (match) return parseInt(match[2]);
        return 1;
    }

    /**
     * Get player type from server-info text
     * @param {string} serverInfo - The server-info text
     * @returns {string} - 'sub', 'dub', or 'regional'
     */
    getPlayerTypeFromServerInfo(serverInfo) {
        const text = serverInfo.toLowerCase().trim();
        if (text === 'sub') return 'sub';
        if (text === 'dub') return 'dub';
        return 'regional';
    }

    /**
     * Extract video sources with smart player naming based on server grid
     * @param {object} $ - Cheerio instance
     * @param {array} serverInfoTypes - Array of server-info text values
     * @param {boolean} isDualAudio - Whether content has sub/dub
     * @param {boolean} isRegional - Whether content is regional
     * @returns {array} - Array of video sources
     */
    async extractVideoSources($, serverInfoTypes, isDualAudio, isRegional = false) {
        const sources = [];

        // Method 1: Extract from server grid structure (most reliable)
        const serverButtons = $('.server-grid .server-btn');
        serverButtons.each((index, el) => {
            if (index >= serverInfoTypes.length) return;

            const serverInfo = serverInfoTypes[index] || '';
            const playerType = this.getPlayerTypeFromServerInfo(serverInfo);
            
            // Find the video source for this server
            // Look for video element, iframe, or data attributes near this server button
            let videoUrl = null;
            
            // Check if this server is active
            const isActive = $(el).hasClass('active');
            
            // Try to find the actual video URL from various sources
            // Look for the video element or iframe that corresponds to this server
            const videoElement = $(el).find('video, iframe');
            if (videoElement.length > 0) {
                videoUrl = videoElement.attr('src') || videoElement.attr('data-src');
            }
            
            // Also check for data attributes on elements
            if (!videoUrl) {
                const parentVideo = $(el).closest('.video-container, .player-container').find('video, iframe, [data-src]');
                if (parentVideo.length > 0) {
                    videoUrl = parentVideo.attr('src') || parentVideo.attr('data-src') || parentVideo.find('source').attr('src');
                }
            }

            // Generate player name based on content type
            let playerName;
            if (isRegional) {
                playerName = `Player ${index + 1}`;
            } else if (playerType === 'dub') {
                playerName = `HD ${index + 1} (Dub)`;
            } else {
                playerName = `HD ${index + 1} (Sub)`;
            }

            if (videoUrl && videoUrl.includes('http')) {
                sources.push({
                    player: playerName,
                    url: normalizeUrl(videoUrl),
                    quality: 'HD',
                    isSub: playerType === 'sub',
                    isDub: playerType === 'dub',
                    isRegional: isRegional,
                    serverInfo: serverInfo,
                    isActive: isActive,
                    type: videoUrl.includes('.m3u8') ? 'hls' : (videoUrl.includes('.mp4') ? 'mp4' : 'iframe'),
                });
            }
        });

        // Method 2: Extract from video source elements
        const sourceElements = $('video source, .video-source, video source[src], iframe[src*="stream"], .player-source');

        // Method 3: Extract from data attributes
        const dataSources = [];
        $('[data-src], [data-url], [data-video], [data-stream]').each((i, el) => {
            const src = $(el).attr('data-src') || $(el).attr('data-url') || $(el).attr('data-video') || $(el).attr('data-stream');
            if (src && (src.includes('http') || src.startsWith('/'))) {
                dataSources.push({
                    url: normalizeUrl(src),
                    element: el,
                    index: i,
                });
            }
        });

        // Method 4: Extract from iframes
        const iframes = [];
        $('iframe[src*="stream"], iframe[src*="player"], iframe[src*="video"]').each((i, el) => {
            const src = $(el).attr('src');
            if (src) {
                iframes.push({
                    url: normalizeUrl(src),
                    index: i,
                });
            }
        });

        // Combine and deduplicate sources
        const allSources = [...dataSources, ...iframes];
        const seenUrls = new Set();

        // Add sources that aren't already captured
        allSources.forEach((source, index) => {
            if (!source.url || seenUrls.has(source.url)) return;
            
            // Check if we already have a similar source
            const existingSource = sources.find(s => s.url === source.url);
            if (existingSource) return;
            
            seenUrls.add(source.url);

            // Determine player type based on server info or index
            const serverIndex = index < serverInfoTypes.length ? index : 0;
            const serverInfo = serverInfoTypes[serverIndex] || '';
            const playerType = this.getPlayerTypeFromServerInfo(serverInfo);

            // Generate player name
            let playerName;
            if (isRegional) {
                playerName = `Player ${sources.length + 1}`;
            } else if (playerType === 'dub') {
                playerName = `HD ${sources.length + 1} (Dub)`;
            } else {
                playerName = `HD ${sources.length + 1} (Sub)`;
            }

            const isSub = playerType === 'sub';

            sources.push({
                player: playerName,
                url: source.url,
                quality: 'HD',
                isSub: isSub,
                isDub: !isSub && !isRegional,
                isRegional: isRegional,
                serverInfo: serverInfo,
                type: source.url.includes('.m3u8') ? 'hls' : (source.url.includes('.mp4') ? 'mp4' : 'iframe'),
            });
        });

        // Also check for known streaming domains
        const streamingDomains = ['streamlare', 'streamsb', 'streamtape', 'videovard', 'mp4upload', 'yourupload', 'upstream'];

        streamingDomains.forEach((domain, index) => {
            const existingIndex = sources.findIndex(s => s.url.includes(domain));
            if (existingIndex === -1) {
                // Look for links to this domain
                $(`a[href*="${domain}"], iframe[src*="${domain}"]`).each((i, el) => {
                    const href = $(el).attr('href') || $(el).attr('src');
                    if (href && !seenUrls.has(href)) {
                        seenUrls.add(href);
                        
                        let playerName;
                        if (isRegional) {
                            playerName = `Player ${sources.length + 1}`;
                        } else if (index === 1 && serverInfoTypes[1] === 'dub') {
                            playerName = `HD 2 (Dub)`;
                        } else {
                            playerName = `HD ${sources.length + 1} (Sub)`;
                        }

                        sources.push({
                            player: playerName,
                            url: normalizeUrl(href),
                            quality: 'HD',
                            isSub: true,
                            isDub: false,
                            isRegional: isRegional,
                            type: 'direct',
                        });
                    }
                });
            }
        });

        return sources;
    }

    /**
     * Extract alternative sources if main method fails
     * @param {object} $ - Cheerio instance
     * @param {array} serverInfoTypes - Array of server-info text values
     * @param {boolean} isDualAudio - Whether content has sub/dub
     * @param {boolean} isRegional - Whether content is regional
     * @returns {array} - Array of video sources
     */
    async extractAlternativeSources($, serverInfoTypes, isDualAudio, isRegional = false) {
        const sources = [];

        // Look for embed links
        $('a[href*="/embed/"], a[href*="/e/"], a[href*="?v="]').each((i, el) => {
            const href = $(el).attr('href');
            if (href && !sources.find(s => s.url === href)) {
                let playerName;
                if (isRegional) {
                    playerName = `Player ${sources.length + 1}`;
                } else {
                    playerName = `HD ${sources.length + 1} (Sub)`;
                }
                sources.push({
                    player: playerName,
                    url: normalizeUrl(href),
                    quality: 'HD',
                    isSub: true,
                    isDub: false,
                    isRegional: isRegional,
                    type: 'embed',
                });
            }
        });

        // Look for video JS player
        $('video[data-src], video[data-setup]').each((i, el) => {
            const src = $(el).attr('data-src') || $(el).find('source').attr('src');
            if (src && !sources.find(s => s.url === src)) {
                let playerName;
                if (isRegional) {
                    playerName = `Player ${sources.length + 1}`;
                } else {
                    playerName = `HD ${sources.length + 1} (Sub)`;
                }
                sources.push({
                    player: playerName,
                    url: normalizeUrl(src),
                    quality: 'HD',
                    isSub: true,
                    isDub: false,
                    isRegional: isRegional,
                    type: 'videojs',
                });
            }
        });

        return sources;
    }

    /**
     * Extract download links
     * @param {object} $ - Cheerio instance
     * @returns {array} - Array of download links
     */
    extractDownloadLinks($) {
        const downloads = [];

        // Check for download buttons/links
        $('a[href*="download"], a[href*="dl="], a[href*="drive.google"], a[href*="mega"], a[href*="1fichier"], a[href*="zippy"]').each((i, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim();

            if (href) {
                const { extractQuality, extractHost } = require('../utils/helpers');
                const quality = extractQuality(text);
                const host = extractHost(href);

                downloads.push({
                    quality: quality,
                    host: host,
                    url: normalizeUrl(href),
                    text: text || `Download ${quality}`,
                });
            }
        });

        // Check for specific download button classes
        $('.download-btn, .download-button, .dl-btn, a.btn-download, .TDDownloads a').each((i, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim();

            if (href) {
                const existing = downloads.find(d => d.url === href);
                if (!existing) {
                    downloads.push({
                        quality: 'Auto',
                        host: 'Direct',
                        url: normalizeUrl(href),
                        text: text || 'Download',
                    });
                }
            }
        });

        return downloads;
    }

    /**
     * Extract related/recommended anime from carousel sections on watch page
     * @param {object} $ - Cheerio instance
     * @returns {array} - Array of related anime objects
     */
    extractRelatedAnime($) {
        const relatedAnime = [];
        const seenIds = new Set();

        // Extract from Owl Carousel sections (Recommended, Related, You May Also Like)
        const carouselSections = $(
            '.owl-carousel:has(.post), ' +
            '.section-body:has(.post), ' +
            '.related-posts:has(.post), ' +
            '.recommended:has(.post), ' +
            '.wp-block-columns:has(.post), ' +
            'article.post:has(.post-thumbnail)'
        );

        // Method 1: Extract from Owl Carousel items
        $('.owl-carousel .owl-item .post, .carousel-item .post, .related-anime .post').each((i, el) => {
            const anime = this.parseRelatedAnimeItem($, $(el));
            if (anime && anime.id && !seenIds.has(anime.id)) {
                seenIds.add(anime.id);
                relatedAnime.push(anime);
            }
        });

        // Method 2: Extract from generic post grids
        $('article.post:has(.post-thumbnail), .post.dfxc:has(.post-thumbnail)').each((i, el) => {
            const anime = this.parseRelatedAnimeItem($, $(el));
            if (anime && anime.id && !seenIds.has(anime.id)) {
                seenIds.add(anime.id);
                relatedAnime.push(anime);
            }
        });

        // Method 3: Extract from section lists
        $('.section-body .post, .related-posts .post, .recommended .post').each((i, el) => {
            const anime = this.parseRelatedAnimeItem($, $(el));
            if (anime && anime.id && !seenIds.has(anime.id)) {
                seenIds.add(anime.id);
                relatedAnime.push(anime);
            }
        });

        // Method 4: Extract from grid layouts
        $('.dfx.fcl.posts .post, .posts-list .post, .anime-grid .post').each((i, el) => {
            const anime = this.parseRelatedAnimeItem($, $(el));
            if (anime && anime.id && !seenIds.has(anime.id)) {
                seenIds.add(anime.id);
                relatedAnime.push(anime);
            }
        });

        return relatedAnime.slice(0, 12); // Limit to 12 items
    }

    /**
     * Parse a single related anime item from HTML
     * @param {object} $ - Cheerio instance
     * @param {object} $el - Element to parse
     * @returns {object|null} - Parsed anime object or null
     */
    parseRelatedAnimeItem($, $el) {
        // Get link
        const link = $el.find('a.lnk-blk').attr('href') ||
            $el.find('a[href*="/series/"]').attr('href') ||
            $el.find('a[href*="/movies/"]').attr('href') ||
            $el.find('a').attr('href');

        if (!link || !link.includes('/series/') && !link.includes('/movies/') && !link.includes('/cartoon/')) {
            return null;
        }

        // Get poster image
        const poster = $el.find('img').attr('data-src') ||
            $el.find('img').attr('src') ||
            $el.find('img').attr('data-lazy-src') ||
            $el.find('.post-thumbnail img').attr('src');

        // Get title from image alt attribute
        let title = $el.find('img').attr('alt');
        if (title) {
            title = title.replace(/^Image /, '').trim();
        }

        // Fallback to other title elements
        if (!title) {
            title = $el.find('.Title, .entry-title, .title, h3, h4').text().trim();
        }

        if (!title) {
            title = $el.text().substring(0, 80).trim();
        }

        // Get episode info if available
        const epMatch = $el.text().match(/EP[:\s]*(\d+)/i);
        const epInfo = this.parseEpisodeFormat($el.text());

        // Extract ID from URL
        const { extractIdFromUrl } = require('../utils/helpers');
        const id = extractIdFromUrl(link);

        if (!id) return null;

        return {
            id: id,
            title: title || 'Unknown',
            poster: poster ? this.normalizeImageUrl(poster) : null,
            url: this.normalizeUrl(link),
            latestEpisode: epMatch ? epMatch[1] : null,
            season: epInfo.season,
            episode: epInfo.episode,
            type: link.includes('/movies/') ? 'MOVIE' : (link.includes('/cartoon/') ? 'CARTOON' : 'SERIES'),
        };
    }

    /**
     * Normalize image URL
     * @param {string} url - Image URL
     * @returns {string|null} - Normalized URL
     */
    normalizeImageUrl(url) {
        if (!url) return null;
        if (typeof url !== 'string') return null;

        url = url.trim();

        // Add protocol if missing
        if (url.startsWith('//')) {
            return 'https:' + url;
        }

        // Handle relative URLs
        if (url.startsWith('/')) {
            return config.baseUrl + url;
        }

        return url;
    }

    /**
     * Parse episode format from text
     * @param {string} text - Text to parse
     * @returns {object} - Season and episode numbers
     */
    parseEpisodeFormat(text) {
        if (!text) return { season: 1, episode: null };

        const patterns = [
            /Season\s*(\d+)[\s\-]*EP[:\s]*(\d+)/i,
            /EP[:\s]*(\d+)/,
            /(\d+)x(\d+)/i,
            /Season\s*(\d+)[\s\-]*Episode[\s\-]*(\d+)/i,
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                if (match.length === 3) {
                    return { season: parseInt(match[1]), episode: parseInt(match[2]) };
                } else if (match.length === 2) {
                    return { season: 1, episode: parseInt(match[1]) };
                }
            }
        }

        return { season: 1, episode: null };
    }

    /**
     * Fetch HTML (override to add caching)
     */
    async fetchHTML(url) {
        const { fetchHTML: fetchHTMLUtil } = require('../utils/request');
        return fetchHTMLUtil(url);
    }

    /**
     * Get from cache
     */
    getFromCache(key) {
        return null;
    }

    /**
     * Set cache
     */
    setCache(key, data, ttl) {
    }

    /**
     * Get Cheerio (override)
     */
    cheerio = {
        load: require('cheerio')
    };
}

module.exports = StreamExtractor;
