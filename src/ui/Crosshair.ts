export class Crosshair {
  private element: HTMLDivElement;

  constructor() {
    this.element = document.createElement('div');
    this.element.id = 'crosshair';
    this.setupStyles();
    document.body.appendChild(this.element);
  }

  private setupStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      #crosshair {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 20px;
        height: 20px;
        pointer-events: none;
        z-index: 1000;
        display: none;
      }

      #crosshair::before,
      #crosshair::after {
        content: '';
        position: absolute;
        background-color: rgba(255, 255, 255, 0.8);
      }

      #crosshair::before {
        top: 50%;
        left: 0;
        width: 100%;
        height: 2px;
        transform: translateY(-50%);
      }

      #crosshair::after {
        left: 50%;
        top: 0;
        width: 2px;
        height: 100%;
        transform: translateX(-50%);
      }

      #crosshair.visible {
        display: block;
      }

      #crosshair .dot {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 4px;
        height: 4px;
        background-color: rgba(255, 255, 255, 0.9);
        border-radius: 50%;
        transform: translate(-50%, -50%);
      }
    `;
    document.head.appendChild(style);

    // Add center dot
    const dot = document.createElement('div');
    dot.className = 'dot';
    this.element.appendChild(dot);
  }

  public show(): void {
    this.element.classList.add('visible');
  }

  public hide(): void {
    this.element.classList.remove('visible');
  }

  public toggle(): void {
    this.element.classList.toggle('visible');
  }
}
