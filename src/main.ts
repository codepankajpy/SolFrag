import { LandingPage } from './ui/LandingPage';

const PLAY_ROUTE = '/play';

let landingPage: LandingPage | null = null;
let playBooted = false;

function isPlayRoute(pathname: string): boolean {
  return pathname === PLAY_ROUTE || pathname.startsWith(PLAY_ROUTE + '/');
}

function showLanding(): void {
  if (!landingPage) {
    landingPage = new LandingPage();
    landingPage.onPlay(() => {
      history.pushState({}, '', PLAY_ROUTE);
      renderRoute();
    });
  }
  landingPage.show();
}

async function bootPlay(): Promise<void> {
  if (playBooted) return;
  playBooted = true;
  landingPage?.hide();
  const mod = await import('./play');
  await mod.bootPlay();
}

function renderRoute(): void {
  const path = window.location.pathname;
  if (isPlayRoute(path)) {
    void bootPlay();
    return;
  }

  // If the game is already running, do a full reload when navigating away.
  if (playBooted) {
    window.location.href = '/';
    return;
  }

  showLanding();
}

window.addEventListener('popstate', renderRoute);
renderRoute();