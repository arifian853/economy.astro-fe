/** Page-local history reads: reuse ordinary requests and only display the current event/request. */
export function createBudgetHistoryLoader<T>(options: {
  fetchHistory: (eventId: string) => Promise<T | null>;
  renderHistory: (history: T) => void;
  clearHistory: () => void;
}) {
  const requests = new Map<string, Promise<T | null>>();
  let activeEventId: string | null = null;
  let activeRequest: Promise<void> | undefined;

  return {
    selectEvent(eventId: string) {
      if (activeEventId === eventId) return;
      activeEventId = eventId;
      activeRequest = undefined;
      options.clearHistory();
    },
    load(eventId: string, { force = false } = {}): Promise<void> {
      // A mutation may finish after navigation. Invalidate its cache without changing the display.
      if (force) requests.delete(eventId);
      if (eventId !== activeEventId) return Promise.resolve();
      if (!force && activeRequest) return activeRequest;

      let history = requests.get(eventId);
      if (!history) {
        history = (async () => options.fetchHistory(eventId))().catch(() => null);
        requests.set(eventId, history);
      }
      const request = history.then(data => {
        if (activeEventId === eventId && activeRequest === request && data !== null) {
          options.renderHistory(data);
        }
      }).catch(() => {
        // History is optional. Keep the last good display if a refresh fails.
      });
      activeRequest = request;
      return request;
    },
  };
}
