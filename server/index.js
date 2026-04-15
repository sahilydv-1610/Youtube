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
const CACHE_TTL = 60 * 60 * 1000; // Increased to 1 hour
const channelAvatarCache = {}; // Longer-lived cache for avatars

// ── Emergency Fallback Data (For 403 Quota Errors) ──
const EMERGENCY_VIDEOS = [
  { videoId: 'j_G7S99eH3M', title: 'Viral Hindi Comedy Episode', thumbnail: 'https://i.ytimg.com/vi/j_G7S99eH3M/mqdefault.jpg', channelName: 'Viral Channel', channelAvatar: '', viewCount: '1500000', publishedAt: new Date().toISOString() },
  { videoId: '6n5W_G4c-iM', title: 'Best Education Facts Hindi', thumbnail: 'https://i.ytimg.com/vi/6n5W_G4c-iM/mqdefault.jpg', channelName: 'EduFact', channelAvatar: '', viewCount: '800000', publishedAt: new Date().toISOString() },
  { videoId: 'Lw7L6E2Xp8U', title: 'New Movie Trailer 2024', thumbnail: 'https://i.ytimg.com/vi/Lw7L6E2Xp8U/mqdefault.jpg', channelName: 'CinemaX', channelAvatar: '', viewCount: '3200000', publishedAt: new Date().toISOString() },
  { videoId: 'KzYF7c-J6f8', title: 'Top Podcast Hindi', thumbnail: 'https://i.ytimg.com/vi/KzYF7c-J6f8/mqdefault.jpg', channelName: 'TalkIndia', channelAvatar: '', viewCount: '450000', publishedAt: new Date().toISOString() }
];

const EMERGENCY_SHORTS = [
  { videoId: 'e8X_G3bH7kI', title: 'Amazing Life Hack #shorts', thumbnail: 'https://i.ytimg.com/vi/e8X_G3bH7kI/mqdefault.jpg', channelName: 'HackIt', channelAvatar: '', viewCount: '5000000' },
  { videoId: 'p69_L2Xm8n0', title: 'Funny Moments India', thumbnail: 'https://i.ytimg.com/vi/p69_L2Xm8n0/mqdefault.jpg', channelName: 'JoyStation', channelAvatar: '', viewCount: '1200000' },
  { videoId: 'v7W_K9jH2b4', title: 'Street Food India Viral', thumbnail: 'https://i.ytimg.com/vi/v7W_K9jH2b4/mqdefault.jpg', channelName: 'Foodie', channelAvatar: '', viewCount: '2500000' }
];

function getCache(key) {
  const entry = cache[key];
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  delete cache[key];
  return null;
}

function setCache(key, data) {
  cache[key] = { data, ts: Date.now() };
}

// Helper: Fetch channel avatars in batch
async function getChannelAvatars(channelIds) {
  const uniqueIds = [...new Set(channelIds)].filter(id => id);
  const result = {};
  const idsToFetch = [];

  uniqueIds.forEach(id => {
    if (channelAvatarCache[id]) {
      result[id] = channelAvatarCache[id];
    } else {
      idsToFetch.push(id);
    }
  });

  if (idsToFetch.length > 0) {
    for (let i = 0; i < idsToFetch.length; i += 50) {
      const batch = idsToFetch.slice(i, i + 50);
      try {
        const response = await axios.get(`${YOUTUBE_API_BASE_URL}/channels`, {
          params: {
            part: 'snippet',
            id: batch.join(','),
            key: YOUTUBE_API_KEY,
          },
        });
        response.data.items?.forEach(item => {
          const url = item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '';
          channelAvatarCache[item.id] = url;
          result[item.id] = url;
        });
      } catch (err) {
        console.error('Error fetching channel avatars:', err.message);
        if (err.response?.status === 403) break; // Quota out, stop trying
      }
    }
  }
  return result;
}

