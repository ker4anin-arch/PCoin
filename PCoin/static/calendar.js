/* ═══════════════════════════════════════════════════
   PCoin Events — Calendar JS
   ═══════════════════════════════════════════════════ */

(function () {
    'use strict';

    // ── State ──────────────────────────────────────
    let currentYear  = new Date().getFullYear();
    let currentMonth = new Date().getMonth() + 1; // 1-12
    let selectedDay  = null; // 'YYYY-MM-DD' or null
    let activeCategoryId = '';
    let allEvents    = []; // cache for current month

    const today = new Date();
    const todayStr = formatDate(today);

    // ── Month names (Russian) ──────────────────────
    const MONTHS_RU = [
        'Январь','Февраль','Март','Апрель','Май','Июнь',
        'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'
    ];
    const MONTHS_RU_GEN = [
        'января','февраля','марта','апреля','мая','июня',
        'июля','августа','сентября','октября','ноября','декабря'
    ];

    // ── DOM refs ───────────────────────────────────
    const miniCalDays   = document.getElementById('miniCalDays');
    const miniCalTitle  = document.getElementById('miniCalTitle');
    const prevMonthBtn  = document.getElementById('prevMonth');
    const nextMonthBtn  = document.getElementById('nextMonth');
    const agendaList    = document.getElementById('agendaList');
    const categoryFilters = document.getElementById('categoryFilters');
    const eventModalOverlay = document.getElementById('eventModalOverlay');
    const modalClose    = document.getElementById('modalClose');

    // ── Init ───────────────────────────────────────
    function init() {
        prevMonthBtn.addEventListener('click', () => navigateMonth(-1));
        nextMonthBtn.addEventListener('click', () => navigateMonth(1));

        categoryFilters.addEventListener('click', (e) => {
            const chip = e.target.closest('.chip');
            if (!chip) return;
            document.querySelectorAll('.chip').forEach(c => c.classList.remove('chip-active'));
            chip.classList.add('chip-active');
            activeCategoryId = chip.dataset.category;
            renderAgenda();
        });

        modalClose.addEventListener('click', closeModal);
        eventModalOverlay.addEventListener('click', (e) => {
            if (e.target === eventModalOverlay) closeModal();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeModal();
        });

        loadMonthAndRender();
        maybeShowAmbientMeme();
    }

    // ── Navigation ─────────────────────────────────
    function navigateMonth(delta) {
        currentMonth += delta;
        if (currentMonth > 12) { currentMonth = 1;  currentYear++; }
        if (currentMonth < 1)  { currentMonth = 12; currentYear--; }
        selectedDay = null;
        loadMonthAndRender();
    }

    // ── Data fetching ──────────────────────────────
    async function loadMonthAndRender() {
        const monthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
        miniCalTitle.textContent = `${MONTHS_RU[currentMonth - 1]} ${currentYear}`;

        try {
            const params = new URLSearchParams({ month: monthStr });
            if (activeCategoryId) params.set('category_id', activeCategoryId);
            const res = await fetch(`/api/events?${params}`);
            allEvents = await res.json();
        } catch (e) {
            allEvents = [];
        }

        renderMiniCal();
        renderAgenda();
    }

    // ── Mini Calendar ──────────────────────────────
    function renderMiniCal() {
        miniCalDays.innerHTML = '';

        const firstDay = new Date(currentYear, currentMonth - 1, 1);
        // Monday-based: 0=Mon … 6=Sun
        let startOffset = firstDay.getDay() - 1;
        if (startOffset < 0) startOffset = 6;

        const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
        const daysInPrev  = new Date(currentYear, currentMonth - 1, 0).getDate();

        // event day lookup
        const eventDays = new Set();
        allEvents.forEach(ev => {
            const d = ev.start_datetime.substring(0, 10);
            eventDays.add(d);
        });

        const cells = [];

        // prev month filler
        for (let i = startOffset - 1; i >= 0; i--) {
            cells.push({ day: daysInPrev - i, month: currentMonth - 1, year: currentYear, other: true });
        }
        // current month
        for (let d = 1; d <= daysInMonth; d++) {
            cells.push({ day: d, month: currentMonth, year: currentYear, other: false });
        }
        // next month filler (complete to 42 cells)
        let next = 1;
        while (cells.length < 42) {
            cells.push({ day: next++, month: currentMonth + 1, year: currentYear, other: true });
        }

        cells.forEach(cell => {
            const btn = document.createElement('button');
            btn.className = 'mini-cal-day';
            btn.textContent = cell.day;

            const dateStr = buildDateStr(cell.year, cell.month, cell.day);

            if (cell.other) {
                btn.classList.add('other-month');
            } else {
                if (dateStr === todayStr)   btn.classList.add('today');
                if (dateStr === selectedDay) btn.classList.add('selected');
                if (eventDays.has(dateStr)) btn.classList.add('has-events');

                btn.addEventListener('click', () => selectDay(dateStr));
            }

            miniCalDays.appendChild(btn);
        });
    }

    function selectDay(dateStr) {
        if (selectedDay === dateStr) {
            selectedDay = null;
        } else {
            selectedDay = dateStr;
        }
        renderMiniCal();
        renderAgenda();
    }

    // ── Agenda ─────────────────────────────────────
    function renderAgenda() {
        let events = allEvents;

        // filter by selected day
        if (selectedDay) {
            events = events.filter(ev => ev.start_datetime.substring(0, 10) === selectedDay);
        }

        // filter by category (already done server-side, but re-apply for quick switching)
        if (activeCategoryId) {
            events = events.filter(ev => ev.category && String(ev.category.id) === String(activeCategoryId));
        }

        if (events.length === 0) {
            agendaList.innerHTML = `
                <div class="agenda-empty">
                    <div class="agenda-empty-icon">📭</div>
                    <p>${selectedDay ? 'В этот день нет событий.' : 'Событий пока нет.'}</p>
                </div>`;
            return;
        }

        // bucket into time groups
        const buckets = buildBuckets(events);
        let html = '';

        for (const [label, items] of Object.entries(buckets)) {
            if (!items.length) continue;
            html += `<div class="agenda-section">
                        <div class="agenda-bucket-label">${label}</div>`;
            items.forEach(ev => {
                html += renderEventCard(ev);
            });
            html += '</div>';
        }

        agendaList.innerHTML = html;

        // attach click listeners
        agendaList.querySelectorAll('.event-card').forEach(card => {
            card.addEventListener('click', () => {
                const ev = events.find(e => String(e.id) === card.dataset.id);
                if (ev) openEvent(ev);
            });
        });
    }

    function buildBuckets(events) {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday   = new Date(startOfToday.getTime() + 86400000 - 1);

        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay() + (startOfToday.getDay() === 0 ? -6 : 1));
        const endOfWeek = new Date(startOfWeek.getTime() + 7 * 86400000 - 1);

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const buckets = {
            'СЕГОДНЯ': [],
            'ЭТА НЕДЕЛЯ': [],
            'ЭТОТ МЕСЯЦ': [],
            'ПОЗЖЕ': [],
            'ПРОШЕДШИЕ': [],
        };

        events.forEach(ev => {
            const d = new Date(ev.start_datetime);
            if (d < startOfToday) {
                buckets['ПРОШЕДШИЕ'].push(ev);
            } else if (d <= endOfToday) {
                buckets['СЕГОДНЯ'].push(ev);
            } else if (d <= endOfWeek) {
                buckets['ЭТА НЕДЕЛЯ'].push(ev);
            } else if (d <= endOfMonth) {
                buckets['ЭТОТ МЕСЯЦ'].push(ev);
            } else {
                buckets['ПОЗЖЕ'].push(ev);
            }
        });

        // Put past at end
        const ordered = {};
        ['СЕГОДНЯ','ЭТА НЕДЕЛЯ','ЭТОТ МЕСЯЦ','ПОЗЖЕ','ПРОШЕДШИЕ'].forEach(k => {
            ordered[k] = buckets[k];
        });
        return ordered;
    }

    function renderEventCard(ev) {
        const catColor = ev.category ? ev.category.color : '#7C3AED';
        const catIcon  = ev.category ? ev.category.icon  : 'fa-calendar';
        const catName  = ev.category ? ev.category.name  : '';

        const start = new Date(ev.start_datetime);
        const dateLabel = formatDateLabel(start);
        const timeLabel = formatTime(start);
        const endLabel  = ev.end_datetime ? ` – ${formatTime(new Date(ev.end_datetime))}` : '';

        const location  = ev.is_online
            ? '<i class="fas fa-wifi"></i> Онлайн'
            : ev.location
                ? `<i class="fas fa-map-marker-alt"></i> ${escHtml(ev.location)}`
                : '';

        const memeBadge = ev.meme_url ? '<span class="event-card-meme-badge">🐸</span>' : '';

        let badges = '';
        if (catName) {
            badges += `<span class="badge badge-cat" style="color:${catColor};border-color:${catColor}40;background:${catColor}18;">
                <i class="fas ${catIcon}"></i> ${escHtml(catName)}
            </span>`;
        }
        badges += ev.is_free
            ? '<span class="badge badge-free"><i class="fas fa-gift"></i> Бесплатно</span>'
            : '<span class="badge badge-paid"><i class="fas fa-ticket-alt"></i> Платно</span>';
        if (ev.is_online) {
            badges += '<span class="badge badge-online"><i class="fas fa-wifi"></i> Онлайн</span>';
        }

        return `
        <div class="event-card" data-id="${ev.id}" role="button" tabindex="0"
             aria-label="${escHtml(ev.title)}">
            <div class="event-card-stripe" style="background:${catColor};"></div>
            <div class="event-card-body">
                <div class="event-card-top">
                    <div class="event-card-title">${escHtml(ev.title)}</div>
                    ${memeBadge}
                </div>
                <div class="event-card-meta">
                    <span><i class="fas fa-calendar-alt"></i> ${dateLabel}, ${timeLabel}${endLabel}</span>
                    ${location ? `<span>${location}</span>` : ''}
                </div>
                <div class="event-card-badges">${badges}</div>
            </div>
        </div>`;
    }

    // ── Event Detail Modal ─────────────────────────
    function openEvent(ev) {
        const effectiveMeme = ev.meme_url || (ev.category && ev.category.meme_url) || null;

        if (effectiveMeme) {
            // Show meme popup first
            showMemePopup(effectiveMeme, ev.title.toUpperCase(), () => {
                showModal(ev);
            }, 1800);
        } else {
            showModal(ev);
        }
    }

    function showModal(ev) {
        const overlay = document.getElementById('eventModalOverlay');
        const memoBanner = document.getElementById('modalMemeBanner');
        const memoImg    = document.getElementById('modalMemeImg');
        const memoTitle  = document.getElementById('modalMemeTitle');
        const body       = document.getElementById('modalBody');

        const effectiveMeme = ev.meme_url || (ev.category && ev.category.meme_url) || null;

        if (effectiveMeme) {
            memoImg.src = effectiveMeme;
            memoTitle.textContent = ev.title.toUpperCase();
            memoBanner.style.display = 'block';
        } else {
            memoBanner.style.display = 'none';
        }

        const start    = new Date(ev.start_datetime);
        const end      = ev.end_datetime ? new Date(ev.end_datetime) : null;
        const catColor = ev.category ? ev.category.color : '#7C3AED';
        const catIcon  = ev.category ? ev.category.icon  : 'fa-calendar';
        const catName  = ev.category ? ev.category.name  : null;

        let metaHtml = `
            <div class="modal-meta-row">
                <i class="fas fa-calendar-alt"></i>
                <span>${formatDateFull(start)}</span>
            </div>
            <div class="modal-meta-row">
                <i class="fas fa-clock"></i>
                <span>${formatTime(start)}${end ? ' – ' + formatTime(end) : ''}</span>
            </div>`;

        if (ev.is_online) {
            metaHtml += `<div class="modal-meta-row">
                <i class="fas fa-wifi"></i>
                <span>Онлайн</span>
            </div>`;
        } else if (ev.location) {
            metaHtml += `<div class="modal-meta-row">
                <i class="fas fa-map-marker-alt"></i>
                <span>${escHtml(ev.location)}</span>
            </div>`;
        }

        metaHtml += `<div class="modal-meta-row">
            <i class="fas fa-tag"></i>
            <span>${ev.is_free ? 'Бесплатно' : 'Платное'}</span>
        </div>`;

        if (catName) {
            metaHtml += `<div class="modal-meta-row modal-cat-row">
                <i class="fas ${catIcon}" style="color:${catColor};"></i>
                <span class="badge badge-cat" style="color:${catColor};border-color:${catColor}40;background:${catColor}18;">
                    ${escHtml(catName)}
                </span>
            </div>`;
        }

        const descHtml = ev.description
            ? `<div class="modal-description">${escHtml(ev.description)}</div>`
            : '';

        body.innerHTML = `
            <h2 class="modal-event-title">${escHtml(ev.title)}</h2>
            <div class="modal-meta">${metaHtml}</div>
            ${descHtml}`;

        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        eventModalOverlay.style.display = 'none';
        document.body.style.overflow = '';
    }

    // ── Ambient Meme (20% on load) ─────────────────
    function maybeShowAmbientMeme() {
        if (Math.random() > 0.2) return;

        const PRESET_MEMES = [
            { url: 'https://i.imgflip.com/4t0m5.jpg',  name: 'ПРОВЕРЬ СОБЫТИЯ!' },
            { url: 'https://i.imgflip.com/2cp1.jpg',   name: 'ТЫ ГОТОВ?' },
            { url: 'https://i.imgflip.com/3si4.jpg',   name: 'STONKS EVENTS 📈' },
            { url: 'https://i.imgflip.com/30b1gx.jpg', name: 'МЫ ТЕБЯ ЖДЁМ...' },
            { url: 'https://i.imgflip.com/1ur9b0.jpg', name: 'СОБЫТИЙ НЕ ПРОПУСТИ!' },
        ];
        const m = PRESET_MEMES[Math.floor(Math.random() * PRESET_MEMES.length)];
        showMemePopup(m.url, m.name, null, 2500);
    }

    // ── Helpers ────────────────────────────────────
    function formatDate(d) {
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }

    function buildDateStr(year, month, day) {
        let m = month, y = year;
        if (m > 12) { m = 1;  y++; }
        if (m < 1)  { m = 12; y--; }
        return `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    }

    function formatDateLabel(d) {
        const ds = formatDate(d);
        if (ds === todayStr) return 'Сегодня';
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        if (ds === formatDate(tomorrow)) return 'Завтра';
        return `${d.getDate()} ${MONTHS_RU_GEN[d.getMonth()]}`;
    }

    function formatDateFull(d) {
        const days = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];
        return `${d.getDate()} ${MONTHS_RU_GEN[d.getMonth()]} ${d.getFullYear()}, ${days[d.getDay()]}`;
    }

    function formatTime(d) {
        return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    }

    function escHtml(str) {
        if (!str) return '';
        return str.replace(/&/g,'&amp;')
                  .replace(/</g,'&lt;')
                  .replace(/>/g,'&gt;')
                  .replace(/"/g,'&quot;');
    }

    // ── Start ──────────────────────────────────────
    init();

})();
