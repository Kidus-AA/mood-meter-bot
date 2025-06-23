export const buffers = new Map();
export const MSG_HISTORY_WINDOW = 30 * 60 * 1000; // 30 minutes
export const MSG_BUCKETS = new Map(); // channel -> Map<bucketTs, string[]>

export const alertState = new Map(); // channel -> { belowSince, active }
