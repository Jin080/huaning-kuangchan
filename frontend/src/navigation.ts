export const NAVIGATION_EVENT = 'kuangchan:navigation';

export function getCurrentLocation() {
  return `${window.location.pathname}${window.location.search}`;
}

export function navigateTo(path: string) {
  if (getCurrentLocation() !== path) {
    window.history.pushState({}, '', path);
  }

  window.dispatchEvent(new Event(NAVIGATION_EVENT));
}
