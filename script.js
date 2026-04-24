document.addEventListener('DOMContentLoaded', () => {

    // --- MOTION STYLE UI UPGRADE --- //

    // 1. Inject Lenis for Smooth Scrolling
    const lenisScript = document.createElement('script');
    lenisScript.src = "https://unpkg.com/@studio-freight/lenis@1.0.39/dist/lenis.min.js";
    document.head.appendChild(lenisScript);
    
    lenisScript.onload = () => {
        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), 
            direction: 'vertical',
            gestureDirection: 'vertical',
            smooth: true,
            mouseMultiplier: 1,
            smoothTouch: false,
            touchMultiplier: 2,
            infinite: false,
        });

        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
    };

    // 2. Inject Page Transition Overlay
    const pageTransition = document.createElement('div');
    pageTransition.className = 'page-transition';
    document.body.appendChild(pageTransition);

    // 3. Inject GSAP and Initialize Target Cursor
    const gsapScript = document.createElement('script');
    gsapScript.src = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js";
    document.head.appendChild(gsapScript);

    gsapScript.onload = () => {
        initTargetCursor();
    };

    function initTargetCursor() {
        const isMobile = (() => {
            const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            const isSmallScreen = window.innerWidth <= 768;
            const userAgent = navigator.userAgent || navigator.vendor || window.opera;
            const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
            return (hasTouchScreen && isSmallScreen) || mobileRegex.test(userAgent.toLowerCase());
        })();

        if (isMobile) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'target-cursor-wrapper';
        wrapper.innerHTML = `
            <div class="target-cursor-dot"></div>
            <div class="target-cursor-corner corner-tl"></div>
            <div class="target-cursor-corner corner-tr"></div>
            <div class="target-cursor-corner corner-br"></div>
            <div class="target-cursor-corner corner-bl"></div>
        `;
        document.body.appendChild(wrapper);

        const cursor = wrapper;
        const dot = wrapper.querySelector('.target-cursor-dot');
        const corners = Array.from(wrapper.querySelectorAll('.target-cursor-corner'));

        const targetSelector = 'a, button, .btn, .card, .skill-card, .timeline-content';
        const spinDuration = 2;
        const hoverDuration = 0.2;
        const parallaxOn = true;
        const constants = { borderWidth: 3, cornerSize: 12 };

        let isActive = false;
        let targetCornerPositions = null;
        let activeStrength = { current: 0 };
        let activeTarget = null;
        let currentLeaveHandler = null;
        let resumeTimeout = null;
        let spinTl = null;
        let tickerFn = null;

        document.body.style.cursor = 'none';

        gsap.set(cursor, { xPercent: -50, yPercent: -50, x: window.innerWidth / 2, y: window.innerHeight / 2 });

        const createSpinTimeline = () => {
            if (spinTl) spinTl.kill();
            spinTl = gsap.timeline({ repeat: -1 }).to(cursor, { rotation: '+=360', duration: spinDuration, ease: 'none' });
        };
        createSpinTimeline();

        const moveCursor = (x, y) => { gsap.to(cursor, { x, y, duration: 0.1, ease: 'power3.out' }); };

        const cleanupTarget = (target) => {
            if (currentLeaveHandler) target.removeEventListener('mouseleave', currentLeaveHandler);
            currentLeaveHandler = null;
        };

        tickerFn = () => {
            if (!targetCornerPositions || !cursor || !corners.length) return;
            const strength = activeStrength.current;
            if (strength === 0) return;

            const cursorX = gsap.getProperty(cursor, 'x');
            const cursorY = gsap.getProperty(cursor, 'y');

            corners.forEach((corner, i) => {
                const currentX = gsap.getProperty(corner, 'x');
                const currentY = gsap.getProperty(corner, 'y');
                const targetX = targetCornerPositions[i].x - cursorX;
                const targetY = targetCornerPositions[i].y - cursorY;
                const finalX = currentX + (targetX - currentX) * strength;
                const finalY = currentY + (targetY - currentY) * strength;
                const duration = strength >= 0.99 ? (parallaxOn ? 0.2 : 0) : 0.05;

                gsap.to(corner, { x: finalX, y: finalY, duration: duration, ease: duration === 0 ? 'none' : 'power1.out', overwrite: 'auto' });
            });
        };

        const moveHandler = e => {
            moveCursor(e.clientX, e.clientY);
            // Basic Blob Physics
            const blobs = document.querySelectorAll('.blob');
            blobs.forEach((blob, index) => {
                const speed = (index + 1) * 0.05;
                const x = (e.clientX - window.innerWidth / 2) * speed;
                const y = (e.clientY - window.innerHeight / 2) * speed;
                blob.style.transform = `translate(${x}px, ${y}px)`;
            });
        };
        window.addEventListener('mousemove', moveHandler);

        const scrollHandler = () => {
            if (!activeTarget || !cursor) return;
            const mouseX = gsap.getProperty(cursor, 'x');
            const mouseY = gsap.getProperty(cursor, 'y');
            const elementUnderMouse = document.elementFromPoint(mouseX, mouseY);
            const isStillOverTarget = elementUnderMouse && (elementUnderMouse === activeTarget || elementUnderMouse.closest(targetSelector) === activeTarget);
            if (!isStillOverTarget && currentLeaveHandler) currentLeaveHandler();
        };
        window.addEventListener('scroll', scrollHandler, { passive: true });

        window.addEventListener('mousedown', () => {
            if (dot) gsap.to(dot, { scale: 0.7, duration: 0.3 });
            if (cursor) gsap.to(cursor, { scale: 0.9, duration: 0.2 });
        });
        window.addEventListener('mouseup', () => {
            if (dot) gsap.to(dot, { scale: 1, duration: 0.3 });
            if (cursor) gsap.to(cursor, { scale: 1, duration: 0.2 });
        });

        const enterHandler = e => {
            const directTarget = e.target;
            const allTargets = [];
            let current = directTarget;
            while (current && current !== document.body) {
                if (current.matches && current.matches(targetSelector)) allTargets.push(current);
                current = current.parentElement;
            }
            const target = allTargets[0] || null;
            if (!target || !cursor || !corners.length) return;
            if (activeTarget === target) return;
            
            if (activeTarget) cleanupTarget(activeTarget);
            if (resumeTimeout) { clearTimeout(resumeTimeout); resumeTimeout = null; }

            activeTarget = target;
            corners.forEach(corner => gsap.killTweensOf(corner));
            gsap.killTweensOf(cursor, 'rotation');
            if (spinTl) spinTl.pause();
            gsap.set(cursor, { rotation: 0 });

            const rect = target.getBoundingClientRect();
            const { borderWidth, cornerSize } = constants;
            const cursorX = gsap.getProperty(cursor, 'x');
            const cursorY = gsap.getProperty(cursor, 'y');

            targetCornerPositions = [
                { x: rect.left - borderWidth, y: rect.top - borderWidth },
                { x: rect.right + borderWidth - cornerSize, y: rect.top - borderWidth },
                { x: rect.right + borderWidth - cornerSize, y: rect.bottom + borderWidth - cornerSize },
                { x: rect.left - borderWidth, y: rect.bottom + borderWidth - cornerSize }
            ];

            isActive = true;
            gsap.ticker.add(tickerFn);

            gsap.to(activeStrength, { current: 1, duration: hoverDuration, ease: 'power2.out' });

            corners.forEach((corner, i) => {
                gsap.to(corner, { x: targetCornerPositions[i].x - cursorX, y: targetCornerPositions[i].y - cursorY, duration: 0.2, ease: 'power2.out' });
            });

            const leaveHandler = () => {
                gsap.ticker.remove(tickerFn);
                isActive = false;
                targetCornerPositions = null;
                gsap.set(activeStrength, { current: 0, overwrite: true });
                activeTarget = null;

                gsap.killTweensOf(corners);
                const { cornerSize } = constants;
                const positions = [
                    { x: -cornerSize * 1.5, y: -cornerSize * 1.5 },
                    { x: cornerSize * 0.5, y: -cornerSize * 1.5 },
                    { x: cornerSize * 0.5, y: cornerSize * 0.5 },
                    { x: -cornerSize * 1.5, y: cornerSize * 0.5 }
                ];
                const tl = gsap.timeline();
                corners.forEach((corner, index) => {
                    tl.to(corner, { x: positions[index].x, y: positions[index].y, duration: 0.3, ease: 'power3.out' }, 0);
                });

                resumeTimeout = setTimeout(() => {
                    if (!activeTarget && cursor && spinTl) {
                        const currentRotation = gsap.getProperty(cursor, 'rotation');
                        const normalizedRotation = currentRotation % 360;
                        spinTl.kill();
                        spinTl = gsap.timeline({ repeat: -1 }).to(cursor, { rotation: '+=360', duration: spinDuration, ease: 'none' });
                        gsap.to(cursor, {
                            rotation: normalizedRotation + 360,
                            duration: spinDuration * (1 - normalizedRotation / 360),
                            ease: 'none',
                            onComplete: () => { spinTl.restart(); }
                        });
                    }
                    resumeTimeout = null;
                }, 50);

                cleanupTarget(target);
            };

            currentLeaveHandler = leaveHandler;
            target.addEventListener('mouseleave', leaveHandler);
        };

        window.addEventListener('mouseover', enterHandler, { passive: true });
    }

    // 4. Handle Page Transitions 
    const internalLinks = document.querySelectorAll('a[href]:not([target="_blank"]):not([href^="#"])');
    internalLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            // Check if it's a real navigation link, not a script handler
            if (href && !href.startsWith('mailto:') && !href.startsWith('tel:') && !link.onclick) {
                // Let the Wink Emoji effect play out if it's there
                if (!link.closest('header')) {
                    e.preventDefault();
                    pageTransition.classList.add('active');
                    setTimeout(() => {
                        window.location.href = href;
                    }, 500); // Wait for transition animation
                }
            }
        });
    });

    // 5. Handle Card Redirects Globally
    document.querySelectorAll('.timeline-content.card, .timeline-content.border-glow-card').forEach(card => {
        // Only apply pointer logic if it has an actionable element or redirect
        if (card.hasAttribute('data-redirect') || card.querySelector('a')) {
            if (!card.style.cursor) {
                card.style.cursor = 'pointer';
            }
        }
        
        card.addEventListener('click', (e) => {
            // Ignore if they explicitly clicked a button/link inside (let it act naturally)
            if (e.target.closest('a') || e.target.closest('button')) return;

            // Otherwise, trigger the primary action
            if (card.hasAttribute('data-redirect')) {
                const href = card.getAttribute('data-redirect');
                if (href) {
                    pageTransition.classList.add('active');
                    setTimeout(() => {
                        window.location.href = href;
                    }, 500);
                }
                return;
            }

            // Fallback: click the first link
            const firstLink = card.querySelector('a');
            if (firstLink) {
                const href = firstLink.getAttribute('href');
                if (firstLink.getAttribute('target') === '_blank') {
                    window.open(href, '_blank');
                } else if (href && !href.startsWith('#')) {
                    pageTransition.classList.add('active');
                    setTimeout(() => {
                        window.location.href = href;
                    }, 500);
                }
            }
        });
    });

    // --- EXISTING PORTFOLIO LOGIC PRESERVED --- //

    // 1. Mobile Navigation Toggle
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    const links = document.querySelectorAll('.nav-links li a');

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            hamburger.classList.toggle('active');
        });
    }

    // Close mobile menu when a link is clicked
    links.forEach(link => {
        link.addEventListener('click', function() {
            const href = this.getAttribute('href');
            const isPageTransition = href && href !== '#' && !href.startsWith('#') && !this.target;
            
            if (isPageTransition) {
                // On mobile, keep the menu open for 1000ms so the wink emoji stays fully visible
                // during the page transition delay.
                setTimeout(() => {
                    if (navLinks.classList.contains('active')) {
                        navLinks.classList.remove('active');
                        hamburger.classList.remove('active');
                    }
                }, 1000);
            } else {
                // For anchor/same-page links, close immediately
                if (navLinks.classList.contains('active')) {
                    navLinks.classList.remove('active');
                    hamburger.classList.remove('active');
                }
            }
        });
    });

    // 2. Sticky Header changing on scroll
    const header = document.querySelector('header');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // 3. Smooth Scrolling for Anchor Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                // Adjust for sticky header height
                const headerHeight = header.offsetHeight;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerHeight;
  
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // 4. Scroll Reveal Animations (Intersection Observer)
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Stop observing once animated
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Target elements to animate
    const slideUpElements = document.querySelectorAll('.slide-up');
    
    // Add initial styles dynamically if JS is enabled
    slideUpElements.forEach(el => {
        observer.observe(el);
    });
    
    // Typewriter effect enhancement
    const roleSpan = document.querySelector('.typewriter');
    if (roleSpan) {
        const text = roleSpan.innerText;
        roleSpan.innerText = '';
        let i = 0;
        
        function typeWriter() {
            if (i < text.length) {
                roleSpan.innerHTML += text.charAt(i);
                i++;
                setTimeout(typeWriter, 100);
            } else {
                // Add blinking cursor
                roleSpan.style.borderRight = "2px solid var(--primary)";
                setInterval(() => {
                    roleSpan.style.borderColor = roleSpan.style.borderColor === 'transparent' ? 'var(--primary)' : 'transparent';
                }, 500);
            }
        }
        
        // Start typing after initial load/fade-in
        setTimeout(typeWriter, 500);
    }

    // 5. Profile Picture Tilt Animation
    const wrap = document.querySelector('.hero-image');
    const shell = document.querySelector('.image-container');
    
    if (shell && wrap) {
        let running = false;
        let currentX = 0; let currentY = 0;
        let targetX = 0; let targetY = 0;
        let rafId = null;

        const setVarsFromXY = (x, y) => {
            const width = shell.clientWidth || 1;
            const height = shell.clientHeight || 1;

            const percentX = Math.min(Math.max((100 / width) * x, 0), 100);
            const percentY = Math.min(Math.max((100 / height) * y, 0), 100);

            const centerX = percentX - 50;
            const centerY = percentY - 50;

            shell.style.setProperty('--rotate-x', `${-(centerX / 5)}deg`);
            shell.style.setProperty('--rotate-y', `${(centerY / 4)}deg`);
            shell.style.setProperty('--pointer-x', `${percentX}%`);
            shell.style.setProperty('--pointer-y', `${percentY}%`);
        };

        const step = () => {
            if (!running) return;
            
            // Smoothen movement
            currentX += (targetX - currentX) * 0.14;
            currentY += (targetY - currentY) * 0.14;

            setVarsFromXY(currentX, currentY);

            if (Math.abs(targetX - currentX) > 0.5 || Math.abs(targetY - currentY) > 0.5) {
                rafId = requestAnimationFrame(step);
            } else {
                running = false;
                cancelAnimationFrame(rafId);
            }
        };

        const setTarget = (x, y) => {
            targetX = x; targetY = y;
            if (!running) {
                running = true;
                rafId = requestAnimationFrame(step);
            }
        };

        shell.addEventListener('pointerenter', (e) => {
            const rect = shell.getBoundingClientRect();
            setTarget(e.clientX - rect.left, e.clientY - rect.top);
        });

        shell.addEventListener('pointermove', (e) => {
            const rect = shell.getBoundingClientRect();
            setTarget(e.clientX - rect.left, e.clientY - rect.top);
        });

        shell.addEventListener('pointerleave', () => {
            // Return to center
            setTarget(shell.clientWidth / 2, shell.clientHeight / 2);
        });

        // Initialize center position
        setTarget(shell.clientWidth / 2, shell.clientHeight / 2);
    }

    // Code Protection: Disable right-click and common inspection keys
    document.addEventListener('contextmenu', function(e) { e.preventDefault(); });
    document.addEventListener('keydown', function(e) {
        if(e.keyCode == 123) { e.preventDefault(); return false; }
        if(e.ctrlKey && e.shiftKey && e.keyCode == 73) { e.preventDefault(); return false; }
        if(e.ctrlKey && e.shiftKey && e.keyCode == 67) { e.preventDefault(); return false; }
        if(e.ctrlKey && e.shiftKey && e.keyCode == 74) { e.preventDefault(); return false; }
        if(e.ctrlKey && e.keyCode == 85) { e.preventDefault(); return false; }
    });

    // 6. Header Button Wink Emoji Effect
    const headerLinks = document.querySelectorAll('header a');
    headerLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            if (this.dataset.winking) return;
            this.dataset.winking = true;
            
            const originalHTML = this.innerHTML;
            this.innerHTML = '<span class="inline-wink">😉</span>';
            
            if (href && href !== '#' && !href.startsWith('#') && !this.target) {
                e.preventDefault();
                // Play page transition early
                pageTransition.classList.add('active');
                setTimeout(() => {
                    this.innerHTML = originalHTML;
                    delete this.dataset.winking;
                    window.location.href = href;
                }, 1000);
            } else {
                setTimeout(() => {
                    this.innerHTML = originalHTML;
                    delete this.dataset.winking;
                }, 1000);
            }
        });
    });

    // 7. Border Glow Portfolio Cards Pointer Logic
    const borderGlowCards = document.querySelectorAll('.border-glow-card');
    borderGlowCards.forEach(card => {
        card.addEventListener('pointermove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const width = rect.width;
            const height = rect.height;
            const cx = width / 2;
            const cy = height / 2;

            const dx = x - cx;
            const dy = y - cy;

            let kx = Infinity;
            let ky = Infinity;
            if (dx !== 0) kx = cx / Math.abs(dx);
            if (dy !== 0) ky = cy / Math.abs(dy);

            const edge = Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
            
            let degrees = 0;
            if (dx !== 0 || dy !== 0) {
                const radians = Math.atan2(dy, dx);
                degrees = radians * (180 / Math.PI) + 90;
                if (degrees < 0) degrees += 360;
            }

            card.style.setProperty('--edge-proximity', `${(edge * 100).toFixed(3)}`);
            card.style.setProperty('--cursor-angle', `${degrees.toFixed(3)}deg`);
        });

        card.addEventListener('pointerleave', () => {
            card.style.setProperty('--edge-proximity', '0');
        });
    });
});
