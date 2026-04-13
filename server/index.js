// Server config
const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

app.use(cors());
app.use(express.json());

const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

// ── In-memory cache to reduce API quota usage ──
const cache = {};
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCache(key) {
  const entry = cache[key];
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  delete cache[key];
  return null;
}

function setCache(key, data) {
  cache[key] = { data, ts: Date.now() };
  // Clean old entries (keep cache under 200 keys)
  const keys = Object.keys(cache);
  if (keys.length > 200) {
    const oldest = keys.sort((a, b) => cache[a].ts - cache[b].ts).slice(0, 50);
    oldest.forEach((k) => delete cache[k]);
  }
}

// 1. Fetch Trending Videos
app.get('/api/trending', async (req, res) => {
  const cacheKey = 'trending';
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  try {
    const response = await axios.get(`${YOUTUBE_API_BASE_URL}/videos`, {
      params: {
        part: 'snippet,statistics,contentDetails',
        chart: 'mostPopular',
        regionCode: 'US',
        maxResults: 20,
        key: YOUTUBE_API_KEY,
      },
    });

    const videos = response.data.items.map((item) => ({
      videoId: item.id,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.standard?.url || item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
      channelName: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      viewCount: item.statistics.viewCount,
      duration: item.contentDetails?.duration,
    }));

    setCache(cacheKey, videos);
    res.json(videos);
  } catch (error) {
    if (error.response?.status === 403) {
      console.log('⚠️ YouTube API quota exceeded on trending.');
      return res.json([]);
    }
    console.error('Error fetching trending videos:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch trending videos' });
  }
});

// 2. Fetch Search Results
app.get('/api/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query parameter "q" is required' });

  const cacheKey = `search:${q.toLowerCase().trim()}`;
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  try {
    const response = await axios.get(`${YOUTUBE_API_BASE_URL}/search`, {
      params: {
        part: 'snippet',
        q,
        type: 'video',
        maxResults: 20,
        key: YOUTUBE_API_KEY,
      },
    });

    const videoIds = response.data.items.map(item => item.id.videoId).filter(Boolean);
    
    let detailedVideos = [];

    if (videoIds.length > 0) {
      const detailsResponse = await axios.get(`${YOUTUBE_API_BASE_URL}/videos`, {
        params: {
          part: 'snippet,statistics,contentDetails',
          id: videoIds.join(','),
          key: YOUTUBE_API_KEY,
        },
      });

      detailedVideos = detailsResponse.data.items.map((item) => ({
        videoId: item.id,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.standard?.url || item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
        channelName: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        viewCount: item.statistics?.viewCount || 0,
        duration: item.contentDetails?.duration || "PT0M0S",
      }));
    }

    setCache(cacheKey, detailedVideos);
    res.json(detailedVideos);
  } catch (error) {
    // On quota error, return empty gracefully
    if (error.response?.status === 403) {
      console.log('⚠️ YouTube API quota exceeded. Serving cached or empty.');
      return res.json([]);
    }
    console.error('Error fetching search results:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch search results' });
  }
});

// 3. Fetch Video Details (with channel info)
app.get('/api/video/:id', async (req, res) => {
  const { id } = req.params;
  const cacheKey = `video:${id}`;
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  try {
    const response = await axios.get(`${YOUTUBE_API_BASE_URL}/videos`, {
      params: {
        part: 'snippet,statistics,contentDetails',
        id,
        key: YOUTUBE_API_KEY,
      },
    });

    if (!response.data.items || response.data.items.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const item = response.data.items[0];

    // Fetch channel details (avatar, subscriber count)
    let channelAvatar = '';
    let subscriberCount = '0';
    try {
      const channelRes = await axios.get(`${YOUTUBE_API_BASE_URL}/channels`, {
        params: {
          part: 'snippet,statistics',
          id: item.snippet.channelId,
          key: YOUTUBE_API_KEY,
        },
      });
      if (channelRes.data.items?.length > 0) {
        channelAvatar = channelRes.data.items[0].snippet.thumbnails?.default?.url || '';
        subscriberCount = channelRes.data.items[0].statistics?.subscriberCount || '0';
      }
    } catch (chErr) {
      console.error('Channel fetch error:', chErr.message);
    }

    const video = {
      videoId: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails?.maxres?.url || item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url,
      channelName: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      channelAvatar,
      subscriberCount,
      publishedAt: item.snippet.publishedAt,
      viewCount: item.statistics.viewCount,
      likeCount: item.statistics.likeCount,
      commentCount: item.statistics.commentCount,
      duration: item.contentDetails?.duration,
    };

    setCache(cacheKey, video);
    res.json(video);
  } catch (error) {
    if (error.response?.status === 403) return res.json({ error: 'Quota exceeded' });
    console.error('Error fetching video details:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch video details' });
  }
});

