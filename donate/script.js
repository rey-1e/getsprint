document.addEventListener('DOMContentLoaded', () => {

    // ── PUBLIC KEY CONFIGURATION ──
    // Replace this string with your Razorpay Public Test Key ID from your dashboard.
    // NEVER put your Key Secret here.
    const RAZORPAY_KEY_ID = "YOUR_RAZORPAY_TEST_KEY_ID"; 

    const presetButtons = document.querySelectorAll('.preset-btn');
    const customAmountInput = document.getElementById('custom-amount');
    const donationForm = document.getElementById('donation-form');
    
    const paymentContainer = document.getElementById('payment-container');
    const successContainer = document.getElementById('success-container');
    const txnIdDisplay = document.getElementById('txn-id');
    const txnAmountDisplay = document.getElementById('txn-amount');

    // 1. Preset Buttons Handler
    presetButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active classes
            presetButtons.forEach(btn => btn.classList.remove('active'));
            
            // Activate selected option
            button.classList.add('active');
            
            // Set input value
            const val = button.getAttribute('data-val');
            customAmountInput.value = val;
        });
    });

    // Reset preset buttons highlight if user manually types an arbitrary value
    customAmountInput.addEventListener('input', () => {
        const currentVal = customAmountInput.value.trim();
        presetButtons.forEach(btn => {
            if (btn.getAttribute('data-val') === currentVal) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    });

    // 2. Form Submission / Razorpay Gateway Trigger
    donationForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const amountValue = parseFloat(customAmountInput.value);
        const contributorName = document.getElementById('contributor-name').value.trim();
        const contributorEmail = document.getElementById('contributor-email').value.trim();

        // Safety Validation
        if (isNaN(amountValue) || amountValue < 10) {
            alert("The minimum donation limit is ₹10.");
            return;
        }

        // Razorpay accepts payment values in subunits (paise for INR). Hence multiply by 100.
        const amountInPaise = Math.round(amountValue * 100);

        // Standard Frontend Options Configuration
        const options = {
            "key": RAZORPAY_KEY_ID, 
            "amount": amountInPaise, 
            "currency": "INR",
            "name": "LeetCode Sprint",
            "description": "Project Server Sponsorship Contribution",
            "image": "https://raw.githubusercontent.com/raj9589/leetcode-sprint/main/icon.png", // Fallback placeholder branding asset
            "handler": function (response) {
                // Executed when a transaction succeeds
                handleSuccess(response, amountValue);
            },
            "prefill": {
                "name": contributorName,
                "email": contributorEmail
            },
            "theme": {
                "color": "#cd5c5c" // Match Indian Red branding accent
            }
        };

        try {
            const rzp = new Razorpay(options);
            
            rzp.on('payment.failed', function (response) {
                alert(`Payment process failed: ${response.error.description}`);
            });

            rzp.open();
        } catch (error) {
            console.error("Failed to construct Razorpay instance:", error);
            alert("Razorpay library failed to load properly. Check your internet connection.");
        }
    });

    // 3. Success Interface Presentation State Transition
    function handleSuccess(response, originalAmount) {
        // Toggle view containers
        paymentContainer.classList.add('hidden');
        successContainer.classList.remove('hidden');

        // Populate details card
        txnIdDisplay.textContent = response.razorpay_payment_id || "N/A";
        txnAmountDisplay.textContent = `₹${originalAmount.toFixed(2)} INR`;
    }
});

