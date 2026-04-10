import { useState, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ReferenceLine, LineChart, Line, ComposedChart } from "recharts";

const ACTIVITIES = [
  { id:"walking", name:"Walking", icon:"🚶", cost:0, min:30, cal:150,
    vo2Y1:1.5, vo2M:0.3, intensity:3.5,
    rr:{heart:0.03,stroke:0.02,diabetes:0.03,alz:0.015,dep:0.02,obesity:0.025,cancer:0.01},
    study:"JAMA Int Med (2019): 30 min/day walking → ~20% lower CV mortality. Moderate VO2 benefit (~1.5 ml/kg/min yr1). Good foundation but limited intensity." },
  { id:"swimming", name:"Swimming", icon:"🏊", cost:3, min:45, cal:400,
    vo2Y1:3.0, vo2M:0.5, intensity:7,
    rr:{heart:0.08,stroke:0.06,diabetes:0.06,alz:0.04,dep:0.06,obesity:0.07,cancer:0.03},
    study:"Br J Sports Med (2017): 28% lower all-cause mortality. Full-body at 7 METs — 2x the cardiovascular demand of walking. ~3.0 ml/kg/min VO2 gain yr1." },
  { id:"cycling", name:"Cycling", icon:"🚴", cost:0, min:40, cal:350,
    vo2Y1:3.0, vo2M:0.5, intensity:6.5,
    rr:{heart:0.07,stroke:0.055,diabetes:0.06,alz:0.035,dep:0.05,obesity:0.06,cancer:0.028},
    study:"BMJ (2017): 46% lower CVD risk, 52% lower CVD mortality in 263K participants. 6.5 METs — nearly 2x walking intensity. VO2 gains match or exceed running." },
  { id:"strength", name:"Strength", icon:"🏋️", cost:0, min:45, cal:300,
    vo2Y1:1.0, vo2M:0.2, intensity:5,
    rr:{heart:0.04,stroke:0.03,diabetes:0.05,alz:0.025,dep:0.03,obesity:0.04,cancer:0.02},
    study:"Am J Prev Med (2022): 15% lower all-cause mortality, 19% CVD mortality. Preserves muscle mass critical for functional independence and fall prevention." },
  { id:"running", name:"Running", icon:"🏃", cost:0, min:30, cal:400,
    vo2Y1:3.5, vo2M:0.6, intensity:8,
    rr:{heart:0.09,stroke:0.065,diabetes:0.07,alz:0.045,dep:0.06,obesity:0.08,cancer:0.035},
    study:"JACC (2014): Even 5-10 min/day → 45% lower CV mortality. Highest MET intensity (8.0), strongest VO2 driver. ~3.5-3.8 ml/kg/min gain yr1." },
  { id:"eating", name:"Healthy Eating", icon:"🥗", cost:5, min:0, cal:0,
    vo2Y1:0, vo2M:0, intensity:0,
    rr:{heart:0.06,stroke:0.05,diabetes:0.08,alz:0.04,dep:0.03,obesity:0.06,cancer:0.03},
    study:"Lancet (2019): Poor diet causes more deaths than any other risk factor. Mediterranean diet reduces CVD events ~30%. Separate pathway from exercise." },
  { id:"sleep", name:"Quality Sleep", icon:"😴", cost:0, min:0, cal:0,
    vo2Y1:0, vo2M:0.15, intensity:0,
    rr:{heart:0.03,stroke:0.025,diabetes:0.03,alz:0.04,dep:0.05,obesity:0.03,cancer:0.015},
    study:"Eur Heart J (2018): Optimal sleep reduces CVD risk 22%. Poor sleep blunts VO2 training adaptations ~30%. Amplifies exercise benefits." },
];

const RISKS = [
  { id:"heart", name:"Heart Disease", icon:"❤️‍🩹", totalCost:225000, annual:15000, baseRisk:0.008, peak:55, wtMult:1.8,
    desc:"AHA: $38.5K first 90 days. Obesity increases risk 80%." },
  { id:"stroke", name:"Stroke", icon:"🧠", totalCost:250000, annual:20000, baseRisk:0.005, peak:60, wtMult:1.5,
    desc:"Lifetime ~$250K. #1 nursing home trigger." },
  { id:"diabetes", name:"Type 2 Diabetes", icon:"💉", totalCost:150000, annual:12000, baseRisk:0.008, peak:45, wtMult:2.5,
    desc:"$85-125K+ lifetime. Obesity 2.5x risk." },
  { id:"alz", name:"Alzheimer's", icon:"🫧", totalCost:413000, annual:65000, baseRisk:0.003, peak:65, wtMult:1.3,
    desc:"$413K lifetime (AJMC 2024). 70% family-borne." },
  { id:"dep", name:"Depression", icon:"🌧️", totalCost:100000, annual:8000, baseRisk:0.012, peak:30, wtMult:1.3,
    desc:"Gateway condition: +30% CV risk." },
  { id:"obesity", name:"Obesity Complications", icon:"⚖️", totalCost:175000, annual:12500, baseRisk:0.015, peak:35, wtMult:2.0,
    desc:"$2,505/yr excess costs (100% higher)." },
  { id:"cancer", name:"Cancer (Preventable)", icon:"🎗️", totalCost:200000, annual:15000, baseRisk:0.004, peak:55, wtMult:1.4,
    desc:"~40% linked to modifiable factors." },
];

const CASCADE = {heart:{stroke:1.5,dep:1.3},stroke:{heart:1.3,dep:1.5,alz:1.4},
  diabetes:{heart:2.0,stroke:1.5,alz:1.3,obesity:1.3},dep:{heart:1.3,stroke:1.2,diabetes:1.2,alz:1.2,obesity:1.2},
  alz:{dep:1.5},obesity:{heart:1.8,diabetes:2.5,stroke:1.3,cancer:1.3,dep:1.2},cancer:{dep:1.3}};

var CARE = [
  {name:"Independent",cost:0,vo2:22},
  {name:"Part-time aide",cost:18000,vo2:18},
  {name:"Assisted living",cost:55000,vo2:15},
  {name:"Nursing home",cost:108000,vo2:12},
  {name:"Memory care",cost:130000,vo2:0}
];

var DECADE = {30:3000,40:4500,50:7000,60:10000,70:12000,80:14000};

var FREQ = [
  {id:"daily",label:"Daily",pw:7},
  {id:"3x",label:"3/wk",pw:3},
  {id:"1x",label:"1/wk",pw:1}
];

function fmt(n) {
  if (Math.abs(n) >= 1e6) return "$" + (n/1e6).toFixed(1) + "M";
  if (Math.abs(n) >= 1e3) return "$" + (n/1e3).toFixed(0) + "K";
  return "$" + Math.round(n);
}

function fmtF(n) {
  return "$" + Math.round(n).toLocaleString();
}

function getCL(v) {
  if (v >= 22) return "Independent";
  if (v >= 18) return "Part-time aide";
  if (v >= 15) return "Assisted living";
  if (v >= 12) return "Nursing home";
  return "Memory care";
}

function wtRiskMult(curWt, targetWt, baseMult) {
  if (curWt <= targetWt) return 1.0;
  var excess = curWt - targetWt;
  return 1 + (baseMult - 1) * Math.min(1, excess / 80);
}

function bmiFn(wt, h) {
  return 703 * wt / (h * h);
}