// 4. Fetch Related / Recommended Videos
app.get('/api/related/:videoId', async (req, res) => {
  const { videoId } = req.params;
  const cacheKey = `related:${videoId}`;
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  try {
    // Step 1: Get the current video's info (title + channelId)
    const vidRes = await axios.get(`${YOUTUBE_API_BASE_URL}/videos`, {
      params: { part: 'snippet', id: videoId, key: YOUTUBE_API_KEY },
    });

    if (!vidRes.data.items?.length) return res.json([]);

    const currentVideo = vidRes.data.items[0].snippet;
    const channelId = currentVideo.channelId;
    // Use first few words of title as search keywords
    const keywords = currentVideo.title.split(/[\s\-|:]+/).slice(0, 4).join(' ');

    // Step 2: Run two searches in parallel — topic-related + same channel
    const [topicRes, channelRes] = await Promise.all([
      axios.get(`${YOUTUBE_API_BASE_URL}/search`, {
        params: {
          part: 'snippet', q: keywords, type: 'video',
          maxResults: 12, key: YOUTUBE_API_KEY,
        },
      }),
      axios.get(`${YOUTUBE_API_BASE_URL}/search`, {
        params: {
          part: 'snippet', channelId, type: 'video',
          order: 'date', maxResults: 8, key: YOUTUBE_API_KEY,
        },
      }),
    ]);

    // Merge and deduplicate
    const allItems = [...channelRes.data.items, ...topicRes.data.items];
    const uniqueIds = [];
    const seen = new Set();
    seen.add(videoId); // exclude current
    for (const item of allItems) {
      const vid = item.id?.videoId;
      if (vid && !seen.has(vid)) {
        seen.add(vid);
        uniqueIds.push(vid);
      }
    }
    const finalIds = uniqueIds.slice(0, 15);
    if (finalIds.length === 0) return res.json([]);

    // Step 3: Enrich with stats + duration
    const detailsRes = await axios.get(`${YOUTUBE_API_BASE_URL}/videos`, {
      params: {
        part: 'snippet,statistics,contentDetails',
        id: finalIds.join(','),
        key: YOUTUBE_API_KEY,
      },
    });

    const videos = detailsRes.data.items.map((item) => ({
      videoId: item.id,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
      channelName: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      publishedAt: item.snippet.publishedAt,
      viewCount: item.statistics?.viewCount || 0,
      duration: item.contentDetails?.duration || 'PT0M0S',
    }));

    setCache(cacheKey, videos);
    res.json(videos);
  } catch (error) {
    console.error('Error fetching related videos:', error.response?.data || error.message);
    // Fallback: return trending
    try {
      const fallback = await axios.get(`${YOUTUBE_API_BASE_URL}/videos`, {
        params: {
          part: 'snippet,statistics,contentDetails', chart: 'mostPopular',
          regionCode: 'US', maxResults: 15, key: YOUTUBE_API_KEY,
        },
      });
      const videos = fallback.data.items.map((item) => ({
        videoId: item.id,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
        channelName: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        viewCount: item.statistics.viewCount,
        duration: item.contentDetails?.duration,
      }));
      res.json(videos.filter(v => v.videoId !== videoId));
    } catch { res.json([]); }
  }
});

// 5. Fetch Comments
app.get('/api/comments/:videoId', async (req, res) => {
  const { videoId } = req.params;
  try {
    const response = await axios.get(`${YOUTUBE_API_BASE_URL}/commentThreads`, {
      params: {
        part: 'snippet',
        videoId,
        maxResults: 20,
        order: 'relevance',
        textFormat: 'plainText',
        key: YOUTUBE_API_KEY,
      },
    });

    const comments = response.data.items.map((item) => {
      const c = item.snippet.topLevelComment.snippet;
      return {
        author: c.authorDisplayName,
        authorAvatar: c.authorProfileImageUrl,
        text: c.textDisplay,
        likeCount: c.likeCount,
        publishedAt: c.publishedAt,
      };
    });

    res.json(comments);
  } catch (error) {
    // 403 = comments disabled on this video — expected, not an error
    const status = error.response?.status;
    if (status !== 403) {
      console.error('Error fetching comments:', error.response?.data || error.message);
    }
    res.json([]);
  }
});

// 5. Fetch Channel Details
app.get('/api/channel/:channelId', async (req, res) => {
  const { channelId } = req.params;
  try {
    const response = await axios.get(`${YOUTUBE_API_BASE_URL}/channels`, {
      params: {
        part: 'snippet,statistics,brandingSettings',
        id: channelId,
        key: YOUTUBE_API_KEY,
      },
    });

    if (!response.data.items || response.data.items.length === 0) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const ch = response.data.items[0];
    const channel = {
      channelId: ch.id,
      title: ch.snippet.title,
      description: ch.snippet.description,
      avatar: ch.snippet.thumbnails?.medium?.url || ch.snippet.thumbnails?.default?.url,
      banner: ch.brandingSettings?.image?.bannerExternalUrl || '',
      subscriberCount: ch.statistics.subscriberCount,
      videoCount: ch.statistics.videoCount,
      viewCount: ch.statistics.viewCount,
      customUrl: ch.snippet.customUrl || '',
      country: ch.snippet.country || '',
    };
    res.json(channel);
  } catch (error) {
    console.error('Error fetching channel:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch channel' });
  }
});

// 6. Fetch Channel Videos
app.get('/api/channel/:channelId/videos', async (req, res) => {
  const { channelId } = req.params;
  try {
    // First, search for videos by this channel
    const searchRes = await axios.get(`${YOUTUBE_API_BASE_URL}/search`, {
      params: {
        part: 'snippet',
        channelId,
        type: 'video',
        order: 'date',
        maxResults: 20,
        key: YOUTUBE_API_KEY,
      },
    });

    const videoIds = searchRes.data.items.map(i => i.id.videoId).filter(Boolean);
    if (videoIds.length === 0) return res.json([]);

    // Enrich with stats + duration
    const detailsRes = await axios.get(`${YOUTUBE_API_BASE_URL}/videos`, {
      params: {
        part: 'snippet,statistics,contentDetails',
        id: videoIds.join(','),
        key: YOUTUBE_API_KEY,
      },
    });

    const videos = detailsRes.data.items.map((item) => ({
      videoId: item.id,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
      channelName: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      publishedAt: item.snippet.publishedAt,
      viewCount: item.statistics?.viewCount || 0,
      duration: item.contentDetails?.duration || 'PT0M0S',
    }));

    res.json(videos);
  } catch (error) {
    console.error('Error fetching channel videos:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch channel videos' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
