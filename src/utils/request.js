/**
 * Request Utility - HTTP request handling with retry logic
 */

const axios = require('axios');
const config = require('../config');

/**
 * Fetch HTML content from a URL with retry logic
 * @param {string} url - The URL to fetch
 * @param {object} options - Additional options
 * @returns {Promise<string>} - HTML content
 */
async function fetchHTML(url, options = {}) {
    const maxRetries = options.retries || config.request.retries;
    const timeout = options.timeout || config.request.timeout;
    const retryDelay = options.retryDelay || config.request.retryDelay;

    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await axios.get(url, {
                timeout: timeout,
                headers: {
                    ...config.request.headers,
                    ...options.headers,
                },
                validateStatus: (status) => status < 500,
            });

            if (response.status === 200) {
                return response.data;
            }

            if (response.status === 429) {
                // Rate limited - wait and retry
                const waitTime = retryDelay * attempt;
                console.log(`[Request] Rate limited, waiting ${waitTime}ms before retry ${attempt}/${maxRetries}`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }

            throw new Error(`HTTP ${response.status}`);
        } catch (error) {
            lastError = error;

            if (attempt < maxRetries) {
                const waitTime = retryDelay * attempt;
                console.log(`[Request] Attempt ${attempt}/${maxRetries} failed: ${error.message}, retrying in ${waitTime}ms`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }

    throw new Error(`Failed to fetch ${url} after ${maxRetries} attempts: ${lastError.message}`);
}

/**
 * Fetch HTML with concurrent requests
 * @param {string[]} urls - Array of URLs to fetch
 * @param {object} options - Additional options
 * @returns {Promise<object>} - Object with URL as key and HTML as value
 */
async function fetchHTMLConcurrent(urls, options = {}) {
    const concurrency = options.concurrency || 5;

    const results = {};

    // Process URLs in batches
    for (let i = 0; i < urls.length; i += concurrency) {
        const batch = urls.slice(i, i + concurrency);
        const promises = batch.map(async (url) => {
            try {
                const html = await fetchHTML(url, options);
                results[url] = { success: true, html };
            } catch (error) {
                results[url] = { success: false, error: error.message };
            }
        });
        await Promise.all(promises);
    }

    return results;
}

/**
 * Create a configured axios instance
 * @returns {object} - Axios instance
 */
function createClient() {
    return axios.create({
        timeout: config.request.timeout,
        headers: config.request.headers,
    });
}

module.exports = {
    fetchHTML,
    fetchHTMLConcurrent,
    createClient,
};
