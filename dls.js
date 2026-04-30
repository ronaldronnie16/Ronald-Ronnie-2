// 🔥 PASTE YOUR FIREBASE CONFIG HERE
const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "YOUR_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* ================= STATE ================= */
let teams = [];
let fixtures = [];
let currentWeek = 1;
let isAdmin = false;

/* ================= LIVE SYNC ================= */
db.collection("league").doc("data")
.onSnapshot((doc)=>{
  if(doc.exists){
    let data = doc.data();
    teams = data.teams || [];
    fixtures = data.fixtures || [];
    currentWeek = data.currentWeek || 1;

    populateWeeks();
    renderAll();
  }
});

/* ================= SAVE ================= */
function save(){
  db.collection("league").doc("data").set({
    teams,
    fixtures,
    currentWeek
  });
}

/* ================= NAV ================= */
function show(id){
  document.querySelectorAll(".section").forEach(s=>s.style.display="none");
  document.getElementById(id).style.display="block";
  renderAll();
}

/* ================= ADMIN ================= */
function adminLogin(){
  let pass = prompt("Enter Admin Password");
  if(pass === "2024/2026"){
    isAdmin = true;
    show("admin");
  }else{
    alert("Wrong password");
  }
}

/* ================= ADD TEAM ================= */
function addTeam(){
  if(!isAdmin) return;

  if(teams.length >= 20)
    return alert("Max 20 teams");

  let name = document.getElementById("teamName").value.trim();
  if(!name) return;

  teams.push(name);
  document.getElementById("teamName").value="";
  save();
}

/* ================= FIXTURES ================= */
function generateFixtures(){

  if(!isAdmin) return;
  if(teams.length !== 20)
    return alert("Need 20 teams");

  let arr = [...teams];
  let schedule = [];

  for(let r=0;r<19;r++){
    let week=[];

    for(let i=0;i<10;i++){
      week.push({
        home:arr[i],
        away:arr[19-i],
        hg:null,
        ag:null,
        played:false
      });
    }

    schedule.push({week:r+1,matches:week});
    arr.splice(1,0,arr.pop());
  }

  let second = schedule.map(w=>({
    week:w.week+19,
    matches:w.matches.map(m=>({
      home:m.away,
      away:m.home,
      hg:null,
      ag:null,
      played:false
    }))
  }));

  fixtures = [...schedule,...second];
  currentWeek = 1;

  save();
}

/* ================= WEEK SELECT ================= */
function populateWeeks(){
  let sel = document.getElementById("weekSelector");
  if(!sel) return;

  sel.innerHTML="";
  for(let i=1;i<=38;i++){
    sel.innerHTML+=`<option value="${i}">Week ${i}</option>`;
  }

  sel.value = currentWeek;

  sel.onchange = function(){
    currentWeek = +this.value;
    save();
  };
}

/* ================= RECORD RESULT ================= */
function recordResult(){

  if(!isAdmin) return;

  let val = document.getElementById("fixtureSelect").value;
  let [w,m] = val.split("-");

  let hg = +document.getElementById("hg").value;
  let ag = +document.getElementById("ag").value;

  let match = fixtures[w].matches[m];
  match.hg = hg;
  match.ag = ag;
  match.played = true;

  checkWeek();
  save();
}

/* ================= AUTO WEEK ================= */
function checkWeek(){
  let week = fixtures.find(w=>w.week===currentWeek);
  if(week && week.matches.every(m=>m.played)){
    currentWeek++;
  }
}

/* ================= FIXTURES VIEW ================= */
function renderFixtures(){

  let weekData = fixtures.find(w=>w.week===currentWeek);
  if(!weekData) return;

  let box = document.getElementById("fixturesList");
  let sel = document.getElementById("fixtureSelect");

  box.innerHTML="";
  sel.innerHTML="";

  weekData.matches.forEach((m,i)=>{
    box.innerHTML+=`
    <p>${m.home} vs ${m.away} (${m.played ? m.hg+"-"+m.ag : "Pending"})</p>`;

    if(!m.played){
      sel.innerHTML+=`
      <option value="${currentWeek-1}-${i}">
      ${m.home} vs ${m.away}
      </option>`;
    }
  });
}

/* ================= TABLE ================= */
function renderTable(){

  let stats={};

  teams.forEach(t=>{
    stats[t]={P:0,W:0,D:0,L:0,GF:0,GA:0,PTS:0};
  });

  fixtures.forEach(w=>{
    w.matches.forEach(m=>{
      if(!m.played) return;

      let H=stats[m.home];
      let A=stats[m.away];

      H.P++; A.P++;
      H.GF+=m.hg; H.GA+=m.ag;
      A.GF+=m.ag; A.GA+=m.hg;

      if(m.hg>m.ag){H.W++;H.PTS+=3;A.L++;}
      else if(m.hg<m.ag){A.W++;A.PTS+=3;H.L++;}
      else{H.D++;A.D++;H.PTS++;A.PTS++;}
    });
  });

  let sorted = Object.entries(stats)
  .sort((a,b)=>b[1].PTS-a[1].PTS);

  let table = document.getElementById("leagueTable");
  table.innerHTML="";

  sorted.forEach(([name,s],i)=>{
    table.innerHTML+=`
    <tr>
      <td>${i+1}</td>
      <td>${name}</td>
      <td>${s.P}</td>
      <td>${s.PTS}</td>
    </tr>`;
  });
}

/* ================= RESULTS ================= */
function renderResults(){
  let box = document.getElementById("resultsLog");
  box.innerHTML="";

  fixtures.forEach(w=>{
    w.matches.forEach(m=>{
      if(m.played){
        box.innerHTML+=`
        <p>${m.home} ${m.hg}-${m.ag} ${m.away}</p>`;
      }
    });
  });
}

/* ================= RESET ================= */
function resetAll(){
  if(!isAdmin) return;
  db.collection("league").doc("data").delete();
}

/* ================= RENDER ================= */
function renderAll(){
  renderFixtures();
  renderTable();
  renderResults();
}

/* INIT */
show("table");