// Helper: Shuffle array
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// 1. Fetch Trending Videos (Generic)
app.get('/api/trending', async (req, res) => {
  const cacheKey = 'trending:popular';
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  try {
    const response = await axios.get(`${YOUTUBE_API_BASE_URL}/videos`, {
      params: {
        part: 'snippet,statistics,contentDetails',
        chart: 'mostPopular',
        regionCode: 'IN',
        maxResults: 40,
        key: YOUTUBE_API_KEY,
      },
    });

    const items = response.data.items;
    const channelIds = items.map(i => i.snippet.channelId);
    const avatars = await getChannelAvatars(channelIds);

    const videos = items.map((item) => ({
      videoId: item.id,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.standard?.url,
      channelName: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      channelAvatar: avatars[item.snippet.channelId] || '',
      publishedAt: item.snippet.publishedAt,
      viewCount: item.statistics.viewCount,
      duration: item.contentDetails?.duration,
    }));

    setCache(cacheKey, videos);
    res.json(videos);
  } catch (error) {
    if (error.response?.status === 403) return res.json(EMERGENCY_VIDEOS);
    res.status(500).json([]);
  }
});

// 1.1 New Featured Mixed Home Feed
app.get('/api/home/recommended', async (req, res) => {
  const cacheKey = 'home:recommended:raw_data:v4';
  let cachedData = getCache(cacheKey);

  if (!cachedData) {
    try {
      const fetchSearch = async (query, max = 15) => {
        try {
          const res = await axios.get(`${YOUTUBE_API_BASE_URL}/search`, { 
            params: { part: 'snippet', q: query, type: 'video', maxResults: max, key: YOUTUBE_API_KEY, regionCode: 'IN' } 
          });
          const ids = res.data.items.map(i => i.id.videoId).filter(Boolean);
          if (ids.length === 0) return { data: { items: [] } };
          return await axios.get(`${YOUTUBE_API_BASE_URL}/videos`, { 
            params: { part: 'snippet,statistics,contentDetails', id: ids.join(','), key: YOUTUBE_API_KEY } 
          });
        } catch (e) {
          if (e.response?.status === 403) throw new Error("QUOTA_OUT");
          console.warn(`Search fetch failed for ${query}:`, e.message);
          return { data: { items: [] } };
        }
      };

      const [eduRes, movieRes, trendingRes, shortsSearchRes] = await Promise.all([
        fetchSearch('best education hindi', 10),
        fetchSearch('hindi movie trailers 2024', 10),
        axios.get(`${YOUTUBE_API_BASE_URL}/videos`, { 
          params: { part: 'snippet,statistics,contentDetails', chart: 'mostPopular', regionCode: 'IN', maxResults: 20, key: YOUTUBE_API_KEY } 
        }).catch(() => ({ data: { items: [] } })),
        axios.get(`${YOUTUBE_API_BASE_URL}/search`, { 
          params: { part: 'snippet', q: '#shorts trending hindi', type: 'video', videoDuration: 'short', maxResults: 10, key: YOUTUBE_API_KEY, regionCode: 'IN' } 
        }).catch(() => ({ data: { items: [] } }))
      ]);

      cachedData = {
        videos: [
          ...(eduRes.data?.items || []),
          ...(movieRes.data?.items || []),
          ...(trendingRes.data?.items || [])
        ],
        shorts: shortsSearchRes.data?.items || []
      };

      if (cachedData.videos.length > 0) {
        setCache(cacheKey, cachedData);
      }
    } catch (error) {
      if (error.message === "QUOTA_OUT" || error.response?.status === 403) {
        return res.json([
          ...EMERGENCY_VIDEOS,
          { type: 'shorts_shelf', items: EMERGENCY_SHORTS },
          ...EMERGENCY_VIDEOS.map(v => ({ ...v, videoId: v.videoId + '_2' }))
        ]);
      }
      console.error('Recommended feed fetch fatal error:', error.message);
      return res.status(500).json([]);
    }
  }

  try {
    const allVideoRaw = cachedData.videos;
    const allShortsRaw = cachedData.shorts;

    const channelIds = [...allVideoRaw, ...allShortsRaw].map(i => i.snippet.channelId);
    const avatars = await getChannelAvatars(channelIds);

    const mappedVideos = allVideoRaw.map(item => ({
      type: 'video',
      videoId: typeof item.id === 'string' ? item.id : item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url,
      channelName: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      channelAvatar: avatars[item.snippet.channelId] || '',
      publishedAt: item.snippet.publishedAt,
      viewCount: item.statistics?.viewCount || 0,
      duration: item.contentDetails?.duration || "PT0M0S",
    }));

    const mappedShorts = allShortsRaw.map(item => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url,
      channelName: item.snippet.channelTitle,
      channelAvatar: avatars[item.snippet.channelId] || '',
      viewCount: 0,
    }));

    const shuffledVideos = shuffleArray([...mappedVideos]);
    const finalItems = [];
    
    finalItems.push(...shuffledVideos.slice(0, 8));
    
    if (mappedShorts.length > 0) {
      finalItems.push({ type: 'shorts_shelf', items: shuffleArray([...mappedShorts]) });
    }
    
    finalItems.push(...shuffledVideos.slice(8));

    res.json(finalItems);
  } catch (err) {
    res.status(500).json([]);
  }
});

