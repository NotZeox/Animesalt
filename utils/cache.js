/**
 * Cache Utility for Anime Salt API
 * In-memory cache with TTL support for scalable performance
 */

class Cache {
    constructor(options = {}) {
        this.ttl = options.ttl || 300000; // Default 5 minutes
        this.maxSize = options.maxSize || 1000;
        this.cache = new Map();
        this.accessOrder = [];
    }

    /**
     * Get item from cache
     */
    get(key) {
        const item = this.cache.get(key);
        
        if (!item) {
            return null;
        }

        // Check if expired
        if (Date.now() > item.expiry) {
            this.delete(key);
            return null;
        }

        // Update access order for LRU
        this.updateAccessOrder(key);
        
        return item.value;
    }

    /**
     * Set item in cache
     */
    set(key, value, ttl = null) {
        // Check if cache is full
        if (this.cache.size >= this.maxSize) {
            this.evictOldest();
        }

        const expiry = Date.now() + (ttl || this.ttl);
        
        this.cache.set(key, {
            value,
            expiry,
            created: Date.now(),
        });

        this.accessOrder.push(key);
    }

    /**
     * Delete item from cache
     */
    delete(key) {
        this.cache.delete(key);
        const index = this.accessOrder.indexOf(key);
        if (index > -1) {
            this.accessOrder.splice(index, 1);
        }
    }

    /**
     * Clear all cache
     */
    clear() {
        this.cache.clear();
        this.accessOrder = [];
    }

    /**
     * Get cache stats
     */
    stats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            hitRate: this.calculateHitRate(),
            memoryUsage: this.estimateMemoryUsage(),
        };
    }

    /**
     * Update access order for LRU eviction
     */
    updateAccessOrder(key) {
        const index = this.accessOrder.indexOf(key);
        if (index > -1) {
            this.accessOrder.splice(index, 1);
            this.accessOrder.push(key);
        }
    }

    /**
     * Evict oldest accessed item
     */
    evictOldest() {
        if (this.accessOrder.length > 0) {
            const oldest = this.accessOrder.shift();
            this.cache.delete(oldest);
        }
    }

    /**
     * Calculate cache hit rate
     */
    calculateHitRate() {
        // Simplified calculation
        return this.cache.size / this.maxSize;
    }

    /**
     * Estimate memory usage
     */
    estimateMemoryUsage() {
        // Rough estimation
        return this.cache.size * 1024; // bytes
    }

    /**
     * Cleanup expired items
     */
    cleanup() {
        const now = Date.now();
        const keysToDelete = [];

        for (const [key, item] of this.cache) {
            if (now > item.expiry) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.delete(key));
        
        return keysToDelete.length;
    }

    /**
     * Start periodic cleanup
     */
    startCleanupInterval(intervalMs = 60000) {
        setInterval(() => {
            const cleaned = this.cleanup();
            if (cleaned > 0) {
                console.log(`[Cache] Cleaned ${cleaned} expired items`);
            }
        }, intervalMs);
    }
}

// Create singleton instance
const cache = new Cache({
    ttl: 300000, // 5 minutes
    maxSize: 1000,
});

module.exports = cache;
