export const moods = [
  { id: 'teal', name: 'Teal', canvas: '#F3F8F7', dark: false },
  { id: 'forest', name: 'Forest', canvas: '#F4F7F1', dark: false },
  { id: 'beige', name: 'Beige', canvas: '#FAF8F5', dark: false },
  { id: 'slate', name: 'Slate', canvas: '#F6F7F8', dark: false },
  { id: 'lavender', name: 'Lavender', canvas: '#F7F5FA', dark: false },
  { id: 'rosewood', name: 'Rosewood', canvas: '#FAF5F5', dark: false },
  { id: 'graphite', name: 'Graphite', canvas: '#111315', dark: true },
  { id: 'sky-night', name: 'Sky Night', canvas: '#0B1220', dark: true },
] as const;
export type Mood = typeof moods[number]['id'];
export function resolveMood(value: string | null): Mood {
  return moods.find(mood => mood.id === value)?.id ?? 'teal';
}
// Self-contained for a synchronous inline <head> script, before any page content.
export const moodBootstrap = `(() => {
  const moods = ${JSON.stringify(moods)};
  let saved = null;
  try { saved = localStorage.getItem('economy-mood'); } catch {}
  const mood = moods.find(m => m.id === saved) || moods[0];
  document.documentElement.dataset.mood = mood.id;
  document.documentElement.style.colorScheme = mood.dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', mood.canvas);
})();`;
export function applyMood(value: string) {
  const mood = moods.find(m => m.id === resolveMood(value))!;
  document.documentElement.dataset.mood = mood.id;
  document.documentElement.style.colorScheme = mood.dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', mood.canvas);
  try { localStorage.setItem('economy-mood', mood.id); } catch { /* Session appearance still works. */ }
  document.querySelectorAll<HTMLSelectElement>('[data-mood-select]').forEach(select => select.value = mood.id);
}
