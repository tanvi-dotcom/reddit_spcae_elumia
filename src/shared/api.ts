export type InitResponse = {
  type: 'init';
  postId: string;
  count: number;
  username: string;
};

export type IncrementResponse = {
  type: 'increment';
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: 'decrement';
  postId: string;
  count: number;
};

export type LeaderboardEntry = {
  name: string;
  score: number;
  date: string;
};

export type LeaderboardResponse = {
  type: 'leaderboard';
  leaderboard: LeaderboardEntry[];
};

export type SubmitScoreRequest = {
  name: string;
  score: number;
};

export type SubmitScoreResponse = {
  type: 'score_submitted';
  rank: number;
};
