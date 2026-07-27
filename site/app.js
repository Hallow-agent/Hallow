(() => {
  'use strict';
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  let lenis = null;

  const lock = value => document.body.classList.toggle('is-locked', value);
  lock(true);

  function initLoader() {
    const loader = $('[data-preloader]');
    if (!loader) return Promise.resolve();
    const percent = $('[data-load-percent]', loader);
    const status = $('[data-load-status]', loader);
    const scene = $('.preloader-scene', loader);
    const sceneImage = $('.preloader-scene img', loader);
    const titleLetters = $$('.preloader-title span', loader);
    const failSafe = setTimeout(() => {
      if (loader.isConnected) {
        loader.remove();
        lock(false);
      }
    }, 6500);

    if (hasGSAP && !reduced) {
      gsap.timeline()
        .fromTo(scene, { clipPath: 'inset(0 49% 0 49% round 999px)' }, { clipPath: 'inset(0 0% 0 0% round 999px 999px 18px 18px)', duration: 1.05, ease: 'power4.inOut' })
        .from(titleLetters, { yPercent: 125, opacity: 0, duration: .8, stagger: .045, ease: 'power4.out' }, .18)
        .from('.preloader-top,.preloader-intro,.preloader-foot', { opacity: 0, y: 12, duration: .65, stagger: .08, ease: 'power3.out' }, .35);
    }

    let value = 0;
    const phases = [
      [26, 'Awakening the runtime'],
      [52, 'Mounting private memory'],
      [76, 'Mapping tools and models'],
      [101, 'Runtime ready']
    ];
    const interval = setInterval(() => {
      value = Math.min(92, value + Math.ceil(Math.random() * 6));
      percent.textContent = String(value).padStart(2, '0') + '%';
      loader.style.setProperty('--load-progress', value + '%');
      status.textContent = phases.find(([limit]) => value < limit)?.[1] || 'Runtime ready';
    }, 110);
    const hero = new Image();
    const imageReady = new Promise(resolve => {
      hero.onload = hero.onerror = resolve;
      hero.src = '/assets/hallow-portal.jpg';
    });
    const fontReady = document.fonts?.ready || Promise.resolve();
    const timeReady = new Promise(resolve => setTimeout(resolve, 1250));
    return Promise.race([
      Promise.all([imageReady, fontReady, timeReady]),
      new Promise(resolve => setTimeout(resolve, 4200))
    ]).then(() => {
      clearInterval(interval);
      percent.textContent = '100%';
      status.textContent = 'Runtime ready';
      loader.style.setProperty('--load-progress', '100%');
      if (!hasGSAP || reduced) {
        clearTimeout(failSafe);
        loader.remove();
        lock(false);
        return;
      }
      return new Promise(resolve => {
        gsap.timeline({ onComplete: () => { clearTimeout(failSafe); loader.remove(); lock(false); resolve(); } })
          .to(titleLetters, { yPercent: -125, opacity: 0, duration: .6, stagger: .025, ease: 'power3.in' }, 0)
          .to('.preloader-top,.preloader-intro,.preloader-foot', { opacity: 0, y: -10, duration: .38, stagger: .035, ease: 'power2.in' }, .04)
          .to(scene, { width: innerWidth, height: innerHeight, borderRadius: 0, duration: 1.18, ease: 'power4.inOut' }, .16)
          .to(sceneImage, { scale: 1.48, filter: 'saturate(.68) brightness(.78)', duration: 1.18, ease: 'power4.inOut' }, .16)
          .to(loader, { backgroundColor: 'rgba(13,12,10,0)', duration: .6, ease: 'power2.out' }, .65)
          .to(scene, { opacity: 0, duration: .3, ease: 'power2.out' }, 1.12)
          .to(loader, { opacity: 0, duration: .3, ease: 'power2.out' }, 1.14);
      });
    });
  }

  function initLenis() {
    if (reduced || typeof window.Lenis === 'undefined') return;
    lenis = new Lenis({ duration: 1.15, smoothWheel: true, touchMultiplier: 1.35 });
    if (hasGSAP) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(time => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = time => { lenis.raf(time); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  function initHeader() {
    const header = $('[data-header]');
    let lastY = scrollY;
    const onScroll = ({ scroll = scrollY } = {}) => {
      const delta = scroll - lastY;
      if (Math.abs(delta) > 8) header.classList.toggle('is-hidden', delta > 0 && scroll > innerHeight);
      lastY = scroll;
    };
    if (lenis) lenis.on('scroll', onScroll);
    else addEventListener('scroll', () => onScroll(), { passive: true });
    const themeObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) header.classList.toggle('is-light', entry.target.dataset.headerTheme === 'light');
      });
    }, { rootMargin: '-15% 0px -78% 0px', threshold: 0 });
    $$('[data-header-theme]').forEach(section => themeObserver.observe(section));
  }

  function initMenu() {
    const menu = $('[data-menu]');
    const open = $('[data-menu-open]');
    const close = $('[data-menu-close]');
    if (!menu) return;
    const show = () => {
      menu.classList.add('is-open');
      menu.removeAttribute('inert');
      open.setAttribute('aria-expanded', 'true');
      lock(true);
      lenis?.stop();
      if (hasGSAP) gsap.timeline().to('.menu-backdrop', { opacity: 1, duration: .4 }).to('.menu-panel', { x: 0, duration: .75, ease: 'power4.inOut' }, 0).from('.menu-links a', { x: -35, opacity: 0, duration: .5, stagger: .05 }, .25);
    };
    const hide = () => {
      const done = () => { menu.classList.remove('is-open'); menu.setAttribute('inert', ''); open.setAttribute('aria-expanded', 'false'); lock(false); lenis?.start(); };
      if (hasGSAP) gsap.timeline({ onComplete: done }).to('.menu-panel', { x: '-102%', duration: .65, ease: 'power4.inOut' }).to('.menu-backdrop', { opacity: 0, duration: .3 }, '<.2');
      else done();
    };
    open.addEventListener('click', show);
    close.addEventListener('click', hide);
    $('.menu-backdrop', menu).addEventListener('click', hide);
    $$('.menu-links a', menu).forEach(link => link.addEventListener('click', hide));
  }

  function splitWords() {
    const quote = $('[data-reveal-text]');
    if (!quote || quote.dataset.split) return;
    quote.dataset.split = 'true';
    const words = quote.textContent.trim().split(/\s+/);
    quote.innerHTML = words.map(word => `<span class="word">${word}</span>`).join(' ');
  }

  function initMotion() {
    splitWords();
    if (!hasGSAP || reduced) {
      $$('.word').forEach(word => word.style.opacity = 1);
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    const hero = $('.hero-scroll');
    const heroTimeline = gsap.timeline({
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom bottom', scrub: .5 }
    });
    heroTimeline
      .to('.hero-title', { scale: .82, yPercent: -6, ease: 'none' }, 0)
      .to('.hero-kicker', { y: -80, opacity: 0, ease: 'none' }, 0)
      .to('.hero-meta', { y: 70, opacity: 0, stagger: .03, ease: 'none' }, .08)
      .to('.orbit-cta,.scene-tour', { opacity: 0, scale: .75, ease: 'none' }, .18)
      .to('.hero-title', { opacity: 0, yPercent: -18, duration: .25, ease: 'power2.in' }, .26)
      .to('.hero-fallback', { scale: 1, ease: 'none' }, 0);
    ScrollTrigger.create({
      trigger: hero, start: 'top top', end: 'bottom bottom',
      onUpdate: self => document.documentElement.style.setProperty('--progress', `${self.progress * 100}%`)
    });

    gsap.to('.prologue blockquote .word', {
      opacity: 1, stagger: .035, ease: 'none',
      scrollTrigger: { trigger: '.prologue blockquote', start: 'top 78%', end: 'bottom 40%', scrub: true }
    });
    gsap.from('.about-title h2', { yPercent: 25, opacity: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.about-title', start: 'top 75%' } });
    gsap.to('.world-image>img', { scale: 1, yPercent: 3, ease: 'none', scrollTrigger: { trigger: '.world-image', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from('.map-line', { strokeDashoffset: 300, opacity: 0, duration: 2, stagger: .2, ease: 'power2.out', scrollTrigger: { trigger: '.map-canvas', start: 'top 72%' } });
    gsap.from('.map-node', { scale: 0, transformOrigin: 'center', duration: .7, stagger: .12, ease: 'back.out(2)', scrollTrigger: { trigger: '.map-canvas', start: 'top 62%' } });

    const modeCopies = $$('[data-mode-copy]');
    const modesTimeline = gsap.timeline({ scrollTrigger: { trigger: '[data-modes]', start: 'top top', end: 'bottom bottom', scrub: .55 } });
    modesTimeline
      .to(modeCopies[0], { opacity: 0, y: -50, duration: .2, onComplete: () => modeCopies[0].classList.remove('is-active'), onReverseComplete: () => modeCopies[0].classList.add('is-active') }, .35)
      .add(() => modeCopies[1].classList.add('is-active'), .45)
      .fromTo(modeCopies[1], { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: .25 }, .45)
      .to('.mode-switch b', { x: 40, duration: .3 }, .42)
      .to('.modes-video', { scale: 1.02, xPercent: -2, duration: 1, ease: 'none' }, 0);

    const track = $('[data-cap-track]');
    const viewport = $('.cap-viewport');
    if (track && viewport) {
      const distance = () => Math.max(0, track.scrollWidth - innerWidth);
      const capTween = gsap.to(track, {
        x: () => -distance(), ease: 'none',
        scrollTrigger: { trigger: viewport, start: 'top top', end: () => '+=' + distance(), pin: true, scrub: .75, invalidateOnRefresh: true,
          onUpdate: self => { $('[data-cap-current]').textContent = String(Math.min(5, Math.round(self.progress * 5))).padStart(2, '0'); }
        }
      });
      $$('.cap-card>img').forEach(image => {
        gsap.fromTo(image, { scale: 1.16 }, {
          scale: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: image.closest('.cap-card'),
            containerAnimation: capTween,
            start: 'left right',
            end: 'center center',
            scrub: true
          }
        });
      });
      addEventListener('resize', () => capTween.scrollTrigger?.refresh(), { passive: true });
    }
    gsap.to('.roadmap-image img', { scale: 1, yPercent: 2, ease: 'none', scrollTrigger: { trigger: '.roadmap', start: 'top bottom', end: '55% top', scrub: true } });
    gsap.to('[data-parallax]', { yPercent: 8, scale: 1, ease: 'none', scrollTrigger: { trigger: '.factoid', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.to('.cta-bg img', { scale: 1, yPercent: 4, ease: 'none', scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'bottom top', scrub: true } });
    $$('.section-index').forEach(index => gsap.from(index, { opacity: 0, x: -20, duration: .7, scrollTrigger: { trigger: index, start: 'top 88%' } }));
    $$('[data-count]').forEach(node => {
      const target = Number(node.dataset.count);
      gsap.to({ value: 0 }, { value: target, duration: 1.4, ease: 'power2.out', scrollTrigger: { trigger: node, start: 'top 85%' }, onUpdate() { node.textContent = Math.round(this.targets()[0].value); } });
    });
  }

  function initPackages() {
    const tabs = $$('[data-package-tab]');
    const panels = $$('[data-package-panel]');
    let transitionId = 0;
    tabs.forEach(tab => tab.addEventListener('click', () => {
      if (tab.classList.contains('is-active')) return;
      const requestId = ++transitionId;
      const next = panels.find(panel => panel.dataset.packagePanel === tab.dataset.packageTab);
      const current = panels.find(panel => !panel.hidden);
      tabs.forEach(item => { item.classList.toggle('is-active', item === tab); item.setAttribute('aria-selected', item === tab ? 'true' : 'false'); });
      const reveal = () => {
        if (requestId !== transitionId) return;
        panels.forEach(panel => {
          panel.hidden = panel !== next;
          panel.classList.toggle('is-active', panel === next);
        });
        if (hasGSAP) {
          gsap.set(panels.filter(panel => panel !== next), { clearProps: 'transform,opacity' });
          gsap.fromTo(next, { xPercent: 8, rotate: 1, opacity: 0 }, { xPercent: 0, rotate: 0, opacity: 1, duration: .65, ease: 'power3.out', clearProps: 'transform,opacity' });
        }
      };
      if (hasGSAP && current) {
        gsap.killTweensOf(panels);
        gsap.to(current, { xPercent: -8, rotate: -1, opacity: 0, duration: .32, ease: 'power2.in', onComplete: reveal });
      }
      else reveal();
    }));
  }

  function initFaq() {
    $$('.faq-list article').forEach(article => {
      const button = $('button', article);
      const content = $('div', article);
      button.addEventListener('click', () => {
        const opening = !article.classList.contains('is-open');
        article.classList.toggle('is-open', opening);
        button.setAttribute('aria-expanded', opening ? 'true' : 'false');
        if (hasGSAP) gsap.to(content, { height: opening ? 'auto' : 0, duration: .55, ease: 'power3.inOut' });
        else content.style.height = opening ? 'auto' : '0';
      });
    });
  }

  function initDragRail() {
    $$('[data-drag-rail]').forEach(rail => {
      let down = false, startX = 0, startScroll = 0;
      let depthFrame = 0;
      const updateDepth = () => {
        depthFrame = 0;
        const railRect = rail.getBoundingClientRect();
        const center = railRect.left + railRect.width / 2;
        $$('figure', rail).forEach(figure => {
          const rect = figure.getBoundingClientRect();
          const distance = Math.abs(rect.left + rect.width / 2 - center);
          const scale = 1 + Math.min(.14, distance / Math.max(1, railRect.width) * .15);
          $('img', figure)?.style.setProperty('--gallery-scale', scale.toFixed(3));
        });
      };
      const scheduleDepth = () => {
        if (!depthFrame) depthFrame = requestAnimationFrame(updateDepth);
      };
      rail.addEventListener('pointerdown', event => { down = true; startX = event.clientX; startScroll = rail.scrollLeft; rail.classList.add('is-dragging'); rail.setPointerCapture(event.pointerId); });
      rail.addEventListener('pointermove', event => { if (down) rail.scrollLeft = startScroll - (event.clientX - startX) * 1.45; });
      const end = event => { down = false; rail.classList.remove('is-dragging'); if (event.pointerId && rail.hasPointerCapture(event.pointerId)) rail.releasePointerCapture(event.pointerId); };
      rail.addEventListener('pointerup', end); rail.addEventListener('pointercancel', end);
      rail.addEventListener('keydown', event => { if (event.key === 'ArrowRight') rail.scrollBy({ left: 360, behavior: 'smooth' }); if (event.key === 'ArrowLeft') rail.scrollBy({ left: -360, behavior: 'smooth' }); });
      rail.addEventListener('scroll', scheduleDepth, { passive: true });
      addEventListener('resize', scheduleDepth, { passive: true });
      updateDepth();
    });
  }

  function initAmbientVideo() {
    const video = $('.modes-video');
    if (!video) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !reduced) video.play().catch(() => {});
        else video.pause();
      });
    }, { rootMargin: '20% 0px 20% 0px' });
    observer.observe(video);
  }

  function initModals() {
    const install = $('[data-install-modal]');
    const tour = $('[data-tour-modal]');
    const openDialog = dialog => {
      dialog.showModal();
      lenis?.stop();
      lock(true);
      if (hasGSAP) gsap.fromTo(dialog, { opacity: 0, y: 35, scale: .97 }, { opacity: 1, y: 0, scale: 1, duration: .55, ease: 'power3.out' });
    };
    $$('[data-install-open]').forEach(button => button.addEventListener('click', () => openDialog(install)));
    $$('[data-tour-open]').forEach(button => button.addEventListener('click', () => { openDialog(tour); $('video', tour)?.play().catch(() => {}); }));
    $$('[data-modal-close]').forEach(button => button.addEventListener('click', () => {
      const dialog = button.closest('dialog');
      $('video', dialog)?.pause();
      dialog.close();
      lock(false);
      lenis?.start();
    }));
    [install, tour].forEach(dialog => dialog?.addEventListener('click', event => {
      if (event.target === dialog) { $('video', dialog)?.pause(); dialog.close(); lock(false); lenis?.start(); }
    }));
    const platformName = `${navigator.userAgentData?.platform || ''} ${navigator.platform || ''} ${navigator.userAgent || ''}`.toLowerCase();
    const detectedPlatform = /win/.test(platformName) && !/android/.test(platformName) ? 'windows' : 'unix';
    $$('[data-install-platform]').forEach(row => {
      const recommended = row.dataset.installPlatform === detectedPlatform;
      row.classList.toggle('is-recommended', recommended);
      if (recommended) $('[data-platform-badge]', row).textContent = 'Recommended';
    });
    const copyText = async value => {
      if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(value);
      const field = document.createElement('textarea');
      field.value = value;
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.appendChild(field);
      field.select();
      document.execCommand('copy');
      field.remove();
    };
    $$('[data-copy-command]').forEach(button => button.addEventListener('click', async event => {
      const command = $('[data-command]', event.currentTarget.closest('.install-command')).textContent;
      await copyText(command);
      const old = event.currentTarget.textContent;
      event.currentTarget.textContent = 'Copied';
      setTimeout(() => event.currentTarget.textContent = old, 1400);
    }));
  }

  function initPointerEffects() {
    const cursor = $('.cursor');
    if (cursor && !reduced) {
      addEventListener('pointermove', event => {
        cursor.classList.add('is-active');
        if (hasGSAP) gsap.to(cursor, { x: event.clientX, y: event.clientY, duration: .22, ease: 'power2.out' });
        else cursor.style.transform = `translate(${event.clientX}px,${event.clientY}px)`;
      }, { passive: true });
      $$('a,button,[data-drag-rail]').forEach(node => {
        node.addEventListener('pointerenter', () => cursor.classList.add('is-hover'));
        node.addEventListener('pointerleave', () => cursor.classList.remove('is-hover'));
      });
    }
    if (matchMedia('(pointer:fine)').matches && hasGSAP && !reduced) {
      $$('.magnetic').forEach(node => {
        node.addEventListener('pointermove', event => {
          const rect = node.getBoundingClientRect();
          gsap.to(node, { x: (event.clientX - rect.left - rect.width / 2) * .16, y: (event.clientY - rect.top - rect.height / 2) * .16, duration: .4 });
        });
        node.addEventListener('pointerleave', () => gsap.to(node, { x: 0, y: 0, duration: .7, ease: 'elastic.out(1,.35)' }));
      });
    }
  }

  function initAnchors() {
    $$('a[href^="#"]').forEach(link => link.addEventListener('click', event => {
      const target = $(link.getAttribute('href'));
      if (!target) return;
      event.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: 0 });
      else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    }));
  }

  async function boot() {
    $('[data-year]').textContent = new Date().getFullYear();
    initPackages();
    initFaq();
    initDragRail();
    initAmbientVideo();
    initModals();
    initPointerEffects();
    initAnchors();
    await initLoader();
    initLenis();
    initHeader();
    initMenu();
    initMotion();
    document.body.classList.add('is-ready');
    if (hasGSAP) ScrollTrigger.refresh();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