export default function App() {
  var _startAge = useState(65);
  var startAge = _startAge[0], setStartAge = _startAge[1];
  var _endAge = useState(100);
  var endAge = _endAge[0], setEndAge = _endAge[1];
  var _sel = useState([]);
  var sel = _sel[0], setSel = _sel[1];
  var _freq = useState({});
  var freq = _freq[0], setFr = _freq[1];
  var _showInv = useState(true);
  var showInv = _showInv[0], setShowInv = _showInv[1];
  var _invRate = useState(7);
  var invRate = _invRate[0], setInvRate = _invRate[1];
  var _tab = useState("dashboard");
  var tab = _tab[0], setTab = _tab[1];
  var _startWt = useState(205);
  var startWt = _startWt[0], setStartWt = _startWt[1];
  var _targetWt = useState(175);
  var targetWt = _targetWt[0], setTargetWt = _targetWt[1];
  var _htFt = useState(5);
  var htFt = _htFt[0], setHtFt = _htFt[1];
  var _htIn = useState(8);
  var htIn = _htIn[0], setHtIn = _htIn[1];
  var height = htFt * 12 + htIn;
  var _lossRate = useState(0.5);
  var lossRate = _lossRate[0], setLossRate = _lossRate[1];
  var _showSettings = useState(false);
  var showSettings = _showSettings[0], setShowSettings = _showSettings[1];
  var _showSplash = useState(true);
  var showSplash = _showSplash[0], setShowSplash = _showSplash[1];
  var _showHint = useState(true);
  var showHint = _showHint[0], setShowHint = _showHint[1];
  var _freqHint = useState(false);
  var freqHint = _freqHint[0], setFreqHint = _freqHint[1];
  var _savingsHint = useState(false);
  var savingsHint = _savingsHint[0], setSavingsHint = _savingsHint[1];

  function toggle(id) {
    if (showHint) { setShowHint(false); setFreqHint(true); setSavingsHint(true); }
    else if (savingsHint) setSavingsHint(false);
    setSel(function(p) { return p.includes(id) ? p.filter(function(a){return a!==id}) : p.concat([id]); });
    if (!freq[id]) setFr(function(p) { var n = {}; for(var k in p) n[k]=p[k]; n[id]="3x"; return n; });
  }

  function setFreq(id, f) {
    if (freqHint) setFreqHint(false);
    if (savingsHint) setSavingsHint(false);
    setFr(function(p) { var n = {}; for(var k in p) n[k]=p[k]; n[id]=f; return n; });
  }

  var calc = useMemo(function() {
    var yrs = endAge - startAge;
    if (yrs <= 0) return null;
    var items = sel.map(function(id) {
      var a = ACTIVITIES.find(function(x){return x.id===id});
      var f = FREQ.find(function(x){return x.id===(freq[id]||"3x")});
      return Object.assign({}, a, {f: f});
    });

    var weeklyCalBurn = items.reduce(function(s,a){return s+a.cal*a.f.pw},0);
    var weeklyMETmin = items.reduce(function(s,a){return s+(a.intensity||0)*a.min*a.f.pw},0);

    // Additive risk reductions with soft cap
    var comb = {};
    RISKS.forEach(function(r) {
      var raw = 0;
      items.forEach(function(a) { raw += (a.rr[r.id]||0) * (a.f.pw/7); });
      comb[r.id] = 0.65 * (1 - Math.exp(-raw / 0.65));
    });

    var casc = {};
    RISKS.forEach(function(r) {
      var b = 0;
      RISKS.forEach(function(o) {
        if (o.id === r.id) return;
        var c = CASCADE[o.id] || {};
        if (c[r.id]) b += (comb[o.id]||0) * (c[r.id]-1) * 0.25;
      });
      casc[r.id] = Math.min(0.15, b);
    });

    var totR = {};
    RISKS.forEach(function(r) { totR[r.id] = Math.min(0.70, (comb[r.id]||0) + (casc[r.id]||0)); });

    // VO2 model: percentile-based from treadmill chart data (men)
    // Each percentile track declines with age — exercise shifts which track you follow
    // Data points: age midpoints 25, 35, 45, 55, 65, 75, 85
    var vo2Table = {
      90: [58.6, 55.5, 50.8, 43.4, 37.1, 29.4, 22.8],
      80: [54.5, 50.0, 45.2, 38.3, 32.0, 25.9, 21.4],
      70: [51.9, 46.4, 40.9, 34.3, 28.7, 23.8, 20.0],
      60: [49.0, 43.4, 37.9, 31.8, 26.5, 22.2, 18.4],
      50: [46.5, 39.7, 35.3, 29.2, 24.6, 20.6, 17.6],
      40: [43.6, 37.0, 32.4, 26.9, 22.8, 19.1, 16.6],
      30: [40.0, 33.5, 29.7, 24.5, 20.7, 17.3, 16.1],
      20: [35.2, 29.8, 26.7, 22.2, 18.5, 15.9, 14.8],
      10: [28.6, 24.9, 22.1, 18.6, 15.8, 13.6, 12.9]
    };
    var vo2Ages = [25, 35, 45, 55, 65, 75, 85];

    // Interpolate VO2 for a given age at a given percentile
    // Extrapolates beyond 85 using the 75→85 decline rate
    function vo2AtAgePercentile(age, pctile) {
      var track = vo2Table[pctile];
      if (!track) return 20;
      if (age <= vo2Ages[0]) return track[0];
      if (age >= vo2Ages[vo2Ages.length-1]) {
        // Extrapolate: continue the decline rate from the last two data points
        var lastRate = (track[track.length-1] - track[track.length-2]) / (vo2Ages[vo2Ages.length-1] - vo2Ages[vo2Ages.length-2]);
        var extrapolated = track[track.length-1] + lastRate * (age - vo2Ages[vo2Ages.length-1]);
        return Math.max(8, extrapolated); // floor at 8
      }
      for (var j = 0; j < vo2Ages.length - 1; j++) {
        if (age >= vo2Ages[j] && age < vo2Ages[j+1]) {
          var frac = (age - vo2Ages[j]) / (vo2Ages[j+1] - vo2Ages[j]);
          return track[j] + (track[j+1] - track[j]) * frac;
        }
      }
      return track[track.length-1];
    }

    // Sedentary = 40th percentile (below average, declining naturally)
    // Exercise shifts your percentile based on activity intensity and frequency
    // Walking 1x/wk: +5 percentile points (40→45, barely above sedentary)
    // Walking daily: +10 points (40→50, average)
    // Swimming/cycling 3x/wk: +15 points (40→55)
    // Swimming/cycling daily: +25 points (40→65, well above average)
    // Running daily: +30 points (40→70, strong)
    // Multiple vigorous daily: can reach 70-80th percentile
    var pctileShift = 0;
    items.forEach(function(a) {
      var freqScale = a.f.pw / 7; // 0.14 for 1x/wk, 1.0 for daily
      var actShift = 0;
      if (a.intensity >= 8) { // running — highest impact
        actShift = 40 * freqScale; // daily running = +40, 3x/wk = +17
      } else if (a.intensity >= 6) { // swimming, cycling — high impact
        actShift = 35 * freqScale; // daily = +35, 3x/wk = +15
      } else if (a.intensity >= 4) { // strength — moderate
        actShift = 10 * freqScale; // daily = +10
      } else if (a.intensity >= 3) { // walking — modest
        actShift = 8 * freqScale; // daily = +8, 3x/wk = +3.4, 1x/wk = +1.1
      }
      pctileShift += actShift;
    });
    // Diminishing returns on stacking exercise: soft cap at ~45
    pctileShift = 45 * (1 - Math.exp(-pctileShift / 45)); // soft cap
    
    var sedentaryPctile = 40; // below average — typical for inactive older adult
    var activePctile = Math.min(90, Math.round(sedentaryPctile + pctileShift));
    // Snap to nearest available track
    var pctiles = [10,20,30,40,50,60,70,80,90];
    function nearestPctile(p) {
      var best = 40;
      for (var j=0;j<pctiles.length;j++) { if (Math.abs(pctiles[j]-p) < Math.abs(best-p)) best = pctiles[j]; }
      return best;
    }
    // Interpolate between two nearest tracks for smoother curves
    function vo2Interp(age, pctile) {
      var lower = 10, upper = 10;
      for (var j=0;j<pctiles.length;j++) {
        if (pctiles[j] <= pctile) lower = pctiles[j];
      }
      for (var j=pctiles.length-1;j>=0;j--) {
        if (pctiles[j] >= pctile) upper = pctiles[j];
      }
      if (lower === upper) return vo2AtAgePercentile(age, lower);
      var frac = (pctile - lower) / (upper - lower);
      return vo2AtAgePercentile(age, lower) + (vo2AtAgePercentile(age, upper) - vo2AtAgePercentile(age, lower)) * frac;
    }

    // Weight: 1% per week loss toward target, bounded by calorie burn
    var weightByYear = [];
    var wt = startWt;
    for (var i = 0; i <= yrs; i++) {
      if (i > 0 && wt > targetWt && sel.length > 0) {
        var weeklyLoss = wt * (lossRate / 100);
        var maxFromCal = weeklyCalBurn / 3500;
        var actualWeekly = Math.min(weeklyLoss, Math.max(maxFromCal * 0.7, weeklyLoss * 0.5));
        wt = Math.max(targetWt, wt - actualWeekly * 52);
      }
      weightByYear.push(Math.round(wt * 10) / 10);
    }

    // Build VO2 trajectory from percentile tracks + weight adjustment
    var vo2Data = [];
    for (var i = 0; i <= yrs; i++) {
      var age = startAge + i;
      var activeVO2 = vo2Interp(age, activePctile);
      // Weight bonus: relative VO2 improves as weight drops (partial effect)
      if (weightByYear[i] < startWt) {
        var wtRatio = startWt / Math.max(weightByYear[i], 100);
        activeVO2 = activeVO2 * (1 + (wtRatio - 1) * 0.3);
      }
      activeVO2 = Math.max(10, Math.min(60, activeVO2));
      vo2Data.push(Math.round(activeVO2 * 10) / 10);
    }
    // Sedentary VO2 for comparison
    function sedVO2(idx) { return Math.round(vo2Interp(startAge + idx, sedentaryPctile) * 10) / 10; }

    // Care
    function getCare(v) { for (var j=0;j<CARE.length;j++) if(v>=CARE[j].vo2) return CARE[j]; return CARE[CARE.length-1]; }
    // Smooth care cost: interpolate between levels instead of hard steps
    // This prevents the annual savings from jumping $50K in a single year
    function smoothCareCost(v) {
      if (v >= CARE[0].vo2) return 0;
      for (var j=0;j<CARE.length-1;j++) {
        if (v >= CARE[j+1].vo2 && v < CARE[j].vo2) {
          var frac = (CARE[j].vo2 - v) / Math.max(1, CARE[j].vo2 - CARE[j+1].vo2);
          return CARE[j].cost + (CARE[j+1].cost - CARE[j].cost) * frac;
        }
      }
      return CARE[CARE.length-1].cost;
    }
    function careProb(age) { if(age<70)return 0;if(age<80)return(age-70)/40;if(age<90)return 0.25+(age-80)/20;if(age<95)return 0.75+(age-90)/20;return 1; }

    // Yearly
    var data = [];
    var cumSaved=0, cumInv=0, cumCost=0, cumCare=0;
    for (var i = 0; i <= yrs; i++) {
      var age = startAge + i;
      var curWt = weightByYear[i];
      var curVO2 = vo2Data[i];
      var sVO2 = sedVO2(i);
      var decade = age<40?30:age<50?40:age<60?50:age<70?60:age<80?70:80;

      var actSavings = 0;
      RISKS.forEach(function(r) {
        var af = age >= r.peak ? Math.min(1.6, 1 + (age - r.peak) * 0.02) : 0.4;
        var wM = wtRiskMult(curWt, targetWt, r.wtMult);
        var sedWM = wtRiskMult(startWt, targetWt, r.wtMult);
        var activeExp = r.baseRisk * af * wM * (r.annual + r.totalCost * 0.05) * (1 - (totR[r.id]||0));
        var sedExp = r.baseRisk * af * sedWM * (r.annual + r.totalCost * 0.05);
        actSavings += Math.max(0, sedExp - activeExp);
      });

      var rSum = 0;
      for (var k in totR) rSum += totR[k];
      var decadeBonus = (DECADE[decade]||14000) * Math.min(1, rSum * 1.2);
      var healthSavings = sel.length > 0 ? actSavings + decadeBonus : 0;

      var cp = careProb(age);
      var sedCare = getCare(sVO2);
      var actCare = getCare(curVO2);
      // Use smoothed costs for savings to prevent jumps in annual chart
      var sedSmoothCost = smoothCareCost(sVO2);
      var actSmoothCost = smoothCareCost(curVO2);
      var careSaved = Math.max(0, cp * (sedSmoothCost - actSmoothCost));
      cumCare += careSaved;

      var totalSav = healthSavings + careSaved;
      var actCost = items.reduce(function(s,a){return s+a.cost*a.f.pw*52},0);
      var net = Math.max(0, totalSav - actCost);
      cumSaved += net;
      cumCost += actCost;
      if (showInv) cumInv = (cumInv + net) * (1 + invRate / 100);

      // Wellness: exercise intensity drives base, eating/sleep multiply the effect
      var exerciseScore = 0;
      var hasEating = false;
      var hasSleep = false;
      items.forEach(function(a) {
        if (a.id === "eating") { hasEating = true; return; }
        if (a.id === "sleep") { hasSleep = true; return; }
        var freqMult = a.f.pw / 7;
        if (a.intensity >= 8) { // running — highest
          exerciseScore += 25 * freqMult; // daily running = +25
        } else if (a.intensity >= 6) { // swimming, cycling
          exerciseScore += 22 * freqMult; // daily swim/cycle = +22
        } else if (a.intensity >= 4) { // strength
          exerciseScore += 10 * freqMult; // daily strength = +10
        } else { // walking
          exerciseScore += 8 * freqMult; // daily walking = +8
        }
      });
      // Diminishing returns on stacking exercise (cap at ~40)
      exerciseScore = 45 * (1 - Math.exp(-exerciseScore / 45));
      
      // Eating and sleep are separate veins — they ADD, not diminish
      // Synergy: eating + exercise > either alone
      var lifestyleScore = 0;
      if (hasEating) lifestyleScore += 8 + (exerciseScore > 5 ? 6 : 0);
      if (hasSleep) lifestyleScore += 6 + (exerciseScore > 5 ? 5 : 0);
      
      var wtScore = curWt <= targetWt ? 10 : 10 * Math.max(0, 1 - (curWt - targetWt) / Math.max(1, startWt - targetWt));
      var vo2Score = Math.min(10, (curVO2 - 10) * 0.4);
      var timeScore = Math.min(5, i * 0.3);
      var ful = Math.min(98, Math.round(25 + exerciseScore + lifestyleScore + wtScore + vo2Score + timeScore));

      data.push({
        age: age, net: Math.round(net), cumSaved: Math.round(cumSaved),
        invValue: Math.round(showInv ? cumInv : 0),
        totalValue: Math.round(showInv ? cumInv : cumSaved),
        wt: curWt, wtLost: Math.round((startWt - curWt) * 10) / 10,
        vo2: curVO2, vo2Sed: Math.round(sVO2 * 10) / 10, ful: ful,
        careSed: Math.round(cp * sedSmoothCost), careAct: Math.round(cp * actSmoothCost),
        careSaved: Math.round(careSaved),
        actCareName: actCare.name, sedCareName: sedCare.name,
        actCareCost: Math.round(actSmoothCost), sedCareCost: Math.round(sedSmoothCost),
        careProbPct: Math.round(cp * 100),
      });
    }

    // Activity breakdown
    // Calculate each activity's share of total risk reduction for apportioning savings
    var totalRawRR = 0;
    var actRawRR = {};
    items.forEach(function(a) {
      var thisRR = 0;
      RISKS.forEach(function(r) { thisRR += (a.rr[r.id]||0) * (a.f.pw/7); });
      actRawRR[a.id] = thisRR;
      totalRawRR += thisRR;
    });

    var last = data[data.length-1];
    var totalModelSavings = last ? (showInv ? last.totalValue : last.cumSaved) : 0;

    var actBk = items.map(function(a) {
      var f = a.f;
      var ac = a.cost * f.pw * 52;
      var as2 = 0;
      RISKS.forEach(function(r) { as2 += r.baseRisk*1.3*(r.annual+r.totalCost*0.05)*(a.rr[r.id]||0)*(f.pw/7); });
      var hrs = (a.min * f.pw * 52) / 60;
      var dph = hrs > 0 ? Math.max(0, (as2-ac)/hrs) : Math.max(0, as2-ac);
      var metMin = (a.intensity||0) * a.min * f.pw;
      var sessionsPerYear = f.pw * 52;
      var totalSessions = sessionsPerYear * yrs;
      var share = totalRawRR > 0 ? (actRawRR[a.id] / totalRawRR) : (1 / Math.max(1, items.length));
      var actTotalSavings = totalModelSavings * share;
      var perSession = totalSessions > 0 ? actTotalSavings / totalSessions : 0;
      return Object.assign({}, a, {ac:ac, as:Math.round(as2), net:Math.round(Math.max(0,as2-ac)),
        dph:Math.round(dph), hrs:Math.round(hrs), life:Math.round(actTotalSavings), metMin:metMin,
        sessionsPerYear: sessionsPerYear, totalSessions: totalSessions,
        perSession: Math.round(perSession * 100) / 100,
        sharePct: Math.round(share * 100)});
    });

    var riskBk = RISKS.map(function(r) {
      return Object.assign({}, r, {
        direct: comb[r.id]||0, cascade: casc[r.id]||0, total: totR[r.id]||0,
        saved: Math.round((totR[r.id]||0) * r.totalCost * r.baseRisk * yrs * 1.3),
        wtMultStart: wtRiskMult(startWt, targetWt, r.wtMult),
        wtMultEnd: wtRiskMult(weightByYear[yrs], targetWt, r.wtMult),
      });
    });

    var careOnsetAct = null, careOnsetSed = null;
    // Find ages where VO2 crosses each care threshold
    var thresholds = [
      {vo2:22,name:"Light assistance",cost:18000,trigger:"Balance/mobility decline — need part-time help"},
      {vo2:18,name:"Assisted living",cost:55000,trigger:"Cannot independently bathe, dress, or manage medications"},
      {vo2:15,name:"Nursing home",cost:108000,trigger:"Severe disability — post-stroke, post-fall, or advanced frailty"},
      {vo2:12,name:"Memory care",cost:130000,trigger:"Advanced dementia — 24/7 supervision needed"}
    ];
    var sedCrossings = [];
    var actCrossings = [];
    for (var t=0;t<thresholds.length;t++) {
      var sedAge = null, actAge = null;
      for (var j=1;j<data.length;j++) {
        if (!sedAge && data[j].vo2Sed < thresholds[t].vo2 && data[j-1].vo2Sed >= thresholds[t].vo2) sedAge = data[j].age;
        if (!actAge && data[j].vo2 < thresholds[t].vo2 && data[j-1].vo2 >= thresholds[t].vo2) actAge = data[j].age;
      }
      sedCrossings.push({threshold:thresholds[t], age:sedAge});
      actCrossings.push({threshold:thresholds[t], age:actAge});
    }
    for (var j=0;j<data.length;j++) { if(!careOnsetAct && data[j].careAct>0) careOnsetAct=data[j].age; if(!careOnsetSed && data[j].careSed>0) careOnsetSed=data[j].age; }

    // First assisted living crossing (VO2 < 15) for "when you enter a home"
    var sedAssistedAge = sedCrossings.length>=2 ? sedCrossings[1].age : null;
    var actAssistedAge = actCrossings.length>=2 ? actCrossings[1].age : null;

    return {
      data: data, actBk: actBk, riskBk: riskBk,
      total: last ? last.totalValue : 0,
      actCost: Math.round(cumCost),
      finalWt: last ? last.wt : startWt,
      wtLost: last ? last.wtLost : 0,
      ful: last ? last.ful : 50,
      finalVO2: last ? last.vo2 : vo2Data[0],
      totR: totR, cumCare: Math.round(cumCare),
      careOnsetAct: careOnsetAct, careOnsetSed: careOnsetSed,
      weeklyMETmin: weeklyMETmin,
      startBMI: Math.round(bmiFn(startWt, height) * 10) / 10,
      endBMI: Math.round(bmiFn(last ? last.wt : startWt, height) * 10) / 10,
      sedCrossings: sedCrossings, actCrossings: actCrossings,
      sedAssistedAge: sedAssistedAge, actAssistedAge: actAssistedAge,
      activePctile: activePctile,
    };
  }, [sel, freq, startAge, endAge, showInv, invRate, startWt, targetWt, height, lossRate]);

  var tabs = [
    {id:"dashboard",l:"Dashboard",i:"📊"},
    {id:"activities",l:"Activities",i:"🏃"},
    {id:"care",l:"Care Costs",i:"🏥"},
    {id:"risks",l:"Health Risks",i:"🛡️"},
    {id:"studies",l:"Research",i:"📚"}
  ];

  var inputStyle = {width:58,padding:"5px 8px",borderRadius:6,border:"2px solid #c5e4d9",fontSize:15,fontWeight:700,color:"#1a6b7a",textAlign:"center",outline:"none"};

  if (showSplash) {
    return (
      <div style={{fontFamily:"'Nunito','Segoe UI',sans-serif",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",
        background:"linear-gradient(145deg, #1a6b7a 0%, #1a5a6a 30%, #2d8f6f 70%, #1a6b7a 100%)",color:"#fff",padding:20}}>
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Playfair+Display:ital,wght@0,700;0,800;1,700&family=Noto+Sans+KR:wght@400;700;900&display=swap" rel="stylesheet"/>
        <div style={{textAlign:"center",maxWidth:440,animation:"fadeIn 1.5s ease-out"}}>
          <style>{"@keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}} @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}"}</style>
          
          <div style={{fontSize:72,marginBottom:16,animation:"pulse 2.5s ease-in-out infinite"}}>💚</div>
          
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:44,fontWeight:800,margin:"0 0 10px"}}>
            Health 401(k)
          </h1>
          
          <div style={{width:50,height:2,background:"rgba(255,255,255,0.35)",borderRadius:2,margin:"0 auto 44px"}}/>
          
          <p style={{fontSize:20,opacity:0.6,margin:"0 0 36px"}}>
            Your health is your greatest investment.
          </p>
          
          <button onClick={function(){setShowSplash(false)}} style={{
            background:"rgba(255,255,255,0.15)",border:"2px solid rgba(255,255,255,0.4)",
            color:"#fff",padding:"16px 52px",borderRadius:50,fontSize:20,fontWeight:700,
            fontFamily:"'Noto Sans KR',sans-serif",cursor:"pointer",transition:"all 0.3s",
            letterSpacing:"0.5px"
          }}
          onMouseOver={function(e){e.target.style.background="rgba(255,255,255,0.25)";e.target.style.borderColor="rgba(255,255,255,0.7)"}}
          onMouseOut={function(e){e.target.style.background="rgba(255,255,255,0.15)";e.target.style.borderColor="rgba(255,255,255,0.4)"}}>
            Start
          </button>
          
          <p style={{fontSize:12,opacity:0.35,marginTop:36}}>
            Made for you by Theo 🤙
          </p>
          
        </div>
      </div>
    );
  }

  return (
    <div style={{fontFamily:"'Nunito','Segoe UI',sans-serif",background:"linear-gradient(165deg,#e8f4f8 0%,#d1ecf1 30%,#e2f0e8 60%,#f0f7f4 100%)",minHeight:"100vh",color:"#2c4a52"}}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet"/>

      <div style={{background:"linear-gradient(135deg,#1a6b7a 0%,#2d8f6f 50%,#1a6b7a 100%)",padding:"12px 16px 10px",color:"#fff",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-40,right:-40,width:160,height:160,borderRadius:"50%",background:"rgba(255,255,255,0.06)"}}/>
        <div style={{maxWidth:920,margin:"0 auto",position:"relative"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:26}}>💚</span>
            <h1 style={{margin:0,fontSize:22,fontFamily:"'Playfair Display',serif",fontWeight:800}}>Health 401(k)</h1>
          </div>

        </div>
      </div>

      <div style={{maxWidth:920,margin:"0 auto",padding:"0 10px 36px"}}>

        {/* Settings Toggle */}
        <div style={{background:"#fff",borderRadius:14,marginTop:8,boxShadow:"0 2px 16px rgba(26,107,122,.08)",overflow:"hidden"}}>
          <div onClick={function(){setShowSettings(!showSettings)}} style={{padding:"10px 18px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:12,fontWeight:700,color:"#5a8a7a"}}>⚙️ Settings: Age {startAge}→{endAge} · {startWt}lbs · {htFt}\'{htIn}"</span>
            <span style={{fontSize:10,color:"#8aaa9a",fontWeight:700}}>{showSettings?"▲":"▼"}</span>
          </div>
          {showSettings && <div style={{padding:"0 18px 16px"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10}}>
            <div style={{background:"#f0f8f4",borderRadius:10,padding:"10px 14px",flex:"0 1 auto",minWidth:170}}>
              <div style={{fontSize:11,fontWeight:700,color:"#3a7a6a",textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>📅 Age Range</div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <input type="number" value={startAge} onChange={function(e){setStartAge(+e.target.value)}} min={20} max={89} style={Object.assign({},inputStyle,{width:68})}/>
                <span style={{fontSize:12,color:"#8aaa9a",fontWeight:700}}>→</span>
                <input type="number" value={endAge} onChange={function(e){setEndAge(+e.target.value)}} min={startAge+1} max={105} style={Object.assign({},inputStyle,{width:68})}/>
                <span style={{fontSize:11,color:"#8aaa9a",fontWeight:600}}>{endAge-startAge} yrs</span>
              </div>
            </div>
            <div style={{background:"#f0f8f4",borderRadius:10,padding:"10px 14px",flex:"0 1 auto",minWidth:140}}>
              <div style={{fontSize:11,fontWeight:700,color:"#3a7a6a",textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>📏 Height</div>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <input type="number" value={htFt} onChange={function(e){setHtFt(+e.target.value)}} min={4} max={7} style={Object.assign({},inputStyle,{width:48})}/>
                <span style={{fontSize:11,color:"#8aaa9a"}}>ft</span>
                <input type="number" value={htIn} onChange={function(e){setHtIn(+e.target.value)}} min={0} max={11} style={Object.assign({},inputStyle,{width:48})}/>
                <span style={{fontSize:11,color:"#8aaa9a"}}>in</span>
              </div>
            </div>
            <div style={{background:"#f0f8f4",borderRadius:10,padding:"10px 14px",flex:"1 1 auto",minWidth:260}}>
              <div style={{fontSize:11,fontWeight:700,color:"#3a7a6a",textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>⚖️ Weight</div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
                <span style={{fontSize:11,color:"#5a8a7a",fontWeight:600}}>Now</span>
                <input type="number" value={startWt} onChange={function(e){setStartWt(+e.target.value)}} min={100} max={400} style={Object.assign({},inputStyle,{width:65})}/>
                <span style={{fontSize:12,color:"#2d8f6f",fontWeight:700}}>→</span>
                <span style={{fontSize:11,color:"#5a8a7a",fontWeight:600}}>Goal</span>
                <input type="number" value={targetWt} onChange={function(e){setTargetWt(+e.target.value)}} min={100} max={startWt} style={Object.assign({},inputStyle,{width:65})}/>
                <span style={{fontSize:11,color:"#8aaa9a"}}>lbs</span>
                {startWt > targetWt && <span style={{fontSize:9,color:"#2d8f6f",fontWeight:700,background:"#e0f5ed",padding:"2px 8px",borderRadius:4}}>-{startWt-targetWt} lbs</span>}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:11,color:"#5a8a7a",fontWeight:600,whiteSpace:"nowrap"}}>Loss</span>
                <input type="range" min={0} max={100} value={Math.round(lossRate*100)} onChange={function(e){setLossRate(+e.target.value/100)}}
                  style={{flex:1,height:4,accentColor:"#2d8f6f",cursor:"pointer"}}/>
                <span style={{fontSize:10,fontWeight:700,color:"#1a6b7a",minWidth:32,textAlign:"right"}}>{lossRate.toFixed(1)}%</span>
                <span style={{fontSize:8,color:"#8aaa9a"}}>/wk</span>
                <span style={{fontSize:9,color:"#1a6b7a",fontWeight:700,background:"#e0f0f8",padding:"2px 8px",borderRadius:4,whiteSpace:"nowrap"}}>{(startWt * lossRate / 100).toFixed(1)} lbs/wk</span>
              </div>
            </div>
            <div style={{background:"#f0f8f4",borderRadius:10,padding:"10px 14px",flex:"0 1 auto",minWidth:170}}>
              <div style={{fontSize:11,fontWeight:700,color:"#3a7a6a",textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>📈 Investment</div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div onClick={function(){setShowInv(!showInv)}} style={{width:32,height:16,borderRadius:8,background:showInv?"linear-gradient(135deg,#2d8f6f,#1a6b7a)":"#ccc",position:"relative",transition:"all .3s",cursor:"pointer"}}>
                  <div style={{width:12,height:12,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:showInv?18:2,transition:"all .3s",boxShadow:"0 1px 2px rgba(0,0,0,.2)"}}/>
                </div>
                {showInv && <input type="number" value={invRate} onChange={function(e){setInvRate(+e.target.value)}} min={1} max={15} style={Object.assign({},inputStyle,{width:52})}/>}
                {showInv && <span style={{fontSize:11,color:"#5a8a7a",fontWeight:600}}>%/yr</span>}
                {!showInv && <span style={{fontSize:11,color:"#999"}}>Off</span>}
              </div>
            </div>
          </div>
          </div>}
        </div>

        {/* Activities */}
        <style>{"@keyframes hintPulse{0%,100%{box-shadow:0 0 0 0 rgba(45,143,111,.5)}50%{box-shadow:0 0 0 12px rgba(45,143,111,0)}} @keyframes walkBounce{0%,100%{transform:scale(1)}25%{transform:scale(1.06)}50%{transform:scale(1)}75%{transform:scale(1.04)}} @keyframes fingerBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}"}</style>
        <div style={{display:"flex",gap:6,marginTop:8,overflowX:"auto",WebkitOverflowScrolling:"touch",paddingBottom:4}}>
          {ACTIVITIES.map(function(a) {
            var on = sel.includes(a.id);
            var actData = calc && calc.actBk ? calc.actBk.find(function(x){return x.id===a.id}) : null;
            var isWalkHint = showHint && !on && a.id === "walking" && sel.length === 0;
            return (
              <div key={a.id} onClick={function(){toggle(a.id)}} style={{
                background:on?"linear-gradient(135deg,#1a6b7a,#2d8f6f)":isWalkHint?"linear-gradient(135deg,#e0f8ef,#d0f0e5)":"#fff",
                color:on?"#fff":"#2c4a52",borderRadius:10,padding:"8px 6px 5px",cursor:"pointer",
                flex:"0 0 auto",width:on?120:88,
                transition:"all .2s",
                boxShadow:isWalkHint?"0 0 20px rgba(45,143,111,.35), 0 4px 16px rgba(45,143,111,.2)":on?"0 3px 12px rgba(26,107,122,.2)":"0 1px 5px rgba(0,0,0,.04)",
                textAlign:"center",transform:on?"scale(1.02)":"scale(1)",
                border:isWalkHint?"3px solid #2d8f6f":on?"2px solid transparent":"2px solid #e8f4f8",
                animation:isWalkHint?"walkBounce 2s ease-in-out infinite, hintPulse 1.5s ease-in-out infinite":"none",
                position:"relative"}}>
                <div style={{fontSize:24,marginBottom:2}}>{a.icon}</div>
                <div style={{fontSize:13,fontWeight:700,lineHeight:1.2}}>{a.name}</div>
                {isWalkHint && <div style={{fontSize:11,color:"#2d8f6f",fontWeight:800,marginTop:4}}><span style={{display:"inline-block",animation:"fingerBounce 1s ease-in-out infinite"}}>👆</span> Tap here</div>}
                {a.vo2Y1>0 && <div style={{fontSize:10,color:on?"rgba(255,255,255,.7)":"#8aaa9a",marginTop:1}}>+{a.vo2Y1} VO2</div>}
                {on && <div style={{marginTop:4,display:"flex",gap:3,flexWrap:"wrap",justifyContent:"center",alignItems:"center"}} onClick={function(e){e.stopPropagation()}}>
                  {freqHint && (freq[a.id]||"3x") !== "daily" && <div style={{fontSize:14,animation:"fingerBounce 0.8s ease-in-out infinite"}}>👉</div>}
                  {FREQ.map(function(f) {
                    var isDaily = f.id === "daily";
                    var isDailyHint = freqHint && isDaily && (freq[a.id]||"3x") !== "daily";
                    var isSelected = (freq[a.id]||"3x")===f.id;
                    return (
                    <button key={f.id} onClick={function(){setFreq(a.id,f.id)}} style={{
                      fontSize:10,padding:"4px 8px",borderRadius:5,
                      border:isDailyHint?"2px solid rgba(255,255,255,.7)":"none",
                      background:isSelected?"rgba(255,255,255,.35)":"rgba(255,255,255,.12)",
                      color:"#fff",cursor:"pointer",fontWeight:isSelected?800:700,
                      animation:isDailyHint?"hintPulse 1.5s ease-in-out infinite":"none",
                      boxShadow:isDailyHint?"0 0 12px rgba(255,255,255,.3)":"none"}}>{f.label}</button>
                  )})}
                </div>}
                {on && actData && <div style={{marginTop:5,background:"rgba(255,255,255,0.25)",borderRadius:8,padding:"6px 8px",border:"1px solid rgba(255,255,255,0.3)"}} onClick={function(e){e.stopPropagation()}}>
                  <div style={{fontSize:20,fontWeight:800,color:"#fff",letterSpacing:"-0.5px"}}>{"$"+actData.perSession.toFixed(0)}</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,.85)",fontWeight:700}}>every {a.min>0?(a.min+" min"):"day"}</div>
                </div>}
              </div>
            );
          })}
        </div>

        {calc && <div style={{marginTop:4}}>

          {/* DASHBOARD */}
          {tab==="dashboard" && <div>

            {savingsHint && calc.actBk && calc.actBk.length > 0 && <div onClick={function(){setSavingsHint(false)}} style={{
              background:"linear-gradient(135deg,#1a6b7a,#2d8f6f)",borderRadius:14,padding:"16px 20px",marginBottom:8,
              cursor:"pointer",animation:"fadeIn 0.5s ease-out",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:-20,right:-20,width:120,height:120,borderRadius:"50%",background:"rgba(255,255,255,0.06)"}}/>
              <div style={{display:"flex",alignItems:"center",gap:14,position:"relative"}}>
                <div style={{fontSize:36}}>🚶</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,color:"rgba(255,255,255,.7)",fontWeight:600}}>
                    Every 30-min walk saves you
                  </div>
                  <div style={{fontSize:28,fontWeight:800,color:"#fff",letterSpacing:"-1px",margin:"2px 0"}}>
                    {"$"+calc.actBk[0].perSession.toFixed(0)} saved
                  </div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,.75)"}}>
                    3x/week = <b style={{color:"#fff"}}>{fmt(calc.total)}</b> by age {endAge}
                  </div>
                </div>
                <div style={{fontSize:10,color:"rgba(255,255,255,.4)"}}>✕</div>
              </div>
            </div>}

            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 4px",marginBottom:4}}>
              <div>
                <div style={{fontSize:11,color:"#5a8a7a",fontWeight:700}}>💰 Health Net Worth</div>
                <div style={{fontSize:28,fontWeight:800,color:"#1a6b7a",fontFamily:"'Playfair Display',serif",animation:savingsHint?"hintPulse 1.5s ease-in-out infinite":"none",borderRadius:8}}>{fmt(calc.total)}</div>
              </div>
              <div style={{display:"flex",gap:12,fontSize:11,color:"#5a8a7a"}}>
                <div style={{textAlign:"center"}}><div style={{fontSize:15,fontWeight:800,color:"#2d8f6f"}}>{calc.finalWt}</div><div>lbs</div></div>
                <div style={{textAlign:"center"}}><div style={{fontSize:15,fontWeight:800,color:"#e85a3a"}}>{calc.finalVO2}</div><div>VO2</div></div>
                <div style={{textAlign:"center"}}><div style={{fontSize:15,fontWeight:800,color:"#4a9a8a"}}>{calc.ful}</div><div>/100</div></div>
              </div>
            </div>

            <CC t="💰 Health Net Worth vs. Baseline ($0 = No Action)">
              <ResponsiveContainer width="100%" height={270}>
                <AreaChart data={calc.data} margin={{top:8,right:8,left:0,bottom:0}}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1a6b7a" stopOpacity={.25}/><stop offset="100%" stopColor="#2d8f6f" stopOpacity={.02}/></linearGradient>
                    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e8a838" stopOpacity={.15}/><stop offset="100%" stopColor="#e8a838" stopOpacity={.01}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d5e8e4"/>
                  <XAxis dataKey="age" tick={{fontSize:9,fill:"#5a8a7a"}}/>
                  <YAxis tickFormatter={fmt} tick={{fontSize:9,fill:"#5a8a7a"}} width={48}/>
                  <Tooltip formatter={function(v){return fmtF(v)}} labelFormatter={function(v){return "Age "+v}} contentStyle={{borderRadius:7,border:"none",boxShadow:"0 2px 12px rgba(0,0,0,.1)",fontSize:10}}/>
                  <ReferenceLine y={0} stroke="#aaa" strokeDasharray="4 4"/>
                  <Area type="monotone" dataKey="cumSaved" name="Expected Savings" stroke="#1a6b7a" fill="url(#g1)" strokeWidth={2.5}
                    dot={function(props) {
                      if (props.index === calc.data.length - 1 && !showInv) {
                        return (
                          <g>
                            <circle cx={props.cx} cy={props.cy} r={5} fill="#1a6b7a" stroke="#fff" strokeWidth={2}/>
                            <rect x={props.cx-62} y={props.cy-10} width={54} height={20} rx={5} fill="#1a6b7a"/>
                            <text x={props.cx-35} y={props.cy+4} textAnchor="middle" fill="#fff" fontSize={11} fontWeight={800}>{fmt(props.payload.cumSaved)}</text>
                          </g>
                        );
                      }
                      return null;
                    }}/>
                  {showInv && <Area type="monotone" dataKey="invValue" name="With Compounding" stroke="#e8a838" fill="url(#g2)" strokeWidth={2} strokeDasharray="5 3"
                    dot={function(props) {
                      if (props.index === calc.data.length - 1) {
                        return (
                          <g>
                            <circle cx={props.cx} cy={props.cy} r={5} fill="#e8a838" stroke="#fff" strokeWidth={2}/>
                            <rect x={props.cx-62} y={props.cy-10} width={54} height={20} rx={5} fill="#e8a838"/>
                            <text x={props.cx-35} y={props.cy+4} textAnchor="middle" fill="#fff" fontSize={11} fontWeight={800}>{fmt(props.payload.invValue)}</text>
                          </g>
                        );
                      }
                      return null;
                    }}/>}
                  <Legend wrapperStyle={{fontSize:11}}/>
                </AreaChart>
              </ResponsiveContainer>
            </CC>

            {/* Tabs */}
            <div style={{display:"flex",gap:2,marginTop:10,background:"#fff",borderRadius:10,padding:3,boxShadow:"0 1px 6px rgba(0,0,0,.04)",overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
              {tabs.map(function(t) { return (
                <button key={t.id} onClick={function(){setTab(t.id);if(savingsHint)setSavingsHint(false)}} style={{
                  flex:"1 0 auto",padding:"10px 8px",whiteSpace:"nowrap",borderRadius:8,border:"none",cursor:"pointer",
                  background:tab===t.id?"linear-gradient(135deg,#1a6b7a,#2d8f6f)":"transparent",
                  color:tab===t.id?"#fff":"#5a8a7a",fontWeight:700,fontSize:13,fontFamily:"inherit"
                }}><span style={{marginRight:2}}>{t.i}</span>{t.l}</button>
              )})}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:8,marginTop:8}}>
              <CC t="🫀 VO2 Max: Your Trajectory">
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={calc.data} margin={{top:10,right:8,left:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0ece8"/>
                    <XAxis dataKey="age" tick={{fontSize:9,fill:"#5a8a7a"}}/>
                    <YAxis tick={{fontSize:9,fill:"#5a8a7a"}} domain={[8,"dataMax+3"]} width={28}/>
                    <Tooltip contentStyle={{borderRadius:5,border:"none",fontSize:11}} formatter={function(v,n){return [v+" ml/kg/min",n]}}/>
                    <ReferenceLine y={18} stroke="#e8a838" strokeWidth={2.5} label={{value:"Assistance Threshold (VO2 = 18)",fontSize:7,fill:"#d48a20",position:"insideBottomRight"}}/>
                    {calc.actAssistedAge && <ReferenceLine x={calc.actAssistedAge} stroke="#e85a3a" strokeWidth={2}/>}
                    <Line type="monotone" dataKey="vo2Sed" name="Avg Inactive Person (40th %ile)" stroke="#daa" strokeWidth={1.5} strokeDasharray="4 3" dot={false}/>
                    <Line type="monotone" dataKey="vo2" name={"You ("+calc.activePctile+"th %ile)"} stroke="#2d8f6f" strokeWidth={2.5}
                      dot={function(props) {
                        if (calc.actAssistedAge && props.payload && props.payload.age === calc.actAssistedAge) {
                          return (
                            <g>
                              <circle cx={props.cx} cy={props.cy} r={6} fill="#e85a3a" stroke="#fff" strokeWidth={2}/>
                              <line x1={props.cx} y1={props.cy-8} x2={props.cx+12} y2={props.cy-28} stroke="#e85a3a" strokeWidth={1.5}/>
                              <rect x={props.cx+10} y={props.cy-44} width={56} height={18} rx={4} fill="#e85a3a"/>
                              <text x={props.cx+38} y={props.cy-32} textAnchor="middle" fill="#fff" fontSize={10} fontWeight={800}>{"Age "+calc.actAssistedAge}</text>
                            </g>
                          );
                        }
                        return null;
                      }}/>
                    <Legend wrapperStyle={{fontSize:10}}/>
                  </ComposedChart>
                </ResponsiveContainer>
                {calc.actAssistedAge && <div style={{marginTop:4,padding:"6px 10px",background:"#fef5e8",borderRadius:6,fontSize:11,lineHeight:1.5}}>
                  <b style={{color:"#e85a3a"}}>⚠️ At age {calc.actAssistedAge}, VO2 drops below 18 — assistance required.</b> Cost: <b style={{color:"#c45a3a"}}>$55,000/yr</b> assisted living.
                  {calc.sedAssistedAge && calc.actAssistedAge > calc.sedAssistedAge && <span> Without exercise this hits at age <b>{calc.sedAssistedAge}</b> — you gain <b style={{color:"#2d8f6f"}}>{calc.actAssistedAge - calc.sedAssistedAge} extra independent years</b>.</span>}
                </div>}
                {!calc.actAssistedAge && sel.length > 0 && <div style={{marginTop:4,padding:"6px 10px",background:"#e8f8f0",borderRadius:6,fontSize:11,lineHeight:1.5}}>
                  <b style={{color:"#2d8f6f"}}>✓ VO2 stays above 18 through age {endAge} — assistance avoided.</b>
                  {calc.sedAssistedAge && <span> Sedentary would need care at <b style={{color:"#c45a3a"}}>{calc.sedAssistedAge}</b> — you save <b style={{color:"#2d8f6f"}}>{fmtF((endAge - calc.sedAssistedAge) * 55000)}</b>.</span>}
                </div>}
              </CC>
              <CC t={"⚖️ Weight → Target ("+targetWt+" lbs)"}>
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={calc.data.filter(function(d,idx) {
                    if (startWt <= targetWt) return true;
                    var hitTarget = -1;
                    for (var j=0;j<calc.data.length;j++) { if (calc.data[j].wt <= targetWt) { hitTarget = j; break; } }
                    if (hitTarget < 0) return true;
                    return idx <= hitTarget + 2;
                  })} margin={{top:4,right:4,left:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0ece8"/>
                    <XAxis dataKey="age" tick={{fontSize:9,fill:"#5a8a7a"}}/>
                    <YAxis tick={{fontSize:9,fill:"#5a8a7a"}} domain={["dataMin-5","dataMax+5"]} width={36}/>
                    <Tooltip contentStyle={{borderRadius:5,border:"none",fontSize:11}} formatter={function(v){return [v+" lbs","Weight"]}}/>
                    <ReferenceLine y={targetWt} stroke="#2d8f6f" strokeWidth={1.5} strokeDasharray="4 3" label={{value:"Goal: "+targetWt+" lbs",fontSize:8,fill:"#2d8f6f",position:"insideTopRight"}}/>
                    <ReferenceLine y={startWt} stroke="#daa" strokeWidth={1} strokeDasharray="3 3" label={{value:"Start: "+startWt,fontSize:7,fill:"#daa",position:"insideBottomRight"}}/>
                    <Area type="monotone" dataKey="wt" name="Weight" stroke="#5ab8a6" fill="#e8f4f0" strokeWidth={2.5}/>
                  </ComposedChart>
                </ResponsiveContainer>
              </CC>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:8,marginTop:8}}>
              <CC t="🏥 Care Costs: You vs. Sedentary">
                <ResponsiveContainer width="100%" height={185}>
                  <BarChart data={calc.data.filter(function(d){return d.age>=65})} margin={{top:4,right:4,left:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0ece8"/>
                    <XAxis dataKey="age" tick={{fontSize:9,fill:"#5a8a7a"}}/>
                    <YAxis tickFormatter={fmt} tick={{fontSize:9,fill:"#5a8a7a"}} width={38}/>
                    <Tooltip formatter={function(v){return fmtF(v)}} labelFormatter={function(v){return "Age "+v}} contentStyle={{borderRadius:5,border:"none",fontSize:11}}/>
                    <Bar dataKey="careSed" name="Sedentary" fill="#e8a0a0" radius={[2,2,0,0]}/>
                    <Bar dataKey="careAct" name="You" fill="#5ab8a6" radius={[2,2,0,0]}/>
                    <Legend wrapperStyle={{fontSize:10}}/>
                  </BarChart>
                </ResponsiveContainer>
              </CC>
              <CC t="📅 Annual Net Savings">
                {sel.length === 0 ? <div style={{height:185,display:"flex",alignItems:"center",justifyContent:"center",color:"#8aaa9a",fontSize:12,fontStyle:"italic"}}>Select activities above to see annual savings</div> :
                <ResponsiveContainer width="100%" height={185}>
                  <BarChart data={calc.data} margin={{top:4,right:4,left:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0ece8"/>
                    <XAxis dataKey="age" tick={{fontSize:9,fill:"#5a8a7a"}}/>
                    <YAxis tickFormatter={fmt} tick={{fontSize:9,fill:"#5a8a7a"}} width={40}/>
                    <Tooltip formatter={function(v){return fmtF(v)}} labelFormatter={function(v){return "Age "+v}} contentStyle={{borderRadius:5,border:"none",fontSize:11}}/>
                    <Bar dataKey="net" name="Net Saved" fill="#2d8f6f" radius={[2,2,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>}
              </CC>
            </div>
          </div>}

          {/* ACTIVITIES */}
          {tab==="activities" && <div>
            {sel.length===0 ? <Empty i="🎯" t="Select Activities Above" s="Tap to build your portfolio"/> :
            <div style={{display:"grid",gap:8}}>
              {calc.actBk.map(function(a) { return (
                <div key={a.id} style={{background:"#fff",borderRadius:11,padding:0,boxShadow:"0 1px 8px rgba(0,0,0,.05)",border:"1px solid #e0f0ea",overflow:"hidden"}}>
                  <div style={{background:"linear-gradient(135deg,#1a6b7a,#2d8f6f)",padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:28,filter:"brightness(0) invert(1)"}}>{a.icon}</span>
                      <div>
                        <div style={{fontWeight:800,fontSize:17,color:"#fff"}}>{a.name}</div>
                        <div style={{fontSize:9,color:"rgba(255,255,255,.7)"}}>{a.f.label} · {a.min>0?a.min+" min":"Daily habit"}{a.vo2Y1>0?" · VO2 +"+a.vo2Y1:""}</div>
                      </div>
                    </div>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:32,fontWeight:800,color:"#fff",letterSpacing:"-1px"}}>{"$"+a.perSession.toFixed(0)}</div>
                      <div style={{fontSize:11,color:"rgba(255,255,255,.85)",fontWeight:700}}>every {a.min>0?a.min+" min":"day"}</div>
                    </div>
                  </div>
                  <div style={{padding:"10px 14px"}}>
                  <div style={{display:"flex",gap:6,marginBottom:6}}>
                    <div style={{flex:1,textAlign:"center",padding:"6px 4px",background:"#f0f8f4",borderRadius:6}}>
                      <div style={{fontSize:14,fontWeight:800,color:"#1a6b7a"}}>{fmt(a.life)}</div>
                      <div style={{fontSize:7,color:"#7a9a8a",fontWeight:600}}>Lifetime Value</div>
                    </div>
                    <div style={{flex:1,textAlign:"center",padding:"6px 4px",background:"#f7faf9",borderRadius:6}}>
                      <div style={{fontSize:14,fontWeight:800,color:"#2d8f6f"}}>{a.totalSessions.toLocaleString()}</div>
                      <div style={{fontSize:7,color:"#7a9a8a",fontWeight:600}}>Total Sessions</div>
                    </div>
                    <div style={{flex:1,textAlign:"center",padding:"6px 4px",background:"#f7faf9",borderRadius:6}}>
                      <div style={{fontSize:14,fontWeight:800,color:a.ac>0?"#c47a30":"#2d8f6f"}}>{a.ac>0?fmtF(a.ac):"Free"}</div>
                      <div style={{fontSize:7,color:"#7a9a8a",fontWeight:600}}>Annual Cost</div>
                    </div>
                    <div style={{flex:1,textAlign:"center",padding:"6px 4px",background:"#f7faf9",borderRadius:6}}>
                      <div style={{fontSize:14,fontWeight:800,color:"#1a6b7a"}}>{"$"+a.dph}</div>
                      <div style={{fontSize:7,color:"#7a9a8a",fontWeight:600}}>$/Hour</div>
                    </div>
                  </div>
                  <div style={{fontSize:9,color:"#6a9a8a",marginBottom:4}}>{a.sharePct}% of total Health 401(k) value</div>
                  <div style={{marginTop:6,padding:"5px 8px",background:"#f0f8f4",borderRadius:5,fontSize:10,color:"#4a7a6a",lineHeight:1.3}}>📎 {a.study}</div>
                  </div>
                </div>
              )})}
            </div>}
          </div>}

          {/* RISKS */}
          {tab==="risks" && <div style={{display:"grid",gap:8}}>
            {calc.riskBk.map(function(r) { return (
              <div key={r.id} style={{background:"#fff",borderRadius:11,padding:"12px 14px",boxShadow:"0 1px 8px rgba(0,0,0,.05)",border:"1px solid #e0f0ea"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    <span style={{fontSize:20}}>{r.icon}</span>
                    <div>
                      <div style={{fontWeight:800,fontSize:14}}>{r.name}</div>
                      <div style={{fontSize:9,color:"#6a9a8a",maxWidth:280}}>{r.desc}</div>
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:14,fontWeight:800,color:"#c45a3a"}}>{fmtF(r.totalCost)}</div>
                    <div style={{fontSize:8,color:"#999",fontWeight:600}}>LIFETIME</div>
                  </div>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:9,fontWeight:700,marginBottom:2}}>
                  <span style={{color:"#5a8a7a"}}>Exercise: {(r.direct*100).toFixed(1)}%</span>
                  {r.cascade>0.001 && <span style={{color:"#4a90b8"}}>+Cascade: {(r.cascade*100).toFixed(1)}%</span>}
                  <span style={{color:"#e85a3a"}}>Wt: {r.wtMultStart>1.05?((r.wtMultStart-1)*100).toFixed(0)+"%→"+((r.wtMultEnd-1)*100).toFixed(0)+"%":"—"}</span>
                  <span style={{color:"#1a6b7a",fontWeight:800}}>Total: {(r.total*100).toFixed(1)}%</span>
                </div>
                <PB v={r.total}/>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:4,fontSize:10}}>
                  <span style={{color:"#5a8a7a"}}>Expected Savings</span>
                  <span style={{fontWeight:800,color:"#2d8f6f"}}>{fmt(r.saved)}</span>
                </div>
              </div>
            )})}
          </div>}

          {/* CARE */}
          {tab==="care" && <div style={{display:"grid",gap:8}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              <SC l="Care Onset (Sedentary)" v={calc.careOnsetSed?"Age "+calc.careOnsetSed:"N/A"} s="Age when care begins" c="#c45a3a" i="⚠️"/>
              <SC l="Care Onset (You)" v={calc.careOnsetAct?"Age "+calc.careOnsetAct:"Avoided"} s="Age when care begins" c="#2d8f6f" i="✅"/>
              <SC l="Total Saved" v={fmtF(calc.cumCare)} s="Care costs avoided" c="#8a5ac4" i="🏥"/>
            </div>

            <div style={{background:"#fff",borderRadius:11,padding:"14px 16px",boxShadow:"0 1px 8px rgba(0,0,0,.05)"}}>
              <h3 style={{margin:"0 0 8px",fontSize:13,fontWeight:800}}>🫀 VO2 Max → Care Level</h3>
              <p style={{margin:"0 0 10px",fontSize:10,color:"#5a8a7a",lineHeight:1.4}}>VO2 determines functional independence. Weight loss improves relative VO2.</p>
              {CARE.map(function(c, i) {
                var lastD = calc.data[calc.data.length-1];
                var isYou = lastD && getCL(lastD.vo2) === c.name;
                var isSed = lastD && getCL(lastD.vo2Sed) === c.name;
                return (
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:8,marginBottom:4,
                    background:isYou?"#e8f8f0":isSed?"#fef0e8":"#f8f8f8",
                    border:isYou?"2px solid #2d8f6f":isSed?"2px solid #e8a0a0":"1px solid #eee"}}>
                    <div style={{width:55,textAlign:"center"}}>
                      <div style={{fontSize:11,fontWeight:800,color:c.cost===0?"#2d8f6f":"#c45a3a"}}>{c.cost===0?"$0":fmtF(c.cost)}</div>
                      <div style={{fontSize:7,color:"#999"}}>/year</div>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:700}}>{c.name}</div>
                      <div style={{fontSize:9,color:"#6a9a8a"}}>VO2 ≥ {c.vo2}</div>
                    </div>
                    <div style={{display:"flex",gap:4}}>
                      {isYou && <span style={{fontSize:8,background:"#2d8f6f",color:"#fff",padding:"2px 6px",borderRadius:4,fontWeight:700}}>You</span>}
                      {isSed && <span style={{fontSize:8,background:"#e8a0a0",color:"#fff",padding:"2px 6px",borderRadius:4,fontWeight:700}}>Sedentary</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            <CC t="🫀 VO2 Trajectory with Care Thresholds">
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={calc.data} margin={{top:8,right:8,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0ece8"/>
                  <XAxis dataKey="age" tick={{fontSize:9,fill:"#5a8a7a"}}/>
                  <YAxis tick={{fontSize:9,fill:"#5a8a7a"}} domain={[8,45]} width={28}/>
                  <Tooltip content={function(props) {
                    if (!props.active || !props.payload || !props.payload.length) return null;
                    var d = props.payload[0].payload;
                    return (
                      <div style={{background:"#fff",borderRadius:8,padding:"8px 12px",boxShadow:"0 2px 12px rgba(0,0,0,.15)",fontSize:9,lineHeight:1.6}}>
                        <div style={{fontWeight:800,marginBottom:2}}>Age {d.age}</div>
                        <div style={{color:"#2d8f6f"}}>Your VO2: <b>{d.vo2}</b> — {d.actCareName}</div>
                        <div style={{color:"#b88"}}>Inactive: <b>{d.vo2Sed}</b> — {d.sedCareName}</div>
                        {d.careProbPct > 0 && <div style={{marginTop:3,borderTop:"1px solid #eee",paddingTop:3}}>
                          <div>Care probability: <b>{d.careProbPct}%</b></div>
                          <div style={{color:"#c45a3a"}}>Inactive cost: <b>{fmtF(d.sedCareCost)}/yr</b></div>
                          <div style={{color:"#2d8f6f"}}>Your cost: <b>{fmtF(d.actCareCost)}/yr</b></div>
                          {d.careSaved > 0 && <div style={{fontWeight:700,color:"#1a6b7a"}}>Saving: {fmtF(d.careSaved)}/yr</div>}
                        </div>}
                      </div>
                    );
                  }}/>
                  <ReferenceLine y={22} stroke="#4a90b8" strokeDasharray="3 3" label={{value:"Independent — $0/yr",fontSize:7,fill:"#4a90b8",position:"right"}}/>
                  <ReferenceLine y={18} stroke="#6aaa9a" strokeDasharray="3 3" label={{value:"Part-time aide — $18K/yr",fontSize:7,fill:"#6aaa9a",position:"right"}}/>
                  <ReferenceLine y={15} stroke="#e8a838" strokeWidth={2} label={{value:"⚠️ Assisted Living — $55K/yr",fontSize:7,fill:"#e8a838",position:"right"}}/>
                  <ReferenceLine y={12} stroke="#e85a3a" strokeWidth={2} label={{value:"🏥 Nursing Home — $108K/yr",fontSize:7,fill:"#e85a3a",position:"right"}}/>
                  {calc.sedCrossings.map(function(c) {
                    if (!c.age) return null;
                    return <ReferenceLine key={"sed-"+c.threshold.vo2} x={c.age} stroke="#daa" strokeWidth={1} strokeDasharray="2 2"/>;
                  })}
                  {calc.actCrossings.map(function(c) {
                    if (!c.age) return null;
                    return <ReferenceLine key={"act-"+c.threshold.vo2} x={c.age} stroke="#2d8f6f" strokeWidth={1} strokeDasharray="2 2"/>;
                  })}
                  <Line type="monotone" dataKey="vo2Sed" name="Avg Inactive Person (40th %ile)" stroke="#daa" strokeWidth={2} strokeDasharray="5 3" dot={false}/>
                  <Line type="monotone" dataKey="vo2" name="Your VO2 Max" stroke="#2d8f6f" strokeWidth={3} dot={false}/>
                  <Legend wrapperStyle={{fontSize:10}}/>
                </ComposedChart>
              </ResponsiveContainer>
            </CC>

            {/* Threshold crossing timeline */}
            <div style={{background:"#fff",borderRadius:11,padding:"14px 16px",boxShadow:"0 1px 8px rgba(0,0,0,.05)"}}>
              <h3 style={{margin:"0 0 10px",fontSize:13,fontWeight:800}}>📍 When Care Levels Begin</h3>
              <div style={{display:"grid",gap:6}}>
                {calc.sedCrossings.map(function(sc, i) {
                  var ac = calc.actCrossings[i];
                  var saved = (sc.age && ac.age) ? (ac.age - sc.age) * sc.threshold.cost : (sc.age ? "Avoided entirely" : null);
                  if (!sc.age && !ac.age) return null;
                  return (
                    <div key={i} style={{display:"flex",gap:10,alignItems:"center",padding:"8px 12px",borderRadius:8,background:"#f8f8f8",border:"1px solid #eee"}}>
                      <div style={{width:90,flexShrink:0}}>
                        <div style={{fontSize:11,fontWeight:800,color:sc.threshold.cost>=100000?"#c45a3a":"#e8a838"}}>{fmtF(sc.threshold.cost)}/yr</div>
                        <div style={{fontSize:8,color:"#999"}}>{sc.threshold.name}</div>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:9,color:"#6a5a5a",marginBottom:2}}>
                          <b style={{color:"#c45a3a"}}>Sedentary: Age {sc.age || "N/A"}</b>
                          <span style={{margin:"0 6px",color:"#ccc"}}>|</span>
                          <b style={{color:"#2d8f6f"}}>You: {ac.age ? "Age " + ac.age : "Avoided"}</b>
                        </div>
                        <div style={{fontSize:8,color:"#8a8a8a"}}>{sc.threshold.trigger}</div>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        {typeof saved === "string" ? <div style={{fontSize:10,fontWeight:800,color:"#2d8f6f"}}>{saved}</div>
                          : saved > 0 ? <div style={{fontSize:10,fontWeight:800,color:"#2d8f6f"}}>+{Math.round((ac.age - sc.age))} yrs delayed</div> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <CC t="🏥 Annual Care Costs">
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={calc.data.filter(function(d){return d.age>=65})} margin={{top:4,right:4,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0ece8"/>
                  <XAxis dataKey="age" tick={{fontSize:9,fill:"#5a8a7a"}}/>
                  <YAxis tickFormatter={fmt} tick={{fontSize:9,fill:"#5a8a7a"}} width={40}/>
                  <Tooltip formatter={function(v){return fmtF(v)}} labelFormatter={function(v){return "Age "+v}} contentStyle={{borderRadius:5,border:"none",fontSize:11}}/>
                  <Bar dataKey="careSed" name="Sedentary" fill="#e8a0a0" radius={[2,2,0,0]}/>
                  <Bar dataKey="careAct" name="You" fill="#5ab8a6" radius={[2,2,0,0]}/>
                  <Legend wrapperStyle={{fontSize:10}}/>
                </BarChart>
              </ResponsiveContainer>
            </CC>

            <div style={{background:"linear-gradient(135deg,#f5eeff,#eee8fa)",borderRadius:10,padding:"12px 14px",border:"1px solid #d5c8e8"}}>
              <h3 style={{margin:"0 0 4px",fontSize:13,fontWeight:800,color:"#5a3a8a"}}>💡 The Biggest Number</h3>
              <p style={{margin:0,fontSize:10,lineHeight:1.5,color:"#4a3a6a"}}>
                Nursing home = $108K/yr x 3.2 yr avg stay = ~$346K. 70% of people 65+ will need care. VO2 above 22 = independent. Each year delayed saves $55-130K.
                {calc.sedAssistedAge && !calc.actAssistedAge && " With your current activities, you may avoid assisted living entirely — keeping potentially $300-500K in your family."}
                {calc.sedAssistedAge && calc.actAssistedAge && " Your activities delay assisted living by " + (calc.actAssistedAge - calc.sedAssistedAge) + " years, saving approximately " + fmtF((calc.actAssistedAge - calc.sedAssistedAge) * 55000) + "."}
              </p>
            </div>
          </div>}

          {/* STUDIES */}
          {tab==="studies" && <div style={{display:"grid",gap:7}}>
            <div style={{background:"#fff",borderRadius:10,padding:"12px 14px"}}>
              <h3 style={{margin:"0 0 6px",fontFamily:"'Playfair Display',serif",fontSize:15,color:"#1a6b7a"}}>Research and Sources</h3>
              <p style={{fontSize:10,color:"#5a8a7a",lineHeight:1.4,margin:0}}>VO2 calibrated from meta-analyses. Weight impacts risk via per-condition multipliers. Care thresholds from functional independence research.</p>
            </div>
            <div style={{background:"#fff",borderRadius:10,padding:"12px 14px"}}>
              <h4 style={{margin:"0 0 6px",fontSize:12,fontWeight:800}}>🫀 VO2 Max and Mortality</h4>
              <div style={{fontSize:10,color:"#4a6a5a",lineHeight:1.6}}>
                <div>Each 1-MET gain reduces all-cause mortality 11-17% (Br J Sports Med 2024, 20.9M observations)</div>
                <div>Copenhagen Male Study (46yr follow-up): each unit VO2 max = +45 days longevity</div>
                <div>JAMA Network Open (2018): low fitness group had 4x higher mortality than high fitness</div>
                <div>Natural decline: ~0.5 ml/kg/min/yr. Trainable at any age.</div>
              </div>
            </div>
            <div style={{background:"#fff",borderRadius:10,padding:"12px 14px"}}>
              <h4 style={{margin:"0 0 6px",fontSize:12,fontWeight:800}}>🏥 Care Cost Sources</h4>
              <div style={{fontSize:10,color:"#4a6a5a",lineHeight:1.6}}>
                <div>Mean entry age: 84 (JAMA Int Med 2023). 70% of 65+ need care. Avg stay 3.2 years.</div>
                <div>Genworth 2024: Nursing $108K/yr. Assisted $55K/yr. Home aide ~$18K/yr.</div>
                <div>Top triggers: stroke, Alzheimer's, falls. All reduced by exercise.</div>
              </div>
            </div>
            <div style={{background:"#fff",borderRadius:10,padding:"12px 14px"}}>
              <h4 style={{margin:"0 0 6px",fontSize:12,fontWeight:800}}>⚖️ Weight Impact</h4>
              <div style={{fontSize:10,color:"#4a6a5a",lineHeight:1.6}}>
                <div>Obesity excess costs: $2,505/yr (Cawley 2021). Class 3: +234% higher costs.</div>
                <div>VO2 = ml O2/kg/min. Losing 20 lbs at 200 = ~11% relative VO2 gain.</div>
                <div>1% body weight/week = safe sustainable loss (ACSM).</div>
              </div>
            </div>
            {ACTIVITIES.map(function(a) { return (
              <div key={a.id} style={{background:"#fff",borderRadius:9,padding:"10px 12px",border:"1px solid #e8f4f0",opacity:sel.includes(a.id)?1:.5}}>
                <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>
                  <span style={{fontSize:16}}>{a.icon}</span>
                  <span style={{fontWeight:800,fontSize:12}}>{a.name}</span>
                  {sel.includes(a.id) && <span style={{fontSize:7,background:"#e0f5ed",color:"#2d8f6f",padding:"1px 5px",borderRadius:3,fontWeight:700}}>ACTIVE</span>}
                </div>
                <p style={{margin:0,fontSize:10,color:"#4a6a5a",lineHeight:1.3,paddingLeft:21}}>📖 {a.study}</p>
              </div>
            )})}
            <div style={{background:"#f0f8f4",borderRadius:9,padding:"10px 12px",border:"1px solid #d5e8dc"}}>
              <div style={{fontSize:9,color:"#4a7a6a",lineHeight:1.4}}>
                <b>Methodology:</b> Weight loss at 1%/wk (ACSM). VO2 research-calibrated with weight-loss bonus. Risk reductions additive with soft cap at 65%. Wellness driven by MET-minutes/week (CDC: 500 active, 1000+ highly active). All USD 2024. Educational only.
              </div>
            </div>
          </div>}

        </div>}
      </div>
    </div>
  );
}

function SC(props) {
  return (
    <div style={{background:"#fff",borderRadius:10,padding:"12px 14px",boxShadow:"0 1px 10px rgba(0,0,0,.05)",borderLeft:"3px solid "+props.c}}>
      <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
        <span style={{fontSize:14}}>{props.i}</span>
        <span style={{fontSize:11,fontWeight:700,color:"#5a8a7a",textTransform:"uppercase",letterSpacing:.3}}>{props.l}</span>
      </div>
      <div style={{fontSize:24,fontWeight:800,color:props.c,fontFamily:"'Playfair Display',serif"}}>{props.v}</div>
      <div style={{fontSize:11,color:"#8aaa9a",marginTop:2}}>{props.s}</div>
    </div>
  );
}

function CC(props) {
  return (
    <div style={Object.assign({background:"#fff",borderRadius:10,padding:"12px 12px 6px",boxShadow:"0 1px 10px rgba(0,0,0,.05)"}, props.s||{})}>
      <h3 style={{margin:"0 0 8px",fontSize:15,fontWeight:800,color:"#2c4a52"}}>{props.t}</h3>
      {props.children}
    </div>
  );
}

function MS(props) {
  return (
    <div style={{textAlign:"center",padding:"6px 3px",background:"#f7faf9",borderRadius:5}}>
      <div style={{fontSize:14,fontWeight:800,color:props.c}}>{props.v}</div>
      <div style={{fontSize:9,color:"#7a9a8a",fontWeight:600,marginTop:1}}>{props.l}</div>
    </div>
  );
}

function PB(props) {
  return (
    <div style={{height:7,background:"#eef5f2",borderRadius:3,overflow:"hidden"}}>
      <div style={{height:"100%",borderRadius:3,width:Math.min(100,props.v/0.70*100)+"%",background:"linear-gradient(90deg,#2d8f6f,#1a6b7a)",transition:"width .4s"}}/>
    </div>
  );
}

function Empty(props) {
  return (
    <div style={{background:"#fff",borderRadius:13,padding:30,textAlign:"center",color:"#5a8a7a"}}>
      <div style={{fontSize:38,marginBottom:8}}>{props.i}</div>
      <h3 style={{margin:0,fontFamily:"'Playfair Display',serif"}}>{props.t}</h3>
      <p style={{margin:"5px 0 0",fontSize:12,opacity:.7}}>{props.s}</p>
    </div>
  );
}
