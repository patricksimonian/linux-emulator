import { EmulatorContext, EmulatorSnapshot } from '../types';

export function createSnapshot(context: EmulatorContext): EmulatorSnapshot {
    const { _sessionTimeline, startTime, sessionId, lastActivityTime, ...snapshot } = context;

    return {
        ...snapshot,
        timestamp: new Date().toISOString()
    };
}
