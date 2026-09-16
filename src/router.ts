export type Route = 'menu' | 'game';

export interface RouteState {
  route: Route;
  level: number;
}

type RouteListener = (state: RouteState) => void;

class HashRouter {
  private listeners: RouteListener[] = [];
  private currentState: RouteState = { route: 'menu', level: 1 };

  constructor() {
    window.addEventListener('hashchange', () => this.handleHashChange());
    // Initial parse
    this.handleHashChange();
  }

  public subscribe(listener: RouteListener) {
    this.listeners.push(listener);
    listener(this.currentState);
  }

  public navigate(route: Route, level?: number) {
    const lvl = level || this.currentState.level;
    if (route === 'menu') {
      window.location.hash = '#/menu';
    } else {
      window.location.hash = `#/game?level=${lvl}`;
    }
  }

  public getState(): RouteState {
    return this.currentState;
  }

  private handleHashChange() {
    const rawHash = window.location.hash.slice(1) || '/menu';
    const [path, queryString] = rawHash.split('?');
    const params = new URLSearchParams(queryString || '');

    let route: Route = 'menu';
    if (path.includes('/game')) {
      route = 'game';
    }

    const level = parseInt(params.get('level') || '1', 10) || 1;
    this.currentState = { route, level };

    for (const listener of this.listeners) {
      listener(this.currentState);
    }
  }
}

export const router = new HashRouter();
