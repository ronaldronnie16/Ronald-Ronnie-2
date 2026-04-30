document.addEventListener("DOMContentLoaded",()=>{

/* ================= STATE ================= */
let teams = JSON.parse(localStorage.getItem("teams")) || [];
let fixtures = JSON.parse(localStorage.getItem("fixtures")) || [];

let isAdmin = false;
let currentWeek = 1;

/* ================= SAVE ================= */
function save(){
  localStorage.setItem("teams",JSON.stringify(teams));
  localStorage.setItem("fixtures",JSON.stringify(fixtures));
}

/* ================= NAVIGATION ================= */
window.show = function(id){
  document.querySelectorAll(".section").forEach(s=>s.style.display="none");
  document.getElementById(id).style.display="block";

  renderAll();
};

/* ================= ADMIN LOGIN ================= */
window.adminLogin = function(){
  let pass = prompt("Enter Admin Password");

  if(pass === "2024/2026"){
    isAdmin = true;
    show("admin");
  }else{
    alert("Wrong Password");
  }
};

/* ================= ADD TEAM ================= */
window.addTeam = function(){

  if(!isAdmin) return alert("Admin only");

  if(teams.length >= 20)
    return alert("Max 20 teams");

  let name = document.getElementById("teamName").value.trim();
  if(!name) return;

  teams.push(name);
  document.getElementById("teamName").value="";
  save();
};

/* ================= FIXTURE GENERATION ================= */
window.generateFixtures = function(){

  if(!isAdmin) return;

  if(teams.length !== 20)
    return alert("Need exactly 20 teams");

  if(fixtures.length)
    return alert("Fixtures already generated");

  let arr = [...teams];
  let n = arr.length;

  let rounds = n - 1;
  let half = n / 2;

  let schedule = [];

  for(let r=0;r<rounds;r++){

    let week = [];

    for(let i=0;i<half;i++){
      week.push({
        home: arr[i],
        away: arr[n-1-i],
        hg:null,
        ag:null,
        played:false
      });
    }

    schedule.push({week:r+1,matches:week});
    arr.splice(1,0,arr.pop());
  }

  let second = schedule.map(w=>({
    week:w.week+rounds,
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
  populateWeeks();
  save();
  renderAll();
};

/* ================= WEEK SELECTOR ================= */
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
    renderAll();
  };
}

/* ================= AUTO ADVANCE WEEK ================= */
function checkWeekCompletion(){

  let weekData = fixtures.find(w=>w.week===currentWeek);
  if(!weekData) return;

  let done = weekData.matches.every(m=>m.played);

  if(done){
    currentWeek++;

    if(currentWeek > 38){
      alert("Season Completed!");
      return;
    }

    document.getElementById("weekSelector").value = currentWeek;
    renderAll();
  }
}

/* ================= RECORD RESULT ================= */
window.recordResult = function(){

  if(!isAdmin) return alert("Admin only");

  let val = document.getElementById("fixtureSelect").value;
  let [w,m] = val.split("-");

  let hg = +document.getElementById("hg").value;
  let ag = +document.getElementById("ag").value;

  fixtures[w].matches[m].hg = hg;
  fixtures[w].matches[m].ag = ag;
  fixtures[w].matches[m].played = true;

  save();

  checkWeekCompletion();
  renderAll();
};

/* ================= FIXTURES ================= */
function renderFixtures(){

  let box = document.getElementById("fixturesList");
  let sel = document.getElementById("fixtureSelect");

  let week = currentWeek;

  box.innerHTML="";
  sel.innerHTML="";

  let data = fixtures.find(w=>w.week===week);
  if(!data) return;

  let table = document.createElement("table");

  table.innerHTML=`
  <tr>
    <th>Home</th>
    <th>Away</th>
    <th>Status</th>
  </tr>`;

  data.matches.forEach((m,i)=>{

    table.innerHTML+=`
    <tr>
      <td>${m.home}</td>
      <td>${m.away}</td>
      <td>${m.played ? m.hg+"-"+m.ag : "Pending"}</td>
    </tr>`;

    if(!m.played){
      sel.innerHTML+=`
      <option value="${week-1}-${i}">
      ${m.home} vs ${m.away}
      </option>`;
    }
  });

  box.appendChild(table);
}

/* ================= TABLE ENGINE ================= */
function renderTable(){

  let t = document.getElementById("leagueTable");

  let stats = {};

  teams.forEach(team=>{
    stats[team] = {
      name:team,P:0,W:0,D:0,L:0,
      GF:0,GA:0,GD:0,PTS:0
    };
  });

  fixtures.forEach(w=>{
    w.matches.forEach(m=>{
      if(!m.played) return;

      let H = stats[m.home];
      let A = stats[m.away];

      H.P++; A.P++;

      H.GF += m.hg;
      H.GA += m.ag;

      A.GF += m.ag;
      A.GA += m.hg;

      if(m.hg > m.ag){
        H.W++; A.L++; H.PTS+=3;
      }else if(m.hg < m.ag){
        A.W++; H.L++; A.PTS+=3;
      }else{
        H.D++; A.D++;
        H.PTS++; A.PTS++;
      }
    });
  });

  Object.values(stats).forEach(t=>{
    t.GD = t.GF - t.GA;
  });

  let sorted = Object.values(stats)
    .sort((a,b)=>b.PTS-a.PTS||b.GD-a.GD);

  t.innerHTML=`
  <tr>
    <th>Pos</th><th>Team</th>
    <th>P</th><th>W</th><th>D</th><th>L</th>
    <th>GF</th><th>GA</th><th>GD</th><th>PTS</th>
  </tr>`;

  sorted.forEach((x,i)=>{
    t.innerHTML+=`
    <tr>
      <td>${i+1}</td>
      <td>${x.name}</td>
      <td>${x.P}</td>
      <td>${x.W}</td>
      <td>${x.D}</td>
      <td>${x.L}</td>
      <td>${x.GF}</td>
      <td>${x.GA}</td>
      <td>${x.GD}</td>
      <td>${x.PTS}</td>
    </tr>`;
  });
}

/* ================= RESULTS ================= */
function renderResults(){

  let box = document.getElementById("resultsLog");
  if(!box) return;

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

/* ================= MASTER RENDER ================= */
function renderAll(){
  renderFixtures();
  renderResults();
  renderTable();
}

/* ================= RESET ================= */
window.resetAll = function(){

  if(!isAdmin) return;

  if(confirm("Delete ALL league data?")){

    localStorage.clear();
    teams = [];
    fixtures = [];
    currentWeek = 1;

    location.reload();
  }
};

/* ================= INIT ================= */
window.show("table");

});