export const moods = [
  { id: 'teal', name: 'Teal', canvas: '#F3F8F7', swatch: '#3F6B67', dark: false },
  { id: 'forest', name: 'Forest', canvas: '#F4F7F1', swatch: '#49644B', dark: false },
  { id: 'beige', name: 'Beige', canvas: '#FAF8F5', swatch: '#6B5040', dark: false },
  { id: 'slate', name: 'Slate', canvas: '#F6F7F8', swatch: '#4D5D6C', dark: false },
  { id: 'lavender', name: 'Lavender', canvas: '#F7F5FA', swatch: '#665A7A', dark: false },
  { id: 'rosewood', name: 'Rosewood', canvas: '#FAF5F5', swatch: '#7A4F55', dark: false },
  { id: 'graphite', name: 'Graphite', canvas: '#111315', swatch: '#B8C0C8', dark: true },
  { id: 'sky-night', name: 'Sky Night', canvas: '#0B1220', swatch: '#8FB7FF', dark: true },
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
export function applyMood(value: string, persist = true) {
  const mood = moods.find(m => m.id === resolveMood(value))!;
  document.documentElement.dataset.mood = mood.id;
  document.documentElement.style.colorScheme = mood.dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', mood.canvas);
  if (persist) {
    try { localStorage.setItem('economy-mood', mood.id); } catch { /* Session appearance still works. */ }
  }
  document.querySelectorAll<HTMLInputElement>('[data-mood-radio]').forEach(radio => { radio.checked = radio.value === mood.id; });
  document.dispatchEvent(new CustomEvent('economy:moodchange', { detail: { mood: mood.id } }));
}
