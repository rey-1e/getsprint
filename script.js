document.addEventListener('DOMContentLoaded', () => {

  // 1. Mail Delivery & Feedback Engine
  const supportForm = document.getElementById('supportForm') || document.getElementById('feedbackForm');
  const supportEmail = document.getElementById('supportEmail') || document.getElementById('feedbackEmail');
  const supportMessage = document.getElementById('supportMessage') || document.getElementById('feedbackMessage');
  const supportSubmitBtn = document.getElementById('supportSubmitBtn') || document.getElementById('feedbackSubmitBtn');
  const supportFeedback = document.getElementById('supportFeedback') || document.getElementById('formFeedback');

  if (supportForm && supportEmail && supportMessage && supportFeedback) {
    supportForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const emailVal = supportEmail.value.trim();
      const messageVal = supportMessage.value.trim();

      if (emailVal && messageVal) {
        const originalBtnText = supportSubmitBtn.textContent;
        supportSubmitBtn.textContent = "Sending Request...";
        supportSubmitBtn.disabled = true;

        fetch("https://formsubmit.co/ajax/kanaderaj1216@gmail.com", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            email: emailVal,
            message: messageVal,
            _subject: "Sprint - Help Desk Support Request"
          })
        })
        .then(response => {
          if (response.ok) {
            supportFeedback.classList.remove('hidden');
            supportForm.reset();
            
            setTimeout(() => {
              supportFeedback.classList.add('hidden');
            }, 5000);
          } else {
            alert("Unable to route support ticket. Please try again.");
          }
        })
        .catch(err => {
          console.error("Transmission error:", err);
          alert("Network failure. Please review your internet connection and try again.");
        })
        .finally(() => {
          supportSubmitBtn.textContent = originalBtnText;
          supportSubmitBtn.disabled = false;
        });
      }
    });
  }

  // 2. Interactive Panel Custom Tabs (Diagnostic Feature Spec Visualizer)
  const subTabs = document.querySelectorAll('.sub-tab');
  const subPanes = document.querySelectorAll('.submission-pane');

  if (subTabs.length > 0 && subPanes.length > 0) {
    subTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        subTabs.forEach(t => t.classList.remove('active'));
        subPanes.forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        const targetPaneId = `pane-${tab.getAttribute('data-tab')}`;
        const targetPane = document.getElementById(targetPaneId);
        if (targetPane) {
          targetPane.classList.add('active');
        }
      });
    });
  }
});