// 1.2 Randomized Shorts Endpoint
app.get('/api/shorts/random', async (req, res) => {
  const shortsKeywords = ['hindi comedy shorts', 'indian viral shorts', 'satisfying shorts india', 'trending shorts india'];
  let q = shortsKeywords[Math.floor(Math.random() * shortsKeywords.length)];

  const fetchShortsWithQuery = async (query) => {
    try {
      const searchRes = await axios.get(`${YOUTUBE_API_BASE_URL}/search`, {
        params: { 
          part: 'snippet', 
          q: query, 
          type: 'video', 
          videoDuration: 'short', 
          maxResults: 15, 
          relevanceLanguage: 'hi',
          regionCode: 'IN',
          key: YOUTUBE_API_KEY 
        }
      });
      return searchRes.data.items || [];
    } catch (e) {
      if (e.response?.status === 403) throw new Error("QUOTA_OUT");
      return [];
    }
  };

  try {
    let items = await fetchShortsWithQuery(q);
    if (!items.length) items = await fetchShortsWithQuery("#shorts trending india");

    const videoIds = items.map(i => i.id.videoId).filter(Boolean);
    if (!videoIds.length) return res.json(EMERGENCY_SHORTS);

    const detailsRes = await axios.get(`${YOUTUBE_API_BASE_URL}/videos`, {
      params: { part: 'snippet,statistics,contentDetails', id: videoIds.join(','), key: YOUTUBE_API_KEY }
    });

    const detailedItems = detailsRes.data.items;
    const avatars = await getChannelAvatars(detailedItems.map(i => i.snippet.channelId));

    const shorts = detailedItems.map(item => ({
      videoId: item.id,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url,
      channelName: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      channelAvatar: avatars[item.snippet.channelId] || '',
      publishedAt: item.snippet.publishedAt,
      viewCount: item.statistics?.viewCount || 0,
    }));

    res.json(shuffleArray(shorts));
  } catch (error) {
    res.json(EMERGENCY_SHORTS);
  }
});

