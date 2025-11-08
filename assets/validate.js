// Self-Check Validation System
(function() {
    'use strict';
    
    // Utility functions
    function getCookie(name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }
    
    function setCookie(name, value, days, options) {
        var expires = new Date();
        expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
        var secure = location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = name + '=' + value + '; expires=' + expires.toUTCString() + '; path=/; SameSite=Lax' + secure;
    }
    
    function deleteCookie(name) {
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }
    
    function getUrlParam(name) {
        try {
            var urlParams = new URLSearchParams(location.search);
            return urlParams.get(name);
        } catch (e) {
            // Fallback to regex for older browsers
            var match = location.search.match(new RegExp('[?&]' + name + '=([^&]*)'));
            return match ? match[1] : null;
        }
    }
    
    function detectGTM() {
        return {
            loaded: typeof window.google_tag_manager !== 'undefined',
            containers: window.google_tag_manager ? Object.keys(window.google_tag_manager) : []
        };
    }
    
    // Validation tests
    function runLandingTests() {
        var results = [];
        var urlMid = getUrlParam('mid');
        var cookieMid = getCookie('bondai_mid');
        
        // Test 1: URL mid should be captured in cookie
        if (urlMid && cookieMid === urlMid) {
            results.push({ test: 'MID Capture', status: 'PASS', details: 'URL mid ' + urlMid + ' captured in cookie' });
        } else if (urlMid && !cookieMid) {
            results.push({ test: 'MID Capture', status: 'FAIL', details: 'URL mid ' + urlMid + ' not captured in cookie' });
        } else if (!urlMid) {
            results.push({ test: 'MID Capture', status: 'SKIP', details: 'No URL mid parameter provided' });
        } else {
            results.push({ test: 'MID Capture', status: 'FAIL', details: 'URL mid ' + urlMid + ' does not match cookie ' + cookieMid });
        }
        
        // Test 2: GTM should be loaded
        var gtm = detectGTM();
        if (gtm.loaded && gtm.containers.length > 0) {
            results.push({ test: 'GTM Loaded', status: 'PASS', details: 'GTM loaded with containers: ' + gtm.containers.join(', ') });
        } else {
            results.push({ test: 'GTM Loaded', status: 'FAIL', details: 'GTM not loaded or no containers detected' });
        }
        
        // Test 3: Checkout link should point to /checkout/
        var checkoutLink = document.querySelector('a[href="/checkout/"]');
        if (checkoutLink) {
            results.push({ test: 'Checkout Link', status: 'PASS', details: 'Checkout link points to /checkout/' });
        } else {
            results.push({ test: 'Checkout Link', status: 'FAIL', details: 'Checkout link not found or incorrect href' });
        }
        
        return results;
    }
    
    function runCheckoutTests() {
        var results = [];
        var urlMid = getUrlParam('mid');
        var cookieMid = getCookie('bondai_mid');
        
        // Test 1: URL should not contain mid parameter
        if (!urlMid) {
            results.push({ test: 'No URL MID', status: 'PASS', details: 'URL does not contain mid parameter' });
        } else {
            results.push({ test: 'No URL MID', status: 'FAIL', details: 'URL contains mid parameter: ' + urlMid });
        }
        
        // Test 2: Cookie should be present
        if (cookieMid) {
            results.push({ test: 'Cookie Present', status: 'PASS', details: 'Cookie bondai_mid contains: ' + cookieMid });
        } else {
            results.push({ test: 'Cookie Present', status: 'FAIL', details: 'Cookie bondai_mid is empty or missing' });
        }
        
        // Test 3: dataLayer should contain exactly one purchase event
        var purchaseEvents = 0;
        if (window.dataLayer) {
            for (var i = 0; i < window.dataLayer.length; i++) {
                if (window.dataLayer[i].event === 'purchase') {
                    purchaseEvents++;
                }
            }
        }
        
        if (purchaseEvents === 1) {
            results.push({ test: 'Purchase Event', status: 'PASS', details: 'dataLayer contains exactly 1 purchase event' });
        } else {
            results.push({ test: 'Purchase Event', status: 'FAIL', details: 'dataLayer contains ' + purchaseEvents + ' purchase events (expected 1)' });
        }
        
        // Test 4: GTM should be loaded
        var gtm = detectGTM();
        if (gtm.loaded && gtm.containers.length > 0) {
            results.push({ test: 'GTM Loaded', status: 'PASS', details: 'GTM loaded with containers: ' + gtm.containers.join(', ') });
        } else {
            results.push({ test: 'GTM Loaded', status: 'FAIL', details: 'GTM not loaded or no containers detected' });
        }
        
        return results;
    }
    
    // Panel creation and management
    function createValidationPanel() {
        var panel = document.createElement('div');
        panel.className = 'validate-panel';
        panel.innerHTML = 
            '<h4>Self-Check Panel</h4>' +
            '<div class="validate-item">' +
                '<span class="validate-label">Current URL:</span>' +
                '<span class="validate-value" id="validate-url">-</span>' +
            '</div>' +
            '<div class="validate-item">' +
                '<span class="validate-label">URL mid:</span>' +
                '<span class="validate-value" id="validate-url-mid">-</span>' +
            '</div>' +
            '<div class="validate-item">' +
                '<span class="validate-label">Cookie bondai_mid:</span>' +
                '<span class="validate-value" id="validate-cookie-mid">-</span>' +
            '</div>' +
            '<div class="validate-item">' +
                '<span class="validate-label">GTM loaded:</span>' +
                '<span class="validate-value" id="validate-gtm-loaded">-</span>' +
            '</div>' +
            '<div class="validate-item">' +
                '<span class="validate-label">GTM containers:</span>' +
                '<span class="validate-value" id="validate-gtm-containers">-</span>' +
            '</div>' +
            '<div class="validate-buttons">' +
                '<button class="validate-btn" id="validate-run-btn">Run Self-Check</button>' +
                '<button class="validate-btn reset" id="validate-reset-btn">Reset MID</button>' +
            '</div>' +
            '<div class="validate-results" id="validate-results" style="display: none;"></div>';
        
        document.body.appendChild(panel);
        return panel;
    }
    
    function updatePanel() {
        var urlMid = getUrlParam('mid');
        var cookieMid = getCookie('bondai_mid');
        var gtm = detectGTM();
        
        document.getElementById('validate-url').textContent = location.href;
        document.getElementById('validate-url-mid').textContent = urlMid || '-';
        document.getElementById('validate-cookie-mid').textContent = cookieMid || '-';
        document.getElementById('validate-gtm-loaded').textContent = gtm.loaded ? 'true' : 'false';
        document.getElementById('validate-gtm-containers').textContent = gtm.containers.length > 0 ? gtm.containers.join(', ') : '-';
    }
    
    function showResults(results) {
        var resultsDiv = document.getElementById('validate-results');
        var html = '';
        
        var allPass = true;
        for (var i = 0; i < results.length; i++) {
            var result = results[i];
            var statusClass = result.status === 'PASS' ? 'validate-pass' : 
                            result.status === 'FAIL' ? 'validate-fail' : 'validate-warning';
            
            if (result.status === 'FAIL') allPass = false;
            
            html += '<div class="validate-item">' +
                '<span class="validate-label">' + result.test + ':</span>' +
                '<span class="' + statusClass + '">' + result.status + '</span>' +
            '</div>';
            
            if (result.details) {
                html += '<div class="validate-details">' + result.details + '</div>';
            }
        }
        
        var summaryClass = allPass ? 'validate-pass' : 'validate-fail';
        var summaryText = allPass ? 'ALL TESTS PASS' : 'SOME TESTS FAILED';
        
        html = '<div class="' + summaryClass + '">' + summaryText + '</div>' + html;
        
        resultsDiv.innerHTML = html;
        resultsDiv.style.display = 'block';
    }
    
    // Initialize validation panel
    function init() {
        // Load CSS
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/assets/validate.css';
        document.head.appendChild(link);
        
        // Create panel
        var panel = createValidationPanel();
        
        // Update panel periodically
        updatePanel();
        setInterval(updatePanel, 1000);
        
        // Add event listeners
        document.getElementById('validate-run-btn').addEventListener('click', function() {
            var isCheckout = location.pathname.indexOf('/checkout') !== -1;
            var results = isCheckout ? runCheckoutTests() : runLandingTests();
            showResults(results);
        });
        
        document.getElementById('validate-reset-btn').addEventListener('click', function() {
            deleteCookie('bondai_mid');
            try {
                localStorage.removeItem('bondai_mid');
            } catch (e) {
                // Ignore localStorage errors
            }
            updatePanel();
        });
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();



