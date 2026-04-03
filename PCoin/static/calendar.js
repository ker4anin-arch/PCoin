/* ═══════════════════════════════════════════════════
   PCoin Events — Calendar JS (Card Grid)
   ═══════════════════════════════════════════════════ */

(function () {
    'use strict';

    // ── NFT-style gradients for day cards ──
    const CARD_GRADIENTS = [
        'linear-gradient(135deg, #667eea, #764ba2)',
        'linear-gradient(135deg, #f093fb, #f5576c)',
        'linear-gradient(135deg, #4facfe, #00f2fe)',
        'linear-gradient(135deg, #43e97b, #38f9d7)',
        'linear-gradient(135deg, #fa709a, #fee140)',
        'linear-gradient(135deg, #a18cd1, #fbc2eb)',
        'linear-gradient(135deg, #fccb90, #d57eeb)',
        'linear-gradient(135deg, #e0c3fc, #8ec5fc)',
        'linear-gradient(135deg, #f6d365, #fda085)',
        'linear-gradient(135deg, #96fbc4, #f9f586)',
        'linear-gradient(135deg, #84fab0, #8fd3f4)',
        'linear-gradient(135deg, #a1c4fd, #c2e9fb)',
        'linear-gradient(135deg, #fddb92, #d1fdff)',
        'linear-gradient(135deg, #ff9a9e, #fad0c4)',
        'linear-gradient(135deg, #a8edea, #fed6e3)',
        'linear-gradient(135deg, #ffecd2, #fcb69f)',
        'linear-gradient(135deg, #ff8177, #b12a5b)',
        'linear-gradient(135deg, #c2e9fb, #81d4fa)',
        'linear-gradient(135deg, #e0f7fa, #b2ebf2)',
        'linear-gradient(135deg, #f3e7e9, #e3eeff)',
        'linear-gradient(135deg, #d4fc79, #96e6a1)',
        'linear-gradient(135deg, #f77062, #fe5196)',
        'linear-gradient(135deg, #c471ed, #f64f59)',
        'linear-gradient(135deg, #12c2e9, #c471ed)',
        'linear-gradient(135deg, #f64f59, #c471ed)',
        'linear-gradient(135deg, #43cbff, #9708cc)',
        'linear-gradient(135deg, #ee9ca7, #ffdde1)',
        'linear-gradient(135deg, #2af598, #009efd)',
        'linear-gradient(135deg, #ffd89b, #19547b)',
        'linear-gradient(135deg, #a8caba, #5d4157)',
        'linear-gradient(135deg, #e96443, #904e95)',
    ];

    // ── Funny emojis to show in card art ──
    const CARD_EMOJIS = [
        '🚀','🎮','🏆','💎','🎯','🔥','⚡','🌈',
        '🎪','🎭','🎨','🎲','🎸','🤖','👾','🦄',
        '🌊','🏄','🎡','🎢','🎠','🎪','🌟','💫',
        '🧩','🎯','🏹','⚔️','🛡️','🌺','🍀','🦋',
    ];

    const MONTHS_RU = [
        'Январь','Февраль','Март','Апрель','Май','Июнь',
        'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'
    ];
    const MONTHS_RU_GEN = [
        'января','февраля','марта','апреля','мая','июня',
        'июля','августа','сентября','октября','ноября','декабря'
    ];
    const DAYS_RU_FULL = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];

    // ── State ──
    let currentYear  = new Date().getFullYear();
    let currentMonth = new Date().getMonth() + 1;
    let activeCategoryId = '';
    let monthEvents  = [];     // all events for current month
    let eventsByDay  = {};     // { 'YYYY-MM-DD': [events...] }
    let flyingCard   = null;   // currently animating card element

    const today = new Date();
    const todayStr = fmtDate(today);

    // ── Init ──
    function init() {
        document.getElementById('prevMonth').addEventListener('click', () => navigateMonth(-1));
        document.getElementById('nextMonth').addEventListener('click', () => navigateMonth(1));
        document.getElementById('dayModalClose').addEventListener('click', closeDayModal);
        document.getElementById('dayModalOverlay').addEventListener('click', e => {
            if (e.target === document.getElementById('dayModalOverlay')) closeDayModal();
        });
        document.getElementById('modalClose').addEventListener('click', closeEventModal);
        document.getElementById('eventModalOverlay').addEventListener('click', e => {
            if (e.target === document.getElementById('eventModalOverlay')) closeEventModal();
        });
        document.getElementById('categoryFilters').addEventListener('click', e => {
            const chip = e.target.closest('.cal-chip');
            if (!chip) return;
            document.querySelectorAll('.cal-chip').forEach(c => c.classList.remove('cal-chip-active'));
            chip.classList.add('cal-chip-active');
            activeCategoryId = chip.dataset.category;
            renderGrid();
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') { closeDayModal(); closeEventModal(); }
        });

        loadMonth();
        maybeShowAmbientMeme();
    }

    // ── Navigation ──
    function navigateMonth(delta) {
        currentMonth += delta;
        if (currentMonth > 12) { currentMonth = 1;  currentYear++; }
        if (currentMonth < 1)  { currentMonth = 12; currentYear--; }
        loadMonth();
    }

    // ── Load month data ──
    async function loadMonth() {
        const monthStr = `${currentYear}-${pad(currentMonth)}`;
        document.getElementById('monthLabel').textContent =
            `${MONTHS_RU[currentMonth - 1]} ${currentYear}`;

        document.getElementById('calGrid').innerHTML =
            '<div class="cal-loading-msg"><i class="fas fa-spinner fa-spin"></i> Загрузка...</div>';

        try {
            let url = `/api/events?month=${monthStr}`;
            if (activeCategoryId) url += `&category_id=${activeCategoryId}`;
            const res = await fetch(url);
            monthEvents = await res.json();
        } catch (e) {
            monthEvents = [];
        }

        // index by day
        eventsByDay = {};
        monthEvents.forEach(ev => {
            const day = ev.start_datetime.substring(0, 10);
            if (!eventsByDay[day]) eventsByDay[day] = [];
            eventsByDay[day].push(ev);
        });

        renderGrid();
    }

    // ── Render card grid ──
    function renderGrid() {
        const grid = document.getElementById('calGrid');

        const firstDay = new Date(currentYear, currentMonth - 1, 1);
        let startOffset = firstDay.getDay() - 1; // 0=Mon
        if (startOffset < 0) startOffset = 6;
        const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
        const daysInPrev  = new Date(currentYear, currentMonth - 1, 0).getDate();

        let html = '';

        // prev month ghost cells
        for (let i = startOffset - 1; i >= 0; i--) {
            const d = daysInPrev - i;
            const m = currentMonth - 1 <= 0 ? 12 : currentMonth - 1;
            const y = currentMonth - 1 <= 0 ? currentYear - 1 : currentYear;
            html += ghostCard(d, m, y);
        }

        // current month cards
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${currentYear}-${pad(currentMonth)}-${pad(d)}`;
            const isToday  = dateStr === todayStr;
            const dayEvents = getFilteredDayEvents(dateStr);
            const bgIdx = ((currentYear * 100 + currentMonth) * 31 + d) % CARD_GRADIENTS.length;
            html += dayCard(d, dateStr, isToday, dayEvents, bgIdx);
        }

        // next month ghost cells (fill to complete last row)
        const totalCells = startOffset + daysInMonth;
        const remainder  = totalCells % 7;
        const nextCount  = remainder === 0 ? 0 : 7 - remainder;
        for (let d = 1; d <= nextCount; d++) {
            const m = currentMonth + 1 > 12 ? 1 : currentMonth + 1;
            const y = currentMonth + 1 > 12 ? currentYear + 1 : currentYear;
            html += ghostCard(d, m, y);
        }

        grid.innerHTML = html;

        // attach click listeners
        grid.querySelectorAll('.day-card[data-date]').forEach(card => {
            card.addEventListener('click', () => handleCardClick(card));
        });
    }

    function getFilteredDayEvents(dateStr) {
        const evs = eventsByDay[dateStr] || [];
        if (!activeCategoryId) return evs;
        return evs.filter(e => e.category && String(e.category.id) === String(activeCategoryId));
    }

    // ── Day card HTML (NFT style) ──
    function dayCard(day, dateStr, isToday, events, idx) {
        const gradient = CARD_GRADIENTS[idx % CARD_GRADIENTS.length];
        const emoji    = CARD_EMOJIS[idx % CARD_EMOJIS.length];
        const hasEvents = events.length > 0;

        const classes = [
            'day-card',
            isToday    ? 'day-card-today'      : '',
            hasEvents  ? 'day-card-has-events'  : '',
        ].filter(Boolean).join(' ');

        // First event info for the info strip
        const firstEv = hasEvents ? events[0] : null;
        const catColor = firstEv && firstEv.category ? firstEv.category.color : '#7C3AED';
        const catIcon  = firstEv && firstEv.category ? firstEv.category.icon  : 'fa-calendar';
        const catName  = firstEv && firstEv.category ? firstEv.category.name  : '';

        // Divider bars (NFT style: 3 bars, first colored)
        const divider = `<div class="day-card-divider">
            <span style="background:${hasEvents ? catColor : 'rgba(255,255,255,0.15)'}"></span>
            <span></span><span></span>
        </div>`;

        const infoBottom = hasEvents
            ? `${catName
                ? `<div class="day-card-cat-badge" style="background:${catColor}88;">
                     <i class="fas ${catIcon}"></i> ${escHtml(catName)}
                   </div>`
                : ''}
               <div class="day-card-event-name">${escHtml(firstEv.title)}</div>
               ${events.length > 1
                    ? `<div class="day-card-empty-label">+${events.length - 1} ещё</div>`
                    : ''}`
            : `<div class="day-card-empty-label">—</div>`;

        return `
        <div class="${classes}" data-date="${dateStr}" data-day="${day}">
            <div class="day-card-art" style="background:${gradient};">
                <span class="day-card-emoji">${emoji}</span>
            </div>
            <div class="day-card-info">
                <div class="day-card-num-row">
                    <span class="day-card-num">${day}</span>
                    ${isToday ? '<span class="day-card-today-badge">Today</span>' : ''}
                </div>
                ${divider}
                ${infoBottom}
            </div>
        </div>`;
    }

    function ghostCard(day, month, year) {
        const idx = ((year * 100 + month) * 31 + day) % CARD_GRADIENTS.length;
        const gradient = CARD_GRADIENTS[idx];
        const emoji    = CARD_EMOJIS[idx % CARD_EMOJIS.length];
        return `
        <div class="day-card day-card-ghost">
            <div class="day-card-art" style="background:${gradient};">
                <span class="day-card-emoji">${emoji}</span>
            </div>
            <div class="day-card-info">
                <div class="day-card-num-row">
                    <span class="day-card-num">${day}</span>
                </div>
                <div class="day-card-divider"><span></span><span></span><span></span></div>
                <div class="day-card-empty-label">—</div>
            </div>
        </div>`;
    }

    // ── Card click → fly animation → modal ──
    function handleCardClick(card) {
        if (flyingCard) return;
        flyingCard = card;

        card.classList.add('day-card-flying');

        setTimeout(() => {
            card.classList.remove('day-card-flying');
            card.classList.add('day-card-vanished');
            flyingCard = null;
            openDayModal(card.dataset.date);

            // restore card after modal close (handled in closeDayModal)
        }, 420);
    }

    // ── Day Modal ──
    function openDayModal(dateStr) {
        const overlay = document.getElementById('dayModalOverlay');
        const content = document.getElementById('dayModalContent');

        const d = new Date(dateStr + 'T12:00:00');
        const dayNum  = d.getDate();
        const dayName = DAYS_RU_FULL[d.getDay()];
        const monthName = MONTHS_RU_GEN[d.getMonth()];
        const isToday = dateStr === todayStr;

        const events = getFilteredDayEvents(dateStr);

        let eventsHtml = '';
        if (events.length > 0) {
            eventsHtml = events.map(ev => dayModalEventCard(ev)).join('');
        } else {
            eventsHtml = `<div class="day-modal-empty">
                <span style="font-size:2.5rem;">📭</span>
                <p>В этот день нет событий</p>
            </div>`;
        }

        content.innerHTML = `
            <div class="day-modal-header">
                <div class="day-modal-date">
                    <span class="day-modal-daynum ${isToday ? 'today' : ''}">${dayNum}</span>
                    <div class="day-modal-dateinfo">
                        <span class="day-modal-dayname">${capitalize(dayName)}</span>
                        <span class="day-modal-monthname">${monthName} ${d.getFullYear()}</span>
                    </div>
                </div>
                ${events.length > 0
                    ? `<span class="day-modal-count">${events.length} ${plural(events.length,'событие','события','событий')}</span>`
                    : ''}
            </div>
            <div class="day-modal-events">${eventsHtml}</div>`;

        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // animate in
        const modal = document.getElementById('dayModal');
        modal.classList.remove('modal-leave');
        modal.classList.add('modal-enter');
        setTimeout(() => modal.classList.remove('modal-enter'), 350);
    }

    function dayModalEventCard(ev) {
        const catColor = ev.category ? ev.category.color : '#7C3AED';
        const catIcon  = ev.category ? ev.category.icon  : 'fa-calendar';
        const catName  = ev.category ? ev.category.name  : '';
        const start = new Date(ev.start_datetime);
        const timeStr = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
        const endStr  = ev.end_datetime
            ? ` – ${pad(new Date(ev.end_datetime).getHours())}:${pad(new Date(ev.end_datetime).getMinutes())}`
            : '';
        const loc = ev.is_online ? 'Онлайн' : (ev.location || '');
        const effectiveMeme = ev.meme_url || (ev.category && ev.category.meme_url) || null;

        return `
        <div class="dme-card" data-event-id="${ev.id}" style="border-left-color:${catColor};">
            ${effectiveMeme
                ? `<div class="dme-meme-thumb" style="background-image:url('${effectiveMeme}')"></div>`
                : ''}
            <div class="dme-body">
                <div class="dme-meta">
                    <span style="color:${catColor};"><i class="fas ${catIcon}"></i> ${escHtml(catName)}</span>
                    <span class="dme-time"><i class="fas fa-clock"></i> ${timeStr}${endStr}</span>
                </div>
                <div class="dme-title">${escHtml(ev.title)}</div>
                ${loc ? `<div class="dme-loc"><i class="fas fa-map-marker-alt"></i> ${escHtml(loc)}</div>` : ''}
                ${ev.description ? `<div class="dme-desc">${escHtml(ev.description)}</div>` : ''}
            </div>
            ${effectiveMeme ? `<button class="dme-meme-btn" data-meme="${effectiveMeme}" data-title="${escHtml(ev.title).toUpperCase()}">🐸</button>` : ''}
        </div>`;
    }

    function closeDayModal() {
        const overlay = document.getElementById('dayModalOverlay');
        const modal   = document.getElementById('dayModal');
        modal.classList.add('modal-leave');
        setTimeout(() => {
            overlay.style.display = 'none';
            modal.classList.remove('modal-leave');
            document.body.style.overflow = '';
            // restore any vanished cards
            document.querySelectorAll('.day-card-vanished').forEach(c => {
                c.classList.remove('day-card-vanished');
            });
        }, 280);
    }

    // ── Event detail modal (full) ──
    function openEventModal(ev) {
        const overlay = document.getElementById('eventModalOverlay');
        const banner  = document.getElementById('modalMemeBanner');
        const memeImg = document.getElementById('modalMemeImg');
        const memeTitle = document.getElementById('modalMemeTitle');
        const body    = document.getElementById('modalBody');
        const effectiveMeme = ev.meme_url || (ev.category && ev.category.meme_url) || null;

        if (effectiveMeme) {
            memeImg.src = effectiveMeme;
            memeTitle.textContent = ev.title.toUpperCase();
            banner.style.display = 'block';
        } else {
            banner.style.display = 'none';
        }

        const start = new Date(ev.start_datetime);
        const catColor = ev.category ? ev.category.color : '#7C3AED';
        const catIcon  = ev.category ? ev.category.icon  : 'fa-calendar';
        const catName  = ev.category ? ev.category.name  : null;

        body.innerHTML = `
            <h2 class="modal-event-title">${escHtml(ev.title)}</h2>
            <div class="modal-meta">
                <div class="modal-meta-row"><i class="fas fa-calendar-alt"></i><span>${start.getDate()} ${MONTHS_RU_GEN[start.getMonth()]} ${start.getFullYear()}</span></div>
                <div class="modal-meta-row"><i class="fas fa-clock"></i><span>${pad(start.getHours())}:${pad(start.getMinutes())}${ev.end_datetime ? ' – ' + pad(new Date(ev.end_datetime).getHours()) + ':' + pad(new Date(ev.end_datetime).getMinutes()) : ''}</span></div>
                ${ev.is_online ? '<div class="modal-meta-row"><i class="fas fa-wifi"></i><span>Онлайн</span></div>'
                    : ev.location ? `<div class="modal-meta-row"><i class="fas fa-map-marker-alt"></i><span>${escHtml(ev.location)}</span></div>` : ''}
                <div class="modal-meta-row"><i class="fas fa-tag"></i><span>${ev.is_free ? 'Бесплатно' : 'Платное'}</span></div>
                ${catName ? `<div class="modal-meta-row"><i class="fas ${catIcon}" style="color:${catColor}"></i><span style="color:${catColor}">${escHtml(catName)}</span></div>` : ''}
            </div>
            ${ev.description ? `<div class="modal-description">${escHtml(ev.description)}</div>` : ''}`;

        overlay.style.display = 'flex';
    }

    function closeEventModal() {
        document.getElementById('eventModalOverlay').style.display = 'none';
    }

    // ── Delegate meme button clicks in day modal ──
    document.addEventListener('click', e => {
        const memeBtn = e.target.closest('.dme-meme-btn');
        if (memeBtn) {
            showMemePopup(memeBtn.dataset.meme, memeBtn.dataset.title, null, 1800);
            return;
        }
        // click on dme-card body opens event modal
        const dmeCard = e.target.closest('.dme-card');
        if (dmeCard && !e.target.closest('.dme-meme-btn')) {
            const eventId = dmeCard.dataset.eventId;
            const ev = monthEvents.find(e => String(e.id) === String(eventId));
            if (ev) {
                const effectiveMeme = ev.meme_url || (ev.category && ev.category.meme_url) || null;
                if (effectiveMeme) {
                    showMemePopup(effectiveMeme, ev.title.toUpperCase(), () => openEventModal(ev), 1500);
                } else {
                    openEventModal(ev);
                }
            }
        }
    });

    // ── Ambient Meme (20% on load) ──
    const AMBIENT_MEMES = [
        'https://i.imgflip.com/4t0m5.jpg',
        'https://i.imgflip.com/2cp1.jpg',
        'https://i.imgflip.com/3si4.jpg',
        'https://i.imgflip.com/30b1gx.jpg',
        'https://i.imgflip.com/1ur9b0.jpg',
    ];
    function maybeShowAmbientMeme() {
        if (Math.random() > 0.2) return;
        const CAPTIONS = [
            'ПРОВЕРЬ СОБЫТИЯ!', 'ТЫ ГОТОВ?',
            'СОБЫТИЯ ЖДУТ ТЕБЯ...', 'НЕ ПРОПУСТИ!', 'STONKS EVENTS 📈'
        ];
        const m = AMBIENT_MEMES[Math.floor(Math.random() * AMBIENT_MEMES.length)];
        showMemePopup(m, CAPTIONS[Math.floor(Math.random() * CAPTIONS.length)], null, 2500);
    }

    // ── Helpers ──
    function fmtDate(d) {
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    }
    function pad(n) { return String(n).padStart(2, '0'); }
    function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
    function escHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g,'&amp;').replace(/</g,'&lt;')
            .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function plural(n, one, few, many) {
        const mod10 = n % 10, mod100 = n % 100;
        if (mod10 === 1 && mod100 !== 11) return one;
        if ([2,3,4].includes(mod10) && ![12,13,14].includes(mod100)) return few;
        return many;
    }

    init();
})();
