document.addEventListener('DOMContentLoaded', () => {

  // ── Support / Feedback Form Handler ──────────────────────────────────────
  const supportForm    = document.getElementById('supportForm') || document.getElementById('feedbackForm');
  const supportEmail   = document.getElementById('supportEmail') || document.getElementById('feedbackEmail');
  const supportMessage = document.getElementById('supportMessage') || document.getElementById('feedbackMessage');
  const submitBtn      = document.getElementById('supportSubmitBtn') || document.getElementById('feedbackSubmitBtn');
  const feedbackMsg    = document.getElementById('supportFeedback') || document.getElementById('formFeedback');

  if (supportForm && supportEmail && supportMessage && submitBtn && feedbackMsg) {
    supportForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const emailVal   = supportEmail.value.trim();
      const messageVal = supportMessage.value.trim();
      if (!emailVal || !messageVal) return;

      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Sending…';
      submitBtn.disabled = true;

      try {
        const res = await fetch('https://formsubmit.co/ajax/kanaderaj1216@gmail.com', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            email: emailVal,
            message: messageVal,
            _subject: 'Sprint — Support / Feedback Request'
          })
        });

        if (res.ok) {
          feedbackMsg.classList.remove('hidden');
          supportForm.reset();
          setTimeout(() => feedbackMsg.classList.add('hidden'), 6000);
        } else {
          alert('Unable to send. Please try again.');
        }
      } catch {
        alert('Network error. Please check your connection and try again.');
      } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  }

  // ── Features Page: Interactive Submission Panel Tabs ─────────────────────
  const subTabs  = document.querySelectorAll('.sub-tab');
  const subPanes = document.querySelectorAll('.submission-pane');

  if (subTabs.length && subPanes.length) {
    subTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        subTabs.forEach(t  => t.classList.remove('active'));
        subPanes.forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const pane = document.getElementById(`pane-${tab.dataset.tab}`);
        if (pane) pane.classList.add('active');
      });
    });
  }

  // ── Hero: Debugger popup dismiss ─────────────────────────────────────────
  const dismissBtn = document.querySelector('.debugger-btn');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      const popup = dismissBtn.closest('.debugger-popup');
      if (popup) popup.style.display = 'none';
    });
  }
});