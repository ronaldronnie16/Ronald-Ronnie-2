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
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
    document.getElementById(id).classList.add("active");
    document.querySelectorAll(".nav-links button").forEach(b => b.classList.remove("active-nav"));
    const btn = document.getElementById(`nav-${id === 'standings-tab' ? 'tables' : id}`);
    if (btn) btn.classList.add("active-nav");
}

function adminLogin() {
    if (prompt("Enter Admin Password") === "2024/2026/dls.league") {
        isAdmin = true;
        document.getElementById("adminLoginArea").classList.add("hidden");
        document.getElementById("adminPanel").classList.remove("hidden");
    } else {
        alert("Access Denied");
    }
}

function recordResult() {
    if (!isAdmin) return;
    const val = document.getElementById("fixtureSelect").value;
    const hInput = document.getElementById("hg").value.toUpperCase();
    const aInput = document.getElementById("ag").value.toUpperCase();
    
    if (!val) return;
    const [wIdx, mIdx] = val.split("-");
    const match = fixtures[wIdx].matches[mIdx];

    if (hInput === "N/A" || aInput === "N/A") {
        match.postponed = true;
        match.played = false;
        alert("Match Postponed");
    } else {
        match.hg = parseInt(hInput) || 0;
        match.ag = parseInt(aInput) || 0;
        match.played = true;
        match.postponed = false;
    }

    // Auto-advance week if all active matches in current week are finished/postponed
    const weekMatches = fixtures[currentWeek - 1].matches;
    const finished = weekMatches.every(m => m.played || m.postponed || m.home === "BYE");
    if (finished && currentWeek < fixtures.length) {
        currentWeek++;
    }

    save();
    document.getElementById("hg").value = "";
    document.getElementById("ag").value = "";
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

    let sorted = Object.entries(s).filter(([n]) => n !== "BYE").map(([n, d]) => ({ n, ...d, GD: d.GF - d.GA }))
        .sort((a, b) => b.PTS - a.PTS || b.GD - a.GD || b.GF - a.GF);

    let h = `<tr><th>#</th><th style="text-align:left">Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>PTS</th></tr>`;
    sorted.forEach((t, i) => {
        let cls = i === 0 ? "first" : i < 4 ? "top4" : i >= sorted.length - 3 ? "relegation" : "";
        h += `<tr class="${cls}"><td>${i+1}</td><td style="text-align:left"><b>${t.n}</b></td><td>${t.P}</td><td>${t.W}</td><td>${t.D}</td><td>${t.L}</td><td>${t.GF}</td><td>${t.GA}</td><td>${t.GD}</td><td><b>${t.PTS}</b></td></tr>`;
    });
    document.getElementById("leagueTable").innerHTML = h;

    const gList = [...sorted].sort((a,b) => b.GF - a.GF).slice(0,5);
    const csList = [...sorted].sort((a,b) => b.CS - a.CS).slice(0,5);
    document.getElementById("goalsTable").innerHTML = `<tr><th>Team</th><th>GF</th></tr>` + gList.map(t => `<tr><td>${t.n}</td><td>${t.GF}</td></tr>`).join('');
    document.getElementById("cleanSheetsTable").innerHTML = `<tr><th>Team</th><th>CS</th></tr>` + csList.map(t => `<tr><td>${t.n}</td><td>${t.CS}</td></tr>`).join('');
}

function renderFixtures() {
    const activeList = document.getElementById("activeFixturesList");
    const historyList = document.getElementById("completedResultsList");
    const postponedList = document.getElementById("postponedList");
    const fSel = document.getElementById("fixtureSelect");
    
    activeList.innerHTML = ""; historyList.innerHTML = ""; postponedList.innerHTML = ""; fSel.innerHTML = "";
    let hasPostponed = false;

    fixtures.forEach((w, wIdx) => {
        w.matches.forEach((m, mIdx) => {
            const scoreText = m.postponed ? '<span class="postponed-tag">POSTPONED</span>' : (m.played ? `${m.hg}-${m.ag}` : 'vs');
            const card = `<div class="match-card"><span>${m.home}</span> <b>${scoreText}</b> <span>${m.away}</span></div>`;
            
            if (m.postponed) {
                postponedList.innerHTML += `<div class="match-card"><span>[Wk ${w.week}] ${m.home}</span> <b class="postponed-tag">N/A</b> <span>${m.away}</span></div>`;
                hasPostponed = true;
            }

            if (m.played || m.postponed) {
                historyList.innerHTML = `<div style="font-size:0.7rem; color:aqua; margin-top:5px;">Week ${w.week}</div>` + card + historyList.innerHTML;
            }

            if (w.week === currentWeek && !m.played && !m.postponed && m.home !== "BYE") {
                activeList.innerHTML += card;
                fSel.add(new Option(`Wk ${w.week}: ${m.home} vs ${m.away}`, `${wIdx}-${mIdx}`));
            }
            
            // Allow admin to select postponed matches to "replay" them
            if (m.postponed) {
                fSel.add(new Option(`REPLAY Wk ${w.week}: ${m.home} vs ${m.away}`, `${wIdx}-${mIdx}`));
            }
        });
    });

    document.getElementById("currentWeekTitle").innerText = `Week ${currentWeek}`;
    document.getElementById("postponedSection").classList.toggle("hidden", !hasPostponed);
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
            ms.push({ home: pool[i], away: pool[pool.length - 1 - i], hg: null, ag: null, played: false, postponed: false });
        }
        sched.push({ week: r + 1, matches: ms });
        pool.splice(1, 0, pool.pop());
    }
    let rev = sched.map(w => ({ 
        week: w.week + rounds, 
        matches: w.matches.map(m => ({ ...m, home: m.away, away: m.home })) 
    }));
    fixtures = [...sched, ...rev];
    currentWeek = 1;
    save();
}

function save() { db.collection("league").doc("data").set({ teams, fixtures, currentWeek }); }
function renderAll() { renderTable(); renderFixtures(); document.getElementById('teamCount').innerText = teams.length; }
async function resetAll() { if (confirm("Wipe all data?")) { await db.collection("league").doc("data").delete(); location.reload(); } }

show('fixtures');
