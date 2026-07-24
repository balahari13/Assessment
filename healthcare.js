(function () {
    'use strict';

    function initWizard() {
        const root = document.getElementById('hc-wizard');
        if (!root) return;

        const steps = Array.from(root.querySelectorAll('.wizard-step'));
        const total = steps.length;
        let index = 0;

        const label = document.getElementById('wizard-step-label');
        const fill = document.getElementById('wizard-progress-fill');
        const backBtn = document.getElementById('wizard-back');
        const nextBtn = document.getElementById('wizard-next');

        function render() {
            steps.forEach((el, i) => {
                el.hidden = i !== index;
            });
            if (label) label.textContent = `Step ${index + 1} of ${total}`;
            if (fill) fill.style.width = `${Math.round(((index + 1) / total) * 100)}%`;
            if (backBtn) backBtn.hidden = index === 0;
            if (nextBtn) {
                nextBtn.textContent = index >= total - 1 ? 'Finish' : 'Next step';
            }
            root.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        if (backBtn) {
            backBtn.addEventListener('click', () => {
                if (index > 0) {
                    index -= 1;
                    render();
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (index < total - 1) {
                    index += 1;
                    render();
                } else {
                    window.location.href = 'careers.html#register';
                }
            });
        }

        render();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWizard);
    } else {
        initWizard();
    }
})();
