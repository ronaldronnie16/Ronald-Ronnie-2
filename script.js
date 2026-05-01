const firebaseConfig = {
    apiKey: "AIzaSyAg4ne-ROQxX5ZUHN8_-eZ3ju8nnuwCHzM",
    authDomain: "dls-league.firebaseapp.com",
    projectId: "dls-league",
    storageBucket: "dls-league.firebasestorage.app",
    messagingSenderId: "336668588963",
    appId: "1:336668588963:web:d7fbc8b0affa4ce0af3816"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let teams = [], fixtures = [], currentWeek = 1, isAdmin = false;

db.collection("league").doc("data").onSnapshot(doc => {
    if (doc.exists) {
        const data = doc.data();
        teams = data.teams || [];
        fixtures = data.fixtures || [];
        currentWeek = data.currentWeek || 1;
    }
    renderAll();
});

function show(id) {
    // 1. Hide all sections and show the selected one
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
    document.getElementById(id).classList.add("active");

    // 2. Remove highlight from all nav buttons
    document.querySelectorAll(".nav-links button").forEach(btn => btn.classList.remove("active-nav"));

    // 3. Highlight the button that corresponds to the visible section
    // We match the onclick attribute of the buttons to find the right one
    const activeButton = Array.from(document.querySelectorAll(".nav-links button"))
        .find(btn => btn.getAttribute("onclick").includes(`'${id}'`));
    
    if (activeButton) {
        activeButton.classList.add("active-nav");
    }
}

// Call this once at the very end of your script to highlight 'Fixtures' on load
show('fixtures');


function adminLogin() {
    if (prompt("Password") === "2024/2026/dls.league") { isAdmin = true; show("admin"); }
    else { alert('Wrong Password'); }
}

async function resetAll() {
    if (isAdmin && confirm("WARNING: Wipe everything?")) {
        await db.collection("league").doc("data").delete();
    }
}

function save() {
    db.collection("league").doc("data").set({ teams, fixtures, currentWeek });
}

function addTeam() {
    let n = document.getElementById("teamName").value.trim();
    if (isAdmin && n && teams.length < 20) {
        teams.push(n);
        document.getElementById("teamName").value = "";
        save();
    }
}

function generateFixtures() {
    if (!isAdmin || teams.length < 2) return;
    let pool = [...teams];
    if (pool.length % 2 !== 0) pool.push("BYE");
    let rounds = pool.length - 1, half = pool.length / 2, sched = [];
    for (let r = 0; r < rounds; r++) {
        let ms = [];
        for (let i = 0; i < half; i++) {
            ms.push({ home: pool[i], away: pool[pool.length - 1 - i], hg: null, ag: null, played: false });
        }
        sched.push({ week: r + 1, matches: ms });
        pool.splice(1, 0, pool.pop());
    }
    let rev = sched.map(w => ({ 
        week: w.week + rounds, 
        matches: w.matches.map(m => ({ home: m.away, away: m.home, hg: null, ag: null, played: false })) 
    }));
    fixtures = [...sched, ...rev];
    currentWeek = 1;
    save();
}

function recordResult() {
    if (!isAdmin) return;
    let val = document.getElementById("fixtureSelect").value;
    if (!val) return;
    let [wIdx, mIdx] = val.split("-");
    fixtures[wIdx].matches[mIdx].hg = parseInt(document.getElementById("hg").value) || 0;
    fixtures[wIdx].matches[mIdx].ag = parseInt(document.getElementById("ag").value) || 0;
    fixtures[wIdx].matches[mIdx].played = true;
    save();
}

function renderTable() {
    let s = {};
    teams.forEach(t => s[t] = { P:0, W:0, D:0, L:0, GF:0, GA:0, PTS:0, CS:0 });

    fixtures.forEach(w => w.matches.forEach(m => {
        if (m.played && s[m.home] && s[m.away]) {
            let h = s[m.home], a = s[m.away];
            h.P++; a.P++; h.GF += m.hg; h.GA += m.ag; a.GF += m.ag; a.GA += m.hg;
            if (m.ag === 0) h.CS++;
            if (m.hg === 0) a.CS++;
            if (m.hg > m.ag) { h.W++; h.PTS += 3; a.L++; }
            else if (m.ag > m.hg) { a.W++; a.PTS += 3; h.L++; }
            else { h.D++; a.D++; h.PTS++; a.PTS++; }
        }
    }));

    let sorted = Object.entries(s).map(([n, d]) => ({ n, ...d, GD: d.GF - d.GA }))
        .sort((a, b) => b.PTS - a.PTS || b.GD - a.GD || b.GF - a.GF || a.n.localeCompare(b.n));

    // 1. Full Live Standings
    let h = `<tr><th>#</th><th style="text-align:left">Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>PTS</th></tr>`;
    sorted.forEach((t, i) => {
        let cls = i === 0 ? "first" : i < 4 ? "top4" : i >= sorted.length - 3 ? "relegation" : "";
        h += `<tr class="${cls}"><td>${i+1}</td><td style="text-align:left"><b>${t.n}</b></td><td>${t.P}</td><td>${t.W}</td><td>${t.D}</td><td>${t.L}</td><td>${t.GF}</td><td>${t.GA}</td><td>${t.GD}</td><td><b>${t.PTS}</b></td></tr>`;
    });
    document.getElementById("leagueTable").innerHTML = h;

    // 2. Goal & CS Tables
    let goalSorted = [...sorted].sort((a, b) => b.GF - a.GF).slice(0, 5);
    let gh = `<tr><th>Team</th><th>GF</th></tr>`;
    goalSorted.forEach(t => gh += `<tr><td style="text-align:left">${t.n}</td><td>${t.GF}</td></tr>`);
    document.getElementById("goalsTable").innerHTML = gh;

    let csSorted = [...sorted].sort((a, b) => b.CS - a.CS).slice(0, 5);
    let csh = `<tr><th>Team</th><th>CS</th></tr>`;
    csSorted.forEach(t => csh += `<tr><td style="text-align:left">${t.n}</td><td>${t.CS}</td></tr>`);
    document.getElementById("cleanSheetsTable").innerHTML = csh;
}

function renderFixtures() {
    const wSel = document.getElementById("weekSelector");
    const list = document.getElementById("fixturesList");
    const fSel = document.getElementById("fixtureSelect");
    if (wSel.options.length !== fixtures.length) {
        wSel.innerHTML = "";
        fixtures.forEach((w, i) => wSel.add(new Option(`Week ${w.week}`, i)));
        wSel.value = currentWeek - 1;
    }
    list.innerHTML = ""; fSel.innerHTML = "";
    if (!fixtures[currentWeek - 1]) return;
    document.getElementById("weekTitle").innerText = `Week ${currentWeek}`;
    fixtures[currentWeek - 1].matches.forEach((m, i) => {
        list.innerHTML += `<div class="match-card"><span>${m.home}</span> <b>${m.played ? m.hg + '-' + m.ag : 'vs'}</b> <span>${m.away}</span></div>`;
        if (!m.played) fSel.add(new Option(`${m.home} vs ${m.away}`, `${currentWeek - 1}-${i}`));
    });
}

function renderAll() {
    document.getElementById('teamCount').innerText = teams.length;
    renderTable();
    renderFixtures();
}
