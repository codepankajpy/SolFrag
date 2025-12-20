export class LandingPage {
  private container: HTMLDivElement;
  private onPlayCallback?: () => void;
  private styleEl: HTMLStyleElement;
  private canvas?: HTMLCanvasElement;
  private ctx?: CanvasRenderingContext2D | null;
  private particles: Array<any> = [];
  private particleImg?: HTMLImageElement;
  private animId?: number;

  constructor() {
    this.styleEl = document.createElement('style');
    this.styleEl.id = 'landing-page-styles';
    this.styleEl.textContent = `
      /* Fonts and base tokens from the solfrag-launchpad theme */
      @import url("https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap");
      /* Ethnocentric font (hosted) - used site-wide */
      @import url("https://fonts.cdnfonts.com/css/ethnocentric");
      @import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap");
      @import url("https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap");

      :root {
        --background: #0f0a0a;
        --foreground: #e6eef5;
        --primary: #f97316; /* warm orange */
        --primary-foreground: #000;
        --muted: rgba(255,255,255,0.6);
        --card: rgba(255,255,255,0.02);
        --border: rgba(255,255,255,0.06);
        --radius: 0.75rem;
        --font-display: 'Ethnocentric', 'Orbitron', Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      }

      /* small utility classes used by the solfrag components */
      .gradient-warm { background: linear-gradient(135deg, #f97316 0%, #f59e0b 100%); }
      .gradient-text { background: linear-gradient(135deg, #f97316 0%, #f59e0b 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
      .text-glow { text-shadow: 0 0 30px rgba(249,115,22,0.5), 0 0 60px rgba(249,115,22,0.3); }

      * { margin: 0; padding: 0; box-sizing: border-box; }

      .lp {
        position: fixed;
        inset: 0;
        overflow-x: hidden;
        overflow-y: auto;
        background: #0a0a0a;
        /* warm ambient glow using subtle radial gradients */
        background-image: radial-gradient(circle at 50% 20%, rgba(249,115,22,0.06) 0, transparent 30%), radial-gradient(circle at 10% 80%, rgba(249,115,22,0.03) 0, transparent 40%);
        background-blend-mode: screen;
        color: var(--foreground);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      }

      /* Use Ethnocentric only for prominent headings */
      h1, h2, h3, .lp-hero-title, .lp-section-title, .lp-cta-title {
        font-family: var(--font-display);
      }

      .lp-nav {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 50;
        background: rgba(10, 10, 10, 0.8);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }

      .lp-nav-inner {
        max-width: 1280px;
        margin: 0 auto;
        padding: 0 24px;
        height: 72px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .lp-logo-box {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .lp-logo-icon {
        width: 40px;
        height: 40px;
        background: #f97316;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 900;
        font-size: 18px;
        color: #000;
      }

      .lp-logo-text {
        font-size: 20px;
        font-weight: 700;
        letter-spacing: 1px;
      }

      .lp-nav-links {
        display: flex;
        gap: 32px;
      }

      .lp-nav-link {
        color: rgba(255, 255, 255, 0.7);
        font-size: 15px;
        cursor: pointer;
        transition: color 0.2s;
      }

      .lp-nav-link:hover { color: #fff; }

      .lp-play-btn {
        background: var(--primary);
        color: var(--primary-foreground);
        padding: 12px 28px;
        border-radius: 8px;
        border: none;
        font-weight: 700;
        font-size: 15px;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
        display: inline-block;
        width: auto;
        min-width: 0;
      }

      .lp-play-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 8px 24px rgba(249, 115, 22, 0.3);
      }

      .lp-section {
        max-width: 1280px;
        margin: 0 auto;
        padding: 0 24px;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        position: relative;
      }

      .lp-hero {
        padding-top: 120px;
        padding-bottom: 80px;
        text-align: center;
      }

      .lp-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        border-radius: 999px;
        background: rgba(249, 115, 22, 0.12);
        border: 1px solid rgba(249, 115, 22, 0.28);
        color: #f97316;
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 28px;
        max-width: 240px;
        justify-content: center;
      }

      .lp-badge-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #f97316;
        animation: pulse 2s infinite;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      .lp-hero-title {
        font-size: clamp(56px, 10vw, 120px);
        font-weight: 900;
        line-height: 0.9;
        margin-bottom: 16px;
        letter-spacing: -2px;
      }

      /* add a gentle glow to prominent headings */
      .lp-hero-title, .lp-section-title, .lp-cta-title {
        text-shadow: 0 8px 30px rgba(249,115,22,0.12);
      }

      .lp-hero-title .orange { color: #f97316; }

      .lp-hero-subtitle {
        font-size: clamp(20px, 3vw, 32px);
        font-style: italic;
        color: #f97316;
        margin-bottom: 24px;
        font-weight: 300;
      }

      .lp-hero-desc {
        max-width: 700px;
        margin: 0 auto 16px auto;
        color: rgba(255, 255, 255, 0.7);
        font-size: 17px;
        line-height: 1.6;
      }

      .lp-cta-btn {
        display: inline-block;
        background: var(--primary);
        color: var(--primary-foreground);
        padding: 18px 48px;
        border-radius: 12px;
        border: none;
        font-weight: 700;
        font-size: 17px;
        cursor: pointer;
        margin: 32px 0 48px 0;
        transition: transform 0.2s, box-shadow 0.2s;
        width: auto;
        max-width: none;
      }

      /* button glow wrapper */
      .lp-btn-wrap { position: relative; display: inline-block; }
      .lp-btn-glow { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 220px; height: 80px; border-radius: 20px; background: radial-gradient(circle, rgba(249,115,22,0.22) 0%, transparent 50%); filter: blur(24px); z-index: 0; pointer-events: none; }
      .lp-play-btn { position: relative; z-index: 2; }

      /* Ensure CTA container centers inline buttons and prevents flex children from stretching */
      .lp-hero, .lp-cta-section { text-align: center; align-items: center; }
      .lp-hero .lp-cta-btn, .lp-cta-section .lp-cta-btn, .lp-nav-inner .lp-play-btn { display: inline-block; }
      .lp-nav-inner { align-items: center; }

      .lp-cta-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 32px rgba(249, 115, 22, 0.4);
      }

      .lp-about {
        padding: 100px 0;
      }

      .lp-eyebrow {
        color: #f97316;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 2px;
        text-transform: uppercase;
        margin-bottom: 16px;
        text-align: center;
      }

      .lp-section-title {
        font-size: clamp(36px, 5vw, 56px);
        font-weight: 700;
        text-align: center;
        margin-bottom: 64px;
        line-height: 1.1;
      }

      .lp-features {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 32px;
      }

      .lp-feature {
        position: relative;
        padding: 28px;
        border-radius: 12px;
        background: var(--card);
        border: 1px solid var(--border);
        overflow: visible;
        z-index: 1;
      }

      .lp-feature::before {
        content: '';
        position: absolute;
        left: 50%;
        top: -10px;
        transform: translateX(-50%);
        width: 120%;
        height: 120%;
        background: radial-gradient(circle at center, rgba(249,115,22,0.12), transparent 40%);
        filter: blur(40px);
        z-index: -1;
        pointer-events: none;
      }

      .lp-feature {
        text-align: left;
      }

      .lp-feature-icon {
        width: 56px;
        height: 56px;
        background: #f97316;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 20px;
        font-size: 24px;
      }

      .lp-feature-title {
        font-size: 20px;
        font-weight: 700;
        margin-bottom: 12px;
      }

      .lp-feature-desc {
        color: rgba(255, 255, 255, 0.6);
        line-height: 1.6;
        font-size: 15px;
      }

      .lp-how {
        padding: 100px 0;
      }

      .lp-steps {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 48px;
        margin-top: 64px;
        position: relative;
      }

      /* page-wide subtle animated glow using pseudo-element */
      .lp::before {
        content: '';
        position: absolute;
        inset: 0;
        z-index: -2;
        pointer-events: none;
        background-image: radial-gradient(circle at 10% 20%, rgba(249,115,22,0.06) 0%, transparent 25%), radial-gradient(circle at 85% 80%, rgba(249,115,22,0.04) 0%, transparent 30%), radial-gradient(circle at 50% 60%, rgba(246,149,36,0.03) 0%, transparent 35%);
        background-blend-mode: screen;
        opacity: 0.9;
        animation: glow-pulse 8s ease-in-out infinite;
      }

      @keyframes glow-pulse {
        0% { opacity: 0.7; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.02); }
        100% { opacity: 0.7; transform: scale(1); }
      }

      .lp-step {
        text-align: center;
        position: relative;
        padding: 28px;
        border-radius: 12px;
        background: var(--card);
        border: 1px solid var(--border);
        z-index: 2;
        overflow: visible;
      }

      .lp-step::before {
        content: '';
        position: absolute;
        left: 50%;
        top: -8px;
        transform: translateX(-50%);
        width: 120%;
        height: 120%;
        background: radial-gradient(circle at center, rgba(249,115,22,0.08), transparent 40%);
        filter: blur(28px);
        z-index: -1;
        pointer-events: none;
      }

      .lp-step-num {
        width: 80px;
        height: 80px;
        border: 2px solid #f97316;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 32px;
        font-weight: 900;
        color: #f97316;
        margin: 0 auto 24px auto;
        position: relative;
        background: #0a0a0a;
      }

      .lp-step-icon {
        width: 56px;
        height: 56px;
        background: #f97316;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 20px auto;
        font-size: 24px;
      }

      .lp-step-title {
        font-size: 20px;
        font-weight: 700;
        margin-bottom: 12px;
      }

      .lp-step-desc {
        color: rgba(255, 255, 255, 0.6);
        line-height: 1.6;
        font-size: 15px;
      }

      .lp-cta-section {
        padding: 100px 0;
        text-align: center;
      }

      .lp-cta-title {
        font-size: clamp(36px, 5vw, 56px);
        font-weight: 700;
        margin-bottom: 24px;
        line-height: 1.1;
      }

      .lp-cta-title .orange { color: #f97316; }

      .lp-cta-desc {
        max-width: 600px;
        margin: 0 auto 40px auto;
        color: rgba(255, 255, 255, 0.7);
        font-size: 17px;
        line-height: 1.6;
      }

      .lp-footer {
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        padding: 40px 0;
      }

      .lp-footer-inner {
        max-width: 1280px;
        margin: 0 auto;
        padding: 0 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 24px;
      }

      .lp-footer-logo {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .lp-footer-logo-icon {
        width: 36px;
        height: 36px;
        background: #f97316;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 900;
        font-size: 16px;
        color: #000;
      }

      .lp-footer-text {
        font-size: 16px;
        font-weight: 700;
      }

      .lp-footer-links {
        display: flex;
        gap: 24px;
      }

      .lp-footer-link {
        color: rgba(255, 255, 255, 0.85);
        font-size: 16px;
        cursor: pointer;
        transition: color 0.2s;
        text-decoration: none;
      }

      .lp-footer-link:hover { color: #f97316; }

      .lp-footer-built {
        color: rgba(255, 255, 255, 0.5);
        font-size: 14px;
      }

      .lp-footer-built .orange {
        color: #f97316;
        font-weight: 600;
      }

      @media (max-width: 768px) {
        .lp-nav-links { display: none; }
        .lp-features, .lp-steps { grid-template-columns: 1fr; }
        .lp-footer-inner { flex-direction: column; text-align: center; }
        .lp-cta-btn, .lp-play-btn { width: auto; display: inline-block; }
      }
    `;

    if (!document.getElementById(this.styleEl.id)) {
      document.head.appendChild(this.styleEl);
    }

    // particle canvas (fire) - created under content so it's behind interactive elements
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'lp-particles-canvas';
    this.canvas.style.position = 'absolute';
    this.canvas.style.inset = '0';
    this.canvas.style.zIndex = '-1';
    this.canvas.style.pointerEvents = 'none';
    this.ctx = this.canvas.getContext('2d');

    // preload particle image
    this.particleImg = new Image();
    this.particleImg.src = '/textures/fire.png';
    this.particleImg.onload = () => {
      // start when image ready
      this.startParticles();
    };

    this.container = document.createElement('div');
    this.container.id = 'landing-page';
    this.container.className = 'lp';

    // attach canvas to container so it stays in background of landing page
    if (this.canvas) this.container.appendChild(this.canvas);

    // Navigation
    const nav = document.createElement('nav');
    nav.className = 'lp-nav';
    const navInner = document.createElement('div');
    navInner.className = 'lp-nav-inner';

    const logoBox = document.createElement('div');
    logoBox.className = 'lp-logo-box';
    const logoIcon = document.createElement('div');
    logoIcon.className = 'lp-logo-icon';
    logoIcon.textContent = 'SF';
    const logoText = document.createElement('div');
    logoText.className = 'lp-logo-text';
    logoText.textContent = 'SOLFRAG';
    logoBox.appendChild(logoIcon);
    logoBox.appendChild(logoText);

    const navLinks = document.createElement('div');
    navLinks.className = 'lp-nav-links';
    ['About', 'Features', 'How It Works'].forEach(text => {
      const link = document.createElement('div');
      link.className = 'lp-nav-link';
      link.textContent = text;
      navLinks.appendChild(link);
    });

    const playBtn = document.createElement('button');
    playBtn.className = 'lp-play-btn';
    playBtn.textContent = 'Play Now';
    playBtn.addEventListener('click', () => this.onPlayCallback?.());

    navInner.appendChild(logoBox);
    navInner.appendChild(navLinks);
    navInner.appendChild(playBtn);
    nav.appendChild(navInner);
    this.container.appendChild(nav);

    // Hero Section (with background and character image)
    const heroSection = document.createElement('section');
    heroSection.className = 'lp-section lp-hero';
    heroSection.style.position = 'relative';

    // background image
    const heroBg = document.createElement('div');
    heroBg.style.position = 'absolute';
    heroBg.style.inset = '0';
    heroBg.style.backgroundImage = 'url(/hero-bg.jpg)';
    heroBg.style.backgroundSize = 'cover';
    heroBg.style.backgroundPosition = 'center';
    heroBg.style.opacity = '0.06';
    heroBg.style.zIndex = '0';
    heroBg.style.pointerEvents = 'none';
    heroSection.appendChild(heroBg);

    // badge removed per request

    const heroTitle = document.createElement('h1');
    heroTitle.className = 'lp-hero-title';
    heroTitle.innerHTML = 'Sol<span class="orange">Frag</span>';
    heroSection.appendChild(heroTitle);

    const heroSubtitle = document.createElement('div');
    heroSubtitle.className = 'lp-hero-subtitle';
    heroSubtitle.textContent = '1v1 Combat on Solana';
    heroSection.appendChild(heroSubtitle);

    const heroDesc1 = document.createElement('div');
    heroDesc1.className = 'lp-hero-desc';
    heroDesc1.textContent = 'Every match, every kill, every victory—permanently recorded on the blockchain.';
    heroSection.appendChild(heroDesc1);

    const heroDesc2 = document.createElement('div');
    heroDesc2.className = 'lp-hero-desc';
    heroDesc2.textContent = 'Pure skill-based 1v1 shooter with immutable match history.';
    heroSection.appendChild(heroDesc2);

    const ctaBtn1 = document.createElement('button');
    ctaBtn1.className = 'lp-play-btn';
    ctaBtn1.textContent = 'Enter Arena';
    ctaBtn1.addEventListener('click', () => this.onPlayCallback?.());
    // wrap button with glow element so glow appears behind
    const btnWrap1 = document.createElement('div');
    btnWrap1.className = 'lp-btn-wrap';
    const btnGlow1 = document.createElement('div');
    btnGlow1.className = 'lp-btn-glow';
    btnWrap1.appendChild(btnGlow1);
    btnWrap1.appendChild(ctaBtn1);
    heroSection.appendChild(btnWrap1);

    // hero character removed per request

    this.container.appendChild(heroSection);

    // About Section
    const aboutSection = document.createElement('section');
    aboutSection.className = 'lp-section lp-about';

    const eyebrow1 = document.createElement('div');
    eyebrow1.className = 'lp-eyebrow';
    eyebrow1.textContent = 'ABOUT SOLFRAG';
    aboutSection.appendChild(eyebrow1);

    const aboutTitle = document.createElement('h2');
    aboutTitle.className = 'lp-section-title';
    aboutTitle.textContent = 'Why SolFrag Changes Everything';
    aboutSection.appendChild(aboutTitle);

    const features = document.createElement('div');
    features.className = 'lp-features';

    const featureData = [
      { icon: '⚔️', title: 'Pure 1v1 Combat', desc: 'No teams, no distractions. Head-to-head battles where skill is the only factor.' },
      { icon: '📋', title: 'On-Chain Records', desc: 'Every match result is permanently stored on Solana. Your combat history lives forever.' },
      { icon: '🛡️', title: 'Anti-Cheat Verified', desc: 'Blockchain-verified gameplay ensures fair competition. No disputes, just proof.' },
      { icon: '🔗', title: 'Wallet Connected', desc: 'Your Solana wallet is your identity. Connect once, battle endlessly.' }
    ];

    featureData.forEach(f => {
      features.appendChild(this.createFeature(f.icon, f.title, f.desc));
    });

    aboutSection.appendChild(features);
    this.container.appendChild(aboutSection);

    // How It Works Section
    const howSection = document.createElement('section');
    howSection.className = 'lp-section lp-how';

    const eyebrow2 = document.createElement('div');
    eyebrow2.className = 'lp-eyebrow';
    eyebrow2.textContent = 'GETTING STARTED';
    howSection.appendChild(eyebrow2);

    const howTitle = document.createElement('h2');
    howTitle.className = 'lp-section-title';
    howTitle.textContent = 'How It Works';
    howSection.appendChild(howTitle);

    const steps = document.createElement('div');
    steps.className = 'lp-steps';

    // removed connector per request; steps remain as individual cards

    const stepData = [
      { num: '01', icon: '💼', title: 'Connect Wallet', desc: 'Link your Solana wallet to create your permanent player identity.' },
      { num: '02', icon: '🎯', title: 'Find Match', desc: 'Queue for ranked 1v1 and get matched with a worthy opponent.' },
      { num: '03', icon: '🏆', title: 'Battle & Record', desc: 'Fight to win. Match results are instantly written to the blockchain.' }
    ];

    stepData.forEach(s => {
      steps.appendChild(this.createStep(s.num, s.icon, s.title, s.desc));
    });

    howSection.appendChild(steps);
    this.container.appendChild(howSection);

    // CTA Section
    const ctaSection = document.createElement('section');
    ctaSection.className = 'lp-section lp-cta-section';

    const ctaTitle = document.createElement('h2');
    ctaTitle.className = 'lp-cta-title';
    ctaTitle.innerHTML = 'Ready to make <span class="orange">history</span>?';
    ctaSection.appendChild(ctaTitle);

    const ctaDesc = document.createElement('div');
    ctaDesc.className = 'lp-cta-desc';
    ctaDesc.textContent = 'Your matches. Your legacy. Permanently on-chain. Join the arena and prove your skill.';
    ctaSection.appendChild(ctaDesc);

    const ctaBtn2 = document.createElement('button');
    ctaBtn2.className = 'lp-play-btn';
    ctaBtn2.textContent = 'Enter the Arena →';
    ctaBtn2.addEventListener('click', () => this.onPlayCallback?.());
    const btnWrap2 = document.createElement('div');
    btnWrap2.className = 'lp-btn-wrap';
    const btnGlow2 = document.createElement('div');
    btnGlow2.className = 'lp-btn-glow';
    btnWrap2.appendChild(btnGlow2);
    btnWrap2.appendChild(ctaBtn2);
    ctaSection.appendChild(btnWrap2);

    this.container.appendChild(ctaSection);

    // Footer
    const footer = document.createElement('footer');
    footer.className = 'lp-footer';
    const footerInner = document.createElement('div');
    footerInner.className = 'lp-footer-inner';

    const footerLogo = document.createElement('div');
    footerLogo.className = 'lp-footer-logo';
    const footerLogoIcon = document.createElement('div');
    footerLogoIcon.className = 'lp-footer-logo-icon';
    footerLogoIcon.textContent = 'SF';
    const footerText = document.createElement('div');
    footerText.className = 'lp-footer-text';
    footerText.textContent = 'SOLFRAG';
    footerLogo.appendChild(footerLogoIcon);
    footerLogo.appendChild(footerText);

    const footerLinks = document.createElement('div');
    footerLinks.className = 'lp-footer-links';
    const portfolioLink = document.createElement('a');
    portfolioLink.className = 'lp-footer-link';
    portfolioLink.href = 'https://codepankaj.tech';
    portfolioLink.target = '_blank';
    portfolioLink.rel = 'noopener noreferrer';
    portfolioLink.textContent = 'codepankaj.tech';
    footerLinks.appendChild(portfolioLink);

    const footerBuilt = document.createElement('div');
    footerBuilt.className = 'lp-footer-built';
    footerBuilt.innerHTML = 'Built on <span class="orange">Solana</span>';

    footerInner.appendChild(footerLogo);
    footerInner.appendChild(footerLinks);
    footerInner.appendChild(footerBuilt);
    footer.appendChild(footerInner);
    this.container.appendChild(footer);
  }

  private createFeature(icon: string, title: string, desc: string): HTMLDivElement {
    const feature = document.createElement('div');
    feature.className = 'lp-feature';

    const featureIcon = document.createElement('div');
    featureIcon.className = 'lp-feature-icon';
    featureIcon.textContent = icon;

    const featureTitle = document.createElement('div');
    featureTitle.className = 'lp-feature-title';
    featureTitle.textContent = title;

    const featureDesc = document.createElement('div');
    featureDesc.className = 'lp-feature-desc';
    featureDesc.textContent = desc;

    feature.appendChild(featureIcon);
    feature.appendChild(featureTitle);
    feature.appendChild(featureDesc);
    return feature;
  }

  private createStep(num: string, icon: string, title: string, desc: string): HTMLDivElement {
    const step = document.createElement('div');
    step.className = 'lp-step';

    const stepNum = document.createElement('div');
    stepNum.className = 'lp-step-num';
    stepNum.textContent = num;

    const stepIcon = document.createElement('div');
    stepIcon.className = 'lp-step-icon';
    stepIcon.textContent = icon;

    const stepTitle = document.createElement('div');
    stepTitle.className = 'lp-step-title';
    stepTitle.textContent = title;

    const stepDesc = document.createElement('div');
    stepDesc.className = 'lp-step-desc';
    stepDesc.textContent = desc;

    step.appendChild(stepNum);
    step.appendChild(stepIcon);
    step.appendChild(stepTitle);
    step.appendChild(stepDesc);
    return step;
  }

  public onPlay(callback: () => void): void {
    this.onPlayCallback = callback;
  }

  public show(): void {
    if (!this.container.isConnected) {
      document.body.appendChild(this.container);
      // ensure canvas size matches when shown
      this.resizeCanvas();
      if (!this.animId && this.particleImg && this.particleImg.complete) this.startParticles();
    }
  }

  public hide(): void {
    this.stopParticles();
    this.container.remove();
  }

  private resizeCanvas(): void {
    if (!this.canvas || !this.ctx) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    this.ctx.scale(dpr, dpr);
  }

  private startParticles(): void {
    if (!this.canvas || !this.ctx || this.animId) return;
    // ensure canvas size
    this.resizeCanvas();
    // initial particles
    const count = 40;
    this.particles = [];
    for (let i = 0; i < count; i++) this.spawnParticle(true);

    const loop = () => {
      this.updateParticles();
      this.animId = window.requestAnimationFrame(loop);
    };
    this.animId = window.requestAnimationFrame(loop);

    window.addEventListener('resize', this.resizeHandler);
  }

  private stopParticles(): void {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = undefined;
    }
    window.removeEventListener('resize', this.resizeHandler);
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    this.particles = [];
  }

  private resizeHandler = () => this.resizeCanvas();

  private spawnParticle(initial = false): void {
    if (!this.canvas) return;
    const w = this.container.getBoundingClientRect().width;
    const h = this.container.getBoundingClientRect().height;
    const x = Math.random() * w;
    const y = initial ? Math.random() * h : h + 20;
    const vx = (Math.random() - 0.5) * 0.12; // gentler horizontal drift
    const vy = - (0.05 + Math.random() * 0.15); // slower upward speed
    const size = 4 + Math.random() * 8; // smaller particles
    // Most particles are short-lived (burn out at half life), a few are long-lived
    const isLong = Math.random() < 0.18; // ~18% reach further
    const life = isLong ? (4 + Math.random() * 4) : (1.2 + Math.random() * 1.6);
    this.particles.push({ x, y, vx, vy, size, life, age: 0, rot: Math.random() * Math.PI * 2, omega: (Math.random() - 0.5) * 0.02 });
  }

  private updateParticles(): void {
    if (!this.ctx || !this.canvas || !this.particleImg) return;
    const ctx = this.ctx;
    // clear (use transparent to allow background glow through)
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    

    // update and draw
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * 30; // scale velocity (halved)
      p.y += p.vy * 30;
      p.vx *= 0.995;
      p.vy -= 0.0015; // gentle upward acceleration
      p.age += 1/60;
      p.rot += p.omega;
      const t = p.age / p.life;
      const alpha = Math.max(0, 1 - t);
      const drawX = p.x;
      const drawY = p.y;
      const size = p.size;

      ctx.save();
      ctx.globalAlpha = alpha * 0.9;
      ctx.translate(drawX, drawY);
      ctx.rotate(p.rot);
      // draw image centered
      ctx.drawImage(this.particleImg, -size/2, -size/2, size, size);
      ctx.restore();

      if (p.y + p.size < -50 || p.age > p.life) {
        // respawn at bottom
        this.particles.splice(i, 1);
        this.spawnParticle(false);
      }
    }
  }
}
