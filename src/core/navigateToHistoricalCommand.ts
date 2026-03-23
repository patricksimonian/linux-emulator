import { EmulatorContext, HistoryEntry } from '../types';

export function getHistoricalCommandFromIndex(index: number, history: HistoryEntry[]): string | null {
    if (history[index]) {
        return history[index].command + ' ' + history[index].args.join(' ');
    }
    return null;
}

export function resetHistoricalIndex(session: EmulatorContext, accountName: string) {
    const histLength = session.history[accountName].length;
    session.h_index[accountName] = histLength - 1;
}
