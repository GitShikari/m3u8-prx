const express = require('express');
const axios = require('axios');
const fetch = require('node-fetch');
const NodeCache = require('node-cache');

const app = express();
const PORT = 3000;
const tsCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

// Middleware
app.use(express.json());

// Add CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Simple status endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'online', 
    service: 'Stream Proxy Server',
    endpoints: {
      fetchStream: '/fetch-stream',
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

// Clear cache endpoint
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

app.get('/hindi.m3u8', async (req, res) => {
    const url = 'http://protv.fun/play/live.php?mac=00:1A:79:73:0c:7d&stream=155967&extension=m3u8';
    
    try {
        // Step 1: Fetch the redirect link
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 4 rev: 874 Mobile Safari/533.3',
                'Connection': 'Keep-Alive',
                'Accept-Encoding': 'identity',
                'Icy-MetaData': '1'
            },
            maxRedirects: 0, // Prevent automatic redirects
            validateStatus: function (status) {
                return status >= 200 && status < 303; // Allow only success and redirect status codes
            }
        });

        if (response.status >= 300 && response.status < 400 && response.headers.location) {
            const redirectLink = response.headers.location;

            // Step 2: Use the /proxy-stream endpoint to fetch data from the redirect link
            const proxyResponse = await axios.get(`http://localhost:${PORT}/proxy-stream/${encodeURIComponent(redirectLink)}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 4 rev: 874 Mobile Safari/533.3',
                    'Connection': 'Keep-Alive',
                    'Accept-Encoding': 'identity'
                }
            });

            // Step 3: Return the data from the redirect link
            // res.send(proxyResponse.data);
            res.redirect(`/proxy-stream/${redirectLink}`);
        } else {
            res.status(500).send({ error: 'No redirect link found' });
        }
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

app.get('/willow.m3u8', async (req, res) => {
    const url = 'http://pxy.proxytx.cloud/play/live.php?mac=00:1A:79:C1:53:4A&stream=1141780&extension=m3u8&play_token=bVbrMVJqJi';
    
    try {
        // Step 1: Fetch the redirect link
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 4 rev: 874 Mobile Safari/533.3',
                'Connection': 'Keep-Alive',
                'Accept-Encoding': 'identity',
                'Icy-MetaData': '1'
            },
            maxRedirects: 0, // Prevent automatic redirects
            validateStatus: function (status) {
                return status >= 200 && status < 303; // Allow only success and redirect status codes
            }
        });

        if (response.status >= 300 && response.status < 400 && response.headers.location) {
            const redirectLink = response.headers.location;

            // Step 2: Use the /proxy-stream endpoint to fetch data from the redirect link
            const proxyResponse = await axios.get(`http://localhost:${PORT}/proxy-stream/${encodeURIComponent(redirectLink)}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 4 rev: 874 Mobile Safari/533.3',
                    'Connection': 'Keep-Alive',
                    'Accept-Encoding': 'identity'
                }
            });

            // Step 3: Return the data from the redirect link
            // res.send(proxyResponse.data);
            res.redirect(`/proxy-stream/${redirectLink}`);
        } else {
            res.status(500).send({ error: 'No redirect link found' });
        }
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

app.get('/fetch-stream/star.m3u8', async (req, res) => {
    try {
        const response = await axios.get('http://tv.stream4k.cc/stalker_portal/server/load.php', {
            params: {
                type: 'itv',
                action: 'create_link',
                cmd: 'ffrt http://localhost/ch/472278',
                JsHttpRequest: '1-xml'
            },
            headers: {
                'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3',
                'Connection': 'Keep-Alive',
                // 'Accept-Encoding': 'gzip',
                'X-User-Agent': 'Model: MAG250; Link: WiFi',
                'Referer': 'http://tv.stream4k.cc/stalker_portal/c/',
                'Authorization': 'Bearer A6538E64F7AA5985A0C03278C6457C39',
                'Cookie': '__cflb=04dToR2zvc74qP5s9bpiDBZLSJKDraGsjXX3MNGRcR; mac=00:1A:79:00:07:3C; stb_lang=en; timezone=GMT'
            }
        });
        
        const cmdUrl = response.data?.js?.cmd || '';
        if (cmdUrl) {
            return res.redirect(`/proxy-stream/${cmdUrl}`);
        }
        res.status(404).json({ error: 'No stream link found' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/proxy-stream/:url(*)', async (req, res) => {
    const streamUrl = `${req.params.url}`;
    
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
        const response = await fetch(streamUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3',
                'Connection': 'Keep-Alive'
                // 'Accept-Encoding': 'gzip' - commented out to avoid compression issues
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }
        
        // Get content type and set response header
        const contentType = response.headers.get('content-type');
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }
        
        // For m3u8 files we rewrite the content but don't cache it
        if (streamUrl.endsWith('155967') || streamUrl.endsWith('m3u8') || streamUrl.endsWith('1141780')) {
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

app.listen(PORT, () => {
    console.log(`Stream Proxy Server running on http://localhost:${PORT}`);
    console.log(`Available endpoints:`);
    console.log(`  - GET /                   : Service info`);
    console.log(`  - GET /status             : Service status with cache stats`);
    console.log(`  - GET /fetch-stream       : Fetch and redirect to stream`);
    console.log(`  - GET /proxy-stream/:url  : Proxy stream endpoint`);
    console.log(`  - POST /clear-cache       : Clear cache (requires token)`);
    console.log(`TS segments are cached for 10 minutes. M3U8 files are not cached.`);
    console.log(`CORS enabled for all origins`);
});
