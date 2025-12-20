/**
 * Loading screen with progress tracking
 */
export class LoadingScreen {
  private container: HTMLDivElement;
  private progressBar: HTMLDivElement;
  private progressFill: HTMLDivElement;
  private statusText: HTMLDivElement;
  private percentText: HTMLDivElement;
  private totalSteps = 0;
  private currentStep = 0;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'loading-screen';
    // add shared font import + heading styles (Ethnocentric for headings)
    const lsStyle = document.createElement('style');
    lsStyle.textContent = `
      @import url("https://fonts.cdnfonts.com/css/ethnocentric");
      #loading-screen { background: #0a0a0a; display: flex; flex-direction: column; justify-content: center; align-items: center; position: fixed; inset: 0; z-index: 10000; font-family: Inter, system-ui, sans-serif; }
      #loading-screen h1 { font-family: 'Ethnocentric', Inter, sans-serif; color: #fff; font-size: 64px; letter-spacing: 6px; margin-bottom: 28px; text-shadow: 0 8px 40px rgba(249,115,22,0.16); }
      #loading-screen .ls-progress { width: 480px; height: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; overflow: hidden; box-shadow: 0 6px 30px rgba(0,0,0,0.4); }
      #loading-screen .ls-progress .fill { height: 100%; width: 0%; background: linear-gradient(90deg, #ffb069 0%, #f97316 60%); box-shadow: 0 6px 30px rgba(249,115,22,0.18); transition: width 0.3s ease; }
      #loading-screen .ls-percent { color: #f97316; font-size: 20px; margin-top: 12px; font-weight: 700; }
      #loading-screen .ls-status { color: rgba(255,255,255,0.72); font-size: 15px; margin-top: 12px; min-height: 28px; }
    `;
    document.head.appendChild(lsStyle);

    this.container.style.cssText = `position: fixed; inset: 0;`;

    // Game title
    const title = document.createElement('h1');
    title.textContent = 'SolFrag';
    title.style.cssText = `font-size: 64px; margin-bottom: 28px;`;
    this.container.appendChild(title);

    // Progress bar container
    this.progressBar = document.createElement('div');
    this.progressBar.className = 'ls-progress';

    // Progress fill
    this.progressFill = document.createElement('div');
    this.progressFill.className = 'fill';
    this.progressBar.appendChild(this.progressFill);
    this.container.appendChild(this.progressBar);

    // Percent text
    this.percentText = document.createElement('div');
    this.percentText.className = 'ls-percent';
    this.percentText.textContent = '0%';
    this.container.appendChild(this.percentText);

    // Status text
    this.statusText = document.createElement('div');
    this.statusText.className = 'ls-status';
    this.statusText.textContent = 'Initializing...';
    this.container.appendChild(this.statusText);

    document.body.appendChild(this.container);
  }

  /**
   * Set total number of loading steps
   */
  public setTotalSteps(total: number): void {
    this.totalSteps = total;
    this.currentStep = 0;
  }

  /**
   * Update loading progress with status message
   */
  public updateProgress(message: string): void {
    this.currentStep++;
    const percent = Math.round((this.currentStep / this.totalSteps) * 100);
    
    this.progressFill.style.width = `${percent}%`;
    this.percentText.textContent = `${percent}%`;
    this.statusText.textContent = message;
  }

  /**
   * Set progress directly (0-100)
   */
  public setProgress(percent: number, message: string): void {
    this.progressFill.style.width = `${percent}%`;
    this.percentText.textContent = `${percent}%`;
    this.statusText.textContent = message;
  }

  /**
   * Hide loading screen with fade out
   */
  public hide(): void {
    this.container.style.transition = 'opacity 0.5s ease';
    this.container.style.opacity = '0';
    
    setTimeout(() => {
      this.container.remove();
    }, 500);
  }

  /**
   * Show loading screen
   */
  public show(): void {
    this.container.style.opacity = '1';
  }
}
