import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import type {
  InitResponse,
  IncrementResponse,
  DecrementResponse,
  LeaderboardResponse,
  SubmitScoreRequest,
  SubmitScoreResponse,
} from '../../shared/api';

type ErrorResponse = {
  status: 'error';
  message: string;
};

export const api = new Hono();

api.get('/init', async (c) => {
  const { postId } = context;

  if (!postId) {
    console.error('API Init Error: postId not found in devvit context');
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'postId is required but missing from context',
      },
      400
    );
  }

  try {
    const [count, username] = await Promise.all([
      redis.get('count'),
      reddit.getCurrentUsername(),
    ]);

    return c.json<InitResponse>({
      type: 'init',
      postId: postId,
      count: count ? parseInt(count) : 0,
      username: username ?? 'anonymous',
    });
  } catch (error) {
    console.error(`API Init Error for post ${postId}:`, error);
    let errorMessage = 'Unknown error during initialization';
    if (error instanceof Error) {
      errorMessage = `Initialization failed: ${error.message}`;
    }
    return c.json<ErrorResponse>(
      { status: 'error', message: errorMessage },
      400
    );
  }
});

api.post('/increment', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'postId is required' },
      400
    );
  }
  const count = await redis.incrBy('count', 1);
  return c.json<IncrementResponse>({ count, postId, type: 'increment' });
});

api.post('/decrement', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'postId is required' },
      400
    );
  }
  const count = await redis.incrBy('count', -1);
  return c.json<DecrementResponse>({ count, postId, type: 'decrement' });
});

// --- Leaderboard Endpoints ---
const LEADERBOARD_KEY = 'space_elumia_leaderboard';
const LEADERBOARD_NAMES_KEY = 'space_elumia_lb_names';

api.get('/leaderboard', async (c) => {
  try {
    // Get top 10 scores (sorted set, highest first)
    const entries = await redis.zRange(LEADERBOARD_KEY, 0, 9, {
      reverse: true,
      by: 'rank',
    });

    const leaderboard = await Promise.all(
      entries.map(async (entry) => {
        const nameData = await redis.hGet(LEADERBOARD_NAMES_KEY, entry.member);
        let parsed: { name: string; date: string } = {
          name: entry.member,
          date: '',
        };
        try {
          if (nameData) parsed = JSON.parse(nameData);
        } catch {
          // ignore
        }
        return {
          name: parsed.name || entry.member,
          score: entry.score,
          date: parsed.date || '',
        };
      })
    );

    return c.json<LeaderboardResponse>({
      type: 'leaderboard',
      leaderboard,
    });
  } catch (error) {
    console.error('Leaderboard fetch error:', error);
    return c.json<LeaderboardResponse>({
      type: 'leaderboard',
      leaderboard: [],
    });
  }
});

api.post('/score', async (c) => {
  try {
    const { name, score } = await c.req.json<SubmitScoreRequest>();
    if (!name || typeof score !== 'number') {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'name and score are required' },
        400
      );
    }

    let username = 'anonymous';
    try {
      username = (await reddit.getCurrentUsername()) ?? 'anonymous';
    } catch {
      // ignore
    }

    // Use username as the member key to ensure one entry per user
    const memberKey = username !== 'anonymous' ? username : `${name}_${Date.now()}`;

    // Only update if higher score (zAdd with GT flag)
    await redis.zAdd(LEADERBOARD_KEY, {
      member: memberKey,
      score: score,
    });

    // Store display name and date
    await redis.hSet(LEADERBOARD_NAMES_KEY, {
      [memberKey]: JSON.stringify({
        name: name.slice(0, 10),
        date: new Date().toLocaleDateString(),
      }),
    });

    // Get rank (1-indexed)
    const rank = await redis.zRank(LEADERBOARD_KEY, memberKey);

    return c.json<SubmitScoreResponse>({
      type: 'score_submitted',
      rank: rank !== undefined ? rank + 1 : -1,
    });
  } catch (error) {
    console.error('Score submission error:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Failed to submit score' },
      400
    );
  }
});
