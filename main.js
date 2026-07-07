(function () {
    'use strict';

    const services = [
        {
            title: 'Customer Support',
            category: 'Omnichannel CX',
            description: 'Professional customer experience management across voice, chat, email, and social channels with structured QA and performance reporting.',
            deliverables: [
                '24/7 India-based support coverage',
                'Quality assurance and calibration programs',
                'CRM and ticketing platform integration',
                'Escalation management and SLA governance'
            ]
        },
        {
            title: 'Finance & Accounting',
            category: 'F&A Operations',
            description: 'Reliable finance and accounting support including transaction processing, reconciliations, payroll, and compliance reporting.',
            deliverables: [
                'Accounts payable and receivable processing',
                'Payroll and reimbursement administration',
                'Month-end close assistance',
                'Well-organized financial documentation'
            ]
        },
        {
            title: 'Human Resources',
            category: 'Talent Solutions',
            description: 'End-to-end HR support covering recruitment, onboarding, employee services, and HRIS administration.',
            deliverables: [
                'Recruitment process outsourcing',
                'Employee onboarding and offboarding',
                'Benefits and policy administration',
                'HR helpdesk and case management'
            ]
        },
        {
            title: 'IT Help Desk',
            category: 'Technical Support',
            description: 'Structured IT support for software, hardware, and infrastructure issues with defined escalation paths and resolution targets.',
            deliverables: [
                'Tier 1–3 support operations',
                'Incident and request management',
                'Knowledge base maintenance',
                'Service desk reporting and SLA tracking'
            ]
        },
        {
            title: 'Sales & Lead Generation',
            category: 'Revenue Operations',
            description: 'Outbound and inside sales support designed to improve lead conversion, pipeline quality, and CRM hygiene.',
            deliverables: [
                'Lead qualification and appointment setting',
                'Inside and outbound sales execution',
                'CRM pipeline management',
                'Campaign performance reporting'
            ]
        },
        {
            title: 'Back Office Operations',
            category: 'Process Excellence',
            description: 'High-volume administrative and operational processing to improve throughput, accuracy, and turnaround time.',
            deliverables: [
                'Data entry and document processing',
                'Order and workflow management',
                'Process automation support',
                'Operational quality audits'
            ]
        }
    ];

    function initPreloader() {
        const preloader = document.getElementById('preloader');
        const progress = document.getElementById('preloader-progress');
        if (!preloader || !progress) return;
        let pct = 0;

        const tick = setInterval(() => {
            pct += Math.random() * 18 + 8;
            if (pct >= 100) {
                clearInterval(tick);
                progress.style.width = '100%';
                setTimeout(() => preloader.classList.add('hidden'), 250);
                return;
            }
            progress.style.width = pct + '%';
        }, 90);
    }

    function initHeroVideo() {
        const videos = document.querySelectorAll('.hero-video');
        if (!videos.length) return;

        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        videos.forEach(video => {
            if (reducedMotion) {
                video.removeAttribute('autoplay');
                return;
            }
            video.muted = true;
            const play = () => video.play().catch(() => {});
            if (video.readyState >= 2) play();
            else video.addEventListener('loadeddata', play, { once: true });
        });
    }

    function initParallax() {
        const wrapper = document.querySelector('[data-parallax]');
        if (!wrapper || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        window.addEventListener('scroll', () => {
            const hero = document.getElementById('hero');
            if (!hero) return;
            const rect = hero.getBoundingClientRect();
            if (rect.bottom > 0 && rect.top < window.innerHeight) {
                const offset = (window.scrollY - hero.offsetTop) * 0.06;
                wrapper.style.setProperty('--scroll-y', `${Math.min(offset, 40)}px`);
            }
        }, { passive: true });
    }



    function initStickyCta() {
        const bar = document.getElementById('sticky-cta');
        if (!bar) return;

        const contact = document.getElementById('contact');
        const showAfter = 480;

        function update() {
            const nearContact = contact && contact.getBoundingClientRect().top < window.innerHeight * 0.75;
            const show = window.scrollY > showAfter && !nearContact;
            bar.hidden = !show;
        }

        window.addEventListener('scroll', update, { passive: true });
        update();
    }

    function initNav() {
        const nav = document.getElementById('nav');
        const toggle = document.getElementById('nav-toggle');
        const menu = document.getElementById('mobile-menu');
        const sections = ['services', 'why', 'india', 'process', 'contact'];
        const links = document.querySelectorAll('.nav-link');

        const isAboutPage = document.body.classList.contains('page-about');

        window.addEventListener('scroll', () => {
            if (!isAboutPage) {
                nav.classList.toggle('scrolled', window.scrollY > 48);
            }

            let current = '';
            sections.forEach(id => {
                const el = document.getElementById(id);
                if (el && el.getBoundingClientRect().top <= 110) current = id;
            });
            links.forEach(link => {
                link.classList.toggle('active', link.getAttribute('href') === '#' + current);
            });
        });

        toggle.addEventListener('click', () => {
            const open = menu.classList.toggle('open');
            toggle.classList.toggle('active', open);
            toggle.setAttribute('aria-expanded', open);
            document.body.style.overflow = open ? 'hidden' : '';
        });

        menu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                menu.classList.remove('open');
                toggle.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }

    function initReveal() {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    }

    function initCounters() {
        const counters = document.querySelectorAll('.stat-value[data-target]');
        const section = document.querySelector('.stats-bar');
        if (!section || !counters.length) return;

        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const observer = new IntersectionObserver(entries => {
            if (!entries[0].isIntersecting) return;
            counters.forEach(counter => {
                const target = parseInt(counter.dataset.target, 10);
                const suffix = counter.dataset.suffix || '';

                function format(value) {
                    if (target >= 1000) return Math.floor(value).toLocaleString() + suffix;
                    return Math.floor(value) + suffix;
                }

                if (reducedMotion) {
                    counter.textContent = format(target);
                    return;
                }

                const duration = 1400;
                const start = performance.now();

                function step(now) {
                    const progress = Math.min((now - start) / duration, 1);
                    const eased = 1 - Math.pow(1 - progress, 3);
                    counter.textContent = format(target * eased);
                    if (progress < 1) requestAnimationFrame(step);
                    else counter.textContent = format(target);
                }

                requestAnimationFrame(step);
            });
            observer.disconnect();
        }, { threshold: 0.4 });

        observer.observe(section);
    }

    function initMetricBars() {
        const bars = document.querySelectorAll('.metric-fill');
        const section = document.getElementById('why');
        if (!section) return;

        const observer = new IntersectionObserver(entries => {
            if (!entries[0].isIntersecting) return;
            bars.forEach(bar => { bar.style.width = bar.dataset.width + '%'; });
            observer.disconnect();
        }, { threshold: 0.25 });

        observer.observe(section);
    }

    function initServiceModal() {
        const modal = document.getElementById('service-modal');
        const body = document.getElementById('service-modal-body');
        const closeBtn = modal.querySelector('.modal-close');
        const backdrop = modal.querySelector('.modal-backdrop');

        function open(index) {
            const service = services[index];
            body.innerHTML = `
                <div class="modal-category">${service.category}</div>
                <h3>${service.title}</h3>
                <p>${service.description}</p>
                <ul>${service.deliverables.map(item => `<li>${item}</li>`).join('')}</ul>
            `;
            modal.classList.add('open');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        }

        function close() {
            modal.classList.remove('open');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }

        document.querySelectorAll('.service-card').forEach(card => {
            const index = parseInt(card.dataset.service, 10);
            card.addEventListener('click', () => open(index));
            card.setAttribute('tabindex', '0');
            card.setAttribute('role', 'button');
            card.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    open(index);
                }
            });
        });

        closeBtn.addEventListener('click', close);
        backdrop.addEventListener('click', close);
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && modal.classList.contains('open')) close();
        });
    }

    function initAccordion() {
        document.querySelectorAll('.accordion-item').forEach(item => {
            const trigger = item.querySelector('.accordion-trigger');
            trigger.addEventListener('click', () => {
                const isOpen = item.classList.contains('open');
                document.querySelectorAll('.accordion-item').forEach(i => {
                    i.classList.remove('open');
                    i.querySelector('.accordion-trigger').setAttribute('aria-expanded', 'false');
                });
                if (!isOpen) {
                    item.classList.add('open');
                    trigger.setAttribute('aria-expanded', 'true');
                }
            });
        });
    }

    const FORM_ENDPOINT = 'https://formsubmit.co/ajax/info@trinitasnxt.in';

    function formToPayload(form) {
        const payload = {
            _subject: 'New inquiry — Trinitas website',
            _template: 'table',
            _captcha: 'false'
        };
        Array.from(form.elements).forEach(el => {
            if (!el.name || el.disabled) return;
            if (el.name.startsWith('_') && el.name !== '_honey') return;
            if ((el.type === 'radio' || el.type === 'checkbox') && !el.checked) return;
            if (el.type === 'submit' || el.type === 'button') return;
            payload[el.name] = el.value;
        });
        return payload;
    }

    function initForm() {
        const form = document.getElementById('contact-form');
        const success = document.getElementById('form-success');
        const error = document.getElementById('form-error');
        const nextField = document.getElementById('form-next');
        if (!form) return;

        if (nextField) {
            nextField.value = new URL('thank-you.html', window.location.href).href;
        }

        form.addEventListener('submit', async e => {
            e.preventDefault();
            const button = form.querySelector('button[type="submit"]');
            const fields = form.querySelectorAll('.form-field');

            button.disabled = true;
            button.textContent = 'Submitting...';
            success.hidden = true;
            error.hidden = true;

            try {
                const response = await fetch(FORM_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(formToPayload(form))
                });

                const data = await response.json().catch(() => ({}));
                if (!response.ok || data.success === false) {
                    throw new Error('submit-failed');
                }

                fields.forEach(field => { field.style.display = 'none'; });
                button.style.display = 'none';
                success.hidden = false;
                form.reset();
            } catch {
                button.disabled = false;
                button.textContent = 'Submit Inquiry';
                error.hidden = false;
            }
        });
    }

    function initBackToTop() {
        const btn = document.getElementById('back-top');
        window.addEventListener('scroll', () => {
            btn.classList.toggle('show', window.scrollY > 600);
        });
        btn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', e => {
                const target = document.querySelector(anchor.getAttribute('href'));
                if (!target) return;
                e.preventDefault();
                const top = target.getBoundingClientRect().top + window.scrollY - 76;
                window.scrollTo({ top, behavior: 'smooth' });
            });
        });
    }

    const VOICE_FAQ = [
        { keys: ['service', 'support', 'bpo', 'outsource', 'offer'], reply: 'Trinitas delivers customer support, finance & accounting, HR, IT help desk, sales, and back-office operations — all from a 100% work-from-home model in India.' },
        { keys: ['career', 'job', 'apply', 'assessment', 'hiring', 'work from home'], reply: 'Visit our Careers page to register and complete the preliminary skills assessment. Shortlisted candidates may receive a Second Attempt with advanced questions.' },
        { keys: ['contact', 'email', 'proposal', 'reach', 'inquiry'], reply: 'Email info@trinitasnxt.in or use the contact form on this page. Our team responds within one business day and prepares proposals within 48 hours.' },
        { keys: ['india', 'remote', 'location', 'where'], reply: 'We are an India-based BPO with a fully remote delivery model — secure, SLA-driven, and built to scale.' },
        { keys: ['hello', 'hi', 'hey', 'good morning', 'good afternoon'], reply: 'Hello! I am the Trinitas assistant. Ask me about our services, careers, or how to get in touch.' }
    ];

    function matchVoiceReply(text) {
        const lower = text.toLowerCase();
        for (const item of VOICE_FAQ) {
            if (item.keys.some(k => lower.includes(k))) return item.reply;
        }
        return 'I can help with Trinitas services, careers and assessments, or contact details. Try asking about customer support, applying for a job, or how to request a proposal.';
    }

    function initVoiceAgent() {
        const fab = document.getElementById('voice-agent-fab');
        const panel = document.getElementById('voice-agent');
        const closeBtn = document.getElementById('voice-agent-close');
        const form = document.getElementById('voice-agent-form');
        const input = document.getElementById('voice-agent-text');
        const micBtn = document.getElementById('voice-agent-mic');
        const messages = document.getElementById('voice-agent-messages');
        if (!fab || !panel) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        let recognition = null;
        let listening = false;

        function speak(text) {
            if (!window.speechSynthesis) return;
            window.speechSynthesis.cancel();
            const utter = new SpeechSynthesisUtterance(text);
            utter.rate = 1;
            utter.pitch = 1;
            window.speechSynthesis.speak(utter);
        }

        function addMessage(text, role) {
            const el = document.createElement('div');
            el.className = `voice-agent-msg voice-agent-msg--${role}`;
            el.textContent = text;
            messages.appendChild(el);
            messages.scrollTop = messages.scrollHeight;
        }

        function respond(userText) {
            const reply = matchVoiceReply(userText);
            addMessage(reply, 'bot');
            speak(reply);
        }

        function setOpen(open) {
            panel.hidden = !open;
            fab.setAttribute('aria-expanded', String(open));
            if (open && messages.childElementCount === 0) {
                const welcome = 'Hi! I am the Trinitas voice assistant. Ask about our BPO services, careers, or how to contact us.';
                addMessage(welcome, 'bot');
            }
            if (open) input.focus();
        }

        fab.addEventListener('click', () => setOpen(panel.hidden));
        closeBtn.addEventListener('click', () => setOpen(false));

        form.addEventListener('submit', e => {
            e.preventDefault();
            const text = input.value.trim();
            if (!text) return;
            addMessage(text, 'user');
            input.value = '';
            respond(text);
        });

        if (SpeechRecognition) {
            recognition = new SpeechRecognition();
            recognition.lang = 'en-IN';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;
            recognition.onresult = e => {
                const text = e.results[0][0].transcript.trim();
                if (text) {
                    addMessage(text, 'user');
                    respond(text);
                }
            };
            recognition.onend = () => {
                listening = false;
                micBtn.classList.remove('voice-agent-mic--active');
            };
            recognition.onerror = () => {
                listening = false;
                micBtn.classList.remove('voice-agent-mic--active');
            };
            micBtn.addEventListener('click', () => {
                if (listening) {
                    recognition.stop();
                    return;
                }
                listening = true;
                micBtn.classList.add('voice-agent-mic--active');
                recognition.start();
            });
        } else {
            micBtn.disabled = true;
            micBtn.title = 'Voice input not supported in this browser';
        }
    }

    function init() {
        initPreloader();
        initHeroVideo();
        initNav();
        initReveal();
        initCounters();
        initMetricBars();
        initParallax();
        initStickyCta();

        if (document.getElementById('service-modal')) initServiceModal();
        if (document.querySelector('.accordion')) initAccordion();
        if (document.getElementById('contact-form')) initForm();
        if (document.getElementById('voice-agent')) initVoiceAgent();
        initBackToTop();
        initSmoothScroll();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();