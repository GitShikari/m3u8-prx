// proxy-server.js - Standalone streaming proxy service with TS segment caching only
const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const NodeCache = require('node-cache');
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize cache with 10 minute TTL (time to live)
const tsCache = new NodeCache({ 
  stdTTL: 600, // 10 minutes in seconds
  checkperiod: 120 // Check for expired keys every 2 minutes
});

// Middleware
app.use(express.json());

// Simple status endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'online', 
    service: 'Stream Proxy Server',
    endpoints: {
      proxyStream: '/proxy-stream/:url(*)',
      status: '/status'
    }
  });
});

// Status endpoint with cache stats
app.get('/status', (req, res) => {
  const stats = tsCache.getStats();
  res.json({
    status: 'online',
    cacheStats: {
      keys: tsCache.keys().length,
      hits: stats.hits,
      misses: stats.misses,
      ksize: stats.ksize,
      vsize: stats.vsize
    },
    uptime: process.uptime()
  });
});

// Clear cache endpoint (protected by simple token)
app.post('/clear-cache', (req, res) => {
  const token = req.body.token;
  
  // Simple token validation - in production use a more secure method
  if (token !== process.env.ADMIN_TOKEN && token !== 'admin-token') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const keysCount = tsCache.keys().length;
  tsCache.flushAll();
  
  res.json({ 
    success: true, 
    message: `Cache cleared. ${keysCount} TS segments removed.` 
  });
});

// CORS Proxy with caching for streaming
app.get('/proxy-stream/:url(*)', async (req, res) => {
  const streamUrl = req.params.url;
  
  if (!streamUrl) {
    return res.status(400).json({ error: 'Stream URL is required' });
  }

  try {
    // Check if we have the TS segment in cache
    if (streamUrl.endsWith('.ts')) {
      const cachedSegment = tsCache.get(streamUrl);
      
      if (cachedSegment) {
        console.log(`Serving cached TS segment for: ${streamUrl}`);
        
        // Set the content type from cached metadata
        if (cachedSegment.contentType) {
          res.setHeader('Content-Type', cachedSegment.contentType);
        }
        
        // Return the cached buffer
        return res.send(cachedSegment.data);
      }
    }
    
    // Not in cache or not a TS file, fetch from source
    console.log(`Fetching from source: ${streamUrl}`);
    const response = await fetch(streamUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }
    
    // Get content type and set response header
    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    
    // For m3u8 files we rewrite the content but don't cache it
    if (streamUrl.endsWith('.m3u8')) {
      const data = await response.text();
      
      // Rewrite the content to use our proxy for internal URLs
      const rewrittenData = rewriteM3u8Content(data, streamUrl);
      
      // Send the rewritten response
      return res.send(rewrittenData);
    } 
    // For TS segment files, cache the binary data
    else if (streamUrl.endsWith('.ts')) {
      const buffer = await response.buffer();
      
      // Cache the buffer
      tsCache.set(streamUrl, {
        data: buffer,
        contentType: contentType
      });
      
      // Send the response
      return res.send(buffer);
    }
    // For other content, we stream directly without caching
    else {
      // Stream the response data to the client
      return response.body.pipe(res);
    }
  } catch (error) {
    console.error('Proxy stream error:', error);
    res.status(500).json({ error: 'Failed to proxy stream: ' + error.message });
  }
});

// Helper function to rewrite m3u8 content to use our proxy
function rewriteM3u8Content(content, originalUrl) {
  // Extract the origin (protocol + hostname) from the original URL
  let origin = '';
  try {
    const urlObj = new URL(originalUrl);
    origin = urlObj.origin;
  } catch (e) {
    console.error('Error parsing original URL:', e);
  }
  
  // Get the base URL for relative paths in the m3u8 file
  const baseUrl = originalUrl.substring(0, originalUrl.lastIndexOf('/') + 1);
  
  // Rewrite segment URLs to go through our proxy
  return content.replace(/^((?!#).+\.ts|.+\.m3u8)$/gm, function(match) {
    // Handle absolute URLs, URLs starting with /, and relative URLs
    let absoluteUrl;
    if (match.startsWith('http')) {
      absoluteUrl = match;
    } else if (match.startsWith('/')) {
      absoluteUrl = origin + match;
    } else {
      absoluteUrl = baseUrl + match;
    }
    
    return `/proxy-stream/${absoluteUrl}`;
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Stream Proxy Server running on port ${PORT}`);
  console.log(`Available endpoints:`);
  console.log(`  - GET /                   : Service info`);
  console.log(`  - GET /status             : Service status with cache stats`);
  console.log(`  - GET /proxy-stream/:url  : Proxy stream endpoint`);
  console.log(`  - POST /clear-cache       : Clear cache (requires token)`);
  console.log(`TS segments are cached for 10 minutes. M3U8 files are not cached.`);
});
