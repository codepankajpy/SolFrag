/**
 * Home screen with click to play
 */
export class HomeScreen {
  private container: HTMLDivElement;
  private onPlayCallback?: () => void;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'home-screen';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 9000;
      font-family: 'Arial', sans-serif;
      cursor: pointer;
    `;

    // Game title
    const title = document.createElement('h1');
    title.textContent = 'FPS GAME';
    title.style.cssText = `
      color: #fff;
      font-size: 72px;
      margin-bottom: 20px;
      text-shadow: 0 0 30px rgba(255, 255, 255, 0.8),
                   0 0 60px rgba(0, 212, 255, 0.6);
      letter-spacing: 12px;
      animation: pulse 2s ease-in-out infinite;
    `;
    this.container.appendChild(title);

    // Subtitle
    const subtitle = document.createElement('div');
    subtitle.textContent = 'First Person Shooter';
    subtitle.style.cssText = `
      color: rgba(255, 255, 255, 0.6);
      font-size: 20px;
      margin-bottom: 60px;
      letter-spacing: 4px;
      text-transform: uppercase;
    `;
    this.container.appendChild(subtitle);

    // Click to play button
    const playButton = document.createElement('div');
    playButton.textContent = 'CLICK TO PLAY';
    playButton.style.cssText = `
      color: #fff;
      font-size: 28px;
      padding: 20px 50px;
      border: 3px solid #00d4ff;
      border-radius: 8px;
      background: rgba(0, 212, 255, 0.1);
      cursor: pointer;
      transition: all 0.3s ease;
      letter-spacing: 2px;
      font-weight: bold;
      box-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
      animation: float 3s ease-in-out infinite;
    `;

    // Hover effect
    playButton.addEventListener('mouseenter', () => {
      playButton.style.background = 'rgba(0, 212, 255, 0.3)';
      playButton.style.boxShadow = '0 0 30px rgba(0, 212, 255, 0.6)';
      playButton.style.transform = 'scale(1.05)';
    });

    playButton.addEventListener('mouseleave', () => {
      playButton.style.background = 'rgba(0, 212, 255, 0.1)';
      playButton.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.3)';
      playButton.style.transform = 'scale(1)';
    });

    this.container.appendChild(playButton);

    // Controls info
    const controls = document.createElement('div');
    controls.style.cssText = `
      position: absolute;
      bottom: 40px;
      color: rgba(255, 255, 255, 0.5);
      font-size: 14px;
      text-align: center;
      line-height: 1.8;
    `;
    controls.innerHTML = `
      <div style="margin-bottom: 10px; font-weight: bold; color: rgba(255, 255, 255, 0.7);">CONTROLS</div>
      WASD - Move | SPACE - Jump | MOUSE - Look | LEFT CLICK - Shoot
    `;
    this.container.appendChild(controls);

    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.8; }
      }
      
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
      }
    `;
    document.head.appendChild(style);

    // Click anywhere to play
    this.container.addEventListener('click', () => {
      if (this.onPlayCallback) {
        this.onPlayCallback();
      }
    });

    document.body.appendChild(this.container);
  }

  /**
   * Set callback for when play is clicked
   */
  public onPlay(callback: () => void): void {
    this.onPlayCallback = callback;
  }

  /**
   * Hide home screen with fade out
   */
  public hide(): void {
    this.container.style.transition = 'opacity 0.5s ease';
    this.container.style.opacity = '0';
    
    setTimeout(() => {
      this.container.remove();
    }, 500);
  }

  /**
   * Show home screen
   */
  public show(): void {
    this.container.style.opacity = '1';
    this.container.style.display = 'flex';
  }
}
