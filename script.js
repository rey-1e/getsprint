document.addEventListener('DOMContentLoaded', () => {

  // 1. Mail Delivery & Feedback Engine
  const feedbackForm = document.getElementById('feedbackForm');
  const feedbackEmail = document.getElementById('feedbackEmail');
  const feedbackMessage = document.getElementById('feedbackMessage');
  const feedbackSubmitBtn = document.getElementById('feedbackSubmitBtn');
  const formFeedback = document.getElementById('formFeedback');

  if (feedbackForm && feedbackEmail && feedbackMessage && formFeedback) {
    feedbackForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const emailVal = feedbackEmail.value.trim();
      const messageVal = feedbackMessage.value.trim();

      if (emailVal && messageVal) {
        // Change button state to signify network transmission activity
        const originalBtnText = feedbackSubmitBtn.textContent;
        feedbackSubmitBtn.textContent = "Sending Feedback...";
        feedbackSubmitBtn.disabled = true;

        // AJAX Delivery via FormSubmit
        fetch("https://formsubmit.co/ajax/kanaderaj1216@gmail.com", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            email: emailVal,
            message: messageVal,
            _subject: "Sprint extension — New User Feedback"
          })
        })
        .then(response => {
          if (response.ok) {
            // Success State handling
            formFeedback.classList.remove('hidden');
            feedbackForm.reset();
            
            // Revert feedback message toast after 5 seconds
            setTimeout(() => {
              formFeedback.classList.add('hidden');
            }, 5000);
          } else {
            alert("Unable to route form submission. Please try again.");
          }
        })
        .catch(err => {
          console.error("Transmission error:", err);
          alert("Network failure. Please review your internet connection and try again.");
        })
        .finally(() => {
          // Revert button text and interactive state
          feedbackSubmitBtn.textContent = originalBtnText;
          feedbackSubmitBtn.disabled = false;
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
        // Reset active structures
        subTabs.forEach(t => t.classList.remove('active'));
        subPanes.forEach(p => p.classList.remove('active'));

        // Assign active values to target tab
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