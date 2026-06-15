/**
 * CodeSprint Update Splash Page Handler
 */
document.addEventListener('DOMContentLoaded', () => {
    // Dynamically retrieve the extension version if executed in Chrome environment
    const versionBadge = document.getElementById('version-badge');
    if (versionBadge && typeof chrome !== 'undefined' && chrome.runtime?.getManifest) {
        try {
            const manifest = chrome.runtime.getManifest();
            if (manifest?.version) {
                versionBadge.textContent = `v${manifest.version}`;
            }
        } catch (error) {
            console.log("Could not fetch extension manifest version.");
        }
    }

    // Interactive Demo Presets switcher data block
    const demoData = {
        optimize: {
            pillLabel: "Optimization Mode",
            userCode: `def find_pairs(nums, k):
    res = []
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == k:
                res.append((nums[i], nums[j]))
    return res`,
            query: "Propose optimizations to improve speed or lessen memory usage.",
            response: `<p>Your current approach runs in <code class="inline-code">O(N²)</code> time. We can optimize this to <code class="inline-code">O(N)</code> time using a Hash Set to track visited elements:</p>
<pre><code>def find_pairs_optimized(nums, k):
    seen = set()
    res = set()
    for num in nums:
        target = k - num
        if target in seen:
            res.add((min(num, target), max(num, target)))
        seen.add(num)
    return list(res)</code></pre>`
        },
        complexity: {
            pillLabel: "Complexity Mode",
            userCode: `def binary_search(arr, target):
    low, high = 0, len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1`,
            query: "Analyze the space and time complexity of my selected solution code.",
            response: `<p>Here is the theoretical complexity breakdown of the Binary Search implementation:</p>
<ul>
  <li><strong>Time Complexity:</strong> <code class="inline-code">O(log N)</code>. In the worst case, the search space is divided in half with each step.</li>
  <li><strong>Space Complexity:</strong> <code class="inline-code">O(1)</code>. The solution runs iteratively using a fixed set of pointer values (low, mid, high), consuming constant memory.</li>
</ul>`
        },
        bug: {
            pillLabel: "Debugger Mode",
            userCode: `def divide_elements(data):
    results = []
    for val in data:
        results.append(100 / val)
    return results`,
            query: "Scan this selected code for hidden logical bugs or runtime failures.",
            response: `<p>I detected two critical points of vulnerability in this function:</p>
<ol>
  <li><strong>ZeroDivisionError:</strong> If <code class="inline-code">data</code> contains the integer <code class="inline-code">0</code>, the operation <code class="inline-code">100 / val</code> will crash. You should implement a safe division check.</li>
  <li><strong>TypeError:</strong> If <code class="inline-code">data</code> contains any non-numerical types (like <code class="inline-code">None</code> or <code class="inline-code">str</code>), the operation will throw a TypeError.</li>
</ol>`
        },
        explain: {
            pillLabel: "Explanation Mode",
            userCode: `def is_palindrome(s):
    cleaned = "".join(c.lower() for c in s if c.isalnum())
    return cleaned == cleaned[::-1]`,
            query: "Explain this solution step by step in clear plain language.",
            response: `<p>This compact Palindrome checker operates via the following logical sequence:</p>
<ol>
  <li><strong>Sanitization:</strong> It iterates through the string <code class="inline-code">s</code>, converts each character to lowercase (<code class="inline-code">c.lower()</code>), and drops punctuation/spaces (<code class="inline-code">c.isalnum()</code>).</li>
  <li><strong>Reconstruction:</strong> The sanitized characters are re-joined into a flat sequence named <code class="inline-code">cleaned</code>.</li>
  <li><strong>Slicing Comparison:</strong> It compares the string to its reversed slicing output (<code class="inline-code">cleaned[::-1]</code>). If they are identical, the input is a valid palindrome.</li>
</ol>`
        }
    };

    const presetButtons = document.querySelectorAll('.mock-preset-btn');
    const demoPillLabel = document.getElementById('demo-pill-label');
    const demoUserCode = document.getElementById('demo-user-code');
    const demoQueryText = document.getElementById('demo-query-text');
    const demoResponseHtml = document.getElementById('demo-response-html');

    if (presetButtons.length > 0) {
        presetButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Deactivate current active states
                presetButtons.forEach(b => b.classList.remove('active'));

                // Activate clicked button
                btn.classList.add('active');

                // Retrieve mapping key
                const pillId = btn.getAttribute('data-pill-id');
                const targetData = demoData[pillId];

                if (targetData) {
                    // Update layout values smoothly
                    if (demoPillLabel) demoPillLabel.textContent = targetData.pillLabel;
                    if (demoUserCode) demoUserCode.textContent = targetData.userCode;
                    if (demoQueryText) demoQueryText.textContent = `"${targetData.query}"`;
                    if (demoResponseHtml) demoResponseHtml.innerHTML = targetData.response;
                }
            });
        });
    }
});