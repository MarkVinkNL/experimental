      /* ─────────────────────────────────────────────
   DATA
───────────────────────────────────────────── */
      const MOOD_EMOJIS = ["😣", "😟", "😞", "😕", "😐", "🙂", "😊", "😄", "🥳", "✨"];
      const MOOD_LABELS = ["Terrible", "Very bad", "Bad", "Poor", "Okay", "Alright", "Good", "Great", "Amazing", "Perfect"];
      const MED_COLORS = ["#b5a0d4", "#f4a87a", "#7bb8e8", "#e8a598", "#a8d4a0", "#e8c87a", "#d4a0b5", "#7bbfb5"];
      const MED_CATS = ["DMARD", "NSAID", "Biologic", "Corticosteroid", "Supplement", "Other"];
      const FREQUENCIES = ["Daily", "Twice daily", "Weekly", "Every other day", "As needed", "Monthly"];
      const TIMES = ["Morning", "Afternoon", "Evening", "Night", "With food", "Before food"];
      const DIARY_TAGS = ["General", "Pain", "Energy", "Digestion", "Sleep", "Mood"];

      const MOOD_DATA = [
        { day: "Mon", score: 7, time: "08:14", note: "Slept well, mild headache" },
        { day: "Tue", score: 5, time: "09:32", note: "Fatigue in the afternoon" },
        { day: "Wed", score: 4, time: "07:55", note: "Nausea after breakfast" },
        { day: "Thu", score: 8, time: "10:01", note: "Feeling much better today" },
        { day: "Fri", score: 6, time: "08:44", note: "Some joint stiffness" },
        { day: "Sat", score: null, time: null, note: null },
        { day: "Sun", score: null, time: null, note: null },
      ];

      let medications = [
        {
          id: 1,
          name: "Methotrexate",
          dose: "15",
          unit: "mg",
          frequency: "Weekly",
          time: "Morning",
          color: "#b5a0d4",
          active: true,
          startDate: "Jan 12, 2026",
          category: "DMARD",
        },
        {
          id: 2,
          name: "Folic Acid",
          dose: "5",
          unit: "mg",
          frequency: "Daily",
          time: "Morning",
          color: "#f4a87a",
          active: true,
          startDate: "Jan 12, 2026",
          category: "Supplement",
        },
        {
          id: 3,
          name: "Naproxen",
          dose: "500",
          unit: "mg",
          frequency: "As needed",
          time: "With food",
          color: "#7bb8e8",
          active: false,
          startDate: "Feb 2, 2026",
          category: "NSAID",
        },
      ];

      let diaryEntries = [
        {
          date: "Thursday, Mar 6",
          tag: "Energy",
          mood: 8,
          content:
            "Woke up feeling surprisingly refreshed. The new sleep schedule seems to be working. Went for a short walk in the morning — joints weren't as stiff as usual.",
        },
        {
          date: "Wednesday, Mar 5",
          tag: "Digestion",
          mood: 4,
          content:
            "Nausea hit about 30 minutes after breakfast again. I'm starting to think it might be related to the new supplement. Going to skip it tomorrow and see if it helps.",
        },
      ];

      /* ─────────────────────────────────────────────
   STATE
───────────────────────────────────────────── */
      let selectedMood = null;
      let submitted = false;
      let isDragging = false;
      let medFormOpen = false;
      let diaryFormOpen = false;
      let selectedDiaryTag = "General";
      let selectedMedColor = MED_COLORS[0];
      let expandedMedId = null;

      /* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
      function scoreToColor(s) {
        if (!s) return "#e8e0d8";
        if (s <= 3) return "#e8a598";
        if (s <= 5) return "#e8c87a";
        if (s <= 7) return "#a8d4a0";
        return "#7bbfb5";
      }

      function scoreToHeight(s) {
        if (!s) return 12;
        return 20 + (s / 10) * 80;
      }

      function todayString(opts) {
        return new Date().toLocaleDateString("en-US", opts);
      }

      function hex2rgb(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
      }

      /* ─────────────────────────────────────────────
   HEADER DATE
───────────────────────────────────────────── */
      document.getElementById("header-date").textContent = todayString({ weekday: "long", month: "long", day: "numeric" });

      /* ─────────────────────────────────────────────
   SLIDER
───────────────────────────────────────────── */
      const sliderTrack = document.getElementById("slider-track");
      const sliderFill = document.getElementById("slider-fill");
      const sliderBgHint = document.getElementById("slider-bg-hint");
      const emojiHandle = document.getElementById("emoji-handle");
      const emojiGhost = document.getElementById("emoji-ghost");
      const tickRow = document.getElementById("tick-row");
      const moodLabelWrap = document.getElementById("mood-label-wrap");
      const moodPlaceholder = document.getElementById("mood-placeholder");
      const moodLabelDiv = document.getElementById("mood-label");
      const moodDot = document.getElementById("mood-dot");
      const moodText = document.getElementById("mood-text");
      const moodScore = document.getElementById("mood-score");
      const btnLog = document.getElementById("btn-log");

      /* Build tick marks */
      for (let n = 1; n <= 10; n++) {
        const tick = document.createElement("div");
        tick.className = "tick";
        tick.innerHTML = `<div class="tick-line" id="tick-line-${n}"></div><span class="tick-num" id="tick-num-${n}">${n}</span>`;
        tickRow.appendChild(tick);
      }

      function getScoreFromX(clientX) {
        const rect = sliderTrack.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        return Math.round(1 + pct * 9);
      }

      function updateSliderUI(score) {
        const pct = ((score - 1) / 9) * 100;
        const color = scoreToColor(score);

        sliderFill.style.display = "block";
        sliderFill.style.width = pct + "%";
        sliderBgHint.style.display = "none";
        emojiGhost.style.display = "none";

        emojiHandle.style.display = "block";
        emojiHandle.style.left = pct + "%";
        emojiHandle.textContent = MOOD_EMOJIS[score - 1];
        emojiHandle.style.borderColor = color;
        emojiHandle.style.boxShadow = `0 4px 22px ${hex2rgb(color, 0.6)}, 0 2px 8px rgba(0,0,0,0.1)`;

        // Mood label
        moodPlaceholder.style.display = "none";
        moodLabelDiv.style.display = "flex";
        moodDot.style.background = color;
        moodText.textContent = MOOD_LABELS[score - 1];
        moodScore.textContent = `· ${score}/10`;

        // Ticks
        for (let n = 1; n <= 10; n++) {
          const active = n <= score;
          document.getElementById("tick-line-" + n).style.background = active ? color : "#ddd";
          document.getElementById("tick-num-" + n).style.color = active ? color : "#ccc";
          document.getElementById("tick-num-" + n).style.fontWeight = n === score ? "400" : "300";
        }

        btnLog.disabled = false;
      }

      function onSliderStart(e) {
        e.preventDefault();
        isDragging = true;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        selectedMood = getScoreFromX(clientX);
        updateSliderUI(selectedMood);
      }

      function onSliderMove(e) {
        if (!isDragging) return;
        e.preventDefault();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        selectedMood = getScoreFromX(clientX);
        updateSliderUI(selectedMood);
      }

      function onSliderEnd() {
        isDragging = false;
        emojiHandle.classList.remove("dragging");
      }

      sliderTrack.addEventListener("mousedown", onSliderStart);
      sliderTrack.addEventListener("touchstart", onSliderStart, { passive: false });
      emojiHandle.addEventListener("mousedown", onSliderStart);
      emojiHandle.addEventListener("touchstart", onSliderStart, { passive: false });
      document.addEventListener("mousemove", (e) => {
        if (isDragging) {
          emojiHandle.classList.add("dragging");
          onSliderMove(e);
        }
      });
      document.addEventListener("mouseup", onSliderEnd);
      document.addEventListener(
        "touchmove",
        (e) => {
          if (isDragging) onSliderMove(e);
        },
        { passive: false },
      );
      document.addEventListener("touchend", onSliderEnd);

      /* ── Log / Submit ── */
      btnLog.addEventListener("click", () => {
        if (!selectedMood) return;
        submitted = true;
        document.getElementById("checkin-form").style.display = "none";
        const sv = document.getElementById("submitted-view");
        sv.style.display = "block";
        sv.classList.add("fade-in");
        document.getElementById("submitted-emoji").textContent = MOOD_EMOJIS[selectedMood - 1];
        document.getElementById("submitted-title").textContent = "Logged — " + MOOD_LABELS[selectedMood - 1];
        document.getElementById("submitted-sub").textContent = "Your check-in for today has been recorded.";
      });

      document.getElementById("btn-update").addEventListener("click", () => {
        submitted = false;
        document.getElementById("submitted-view").style.display = "none";
        document.getElementById("submitted-view").classList.remove("fade-in");
        document.getElementById("checkin-form").style.display = "block";
      });

      /* ─────────────────────────────────────────────
   BAR CHART
───────────────────────────────────────────── */
      (function buildChart() {
        const container = document.getElementById("bar-chart");
        MOOD_DATA.forEach((d) => {
          const wrap = document.createElement("div");
          wrap.className = "bar-wrap";

          if (d.score) {
            const tip = document.createElement("div");
            tip.className = "bar-tooltip";
            tip.innerHTML = `${d.score}/10 · ${d.time}<br>${d.note}`;
            wrap.appendChild(tip);
          }

          const bar = document.createElement("div");
          bar.className = "bar";
          bar.style.height = scoreToHeight(d.score) + "px";
          bar.style.background = d.score ? scoreToColor(d.score) : "#f0ece6";
          if (!d.score) bar.style.border = "2px dashed #ddd";
          wrap.appendChild(bar);

          const label = document.createElement("div");
          label.className = "bar-day";
          label.style.color = d.score ? "#888" : "#ccc";
          label.textContent = d.day;
          wrap.appendChild(label);

          if (d.score) {
            const dot = document.createElement("div");
            dot.className = "bar-dot";
            dot.style.background = scoreToColor(d.score);
            wrap.appendChild(dot);
          }

          container.appendChild(wrap);
        });
      })();

      /* ─────────────────────────────────────────────
   MEDICATIONS
───────────────────────────────────────────── */
      function renderMedications() {
        const activeEl = document.getElementById("active-meds");
        const inactiveEl = document.getElementById("inactive-meds");
        const inactiveTitle = document.getElementById("inactive-title");
        const ghostAdd = document.getElementById("ghost-add");

        activeEl.innerHTML = "";
        inactiveEl.innerHTML = "";

        const active = medications.filter((m) => m.active);
        const inactive = medications.filter((m) => !m.active);

        ghostAdd.style.display = active.length === 0 && !medFormOpen ? "flex" : "none";
        inactiveTitle.style.display = inactive.length > 0 ? "block" : "none";

        active.forEach((m) => activeEl.appendChild(buildMedCard(m, false)));
        inactive.forEach((m) => inactiveEl.appendChild(buildMedCard(m, true)));
      }

      function buildMedCard(med, isInactive) {
        const card = document.createElement("div");
        card.className = "med-card" + (isInactive ? " inactive" : "");
        card.dataset.id = med.id;

        /* Header */
        const header = document.createElement("div");
        header.className = "med-card-header";

        const dot = document.createElement("div");
        dot.className = "med-dot";
        dot.style.background = med.color;

        const meta = document.createElement("div");
        meta.className = "med-meta";

        if (isInactive) {
          meta.innerHTML = `
      <span class="med-name dim">${med.name}</span>
      <div class="med-sub">${med.dose}${med.unit} · ${med.frequency}</div>`;
        } else {
          const doseChip = med.dose
            ? `<span class="med-pill" style="background:${med.color}22;color:${med.color};">${med.dose}${med.unit}</span>`
            : "";
          meta.innerHTML = `
      <div class="med-name-row">
        <span class="med-name">${med.name}</span>
        ${doseChip}
        <span class="med-pill" style="background:#f5f0ea;color:#aaa;">${med.category}</span>
      </div>
      <div class="med-sub">${med.frequency} · ${med.time}</div>`;
        }

        /* Toggle */
        const label = document.createElement("label");
        label.className = "toggle-switch";
        label.innerHTML = `<input type="checkbox" ${med.active ? "checked" : ""}><span class="toggle-slider"></span>`;
        label.addEventListener("click", (e) => e.stopPropagation());
        label.querySelector("input").addEventListener("change", () => toggleMed(med.id));

        header.appendChild(dot);
        header.appendChild(meta);
        header.appendChild(label);

        if (!isInactive) {
          const chev = document.createElement("span");
          chev.className = "med-chevron";
          chev.textContent = expandedMedId === med.id ? "▲" : "▼";
          header.appendChild(chev);

          header.addEventListener("click", () => toggleExpandMed(med.id));
        }

        card.appendChild(header);

        /* Detail panel */
        if (!isInactive && expandedMedId === med.id) {
          const detail = document.createElement("div");
          detail.className = "med-detail slide-down";
          const grid = document.createElement("div");
          grid.className = "med-detail-grid";
          [
            ["💊 Dose", med.dose ? `${med.dose} ${med.unit}` : "—"],
            ["🔁 Frequency", med.frequency],
            ["🕐 Timing", med.time],
            ["📅 Since", med.startDate],
            ["🏷 Category", med.category],
          ].forEach(([lbl, val]) => {
            const item = document.createElement("div");
            item.className = "med-detail-item";
            item.innerHTML = `<span class="det-label">${lbl}</span><span class="det-val">${val}</span>`;
            grid.appendChild(item);
          });
          detail.appendChild(grid);

          const footer = document.createElement("div");
          footer.className = "med-detail-footer";
          const btnRemove = document.createElement("button");
          btnRemove.className = "btn-remove";
          btnRemove.textContent = "Remove";
          btnRemove.addEventListener("click", () => removeMed(med.id));
          footer.appendChild(btnRemove);
          detail.appendChild(footer);

          card.appendChild(detail);
        }

        return card;
      }

      function toggleMed(id) {
        medications = medications.map((m) => (m.id === id ? { ...m, active: !m.active } : m));
        renderMedications();
      }

      function removeMed(id) {
        medications = medications.filter((m) => m.id !== id);
        if (expandedMedId === id) expandedMedId = null;
        renderMedications();
      }

      function toggleExpandMed(id) {
        expandedMedId = expandedMedId === id ? null : id;
        renderMedications();
      }

      /* Med form controls */
      const btnToggleMedForm = document.getElementById("btn-toggle-med-form");
      const medFormEl = document.getElementById("med-form");

      btnToggleMedForm.addEventListener("click", () => {
        medFormOpen = !medFormOpen;
        medFormEl.classList.toggle("open", medFormOpen);
        btnToggleMedForm.textContent = medFormOpen ? "Cancel" : "+ Add medication";
        btnToggleMedForm.classList.toggle("open", medFormOpen);
        renderMedications();
      });

      document.getElementById("ghost-add").addEventListener("click", () => {
        medFormOpen = true;
        medFormEl.classList.add("open");
        btnToggleMedForm.textContent = "Cancel";
        btnToggleMedForm.classList.add("open");
        renderMedications();
      });

      /* Populate selects */
      MED_CATS.forEach((c) => (document.getElementById("med-category").innerHTML += `<option>${c}</option>`));
      FREQUENCIES.forEach((f) => (document.getElementById("med-frequency").innerHTML += `<option>${f}</option>`));
      TIMES.forEach((t) => (document.getElementById("med-time").innerHTML += `<option>${t}</option>`));

      /* Color swatches */
      (function buildSwatches() {
        const wrap = document.getElementById("color-swatches");
        MED_COLORS.forEach((c, i) => {
          const sw = document.createElement("div");
          sw.className = "color-swatch" + (i === 0 ? " selected" : "");
          sw.style.background = c;
          sw.addEventListener("click", () => {
            document.querySelectorAll(".color-swatch").forEach((s) => s.classList.remove("selected"));
            sw.classList.add("selected");
            selectedMedColor = c;
          });
          wrap.appendChild(sw);
        });
      })();

      document.getElementById("btn-save-med").addEventListener("click", () => {
        const name = document.getElementById("med-name").value.trim();
        if (!name) return;
        const today = todayString({ month: "short", day: "numeric", year: "numeric" });
        medications.push({
          id: Date.now(),
          name,
          dose: document.getElementById("med-dose").value.trim(),
          unit: document.getElementById("med-unit").value,
          frequency: document.getElementById("med-frequency").value,
          time: document.getElementById("med-time").value,
          category: document.getElementById("med-category").value,
          color: selectedMedColor,
          active: true,
          startDate: today,
        });
        /* Reset form */
        document.getElementById("med-name").value = "";
        document.getElementById("med-dose").value = "";
        document.getElementById("med-unit").value = "mg";
        document.getElementById("med-frequency").value = "Daily";
        document.getElementById("med-time").value = "Morning";
        document.getElementById("med-category").value = "Other";
        document.querySelectorAll(".color-swatch").forEach((s, i) => s.classList.toggle("selected", i === 0));
        selectedMedColor = MED_COLORS[0];

        medFormOpen = false;
        medFormEl.classList.remove("open");
        btnToggleMedForm.textContent = "+ Add medication";
        btnToggleMedForm.classList.remove("open");
        renderMedications();
      });

      renderMedications();

      /* ─────────────────────────────────────────────
   DIARY
───────────────────────────────────────────── */
      function renderDiary() {
        const container = document.getElementById("diary-entries");
        const empty = document.getElementById("diary-empty");
        container.innerHTML = "";

        if (diaryEntries.length === 0) {
          empty.style.display = "block";
          return;
        }
        empty.style.display = "none";

        diaryEntries.forEach((entry) => {
          const card = document.createElement("div");
          card.className = "diary-card";
          card.style.borderLeftColor = scoreToColor(entry.mood);
          card.innerHTML = `
      <div class="diary-card-header">
        <div class="diary-card-left">
          <span class="diary-date">${entry.date}</span>
          <span class="tag-chip">${entry.tag}</span>
        </div>
        <span class="diary-emoji">${MOOD_EMOJIS[entry.mood - 1]}</span>
      </div>
      <p class="diary-content">${entry.content}</p>`;
          container.appendChild(card);
        });
      }

      /* Build tag buttons */
      (function buildTags() {
        const wrap = document.getElementById("tag-select");
        DIARY_TAGS.forEach((tag) => {
          const btn = document.createElement("button");
          btn.className = "tag-btn" + (tag === selectedDiaryTag ? " active" : "");
          btn.textContent = tag;
          btn.addEventListener("click", () => {
            selectedDiaryTag = tag;
            document.querySelectorAll(".tag-btn").forEach((b) => b.classList.toggle("active", b.textContent === tag));
          });
          wrap.appendChild(btn);
        });
      })();

      const btnToggleDiary = document.getElementById("btn-toggle-diary");
      const diaryFormEl = document.getElementById("diary-form");

      btnToggleDiary.addEventListener("click", () => {
        diaryFormOpen = !diaryFormOpen;
        diaryFormEl.classList.toggle("open", diaryFormOpen);
        btnToggleDiary.textContent = diaryFormOpen ? "Cancel" : "+ New entry";
        btnToggleDiary.classList.toggle("open", diaryFormOpen);
      });

      document.getElementById("btn-save-diary").addEventListener("click", () => {
        const text = document.getElementById("diary-textarea").value.trim();
        if (!text) return;
        const today = todayString({ weekday: "long", month: "short", day: "numeric" });
        diaryEntries.unshift({
          date: today,
          tag: selectedDiaryTag,
          mood: selectedMood ?? 5,
          content: text,
        });
        document.getElementById("diary-textarea").value = "";
        diaryFormOpen = false;
        diaryFormEl.classList.remove("open");
        btnToggleDiary.textContent = "+ New entry";
        btnToggleDiary.classList.remove("open");
        renderDiary();
      });

      renderDiary();