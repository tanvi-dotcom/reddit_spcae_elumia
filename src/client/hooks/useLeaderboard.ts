import { useCallback, useEffect, useState } from 'react';

export type LeaderboardEntry = {
    name: string;
    score: number;
    date: string;
};

type LeaderboardState = {
    leaderboard: LeaderboardEntry[];
    loading: boolean;
    username: string;
};

export const useLeaderboard = () => {
    const [state, setState] = useState<LeaderboardState>({
        leaderboard: [],
        loading: true,
        username: 'PILOT',
    });

    useEffect(() => {
        const init = async () => {
            try {
                const res = await fetch('/api/init');
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                const username =
                    typeof data.username === 'string' && data.username !== 'anonymous'
                        ? data.username.toUpperCase().slice(0, 10)
                        : 'PILOT';

                const lbRes = await fetch('/api/leaderboard');
                let leaderboard: LeaderboardEntry[] = [];
                if (lbRes.ok) {
                    const lbData = await lbRes.json();
                    if (Array.isArray(lbData.leaderboard)) {
                        leaderboard = lbData.leaderboard;
                    }
                }

                setState({ leaderboard, loading: false, username });
            } catch (err) {
                console.error('Failed to init leaderboard', err);
                // Fallback to localStorage
                try {
                    const stored = localStorage.getItem('space_Elumia_lb');
                    const leaderboard = stored ? JSON.parse(stored) : [];
                    setState({ leaderboard, loading: false, username: 'PILOT' });
                } catch {
                    setState((prev) => ({ ...prev, loading: false }));
                }
            }
        };
        void init();
    }, []);

    const submitScore = useCallback(
        async (name: string, score: number) => {
            const newEntry: LeaderboardEntry = {
                name,
                score,
                date: new Date().toLocaleDateString(),
            };

            try {
                const res = await fetch('/api/score', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, score }),
                });
                if (res.ok) {
                    // Refetch leaderboard
                    const lbRes = await fetch('/api/leaderboard');
                    if (lbRes.ok) {
                        const lbData = await lbRes.json();
                        if (Array.isArray(lbData.leaderboard)) {
                            setState((prev) => ({
                                ...prev,
                                leaderboard: lbData.leaderboard,
                            }));
                            return;
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to submit score to server', err);
            }

            // Fallback to localStorage
            const newLb = [...state.leaderboard, newEntry]
                .sort((a, b) => b.score - a.score)
                .slice(0, 10);
            setState((prev) => ({ ...prev, leaderboard: newLb }));
            try {
                localStorage.setItem('space_Elumia_lb', JSON.stringify(newLb));
            } catch {
                // Ignore localStorage errors in iframe
            }
        },
        [state.leaderboard]
    );

    const fetchLeaderboard = useCallback(async () => {
        try {
            const res = await fetch('/api/leaderboard');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data.leaderboard)) {
                    setState((prev) => ({ ...prev, leaderboard: data.leaderboard }));
                }
            }
        } catch {
            // silent
        }
    }, []);

    return {
        ...state,
        submitScore,
        fetchLeaderboard,
    } as const;
};
