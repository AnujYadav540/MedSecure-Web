// PDF Cache utility for better performance
class PDFCache {
  constructor(maxSize = 50 * 1024 * 1024) { // 50MB default cache size
    this.cache = new Map();
    this.maxSize = maxSize;
    this.currentSize = 0;
  }

  // Generate cache key
  getCacheKey(recordId) {
    return `pdf_${recordId}`;
  }

  // Add PDF to cache
  set(recordId, blob) {
    const key = this.getCacheKey(recordId);
    const size = blob.size;

    // Check if we need to clear space
    while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
      const firstKey = this.cache.keys().next().value;
      const firstBlob = this.cache.get(firstKey);
      this.currentSize -= firstBlob.size;
      this.cache.delete(firstKey);
    }

    // Add to cache
    this.cache.set(key, {
      blob,
      timestamp: Date.now(),
      size
    });
    this.currentSize += size;

    console.log(`PDF cached: ${recordId}, Cache size: ${(this.currentSize / 1024 / 1024).toFixed(2)}MB`);
  }

  // Get PDF from cache
  get(recordId) {
    const key = this.getCacheKey(recordId);
    const cached = this.cache.get(key);

    if (cached) {
      // Check if cache is still valid (24 hours)
      const age = Date.now() - cached.timestamp;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (age < maxAge) {
        console.log(`PDF cache hit: ${recordId}`);
        return cached.blob;
      } else {
        // Cache expired
        this.cache.delete(key);
        this.currentSize -= cached.size;
        console.log(`PDF cache expired: ${recordId}`);
      }
    }

    console.log(`PDF cache miss: ${recordId}`);
    return null;
  }

  // Check if PDF is cached
  has(recordId) {
    return this.get(recordId) !== null;
  }

  // Clear specific PDF from cache
  remove(recordId) {
    const key = this.getCacheKey(recordId);
    const cached = this.cache.get(key);
    
    if (cached) {
      this.currentSize -= cached.size;
      this.cache.delete(key);
      console.log(`PDF removed from cache: ${recordId}`);
    }
  }

  // Clear all cache
  clear() {
    this.cache.clear();
    this.currentSize = 0;
    console.log('PDF cache cleared');
  }

  // Get cache stats
  getStats() {
    return {
      count: this.cache.size,
      size: this.currentSize,
      sizeFormatted: `${(this.currentSize / 1024 / 1024).toFixed(2)}MB`,
      maxSize: this.maxSize,
      maxSizeFormatted: `${(this.maxSize / 1024 / 1024).toFixed(2)}MB`
    };
  }
}

// Create singleton instance
const pdfCache = new PDFCache();

export default pdfCache;
