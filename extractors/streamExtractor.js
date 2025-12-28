/**
 * Stream Extractor for Anime Salt API
 * Extracts streaming links, servers, and video sources
 */

const { fetchHTML, normalizeUrl, sanitizeText } = require('../utils/helpers');

class StreamExtractor {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    /**
     * Extract streaming data for an episode
     */
    async extract(id, episode, options = {}) {
        try {
            const url = this.buildUrl(id, episode);
            const html = await fetchHTML(url);
            const $ = require('cheerio').load(html);

            const data = {
                streamingLink: await this.extractStreamingLinks($),
                servers: await this.extractServers($),
                availableServers: await this.extractAvailableServers($),
            };

            return {
                success: true,
                data: data,
            };
        } catch (error) {
            console.error('[StreamExtractor] Error:', error.message);
            return {
                success: false,
                error: error.message,
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

        if (episode) {
            // Format: /episode/{anime-id}-{episode}/
            // Episode format: 1x1, 2x5, etc.
            const epParts = episode.toString().split('x');
            const season = epParts[0] || 1;
            const ep = epParts[1] || episode;
            return `${this.baseUrl}/episode/${id}-${season}x${ep}/`;
        }

        return `${this.baseUrl}/series/${id}/`;
    }

    /**
     * Extract streaming links and tracks
     */
    async extractStreamingLinks($) {
        const streamingLinks = [];

        // Extract primary iframe sources
        const iframes = [];
        $('iframe[src], iframe[data-src]').each((i, el) => {
            const src = $(el).attr('src') || $(el).attr('data-src');
            if (src) {
                iframes.push({
                    server: `Server ${i + 1}`,
                    embed: src,
                    type: 'iframe',
                });
            }
        });

        // Process each iframe
        for (const iframe of iframes) {
            const streamData = {
                id: this.generateId(),
                server: iframe.server,
                link: {
                    file: iframe.embed,
                    type: 'iframe',
                },
                tracks: this.extractTracks($),
                intro: this.extractIntro($),
                outro: this.extractOutro($),
            };

            streamingLinks.push(streamData);
        }

        // Extract multi-language player data
        const multiLangSrc = $('iframe[data-src*="multi-lang-plyr"]').attr('data-src');
        if (multiLangSrc) {
            const multiLangStreams = this.parseMultiLangData(multiLangSrc);
            streamingLinks.push(...multiLangStreams);
        }

        // Extract direct video sources from scripts
        const videoSources = this.extractVideoSources($);
        streamingLinks.push(...videoSources);

        return streamingLinks;
    }

    /**
     * Extract video tracks (subtitles, captions)
     */
    extractTracks($) {
        const tracks = [];
        
        // Try to find track elements
        $('track').each((i, el) => {
            const src = $(el).attr('src');
            const label = $(el).attr('label') || $(el).attr('srclang');
            const kind = $(el).attr('kind') || 'subtitles';
            const isDefault = $(el).attr('default') !== undefined;

            if (src) {
                tracks.push({
                    file: normalizeUrl(src),
                    label: label || 'Unknown',
                    kind: kind,
                    default: isDefault,
                });
            }
        });

        return tracks;
    }

    /**
     * Extract intro timestamp
     */
    extractIntro($) {
        // Try to find intro markers in scripts
        const scripts = $('script').map((i, el) => $(el).html()).get().join('\n');
        
        const introMatch = scripts.match(/intro[\s\S]*?start[\s]*[:=]\s*(\d+)[\s\S]*?end[\s]*[:=]\s*(\d+)/i);
        if (introMatch) {
            return {
                start: parseInt(introMatch[1]),
                end: parseInt(introMatch[2]),
            };
        }

        return null;
    }

    /**
     * Extract outro timestamp
     */
    extractOutro($) {
        // Try to find outro markers in scripts
        const scripts = $('script').map((i, el) => $(el).html()).get().join('\n');
        
        const outroMatch = scripts.match(/outro[\s\S]*?start[\s]*[:=]\s*(\d+)[\s\S]*?end[\s]*[:=]\s*(\d+)/i);
        if (outroMatch) {
            return {
                start: parseInt(outroMatch[1]),
                end: parseInt(outroMatch[2]),
            };
        }

        return null;
    }

    /**
     * Extract servers list
     */
    async extractServers($) {
        const servers = [];
        
        // Look for server selection elements
        $('.server-btn, .server-item, [data-server]').each((i, el) => {
            const serverId = $(el).attr('data-server') || $(el).attr('data-id');
            const serverName = $(el).text().trim() || $(el).attr('title');
            const serverType = $(el).attr('data-type') || 'sub';
            
            if (serverId && serverName) {
                servers.push({
                    id: serverId,
                    name: sanitizeText(serverName),
                    type: serverType,
                });
            }
        });

        return servers;
    }

    /**
     * Extract available server information
     */
    async extractAvailableServers($) {
        const servers = [];
        
        // Extract from iframe sources
        $('iframe[src], iframe[data-src]').each((i, el) => {
            const src = $(el).attr('src') || $(el).attr('data-src');
            
            if (src) {
                // Determine server name from URL
                let serverName = 'Unknown';
                if (src.includes('zephyrflick')) serverName = 'ZephyrFlick';
                else if (src.includes('streamtape')) serverName = 'StreamTape';
                else if (src.includes('mp4upload')) serverName = 'Mp4Upload';
                else if (src.includes('gogo')) serverName = 'GogoStream';
                else if (src.includes('cloud9')) serverName = 'Cloud9';
                
                servers.push({
                    server_id: i + 1,
                    server_name: serverName,
                    type: src.includes('dub') ? 'dub' : 'sub',
                });
            }
        });

        return servers;
    }

    /**
     * Parse multi-language player data
     */
    parseMultiLangData(dataSrc) {
        const streams = [];
        
        try {
            // Decode URL-encoded JSON data
            const decodedData = decodeURIComponent(dataSrc.split('data=')[1] || '');
            const langData = JSON.parse(decodedData);
            
            if (Array.isArray(langData)) {
                langData.forEach((item, idx) => {
                    streams.push({
                        id: this.generateId(),
                        type: item.language || 'Unknown',
                        server: `Language Server ${idx + 1}`,
                        link: {
                            file: item.link,
                            type: 'iframe',
                        },
                        tracks: [],
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
            m3u8Matches.forEach((link, idx) => {
                sources.push({
                    id: this.generateId(),
                    server: `HLS ${idx + 1}`,
                    link: {
                        file: link,
                        type: 'hls',
                    },
                    tracks: this.extractTracks($),
                });
            });
        }

        // Look for MP4 links
        const mp4Matches = scripts.match(/video[\s\S]*?src[\s]*=[\s]*["']([^"']+\.mp4[^"']*)["']/g);
        if (mp4Matches) {
            mp4Matches.forEach((match, idx) => {
                const urlMatch = match.match(/["']([^"']+\.mp4[^"']*)["']/);
                if (urlMatch) {
                    sources.push({
                        id: this.generateId(),
                        server: `Direct ${idx + 1}`,
                        link: {
                            file: urlMatch[1],
                            type: 'video/mp4',
                        },
                        tracks: this.extractTracks($),
                    });
                }
            });
        }

        return sources;
    }

    /**
     * Generate unique ID
     */
    generateId(length = 8) {
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
            const html = await fetchHTML(url);
            const $ = require('cheerio').load(html);

            // Try to find specific server
            const serverData = await this.extractServers($);
            const matchingServer = serverData.find(s => 
                s.name.toLowerCase().includes(server?.toLowerCase() || '')
            );

            if (matchingServer) {
                // Simulate clicking server button
                const streamData = await this.extract(id, episode);
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
}

module.exports = StreamExtractor;
