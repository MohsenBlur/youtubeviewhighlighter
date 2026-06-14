// ==UserScript==
// @name         YouTube View Highlighter
// @namespace    https://github.com/MohsenBlur/youtubeviewhighlighter
// @version      2.0
// @description  Visibly highlights the view count of the top X% of videos on any YouTube page with an interactive control bar.
// @author       Antigravity
// @match        https://www.youtube.com/*
// @grant        none
// @run-at       document-idle
// @downloadURL  https://raw.githubusercontent.com/MohsenBlur/youtubeviewhighlighter/main/youtube-view-highlighter.user.js
// @updateURL    https://raw.githubusercontent.com/MohsenBlur/youtubeviewhighlighter/main/youtube-view-highlighter.user.js
// @supportURL   https://github.com/MohsenBlur/youtubeviewhighlighter/issues
// ==/UserScript==

(function() {
    'use strict';

    // CSS selectors for various YouTube video card containers
    const CARD_SELECTORS = [
        'ytd-rich-grid-media',         // Home feed and Channel video grids
        'yt-lockup-view-model',        // Modern YouTube grid cards (2025/2026 update)
        'ytd-grid-video-renderer',     // Older channel grids / playlists
        'ytd-video-renderer',          // Search results
        'ytd-compact-video-renderer',  // Sidebar related videos
        'ytd-playlist-video-renderer', // Playlists page
        'ytd-reel-item-renderer',      // Shorts grid/list
        'ytd-rich-grid-slim-media'     // Shorts on channel home
    ].join(',');

    // Keywords to identify the view count element vs. upload time or other metadata
    const VIEW_KEYWORDS = ['view', 'watch', 'vist', 'visualiz', 'vue', 'aufruf', 'zuschau', 'просмотр', 'spectat', 'especta'];
    const TIME_KEYWORDS = ['ago', 'hour', 'day', 'week', 'month', 'year', 'min', 'sec', 'hace', 'hora', 'dia', 'día', 'semana', 'mes', 'año', 'vor', 'stund', 'tag', 'woch', 'monat', 'jahr', 'il y a', 'an ', 'ans', 'jour', 'semain', 'назад', 'час', 'день', 'недел', 'месяц', 'год'];

    // Multipliers for parsing views in different languages
    const MULTIPLIERS = {
        'k': 1000,
        'thousand': 1000,
        'mil': 1000,
        'тыс': 1000,
        'm': 1000000,
        'million': 1000000,
        'mio': 1000000,
        'млн': 1000000,
        'b': 1000000000,
        'billion': 1000000000,
        'mrd': 1000000000,
        'млрд': 1000000000
    };

    // User-controlled percentage state (default to 20%)
    let highlightPercentage = 20;

    // Load saved percentage preference if available
    const savedPercentage = localStorage.getItem('yt-highlighter-percentage');
    if (savedPercentage) {
        const parsed = parseInt(savedPercentage, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 100) {
            highlightPercentage = parsed;
        }
    }

    // Collapsed/docked UI state
    let isCollapsed = false;
    const savedCollapse = localStorage.getItem('yt-highlighter-collapsed');
    if (savedCollapse === 'true') {
        isCollapsed = true;
    }

    // Dock side state ('left' or 'right', default 'right')
    let dockSide = 'right';
    const savedDockSide = localStorage.getItem('yt-highlighter-dock-side');
    if (savedDockSide === 'left' || savedDockSide === 'right') {
        dockSide = savedDockSide;
    }

    // Dock vertical position state (default '72px')
    let dockTop = '72px';
    const savedDockTop = localStorage.getItem('yt-highlighter-dock-top');
    if (savedDockTop) {
        dockTop = savedDockTop;
    }

    // Inject styles for premium-looking highlights, flashing text animations, and the floating control bar
    function injectStyles() {
        if (document.getElementById('yt-view-highlighter-styles')) return;

        const style = document.createElement('style');
        style.id = 'yt-view-highlighter-styles';
        style.textContent = `
            /* Rapid rainbow text and border color flashing keyframes */
            @keyframes yt-rainbow-flash {
                0% { 
                    color: #ff3b30; 
                    text-shadow: 0 0 8px rgba(255, 59, 48, 0.9); 
                    border-color: #ff3b30; 
                    box-shadow: 0 0 8px rgba(255, 59, 48, 0.4);
                }
                17% { 
                    color: #ff9500; 
                    text-shadow: 0 0 8px rgba(255, 149, 0, 0.9); 
                    border-color: #ff9500; 
                    box-shadow: 0 0 8px rgba(255, 149, 0, 0.4);
                }
                33% { 
                    color: #ffcc00; 
                    text-shadow: 0 0 8px rgba(255, 204, 0, 0.9); 
                    border-color: #ffcc00; 
                    box-shadow: 0 0 8px rgba(255, 204, 0, 0.4);
                }
                50% { 
                    color: #4cd964; 
                    text-shadow: 0 0 8px rgba(76, 217, 100, 0.9); 
                    border-color: #4cd964; 
                    box-shadow: 0 0 8px rgba(76, 217, 100, 0.4);
                }
                67% { 
                    color: #5ac8fa; 
                    text-shadow: 0 0 8px rgba(90, 200, 250, 0.9); 
                    border-color: #5ac8fa; 
                    box-shadow: 0 0 8px rgba(90, 200, 250, 0.4);
                }
                83% { 
                    color: #5856d6; 
                    text-shadow: 0 0 8px rgba(88, 86, 214, 0.9); 
                    border-color: #5856d6; 
                    box-shadow: 0 0 8px rgba(88, 86, 214, 0.4);
                }
                100% { 
                    color: #ff3b30; 
                    text-shadow: 0 0 8px rgba(255, 59, 48, 0.9); 
                    border-color: #ff3b30; 
                    box-shadow: 0 0 8px rgba(255, 59, 48, 0.4);
                }
            }

            /* Neon Arcade Style: Deep black background bar with rapid rainbow color flashing text and border */
            span.yt-view-highlight,
            #metadata-line span.yt-view-highlight,
            yt-content-metadata-view-model span.yt-view-highlight,
            .ytContentMetadataViewModelMetadataText.yt-view-highlight,
            .inline-metadata-item.yt-view-highlight {
                background: #090d16 !important; /* Deep dark neon black background */
                border: 2px solid #ff3b30 !important;
                padding: 3px 9px !important;
                border-radius: 6px !important;
                font-weight: 900 !important;
                font-size: 13px !important;
                display: inline-block !important;
                vertical-align: middle !important;
                line-height: 1.25 !important;
                transition: transform 0.2s ease !important;
                animation: yt-rainbow-flash 1.2s infinite linear !important;
            }

            /* Add hover micro-animation */
            span.yt-view-highlight:hover,
            .ytContentMetadataViewModelMetadataText.yt-view-highlight:hover {
                transform: scale(1.08) !important;
            }

            /* Floating Control Panel Section styling */
            #yt-highlighter-control {
                position: fixed !important;
                z-index: 10000 !important;
                display: flex !important;
                align-items: center !important;
                background: rgba(255, 255, 255, 0.85) !important;
                border: 1px solid rgba(0, 0, 0, 0.08) !important;
                border-radius: 30px !important;
                padding: 6px 14px !important;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08) !important;
                backdrop-filter: blur(10px) !important;
                -webkit-backdrop-filter: blur(10px) !important;
                font-family: Roboto, Arial, sans-serif !important;
                font-size: 14px !important;
                font-weight: 500 !important;
                color: #0f0f0f !important;
                gap: 8px !important;
                user-select: none !important;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            }

            html[dark] #yt-highlighter-control,
            html[theme="dark"] #yt-highlighter-control {
                background: rgba(15, 15, 15, 0.85) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
                color: #f1f1f1 !important;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4) !important;
            }

            /* Disable transition and cursor change while dragging */
            #yt-highlighter-control.yt-dragging {
                transition: none !important;
                cursor: grabbing !important;
            }

            /* Base Collapsed State Tab styling */
            #yt-highlighter-control.yt-collapsed {
                cursor: pointer !important;
                background: rgba(16, 185, 129, 0.12) !important;
                border-color: rgba(16, 185, 129, 0.3) !important;
                color: #047857 !important;
                padding: 6px 14px !important;
            }

            #yt-highlighter-control.yt-collapsed.yt-dock-right {
                right: 0px !important;
                left: auto !important;
                border-radius: 20px 0 0 20px !important;
                border-right: none !important;
                padding: 6px 10px 6px 14px !important;
                box-shadow: -2px 4px 10px rgba(16, 185, 129, 0.1) !important;
            }

            #yt-highlighter-control.yt-collapsed.yt-dock-left {
                left: 0px !important;
                right: auto !important;
                border-radius: 0 20px 20px 0 !important;
                border-left: none !important;
                padding: 6px 14px 6px 10px !important;
                box-shadow: 2px 4px 10px rgba(16, 185, 129, 0.1) !important;
            }

            html[dark] #yt-highlighter-control.yt-collapsed,
            html[theme="dark"] #yt-highlighter-control.yt-collapsed {
                background: rgba(16, 185, 129, 0.18) !important;
                border-color: rgba(16, 185, 129, 0.4) !important;
                color: #34d399 !important;
                box-shadow: -2px 4px 12px rgba(16, 185, 129, 0.2) !important;
            }

            #yt-highlighter-control.yt-collapsed.yt-dock-right:hover {
                background: rgba(16, 185, 129, 0.2) !important;
                transform: translateX(-4px) !important;
            }

            #yt-highlighter-control.yt-collapsed.yt-dock-left:hover {
                background: rgba(16, 185, 129, 0.2) !important;
                transform: translateX(4px) !important;
            }

            html[dark] #yt-highlighter-control.yt-collapsed:hover,
            html[theme="dark"] #yt-highlighter-control.yt-collapsed:hover {
                background: rgba(16, 185, 129, 0.3) !important;
            }

            /* Drag handle styling */
            .yt-drag-handle {
                cursor: grab !important;
                color: rgba(0, 0, 0, 0.3) !important;
                font-size: 14px !important;
                font-weight: 900 !important;
                user-select: none !important;
                padding: 0 4px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            }

            html[dark] .yt-drag-handle,
            html[theme="dark"] .yt-drag-handle {
                color: rgba(255, 255, 255, 0.4) !important;
            }

            .yt-drag-handle:active {
                cursor: grabbing !important;
            }

            .yt-collapsed-text {
                font-weight: 700 !important;
                font-size: 13px !important;
                letter-spacing: 0.5px !important;
            }

            .yt-control-btn {
                background: transparent !important;
                border: none !important;
                color: inherit !important;
                font-size: 16px !important;
                font-weight: 700 !important;
                cursor: pointer !important;
                width: 24px !important;
                height: 24px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                border-radius: 50% !important;
                transition: background-color 0.2s ease !important;
                outline: none !important;
            }

            .yt-control-btn:hover {
                background-color: rgba(0, 0, 0, 0.06) !important;
            }

            html[dark] .yt-control-btn:hover,
            html[theme="dark"] .yt-control-btn:hover {
                background-color: rgba(255, 255, 255, 0.1) !important;
            }

            .yt-control-input {
                background: transparent !important;
                border: none !important;
                border-bottom: 1px dashed rgba(0, 0, 0, 0.3) !important;
                color: inherit !important;
                width: 28px !important;
                text-align: center !important;
                font-size: 14px !important;
                font-weight: 700 !important;
                padding: 0 !important;
                margin: 0 !important;
                outline: none !important;
            }

            html[dark] .yt-control-input,
            html[theme="dark"] .yt-control-input {
                border-bottom: 1px dashed rgba(255, 255, 255, 0.4) !important;
            }

            .yt-control-input::-webkit-outer-spin-button,
            .yt-control-input::-webkit-inner-spin-button {
                -webkit-appearance: none !important;
                margin: 0 !important;
            }

            .yt-control-input {
                -moz-appearance: textfield !important;
            }

            .yt-control-percent {
                font-weight: 700 !important;
                margin-left: -2px !important;
            }

            .yt-control-divider {
                width: 1px !important;
                height: 16px !important;
                background-color: rgba(0, 0, 0, 0.08) !important;
                margin: 0 2px !important;
            }

            html[dark] .yt-control-divider,
            html[theme="dark"] .yt-control-divider {
                background-color: rgba(255, 255, 255, 0.15) !important;
            }

            .yt-collapse-btn {
                background: transparent !important;
                border: none !important;
                color: inherit !important;
                font-size: 18px !important;
                font-weight: 500 !important;
                cursor: pointer !important;
                width: 20px !important;
                height: 20px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                border-radius: 4px !important;
                transition: background-color 0.2s ease !important;
                outline: none !important;
            }

            .yt-collapse-btn:hover {
                background-color: rgba(0, 0, 0, 0.06) !important;
            }

            html[dark] .yt-collapse-btn:hover,
            html[theme="dark"] .yt-collapse-btn:hover {
                background-color: rgba(255, 255, 255, 0.1) !important;
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    // Create and attach the floating controls to the DOM (TrustedHTML compliant)
    function createControlPanel() {
        let control = document.getElementById('yt-highlighter-control');
        if (control) {
            // Re-append to body if somehow detached during dynamic SPA re-renders
            if (control.parentNode !== document.body) {
                document.body.appendChild(control);
            }
            applyDockedPosition();
            return; // Already exists, do not clear and recreate children
        }

        control = document.createElement('div');
        control.id = 'yt-highlighter-control';
        document.body.appendChild(control);

        updateControlPanelUI();
    }

    // Update the layout inside the control panel wrapper based on collapsed/expanded state
    function updateControlPanelUI() {
        const control = document.getElementById('yt-highlighter-control');
        if (!control) return;

        // Clear existing nodes safely (TrustedHTML compliant)
        while (control.firstChild) {
            control.removeChild(control.firstChild);
        }

        if (isCollapsed) {
            control.classList.add('yt-collapsed');
            
            const tabText = document.createElement('span');
            tabText.className = 'yt-collapsed-text';
            if (dockSide === 'left') {
                tabText.textContent = `${highlightPercentage}% ›`;
            } else {
                tabText.textContent = `‹ ${highlightPercentage}%`;
            }
            control.appendChild(tabText);

            // Expand when clicking anywhere on the collapsed tab
            control.onclick = () => {
                isCollapsed = false;
                localStorage.setItem('yt-highlighter-collapsed', 'false');
                updateControlPanelUI();
            };
        } else {
            control.classList.remove('yt-collapsed');
            control.onclick = null;

            // Drag handle
            const dragHandle = document.createElement('span');
            dragHandle.className = 'yt-drag-handle';
            dragHandle.textContent = '⋮⋮';
            control.appendChild(dragHandle);

            const decBtn = document.createElement('button');
            decBtn.className = 'yt-control-btn';
            decBtn.textContent = '−';
            decBtn.onclick = (e) => {
                e.stopPropagation();
                updatePercentage(highlightPercentage - 5);
            };

            const inputEl = document.createElement('input');
            inputEl.type = 'number';
            inputEl.id = 'yt-highlighter-input';
            inputEl.className = 'yt-control-input';
            inputEl.value = highlightPercentage;
            inputEl.min = '1';
            inputEl.max = '100';
            inputEl.onclick = (e) => e.stopPropagation();
            inputEl.oninput = (e) => {
                let val = parseInt(inputEl.value, 10);
                if (!isNaN(val)) {
                    if (val < 1) val = 1;
                    if (val > 100) val = 100;
                    highlightPercentage = val;
                    localStorage.setItem('yt-highlighter-percentage', highlightPercentage);
                    debouncedHighlight();
                }
            };
            inputEl.onblur = () => {
                inputEl.value = highlightPercentage;
            };

            const percentSpan = document.createElement('span');
            percentSpan.className = 'yt-control-percent';
            percentSpan.textContent = '%';

            const incBtn = document.createElement('button');
            incBtn.className = 'yt-control-btn';
            incBtn.textContent = '+';
            incBtn.onclick = (e) => {
                e.stopPropagation();
                updatePercentage(highlightPercentage + 5);
            };

            const divider = document.createElement('span');
            divider.className = 'yt-control-divider';

            const collapseBtn = document.createElement('button');
            collapseBtn.className = 'yt-collapse-btn';
            collapseBtn.textContent = dockSide === 'left' ? '‹' : '›';
            collapseBtn.onclick = (e) => {
                e.stopPropagation();
                isCollapsed = true;
                localStorage.setItem('yt-highlighter-collapsed', 'true');
                updateControlPanelUI();
            };

            control.appendChild(decBtn);
            control.appendChild(inputEl);
            control.appendChild(percentSpan);
            control.appendChild(incBtn);
            control.appendChild(divider);
            control.appendChild(collapseBtn);

            setupDraggability(control, dragHandle);
        }

        applyDockedPosition();
    }

    // Set up dragging logic for the control panel using the handle
    function setupDraggability(control, dragHandle) {
        let isDragging = false;
        let startX, startY;
        let initialLeft, initialTop;

        dragHandle.addEventListener('mousedown', dragStart);
        dragHandle.addEventListener('touchstart', dragStart, { passive: false });

        function dragStart(e) {
            if (e.type === 'mousedown' && e.button !== 0) return;
            
            isDragging = true;
            control.classList.add('yt-dragging');

            const rect = control.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;

            const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
            const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
            
            startX = clientX;
            startY = clientY;

            document.addEventListener('mousemove', dragMove, { passive: false });
            document.addEventListener('mouseup', dragEnd);
            document.addEventListener('touchmove', dragMove, { passive: false });
            document.addEventListener('touchend', dragEnd);

            e.preventDefault();
        }

        function dragMove(e) {
            if (!isDragging) return;
            
            const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
            const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

            const dx = clientX - startX;
            const dy = clientY - startY;

            let newLeft = initialLeft + dx;
            let newTop = initialTop + dy;

            const width = control.offsetWidth;
            const height = control.offsetHeight;

            if (newLeft < 10) newLeft = 10;
            if (newLeft + width > window.innerWidth - 10) {
                newLeft = window.innerWidth - width - 10;
            }
            if (newTop < 10) newTop = 10;
            if (newTop + height > window.innerHeight - 10) {
                newTop = window.innerHeight - height - 10;
            }

            control.style.setProperty('left', `${newLeft}px`, 'important');
            control.style.setProperty('right', 'auto', 'important');
            control.style.setProperty('top', `${newTop}px`, 'important');
            
            e.preventDefault();
        }

        function dragEnd(e) {
            if (!isDragging) return;
            isDragging = false;
            control.classList.remove('yt-dragging');

            document.removeEventListener('mousemove', dragMove);
            document.removeEventListener('mouseup', dragEnd);
            document.removeEventListener('touchmove', dragMove);
            document.removeEventListener('touchend', dragEnd);

            const rect = control.getBoundingClientRect();
            const panelCenterX = rect.left + rect.width / 2;
            const windowCenterX = window.innerWidth / 2;

            if (panelCenterX < windowCenterX) {
                dockSide = 'left';
            } else {
                dockSide = 'right';
            }

            const topPct = (rect.top / window.innerHeight) * 100;
            const boundedTopPct = Math.max(5, Math.min(95, topPct));
            dockTop = `${boundedTopPct}%`;

            localStorage.setItem('yt-highlighter-dock-side', dockSide);
            localStorage.setItem('yt-highlighter-dock-top', dockTop);

            applyDockedPosition();
        }
    }

    // Apply the docking CSS classes and positioning rules dynamically
    function applyDockedPosition() {
        const control = document.getElementById('yt-highlighter-control');
        if (!control) return;

        if (dockSide === 'left') {
            control.classList.add('yt-dock-left');
            control.classList.remove('yt-dock-right');
            
            control.style.setProperty('top', dockTop, 'important');
            if (isCollapsed) {
                control.style.setProperty('left', '0px', 'important');
                control.style.setProperty('right', 'auto', 'important');
            } else {
                control.style.setProperty('left', '24px', 'important');
                control.style.setProperty('right', 'auto', 'important');
            }
        } else {
            control.classList.add('yt-dock-right');
            control.classList.remove('yt-dock-left');

            control.style.setProperty('top', dockTop, 'important');
            if (isCollapsed) {
                control.style.setProperty('right', '0px', 'important');
                control.style.setProperty('left', 'auto', 'important');
            } else {
                control.style.setProperty('right', '24px', 'important');
                control.style.setProperty('left', 'auto', 'important');
            }
        }
    }

    // Update state, DOM and trigger re-highlighting
    function updatePercentage(newVal) {
        if (newVal < 1) newVal = 1;
        if (newVal > 100) newVal = 100;
        
        highlightPercentage = newVal;
        localStorage.setItem('yt-highlighter-percentage', highlightPercentage);
        
        const inputEl = document.getElementById('yt-highlighter-input');
        if (inputEl) {
            inputEl.value = highlightPercentage;
        }
        
        const tabText = document.querySelector('.yt-collapsed-text');
        if (tabText) {
            if (dockSide === 'left') {
                tabText.textContent = `${highlightPercentage}% ›`;
            } else {
                tabText.textContent = `‹ ${highlightPercentage}%`;
            }
        }
        
        runHighlighting();
    }

    // Parse float numbers taking locale formatting into account
    function parseLocaleFloat(str) {
        str = str.replace(/\s+/g, ''); // Remove all whitespaces

        const commas = (str.match(/,/g) || []).length;
        const dots = (str.match(/\./g) || []).length;

        // Multiple separators mean they must be thousands separators
        if (commas > 1) return parseFloat(str.replace(/,/g, ''));
        if (dots > 1) return parseFloat(str.replace(/\./g, ''));

        // Both separators present: the last one is the decimal
        if (commas === 1 && dots === 1) {
            const commaIdx = str.indexOf(',');
            const dotIdx = str.indexOf('.');
            if (commaIdx < dotIdx) {
                return parseFloat(str.replace(/,/g, ''));
            } else {
                return parseFloat(str.replace(/\./g, '').replace(',', '.'));
            }
        }

        // Only one separator present
        const separator = commas === 1 ? ',' : (dots === 1 ? '.' : null);
        if (!separator) {
            return parseFloat(str) || 0;
        }

        const MathParts = str.split(separator);
        const lastPart = MathParts[1];

        // If the fractional/decimal part has exactly 3 digits, treat it as a thousands separator
        if (lastPart.length === 3) {
            return parseFloat(str.replace(separator === ',' ? /,/g : /\./g, ''));
        } else {
            // Otherwise, treat it as a decimal separator
            return parseFloat(str.replace(separator, '.'));
        }
    }

    // Parse view counts from the display string
    function parseViews(viewStr) {
        if (!viewStr) return 0;
        viewStr = viewStr.trim().toLowerCase();

        // Check for common zero-view expressions
        const zeroKeywords = [
            'no views', 'sin vistas', 'keine aufrufe', 'aucune vue', 
            'nessuna visualizzazione', 'nenhuma visualizzazione', 'без просмотров',
            'no watching', 'keine zuschauer'
        ];
        if (zeroKeywords.some(k => viewStr.includes(k))) return 0;

        // Extract the leading number block and any potential suffix block
        const match = viewStr.match(/([\d.,]+)\s*([a-zа-яё]+)?/);
        if (!match) return 0;

        const numStr = match[1];
        const suffix = match[2] || '';

        let value = parseLocaleFloat(numStr);

        // Apply correct multiplier based on the suffix prefix
        if (suffix) {
            for (const key of Object.keys(MULTIPLIERS)) {
                if (suffix.startsWith(key)) {
                    value *= MULTIPLIERS[key];
                    break;
                }
            }
        }

        return value;
    }

    // Find the view count element within a video card
    function getViewElementAndCount(card) {
        const spans = card.querySelectorAll('#metadata-line span, yt-content-metadata-view-model span, .ytContentMetadataViewModelMetadataText, .inline-metadata-item');
        if (spans.length === 0) return null;

        let viewSpan = null;
        let viewCount = -1;

        // Check each span
        for (const span of spans) {
            const text = (span.textContent || '').toLowerCase();
            const ariaLabel = (span.getAttribute('aria-label') || '').toLowerCase();
            const combinedText = text + ' ' + ariaLabel;

            // 1. If it contains a view keyword and no time keyword, it's definitely the views element
            if (VIEW_KEYWORDS.some(k => combinedText.includes(k)) && !TIME_KEYWORDS.some(k => combinedText.includes(k))) {
                viewSpan = span;
                break;
            }
        }

        // 2. Fallback: If not found, try finding one that matches view keywords
        if (!viewSpan) {
            for (const span of spans) {
                const text = (span.textContent || '').toLowerCase();
                const ariaLabel = (span.getAttribute('aria-label') || '').toLowerCase();
                const combinedText = text + ' ' + ariaLabel;
                if (VIEW_KEYWORDS.some(k => combinedText.includes(k))) {
                    viewSpan = span;
                    break;
                }
            }
        }

        // 3. Fallback: If not found, find one that does NOT match time keywords
        if (!viewSpan) {
            for (const span of spans) {
                const text = (span.textContent || '').toLowerCase();
                const ariaLabel = (span.getAttribute('aria-label') || '').toLowerCase();
                const combinedText = text + ' ' + ariaLabel;
                if (!TIME_KEYWORDS.some(k => combinedText.includes(k))) {
                    viewSpan = span;
                    break;
                }
            }
        }

        // 4. Last resort fallback
        if (!viewSpan) {
            viewSpan = spans[0];
        }

        if (viewSpan) {
            const text = viewSpan.textContent || '';
            const ariaLabel = viewSpan.getAttribute('aria-label') || '';
            
            // If the text has digits, parse it directly, otherwise fallback to the aria-label
            const hasDigits = /\d/.test(text);
            viewCount = parseViews(hasDigits ? text : ariaLabel);
            
            return { element: viewSpan, count: viewCount };
        }

        return null;
    }

    // Main calculation and highlighting logic
    function runHighlighting() {
        injectStyles();
        createControlPanel();

        const cards = document.querySelectorAll(CARD_SELECTORS);
        const activeVideos = [];

        // Parse view counts for all visible video cards
        for (const card of cards) {
            // Skip cards that are hidden
            if (card.offsetWidth === 0 && card.offsetHeight === 0) continue;

            const res = getViewElementAndCount(card);
            if (res) {
                activeVideos.push({
                    card,
                    element: res.element,
                    count: res.count
                });
            }
        }

        if (activeVideos.length === 0) return;

        // Sort video cards descending by view count
        activeVideos.sort((a, b) => b.count - a.count);

        // Find the top X% threshold index based on custom highlightPercentage
        const pct = highlightPercentage / 100;
        const topCount = Math.max(1, Math.ceil(activeVideos.length * pct));
        const maxViews = activeVideos[0].count;
        
        // Define views threshold
        const threshold = maxViews > 0 ? activeVideos[topCount - 1].count : Infinity;

        console.log(`[YT View Highlighter] Analyzed ${activeVideos.length} videos. Max views: ${maxViews}. Top ${highlightPercentage}% threshold: ${threshold}`);

        // Apply or remove highlights dynamically
        for (const video of activeVideos) {
            const shouldHighlight = video.count >= threshold && video.count > 0;

            if (shouldHighlight) {
                if (!video.element.classList.contains('yt-view-highlight')) {
                    video.element.classList.add('yt-view-highlight');
                }
            } else {
                if (video.element.classList.contains('yt-view-highlight')) {
                    video.element.classList.remove('yt-view-highlight');
                }
            }
        }
    }

    // Debounce wrapper to limit execution frequency during rapid scrolling/updates
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Run immediately when script loads
    injectStyles();
    createControlPanel();
    runHighlighting();

    // Trigger run on dynamic page transitions in YouTube's Single Page Application router
    window.addEventListener('yt-navigate-finish', () => {
        console.log('[YT View Highlighter] Navigation detected, recalculating view statistics...');
        setTimeout(() => {
            createControlPanel();
            runHighlighting();
        }, 300);
    });

    // Observe page mutations (infinite scrolling loads new video thumbnails)
    const debouncedHighlight = debounce(runHighlighting, 250);
    const observer = new MutationObserver(debouncedHighlight);

    // Observe child additions, subtrees, and text content changes (failsafe for skeleton load)
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    // Failsafe periodic check to handle dynamic frameworks overriding standard elements
    setInterval(debouncedHighlight, 1500);

})();
