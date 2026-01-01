/**
 * Stream Extractor for Anime Salt API
 * Extracts streaming links, servers, and video sources with comprehensive coverage
 * Aligned with animesalt.cc structure and itzzzzme/anime-api reference format
 */

const { fetchHTML, normalizeUrl, sanitizeText, delay, getBaseDomain } = require('../utils/helpers');

class StreamExtractor {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.maxRetries = 3;
        this.requestDelay = 1000;
    }

    /**
     * Extract streaming data for an episode
     * @param {string} id - Anime ID/slug
     * @param {string|number} episode - Episode number or identifier
     * @param {object} options - Additional options
     */
    async extract(id, episode, options = {}) {
        const server = options.server || null;
        const language = options.language || 'all';

        try {
            if (!id) {
                throw new Error('Anime ID is required');
            }

            const url = this.buildUrl(id, episode);
            const html = await this.fetchWithRetry(url);
            const $ = require('cheerio').load(html);

            const data = {
                id: id,
                episode: episode,
                url: normalizeUrl(url),
                streamingLinks: await this.extractStreamingLinks($),
                servers: await this.extractServers($),
                availableServers: await this.extractAvailableServers($),
                tracks: this.extractTracks($),
                intro: this.extractIntro($),
                outro: this.extractOutro($),
                downloadLinks: await this.extractDownloadLinks($),
            };

            // Filter by server if specified
            if (server) {
                data.streamingLinks = data.streamingLinks.filter(
                    link => link.server.toLowerCase().includes(server.toLowerCase())
                );
                data.servers = data.servers.filter(
                    s => s.name.toLowerCase().includes(server.toLowerCase())
                );
            }

            // Filter by language if specified
            if (language !== 'all') {
                data.streamingLinks = data.streamingLinks.filter(
                    link => link.language === language || link.type === language
                );
            }

            return {
                success: true,
                data: data,
            };
        } catch (error) {
            console.error('[StreamExtractor] Error:', error.message);
            return {
                success: false,
                error: error.message,
                id: id,
                episode: episode,
            };
        }
    }

    /**
     * Build episode URL
     */
    buildUrl(id, episode) {
        if (!id) {
            throw new Error('Anime ID is required');
        }

        // Clean the ID
        id = id.toString().replace(/\/$/, '');

        if (episode) {
            // Handle various episode formats
            let epNum = episode.toString();
            let season = '1';

            // Handle "1x1" format
            if (epNum.includes('x')) {
                const parts = epNum.split('x');
                season = parts[0];
                epNum = parts[1] || parts[0];
            }

            // Build URL based on animesalt.cc pattern
            return `${this.baseUrl}/episode/${id}-${season}x${epNum}/`;
        }

        return `${this.baseUrl}/series/${id}/`;
    }

    /**
     * Fetch HTML with retry logic
     */
    async fetchWithRetry(url, retries = this.maxRetries) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const html = await fetchHTML(url);
                if (html && html.length > 100) {
                    return html;
                }
                throw new Error('Empty or invalid response');
            } catch (error) {
                if (attempt === retries) {
                    throw error;
                }
                await delay(attempt * this.requestDelay);
            }
        }
    }

    /**
     * Extract streaming links and tracks
     */
    async extractStreamingLinks($) {
        const streamingLinks = [];
        const seenUrls = new Set();

        // Method 1: Extract direct iframes
        const iframes = this.extractIframes($);
        for (const iframe of iframes) {
            if (iframe.src && !seenUrls.has(iframe.src)) {
                seenUrls.add(iframe.src);
                streamingLinks.push(this.createStreamLink($, iframe, 'iframe'));
            }
        }

        // Method 2: Extract multi-language player data
        const multiLangStreams = this.extractMultiLangStreams($);
        for (const stream of multiLangStreams) {
            if (stream.link && !seenUrls.has(stream.link)) {
                seenUrls.add(stream.link);
                streamingLinks.push(stream);
            }
        }

        // Method 3: Extract direct video sources from scripts
        const videoSources = this.extractVideoSources($);
        for (const source of videoSources) {
            if (source.link && !seenUrls.has(source.link.file)) {
                seenUrls.add(source.link.file);
                streamingLinks.push(source);
            }
        }

        // Method 4: Extract from data attributes
        const dataStreams = this.extractDataAttributeStreams($);
        for (const stream of dataStreams) {
            if (stream.link && !seenUrls.has(stream.link)) {
                seenUrls.add(stream.link);
                streamingLinks.push(stream);
            }
        }

        return streamingLinks;
    }

    /**
     * Extract iframes from page
     */
    extractIframes($) {
        const iframes = [];

        $('iframe[src], iframe[data-src], iframe[data-url]').each((i, el) => {
            const $el = $(el);
            let src = $el.attr('src') || $el.attr('data-src') || $el.attr('data-url');

            if (src) {
                // Handle relative URLs
                if (src.startsWith('//')) {
                    src = 'https:' + src;
                } else if (!src.startsWith('http')) {
                    src = this.baseUrl + (src.startsWith('/') ? '' : '/') + src;
                }

                // Determine server name from URL
                const serverName = this.detectServerName(src);

                iframes.push({
                    src: src,
                    server: serverName,
                    id: $el.attr('id') || `server-${i + 1}`,
                    type: $el.attr('data-type') || this.detectLanguageFromUrl(src),
                    class: $el.attr('class') || '',
                    dataId: $el.attr('data-id') || '',
                    dataServer: $el.attr('data-server') || '',
                });
            }
        });

        return iframes;
    }

    /**
     * Detect server name from URL
     */
    detectServerName(url) {
        if (!url) return 'Unknown';

        const urlLower = url.toLowerCase();

        // Common streaming servers
        const serverPatterns = [
            { pattern: /streamtape\.com/i, name: 'StreamTape' },
            { pattern: /mp4upload\.com/i, name: 'Mp4Upload' },
            { pattern: /gogostream/i, name: 'GogoStream' },
            { pattern: /gogoanime/i, name: 'GogoAnime' },
            { pattern: /hydrax\.net/i, name: 'Hydrax' },
            { pattern: /vizcloud/i, name: 'VizCloud' },
            { pattern: /mp4shark/i, name: 'Mp4Shark' },
            { pattern: /streamhub/i, name: 'StreamHub' },
            { pattern: /upstream/i, name: 'Upstream' },
            { pattern: /streamlare/i, name: 'Streamlare' },
            { pattern: /videovard/i, name: 'VideoVard' },
            { pattern: /zplayer/i, name: 'ZPlayer' },
            { pattern: /doodstream/i, name: 'DoodStream' },
            { pattern: /wishembed/i, name: 'WishEmbed' },
            { pattern: /filemoon/i, name: 'FileMoon' },
            { pattern: /uqload/i, name: 'Uqload' },
            { pattern: /voe\.sx/i, name: 'Voe' },
            { pattern: /streamwish/i, name: 'StreamWish' },
            { pattern: /zephyrflick/i, name: 'ZephyrFlick' },
            { pattern: /vidsrc\.pro/i, name: 'VidSrc' },
            { pattern: /player\.vime| vimeo\.com/i, name: 'Vimeo' },
            { pattern: /youtube\.com|youtu\.be/i, name: 'YouTube' },
            { pattern: /dailymotion/i, name: 'DailyMotion' },
            { pattern: /ok\.ru/i, name: 'OkRu' },
            { pattern: /vk\.com/i, name: 'VK' },
        ];

        for (const { pattern, name } of serverPatterns) {
            if (pattern.test(urlLower)) {
                return name;
            }
        }

        // Try to extract domain
        try {
            const domain = getBaseDomain(url);
            if (domain) {
                return domain.charAt(0).toUpperCase() + domain.slice(1);
            }
        } catch (e) {
            // Ignore domain parsing errors
        }

        return 'Unknown';
    }

    /**
     * Detect language from URL
     */
    detectLanguageFromUrl(url) {
        if (!url) return 'sub';

        const urlLower = url.toLowerCase();
        if (urlLower.includes('dub') || urlLower.includes('english')) {
            return 'dub';
        } else if (urlLower.includes('sub')) {
            return 'sub';
        }
        return 'sub';
    }

    /**
     * Create stream link object
     */
    createStreamLink($, iframe, type = 'iframe') {
        return {
            id: this.generateId(),
            server: iframe.server || 'Unknown',
            name: iframe.server || 'Unknown',
            link: {
                url: normalizeUrl(iframe.src),
                file: normalizeUrl(iframe.src),
                type: type,
            },
            type: iframe.type || 'sub',
            language: iframe.type || 'sub',
            referer: this.baseUrl,
            tracks: this.extractTracks($),
            intro: this.extractIntro($),
            outro: this.extractOutro($),
        };
    }

    /**
     * Extract multi-language stream data
     */
    extractMultiLangStreams($) {
        const streams = [];

        // Look for data-src attributes with multi-language data
        $('iframe[data-src*="multi-lang"], iframe[data-src*="multilang"], iframe[data-src*="multi_"]').each((i, el) => {
            const dataSrc = $(el).attr('data-src');
            if (dataSrc) {
                const parsed = this.parseMultiLangData(dataSrc);
                streams.push(...parsed);
            }
        });

        // Look for data attributes with stream info
        $('[data-stream], [data-embed], [data-video]').each((i, el) => {
            const $el = $(el);
            const streamUrl = $el.attr('data-stream') || $el.attr('data-embed') || $el.attr('data-video');

            if (streamUrl) {
                streams.push({
                    id: this.generateId(),
                    server: this.detectServerName(streamUrl),
                    name: this.detectServerName(streamUrl),
                    link: {
                        url: normalizeUrl(streamUrl),
                        file: normalizeUrl(streamUrl),
                        type: 'iframe',
                    },
                    type: $el.attr('data-type') || 'sub',
                    language: $el.attr('data-type') || 'sub',
                    tracks: this.extractTracks($),
                });
            }
        });

        return streams;
    }

    /**
     * Parse multi-language player data
     */
    parseMultiLangData(dataSrc) {
        const streams = [];

        try {
            // Try to decode and parse the data
            let decodedData = dataSrc;

            // Try URL decode if encoded
            if (dataSrc.includes('data=')) {
                const parts = dataSrc.split('data=');
                if (parts[1]) {
                    try {
                        decodedData = decodeURIComponent(parts[1]);
                    } catch (e) {
                        decodedData = Buffer.from(parts[1], 'base64').toString('utf-8');
                    }
                }
            }

            // Try to parse as JSON
            const langData = JSON.parse(decodedData);

            if (Array.isArray(langData)) {
                langData.forEach((item, idx) => {
                    streams.push({
                        id: this.generateId(),
                        server: item.server || `Server ${idx + 1}`,
                        name: item.server || `Server ${idx + 1}`,
                        link: {
                            url: normalizeUrl(item.link || item.url || item.file),
                            file: normalizeUrl(item.link || item.url || item.file),
                            type: 'iframe',
                        },
                        type: item.type || item.language || 'sub',
                        language: item.type || item.language || 'sub',
                        label: item.label || item.language || 'Unknown',
                        tracks: [],
                    });
                });
            } else if (langData.sources && Array.isArray(langData.sources)) {
                // Handle standard playlist format
                langData.sources.forEach((item, idx) => {
                    streams.push({
                        id: this.generateId(),
                        server: item.server || this.detectServerName(item.file),
                        name: item.server || this.detectServerName(item.file),
                        link: {
                            url: normalizeUrl(item.file),
                            file: normalizeUrl(item.file),
                            type: item.type || 'video/mp4',
                        },
                        type: item.type || 'sub',
                        language: item.label || 'sub',
                        label: item.label || 'Unknown',
                        tracks: langData.tracks || [],
                    });
                });
            }
        } catch (e) {
            console.error('[StreamExtractor] Failed to parse multi-lang data:', e.message);
        }

        return streams;
    }

    /**
     * Extract direct video sources from JavaScript
     */
    extractVideoSources($) {
        const sources = [];
        const scripts = $('script').map((i, el) => $(el).html()).get().join('\n');

        // Look for m3u8 links
        const m3u8Matches = scripts.match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/g);
        if (m3u8Matches) {
            const uniqueLinks = [...new Set(m3u8Matches)];
            uniqueLinks.forEach((link, idx) => {
                sources.push({
                    id: this.generateId(),
                    server: 'HLS',
                    name: 'HLS Stream',
                    link: {
                        url: normalizeUrl(link),
                        file: normalizeUrl(link),
                        type: 'application/x-mpegURL',
                    },
                    type: 'sub',
                    language: 'sub',
                    intro: this.extractIntro($),
                    outro: this.extractOutro($),
                });
            });
        }

        // Look for MP4 links
        const mp4Matches = scripts.match(/(https?:\/\/[^\s"']+\.mp4[^\s"']*)/g);
        if (mp4Matches) {
            const uniqueLinks = [...new Set(mp4Matches)];
            uniqueLinks.forEach((link, idx) => {
                sources.push({
                    id: this.generateId(),
                    server: 'Direct',
                    name: 'Direct MP4',
                    link: {
                        url: normalizeUrl(link),
                        file: normalizeUrl(link),
                        type: 'video/mp4',
                    },
                    type: 'sub',
                    language: 'sub',
                    intro: this.extractIntro($),
                    outro: this.extractOutro($),
                });
            });
        }

        // Look for embed configs in scripts
        const configMatches = scripts.match(/player\.src\([^)]+\)/g);
        if (configMatches) {
            configMatches.forEach((match, idx) => {
                try {
                    // Try to extract URL from src call
                    const urlMatch = match.match(/src[\s]*[\(:]["']?([^"')]+)["']?/);
                    if (urlMatch) {
                        const url = urlMatch[1];
                        sources.push({
                            id: this.generateId(),
                            server: 'Player',
                            name: 'Player Source',
                            link: {
                                url: normalizeUrl(url),
                                file: normalizeUrl(url),
                                type: this.getMediaType(url),
                            },
                            type: 'sub',
                            language: 'sub',
                        });
                    }
                } catch (e) {
                    // Ignore parsing errors
                }
            });
        }

        return sources;
    }

    /**
     * Extract streams from data attributes
     */
    extractDataAttributeStreams($) {
        const streams = [];

        // Look for various data attributes containing stream URLs
        $('[data-video-url], [data-embed-url], [data-stream-url], [data-src-url]').each((i, el) => {
            const $el = $(el);
            const url = $el.attr('data-video-url') ||
                       $el.attr('data-embed-url') ||
                       $el.attr('data-stream-url') ||
                       $el.attr('data-src-url');

            if (url) {
                streams.push({
                    id: this.generateId(),
                    server: this.detectServerName(url),
                    name: this.detectServerName(url),
                    link: {
                        url: normalizeUrl(url),
                        file: normalizeUrl(url),
                        type: this.getMediaType(url),
                    },
                    type: $el.attr('data-type') || 'sub',
                    language: $el.attr('data-type') || 'sub',
                });
            }
        });

        return streams;
    }

    /**
     * Get media type from URL
     */
    getMediaType(url) {
        if (!url) return 'video/mp4';

        const urlLower = url.toLowerCase();
        if (urlLower.includes('.m3u8')) {
            return 'application/x-mpegURL';
        } else if (urlLower.includes('.mp4')) {
            return 'video/mp4';
        } else if (urlLower.includes('.webm')) {
            return 'video/webm';
        } else if (urlLower.includes('.mkv')) {
            return 'video/x-matroska';
        }
        return 'video/mp4';
    }

    /**
     * Extract video tracks (subtitles, captions)
     */
    extractTracks($) {
        const tracks = [];

        // Try to find track elements
        $('track').each((i, el) => {
            const $el = $(el);
            const src = $el.attr('src');
            const label = $el.attr('label') || $el.attr('srclang');
            const kind = $el.attr('kind') || 'subtitles';
            const isDefault = $el.attr('default') !== undefined;

            if (src) {
                tracks.push({
                    file: normalizeUrl(src),
                    label: label || 'Unknown',
                    kind: kind,
                    default: isDefault,
                    language: label || 'unknown',
                });
            }
        });

        // Try to find tracks in JavaScript
        const scripts = $('script').map((i, el) => $(el).html()).get().join('\n');
        const trackMatches = scripts.match(/tracks[\s]*:[\s]*\[([^\]]+)\]/);
        if (trackMatches) {
            try {
                // Try to parse tracks array
                const trackData = JSON.parse(`[${trackMatches[1]}]`);
                trackData.forEach((track, idx) => {
                    if (track.file || track.src) {
                        tracks.push({
                            file: normalizeUrl(track.file || track.src),
                            label: track.label || `Track ${idx + 1}`,
                            kind: track.kind || 'subtitles',
                            default: track.default || false,
                            language: track.srclang || track.language || 'unknown',
                        });
                    }
                });
            } catch (e) {
                // Ignore parsing errors
            }
        }

        return tracks;
    }

    /**
     * Extract intro timestamp
     */
    extractIntro($) {
        // Try to find intro markers in scripts
        const scripts = $('script').map((i, el) => $(el).html()).get().join('\n');

        // Try various patterns
        const patterns = [
            /intro[\s\S]*?start[\s]*[:=]\s*(\d+)[\s\S]*?end[\s]*[:=]\s*(\d+)/i,
            /skip\.intro[\s]*[:=]\s*(\d+)[\s\S]*?(\d+)/i,
            /"intro"[^{]*start["']?\s*:\s*(\d+)[^}]*end["']?\s*:\s*(\d+)/i,
            /intro:\s*\{\s*start:\s*(\d+)[^}]*end:\s*(\d+)/i,
        ];

        for (const pattern of patterns) {
            const match = scripts.match(pattern);
            if (match) {
                return {
                    start: parseInt(match[1]),
                    end: parseInt(match[2]),
                    skip: parseInt(match[1]),
                };
            }
        }

        return null;
    }

    /**
     * Extract outro timestamp
     */
    extractOutro($) {
        // Try to find outro markers in scripts
        const scripts = $('script').map((i, el) => $(el).html()).get().join('\n');

        const patterns = [
            /outro[\s\S]*?start[\s]*[:=]\s*(\d+)[\s\S]*?end[\s]*[:=]\s*(\d+)/i,
            /"outro"[^{]*start["']?\s*:\s*(\d+)[^}]*end["']?\s*:\s*(\d+)/i,
            /outro:\s*\{\s*start:\s*(\d+)[^}]*end:\s*(\d+)/i,
        ];

        for (const pattern of patterns) {
            const match = scripts.match(pattern);
            if (match) {
                return {
                    start: parseInt(match[1]),
                    end: parseInt(match[2]),
                };
            }
        }

        return null;
    }

    /**
     * Extract servers list
     */
    async extractServers($) {
        const servers = [];
        const seenIds = new Set();

        // Look for server selection elements
        const serverSelectors = [
            '.server-btn',
            '.server-item',
            '[data-server]',
            '[data-id]',
            '.server-list .server',
            '.servers .server',
            '.streaming-servers .server',
            '.video-servers .server',
            '.source-select .source',
        ];

        for (const selector of serverSelectors) {
            $(selector).each((i, el) => {
                const $el = $(el);
                const serverId = $el.attr('data-server') ||
                               $el.attr('data-id') ||
                               $el.attr('id') ||
                               `server-${i + 1}`;
                const serverName = $el.text().trim() ||
                                 $el.attr('title') ||
                                 $el.attr('data-name');
                const serverType = $el.attr('data-type') ||
                                  $el.attr('data-lang') ||
                                  'sub';

                if (serverId && serverName && !seenIds.has(serverId)) {
                    seenIds.add(serverId);
                    servers.push({
                        id: serverId,
                        name: sanitizeText(serverName),
                        type: serverType,
                        language: serverType,
                        active: $el.hasClass('active') || $el.hasClass('current'),
                    });
                }
            });
        }

        return servers;
    }

    /**
     * Extract available server information
     */
    async extractAvailableServers($) {
        const servers = [];
        const seenUrls = new Set();

        // Extract from iframe sources
        $('iframe[src], iframe[data-src]').each((i, el) => {
            const src = $(el).attr('src') || $(el).attr('data-src');

            if (src && !seenUrls.has(src)) {
                seenUrls.add(src);

                // Determine server name from URL
                const serverName = this.detectServerName(src);
                const type = src.includes('dub') ? 'dub' : 'sub';

                servers.push({
                    server_id: i + 1,
                    server_name: serverName,
                    type: type,
                    language: type,
                    available: true,
                    embed_url: normalizeUrl(src),
                });
            }
        });

        // Add servers from data attributes
        $('[data-embed]').each((i, el) => {
            const embed = $(el).attr('data-embed');
            if (embed && !seenUrls.has(embed)) {
                seenUrls.add(embed);

                servers.push({
                    server_id: servers.length + 1,
                    server_name: this.detectServerName(embed),
                    type: 'sub',
                    language: 'sub',
                    available: true,
                    embed_url: normalizeUrl(embed),
                });
            }
        });

        return servers;
    }

    /**
     * Extract download links
     */
    async extractDownloadLinks($) {
        const downloads = [];

        // Look for download buttons/links
        $('a[href*="download"], a[download], .download-btn, .download-link').each((i, el) => {
            const $el = $(el);
            const href = $el.attr('href');
            const text = $el.text().trim();

            if (href && href.startsWith('http')) {
                downloads.push({
                    id: this.generateId(),
                    url: normalizeUrl(href),
                    name: text || `Download ${i + 1}`,
                    server: this.detectServerName(href),
                    quality: this.extractQualityFromText(text),
                });
            }
        });

        // Look for download data in scripts
        const scripts = $('script').map((i, el) => $(el).html()).get().join('\n');
        const downloadMatches = scripts.match(/"download"[^{]*url["']?\s*:\s*["']([^"']+)["']/g);
        if (downloadMatches) {
            downloadMatches.forEach((match, idx) => {
                const urlMatch = match.match(/["']([^"']+)["']/);
                if (urlMatch) {
                    downloads.push({
                        id: this.generateId(),
                        url: normalizeUrl(urlMatch[1]),
                        name: `Download ${idx + 1}`,
                        server: this.detectServerName(urlMatch[1]),
                    });
                }
            });
        }

        return downloads;
    }

    /**
     * Extract quality from text
     */
    extractQualityFromText(text) {
        if (!text) return 'HD';

        const textLower = text.toLowerCase();
        if (textLower.includes('1080p') || textLower.includes('full hd')) {
            return '1080p';
        } else if (textLower.includes('720p')) {
            return '720p';
        } else if (textLower.includes('480p')) {
            return '480p';
        } else if (textLower.includes('4k')) {
            return '4K';
        }
        return 'HD';
    }

    /**
     * Generate unique ID
     */
    generateId(length = 12) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Extract fallback streaming links
     */
    async extractFallback(id, episode, server) {
        try {
            const url = this.buildUrl(id, episode);
            const html = await this.fetchWithRetry(url);
            const $ = require('cheerio').load(html);

            // Get all available servers
            const serverData = await this.extractServers($);
            const matchingServer = serverData.find(s =>
                s.name.toLowerCase().includes(server?.toLowerCase() || '')
            );

            if (matchingServer) {
                // Return data with matched server
                const streamData = await this.extract(id, episode);
                if (streamData.success) {
                    streamData.data.streamingLinks = streamData.data.streamingLinks.filter(
                        link => link.server.toLowerCase().includes(server.toLowerCase())
                    );
                }
                return streamData;
            }

            return await this.extract(id, episode);
        } catch (error) {
            console.error('[StreamExtractor] Fallback Error:', error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Get episode streaming URL directly
     */
    async getStreamUrl(id, episode, server = null) {
        const result = await this.extract(id, episode);

        if (!result.success || !result.data.streamingLinks.length) {
            return null;
        }

        // If server specified, try to find it
        if (server) {
            const matchingLink = result.data.streamingLinks.find(
                link => link.server.toLowerCase().includes(server.toLowerCase())
            );
            if (matchingLink) {
                return matchingLink.link.url;
            }
        }

        // Return first available link
        return result.data.streamingLinks[0]?.link?.url || null;
    }
}

module.exports = StreamExtractor;