// 2. Mixed Search Results (Videos + Channels + Shorts)
app.get('/api/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query parameter "q" is required' });

  const cacheKey = `search:mixed:${q.toLowerCase().trim()}`;
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  try {
    // Parallel fetch: Videos, Related Channels, and Shorts
    const [videoRes, channelRes, shortRes] = await Promise.all([
      axios.get(`${YOUTUBE_API_BASE_URL}/search`, {
        params: { part: 'snippet', q, type: 'video', maxResults: 15, key: YOUTUBE_API_KEY }
      }),
      axios.get(`${YOUTUBE_API_BASE_URL}/search`, {
        params: { part: 'snippet', q, type: 'channel', maxResults: 3, key: YOUTUBE_API_KEY }
      }),
      axios.get(`${YOUTUBE_API_BASE_URL}/search`, {
        params: { part: 'snippet', q: q + ' shorts', type: 'video', maxResults: 8, key: YOUTUBE_API_KEY }
      })
    ]);

    const videoIds = videoRes.data.items.map(i => i.id.videoId).filter(Boolean);
    const shortIds = shortRes.data.items.map(i => i.id.videoId).filter(Boolean);
    
    // Enrich videos and shorts with stats
    const [videoDetails, shortDetails] = await Promise.all([
      videoIds.length > 0 ? axios.get(`${YOUTUBE_API_BASE_URL}/videos`, { params: { part: 'snippet,statistics,contentDetails', id: videoIds.join(','), key: YOUTUBE_API_KEY } }) : { data: { items: [] } },
      shortIds.length > 0 ? axios.get(`${YOUTUBE_API_BASE_URL}/videos`, { params: { part: 'snippet,statistics,contentDetails', id: shortIds.join(','), key: YOUTUBE_API_KEY } }) : { data: { items: [] } }
    ]);

    // Collect all channel IDs for avatar fetching
    const allChannelIds = [
      ...videoDetails.data.items.map(i => i.snippet.channelId),
      ...channelRes.data.items.map(i => i.snippet.channelId || i.id.channelId),
      ...shortDetails.data.items.map(i => i.snippet.channelId)
    ];
    const avatars = await getChannelAvatars(allChannelIds);

    // Map into objects
    const finalVideos = videoDetails.data.items.map(item => ({
      type: 'video',
      videoId: item.id,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url,
      channelName: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      channelAvatar: avatars[item.snippet.channelId] || '',
      publishedAt: item.snippet.publishedAt,
      viewCount: item.statistics?.viewCount || 0,
      duration: item.contentDetails?.duration || "PT0M0S",
    }));

    const finalChannels = channelRes.data.items.map(item => {
      const cId = item.id.channelId;
      return {
        type: 'channel',
        channelId: cId,
        title: item.snippet.title,
        thumbnail: avatars[cId] || item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url,
        description: item.snippet.description,
      };
    });

    const finalShorts = shortDetails.data.items.map(item => ({
      type: 'short',
      videoId: item.id,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url,
      viewCount: item.statistics?.viewCount || 0,
    }));

    // Interleave algorithm:
    // 1. Channels at the top (or after 1 video)
    // 2. First 5 videos
    // 3. Shorts shelf
    // 4. Remaining videos
    const mixedResults = [];
    if (finalVideos.length > 0) mixedResults.push(finalVideos[0]);
    finalChannels.forEach(c => mixedResults.push(c));
    if (finalVideos.length > 1) {
      mixedResults.push(...finalVideos.slice(1, 5));
    }
    if (finalShorts.length > 0) {
      mixedResults.push({ type: 'shorts_shelf', items: finalShorts });
    }
    if (finalVideos.length > 5) {
      mixedResults.push(...finalVideos.slice(5));
    }

    setCache(cacheKey, mixedResults);
    res.json(mixedResults);
  } catch (error) {
    if (error.response?.status === 403) return res.json([]);
    console.error('Error fetching search results:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed' });
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
      params: { part: 'snippet,statistics,contentDetails', id, key: YOUTUBE_API_KEY },
    });

    if (!response.data.items || response.data.items.length === 0) return res.status(404).json({ error: 'Not found' });

    const item = response.data.items[0];
    const channelRes = await axios.get(`${YOUTUBE_API_BASE_URL}/channels`, {
      params: { part: 'snippet,statistics', id: item.snippet.channelId, key: YOUTUBE_API_KEY },
    });

    let channelAvatar = '';
    let subscriberCount = '0';
    if (channelRes.data.items?.length > 0) {
      channelAvatar = channelRes.data.items[0].snippet.thumbnails?.medium?.url || '';
      subscriberCount = channelRes.data.items[0].statistics?.subscriberCount || '0';
      channelAvatarCache[item.snippet.channelId] = channelAvatar;
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
    res.status(500).json({ error: 'Failed' });
  }
});

