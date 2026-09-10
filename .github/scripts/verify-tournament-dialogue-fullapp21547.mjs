async function importBaseWithReloadRetry() {
  const attempts = 2;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await import(`./verify-tournament-dialogue-fullapp21547-base.mjs?reloadRetry=${attempt}`);
      return;
    } catch (error) {
      const message = String(error?.stack || error?.message || error || '');
      const transientReloadRace = message.includes('Execution context was destroyed');
      if (!transientReloadRace || attempt === attempts) throw error;
      console.warn(`[21547 fullapp] transient reload race after COI/service-worker navigation; retrying base (${attempt}/${attempts})`);
    }
  }
}

await importBaseWithReloadRetry();
await import('./verify-tournament-orientation-longround21551.mjs');
await import('./verify-tournament-upset-fullapp21552.mjs');
await import('./verify-tournament-four-round-opponents21553.mjs');
await import('./verify-tournament-four-round-reload21554.mjs');
await import('./verify-tournament-same-cup-restart21555.mjs');
