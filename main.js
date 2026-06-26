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



    function initChartBars() {
        const chart = document.querySelector('.dashboard-chart');
        if (!chart) return;

        const observer = new IntersectionObserver(entries => {
            if (!entries[0].isIntersecting) return;
            chart.querySelectorAll('.chart-bar').forEach((bar, i) => {
                bar.style.animationDelay = `${i * 0.08}s`;
                bar.style.animationPlayState = 'running';
            });
            observer.disconnect();
        }, { threshold: 0.5 });

        chart.querySelectorAll('.chart-bar').forEach(bar => {
            bar.style.animationPlayState = 'paused';
        });
        observer.observe(chart);
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
        if (!section) return;

        const observer = new IntersectionObserver(entries => {
            if (!entries[0].isIntersecting) return;
            counters.forEach(counter => {
                const target = parseInt(counter.dataset.target, 10);
                const suffix = counter.dataset.suffix || '';
                const duration = 1400;
                const start = performance.now();

                function format(value) {
                    if (target >= 1000) return Math.floor(value).toLocaleString() + suffix;
                    return Math.floor(value) + suffix;
                }

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

    function init() {
        initPreloader();
        initHeroVideo();
        initNav();
        initReveal();
        initCounters();
        initMetricBars();
        initChartBars();
        initParallax();

        if (document.getElementById('service-modal')) initServiceModal();
        if (document.querySelector('.accordion')) initAccordion();
        if (document.getElementById('contact-form')) initForm();
        initBackToTop();
        initSmoothScroll();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();