// 4. Fetch Related / Recommended Videos
app.get('/api/related/:videoId', async (req, res) => {
  const { videoId } = req.params;
  const cacheKey = `related:${videoId}`;
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  try {
    const vidRes = await axios.get(`${YOUTUBE_API_BASE_URL}/videos`, {
      params: { part: 'snippet', id: videoId, key: YOUTUBE_API_KEY },
    });

    if (!vidRes.data.items?.length) return res.json([]);
    const currentVideo = vidRes.data.items[0].snippet;
    const keywords = currentVideo.title.split(/[\s\-|:]+/).slice(0, 4).join(' ');

    const [topicRes, channelRes] = await Promise.all([
      axios.get(`${YOUTUBE_API_BASE_URL}/search`, { params: { part: 'snippet', q: keywords, type: 'video', maxResults: 12, key: YOUTUBE_API_KEY } }),
      axios.get(`${YOUTUBE_API_BASE_URL}/search`, { params: { part: 'snippet', channelId: currentVideo.channelId, type: 'video', order: 'date', maxResults: 8, key: YOUTUBE_API_KEY } }),
    ]);

    const allItems = [...channelRes.data.items, ...topicRes.data.items];
    const uniqueIds = [];
    const seen = new Set([videoId]);
    for (const item of allItems) {
      const vid = item.id?.videoId;
      if (vid && !seen.has(vid)) {
        seen.add(vid);
        uniqueIds.push(vid);
      }
    }
    const finalIds = uniqueIds.slice(0, 15);
    if (!finalIds.length) return res.json([]);

    const detailsRes = await axios.get(`${YOUTUBE_API_BASE_URL}/videos`, {
      params: { part: 'snippet,statistics,contentDetails', id: finalIds.join(','), key: YOUTUBE_API_KEY },
    });

    const items = detailsRes.data.items;
    const avatars = await getChannelAvatars(items.map(i => i.snippet.channelId));

    const videos = items.map((item) => ({
      videoId: item.id,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.high?.url,
      channelName: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      channelAvatar: avatars[item.snippet.channelId] || '',
      publishedAt: item.snippet.publishedAt,
      viewCount: item.statistics?.viewCount || 0,
      duration: item.contentDetails?.duration || 'PT0M0S',
    }));

    setCache(cacheKey, videos);
    res.json(videos);
  } catch { res.json([]); }
});

// 5. Fetch Comments
app.get('/api/comments/:videoId', async (req, res) => {
  const { videoId } = req.params;
  try {
    const response = await axios.get(`${YOUTUBE_API_BASE_URL}/commentThreads`, {
      params: { part: 'snippet', videoId, maxResults: 20, order: 'relevance', textFormat: 'plainText', key: YOUTUBE_API_KEY },
    });
    const comments = response.data.items.map((item) => {
      const c = item.snippet.topLevelComment.snippet;
      return { author: c.authorDisplayName, authorAvatar: c.authorProfileImageUrl, text: c.textDisplay, likeCount: c.likeCount, publishedAt: c.publishedAt };
    });
    res.json(comments);
  } catch { res.json([]); }
});

// 6. Fetch Channel Details
app.get('/api/channel/:channelId', async (req, res) => {
  const { channelId } = req.params;
  try {
    const response = await axios.get(`${YOUTUBE_API_BASE_URL}/channels`, {
      params: { part: 'snippet,statistics,brandingSettings', id: channelId, key: YOUTUBE_API_KEY },
    });
    if (!response.data.items?.length) return res.status(404).json({ error: 'Not found' });
    const ch = response.data.items[0];
    res.json({
      channelId: ch.id,
      title: ch.snippet.title,
      description: ch.snippet.description,
      avatar: ch.snippet.thumbnails?.medium?.url,
      banner: ch.brandingSettings?.image?.bannerExternalUrl || '',
      subscriberCount: ch.statistics.subscriberCount,
      videoCount: ch.statistics.videoCount,
      viewCount: ch.statistics.viewCount,
      customUrl: ch.snippet.customUrl || '',
    });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// 7. Fetch Channel Videos
app.get('/api/channel/:channelId/videos', async (req, res) => {
  const { channelId } = req.params;
  try {
    const searchRes = await axios.get(`${YOUTUBE_API_BASE_URL}/search`, {
      params: { part: 'snippet', channelId, type: 'video', order: 'date', maxResults: 20, key: YOUTUBE_API_KEY },
    });
    const videoIds = searchRes.data.items.map(i => i.id.videoId).filter(Boolean);
    if (!videoIds.length) return res.json([]);
    const detailsRes = await axios.get(`${YOUTUBE_API_BASE_URL}/videos`, {
      params: { part: 'snippet,statistics,contentDetails', id: videoIds.join(','), key: YOUTUBE_API_KEY },
    });
    const avatars = await getChannelAvatars([channelId]);
    const videos = detailsRes.data.items.map((item) => ({
      videoId: item.id,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url,
      channelName: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      channelAvatar: avatars[channelId] || '',
      publishedAt: item.snippet.publishedAt,
      viewCount: item.statistics?.viewCount || 0,
      duration: item.contentDetails?.duration || 'PT0M0S',
    }));
    res.json(videos);
  } catch { res.status(500).json({ error: 'Failed' }); }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
