export class Scoreboard {
  private el: HTMLDivElement;

  constructor() {
    this.el = document.createElement('div');
    this.el.style.position = 'absolute';
    this.el.style.top = '12px';
    this.el.style.left = '50%';
    this.el.style.transform = 'translateX(-50%)';
    this.el.style.padding = '6px 10px';
    this.el.style.background = 'rgba(0,0,0,0.5)';
    this.el.style.color = '#fff';
    this.el.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    this.el.style.fontSize = '14px';
    this.el.style.borderRadius = '8px';
    this.el.style.zIndex = '1000';
    this.el.textContent = 'Player 1 - 0 | Player 2 - 0';
    document.body.appendChild(this.el);
  }

  update(scores: { [name: string]: number }) {
    const entries = Object.entries(scores);
    // Display exactly two entries if available, else show what exists
    const text = entries
      .slice(0, 2)
      .map(([name, points], _idx) => `${name} - ${points}`)
      .join(' | ');
    this.el.textContent = text || 'Waiting for players...';
  }

  announceWinner(winner: string) {
    this.el.textContent = `${winner} wins!`;
    this.el.style.background = 'rgba(0,128,0,0.6)';
  }
}
