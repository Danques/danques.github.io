
function alphaOf(cs) {
    const f = x => cs.reduce((s, c, i) => s + c * Math.pow(x, -(i + 1)), 0);
    let lo = 1e-6;
    let hi = cs.reduce((a, b) => a + b, 0) + 1;
    for (let i = 0; i < 200; i++) {
        const mid = (lo + hi) / 2;
        if (f(mid) > 1) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
}

function wordOf(cs, order) {
    const memo = new Map();
    function ws(i) {
        if (i <= 0) return [-i];
        if (memo.has(i)) return memo.get(i);
        let out = [];
        cs.forEach((c, idx) => {
            const sub = ws(i - (idx + 1));
            for (let r = 0; r < c; r++) out = out.concat(sub);
        });
        memo.set(i, out);
        return out;
    }
    return ws(order);
}

const PASTEL_S = 75;   // saturation (%)
const PASTEL_L = 80;   // lightness (%)

function pastelCss(t) {
    const hue = 270 * (1 - t);
    return "hsl(" + hue.toFixed(1) + "," + PASTEL_S + "%," + PASTEL_L + "%)";
}

function buildKT(ks) {
    const uniq = Array.from(new Set(ks)).sort((a, b) => a - b);
    const map = new Map();
    uniq.forEach((k, idx) => map.set(k, uniq.length > 1 ? idx / (uniq.length - 1) : 0));
    return map;
}

const MAX_LEVEL = 1.3;
const MAX_NOTES = 600;
const MAX_DIV = 16;

let bpm = 30;

const insts = [
    { id: "hh", label: "ハイハット", cs: "1,1", order: 3 },
    { id: "bd", label: "バスドラム", cs: "1,1", order: 3 },
    { id: "sn", label: "スネア", cs: "1,1", order: 3 }
].map(o => Object.assign(o, {
    levels: [], divs: [], word: [], durs: [], starts: [], ks: [], kt: new Map(), valid: false,
    hs: [], hd: [], hn: [], hl: [],   // per-hit start / duration / note index / sub index
    sel: -1, subSel: -1, mute: false, vol: 1.0, idx: 0, c: 0, dirty: false, events: [], els: {}
}));

// ---------- UI construction ----------
const app = document.getElementById("app");

insts.forEach(inst => {
    const box = document.createElement("div");
    box.className = "inst";
    box.innerHTML =
        '<h2>' + inst.label + '</h2>' +
        '<div class="ctrl">' +
        '<label>係数配列 <input type="text" class="cs" value="' + inst.cs + '"></label>' +
        '<label>深さ order <input type="number" class="order" min="0" max="10" value="' + inst.order + '"></label>' +
        '<label><input type="checkbox" class="mute"> ミュート</label>' +
        '<label>音量 <input type="range" class="vol" min="0" max="1.5" step="0.01" value="1" style="width:140px;vertical-align:middle">' +
        ' <span class="volv" style="display:inline-block;width:42px">100%</span></label>' +
        '<button class="reset">強さを 1.0 に</button>' +
        '<button class="resetdiv">分割数を 1 に</button>' +
        '<span class="err"></span>' +
        '</div>' +
        '<div class="meta"></div>' +
        '<div class="legend"></div>' +
        '<div class="barswrap"><div class="lbl"></div><div class="bars"><div class="scan"></div></div></div>' +
        '<div class="edit">' +
        '<span class="selinfo">選択中: なし</span>' +
        '<label>強さ <input type="number" class="selval" min="0" max="' + MAX_LEVEL + '" step="0.05" disabled></label>' +
        '<label>分割数 <input type="number" class="seldiv" min="1" max="' + MAX_DIV + '" step="1" disabled></label>' +
        '</div>' +
        '<div class="edit">' +
        '<label>全ブロックの強さ(音符ごとにカンマ、分割内はスラッシュ区切り、不足分は繰り返し): ' +
        '<input type="text" class="list"></label>' +
        '</div>' +
        '<div class="edit">' +
        '<label>全ブロックの分割数(カンマ区切り、不足分は繰り返し): ' +
        '<input type="text" class="dlist"></label>' +
        '</div>';
    app.appendChild(box);
    const q = s => box.querySelector(s);
    inst.els = {
        cs: q(".cs"), order: q(".order"), mute: q(".mute"),
        vol: q(".vol"), volv: q(".volv"),
        reset: q(".reset"), resetdiv: q(".resetdiv"),
        err: q(".err"), meta: q(".meta"), legend: q(".legend"), bars: q(".bars"),
        scan: q(".scan"), selinfo: q(".selinfo"), selval: q(".selval"),
        seldiv: q(".seldiv"), list: q(".list"), dlist: q(".dlist"),
        blocks: [], subdivs: [], subs: [], fills: [], vals: []
    };

    inst.els.cs.addEventListener("input", () => rebuild(inst));
    inst.els.order.addEventListener("input", () => rebuild(inst));
    inst.els.mute.addEventListener("change", () => { inst.mute = inst.els.mute.checked; });
    inst.els.vol.addEventListener("input", () => {
        setVol(inst, parseFloat(inst.els.vol.value));
    });
    inst.els.reset.addEventListener("click", () => {
        inst.levels = inst.levels.map(a => a.map(() => 1.0));
        refreshLevels(inst);
    });
    inst.els.resetdiv.addEventListener("click", () => {
        inst.divs = inst.divs.map(() => 1);
        refreshDivs(inst);
    });
    inst.els.selval.addEventListener("input", () => {
        if (inst.sel < 0 || inst.subSel < 0) return;
        const v = parseFloat(inst.els.selval.value);
        if (!isNaN(v)) setLevel(inst, inst.sel, inst.subSel, v, true);
    });
    inst.els.seldiv.addEventListener("input", () => {
        if (inst.sel < 0) return;
        const v = parseInt(inst.els.seldiv.value, 10);
        if (!isNaN(v)) setDiv(inst, inst.sel, v, true);
    });
    inst.els.seldiv.addEventListener("change", () => updateSel(inst));
    inst.els.list.addEventListener("change", () => {
        const arr = parseLevelList(inst.els.list.value);
        if (arr.length === 0) return;
        inst.levels = inst.word.map((_, i) => {
            const a = arr[i % arr.length];
            return Array.from({ length: inst.divs[i] }, (_, s) => a[s % a.length]);
        });
        refreshLevels(inst);
    });
    inst.els.dlist.addEventListener("change", () => {
        const arr = inst.els.dlist.value.split(",")
            .map(s => parseInt(s.trim(), 10)).filter(v => !isNaN(v));
        if (arr.length === 0) return;
        inst.divs = inst.word.map((_, i) => clampDiv(arr[i % arr.length]));
        refreshDivs(inst);
    });
});

function setBpm(v) {
    bpm = v;
    document.getElementById("gbpm").value = v;
    insts.forEach(updateMeta);
    updateGlobalMeta();
}

document.getElementById("gbpm").addEventListener("input", ev => {
    const v = parseFloat(ev.target.value);
    if (v > 0) setBpm(v);
});

function updateGlobalMeta() {
    document.getElementById("gmeta").textContent =
        "1 サイクル = " + (60 / bpm).toFixed(3) + " 秒";
}

function clampLv(v) {
    return Math.max(0, Math.min(MAX_LEVEL, Math.round(v * 100) / 100));
}

function clampDiv(v) {
    v = Math.round(v);
    if (!Number.isFinite(v)) return 1;
    return Math.max(1, Math.min(MAX_DIV, v));
}

function fmt(v) { return v.toFixed(2).replace(/0$/, "").replace(/\.$/, ".0"); }

function sized(arr, n) {
    const out = [];
    const fallback = arr && arr.length > 0 ? arr[arr.length - 1] : 1.0;
    for (let s = 0; s < n; s++) out.push(arr && s < arr.length ? arr[s] : fallback);
    return out;
}

function parseLevelList(text) {
    return text.split(",")
        .map(tok => tok.split("/").map(s => parseFloat(s.trim())).filter(v => !isNaN(v)).map(clampLv))
        .filter(a => a.length > 0);
}

function levelsText(inst) {
    return inst.levels.map(a =>
        a.every(x => x === a[0]) ? fmt(a[0]) : a.map(fmt).join("/")
    ).join(", ");
}

function writeLists(inst) {
    const e = inst.els;
    if (document.activeElement !== e.list) e.list.value = levelsText(inst);
    if (document.activeElement !== e.dlist) e.dlist.value = inst.divs.join(", ");
}

function computeHits(inst) {
    const hs = [], hd = [], hn = [], hl = [];
    inst.starts.forEach((st, i) => {
        const n = inst.divs[i];
        const d = inst.durs[i];
        for (let r = 0; r < n; r++) {
            hs.push(st + d * r / n);
            hd.push(d / n);
            hn.push(i);
            hl.push(r);
        }
    });
    inst.hs = hs; inst.hd = hd; inst.hn = hn; inst.hl = hl;
    inst.dirty = true;
}

function rebuild(inst) {
    const e = inst.els;
    e.err.textContent = "";
    e.legend.innerHTML = "";
    const cs = e.cs.value.split(",").map(s => parseInt(s.trim(), 10));
    const N = parseInt(e.order.value, 10);
    inst.valid = false;
    inst.dirty = true;

    if (cs.length === 0 || cs.some(c => !Number.isInteger(c) || c < 0) ||
        cs.every(c => c === 0)) {
        e.err.textContent = "係数は 0 以上の整数をカンマ区切りで入力してください";
        return;
    }
    if (!(N >= 0 && N <= 10)) {
        e.err.textContent = "order は 0〜10 の範囲で指定してください";
        return;
    }
    const m = cs.length;
    const word = wordOf(cs, N);
    if (word.length > MAX_NOTES) {
        e.err.textContent = "音数が多すぎます(" + word.length + " > " + MAX_NOTES + ")。order を下げてください";
        return;
    }
    const alpha = alphaOf(cs);
    const ks = word.map(j => N + j);
    const durs = ks.map(k => Math.pow(alpha, -k));
    const sum = durs.reduce((a, b) => a + b, 0);
    const norm = durs.map(d => d / sum);
    const starts = [];
    let acc = 0;
    norm.forEach(d => { starts.push(acc); acc += d; });

    const oldL = inst.levels;
    const oldD = inst.divs;
    inst.levels = word.map((_, i) => (i < oldL.length ? oldL[i] : [1.0]));
    inst.divs = word.map((_, i) => (i < oldD.length ? oldD[i] : 1));
    inst.word = word; inst.durs = norm; inst.starts = starts; inst.ks = ks;
    inst.alpha = alpha; inst.m = m; inst.N = N; inst.sum = sum;
    inst.kt = buildKT(ks);
    inst.valid = true;
    inst.sel = -1;
    inst.subSel = -1;

    // legend: one swatch per exponent that actually occurs
    Array.from(inst.kt.keys()).forEach(k => {
        const s = document.createElement("span");
        const sw = document.createElement("i");
        sw.style.background = pastelCss(inst.kt.get(k));
        s.appendChild(sw);
        s.appendChild(document.createTextNode("k=" + k));
        e.legend.appendChild(s);
    });

    e.bars.querySelectorAll(".blk").forEach(b => b.remove());
    e.blocks = []; e.subdivs = []; e.subs = []; e.fills = []; e.vals = [];

    word.forEach((j, i) => {
        const b = document.createElement("div");
        b.className = "blk";
        b.style.width = (norm[i] * 100) + "%";
        b.style.flex = "none";
        const subsBox = document.createElement("div");
        subsBox.className = "subs";
        const kk = document.createElement("div");
        kk.className = "k"; kk.textContent = ks[i];
        b.appendChild(subsBox); b.appendChild(kk);
        e.bars.insertBefore(b, e.scan);
        e.blocks.push(b); e.subdivs.push(subsBox);
        e.subs.push([]); e.fills.push([]); e.vals.push([]);
        attachDrag(inst, b, i);
    });

    refreshDivs(inst);
    refreshLevels(inst);
}

function buildSubs(inst, i) {
    const e = inst.els;
    const n = inst.divs[i];
    const box = e.subdivs[i];
    box.innerHTML = "";
    const col = pastelCss(inst.kt.get(inst.ks[i]));
    const subs = [], fills = [], vals = [];
    for (let s = 0; s < n; s++) {
        const el = document.createElement("div");
        el.className = "sub";
        const f = document.createElement("div");
        f.className = "fill";
        f.style.background = col;
        const v = document.createElement("div");
        v.className = "v";
        el.appendChild(f); el.appendChild(v);
        box.appendChild(el);
        subs.push(el); fills.push(f); vals.push(v);
    }
    e.subs[i] = subs; e.fills[i] = fills; e.vals[i] = vals;
}

function updateMeta(inst) {
    if (!inst.valid) { inst.els.meta.textContent = ""; return; }
    inst.els.meta.innerHTML =
        "α = " + inst.alpha.toFixed(6) + " / 音数: " + inst.word.length +
        " / 総発音数: " + inst.hs.length +
        " / 1 サイクル = " + (60 / bpm).toFixed(3) + " 秒 (全音符 " + bpm + " BPM)";
}

function refreshLevels(inst) {
    inst.levels.forEach((_, i) => paintBlock(inst, i));
    writeLists(inst);
    updateSel(inst);
}

// after inst.divs changed: resize levels, rebuild sub elements, regenerate hits
function refreshDivs(inst) {
    inst.levels = inst.levels.map((a, i) => sized(a, inst.divs[i]));
    inst.divs.forEach((_, i) => {
        buildSubs(inst, i);
        paintBlock(inst, i);
    });
    if (inst.sel >= 0 && inst.sel < inst.divs.length &&
        inst.subSel >= inst.divs[inst.sel]) {
        inst.subSel = inst.divs[inst.sel] - 1;
    }
    writeLists(inst);
    computeHits(inst);
    updateMeta(inst);
    updateSel(inst);
}

function paintBlock(inst, i) {
    const e = inst.els;
    const n = inst.divs[i];
    const showTxt = inst.durs[i] / n > 0.03;
    inst.levels[i].forEach((v, s) => {
        const top = 100 - Math.min(100, v / MAX_LEVEL * 100);
        e.fills[i][s].style.clipPath = "inset(" + top + "% 0 0 0)";
        e.vals[i][s].textContent = showTxt ? fmt(v) : "";
    });
}

function updateSel(inst) {
    const e = inst.els;
    e.subs.forEach((arr, i) => arr.forEach((el, s) =>
        el.classList.toggle("sel", i === inst.sel && s === inst.subSel)));
    if (inst.sel >= 0 && inst.sel < inst.levels.length &&
        inst.subSel >= 0 && inst.subSel < inst.levels[inst.sel].length) {
        const n = inst.divs[inst.sel];
        e.selinfo.textContent = "選択中: #" + inst.sel +
            (n > 1 ? "-" + (inst.subSel + 1) + "/" + n : "") +
            " (指数 k=" + inst.ks[inst.sel] + ")";
        e.selval.disabled = false;
        e.seldiv.disabled = false;
        if (document.activeElement !== e.selval) e.selval.value = inst.levels[inst.sel][inst.subSel];
        if (document.activeElement !== e.seldiv) e.seldiv.value = n;
    } else {
        e.selinfo.textContent = "選択中: なし";
        e.selval.disabled = true;
        e.selval.value = "";
        e.seldiv.disabled = true;
        e.seldiv.value = "";
    }
}

function setLevel(inst, i, s, v, fromInput) {
    inst.levels[i][s] = clampLv(v);
    paintBlock(inst, i);
    const e = inst.els;
    if (document.activeElement !== e.list) e.list.value = levelsText(inst);
    if (!fromInput && document.activeElement !== e.selval &&
        inst.sel === i && inst.subSel === s) {
        e.selval.value = inst.levels[i][s];
    }
}

function setDiv(inst, i, v, fromInput) {
    const n = clampDiv(v);
    inst.divs[i] = n;
    inst.levels[i] = sized(inst.levels[i], n);
    buildSubs(inst, i);
    paintBlock(inst, i);
    if (inst.sel === i && inst.subSel >= n) inst.subSel = n - 1;
    writeLists(inst);
    computeHits(inst);
    updateMeta(inst);
    updateSel(inst);
}

function attachDrag(inst, b, i) {
    let dragging = false;
    let cur = 0;
    const apply = ev => {
        const r = b.getBoundingClientRect();
        const t = (r.bottom - ev.clientY) / r.height;
        setLevel(inst, i, cur, Math.round(t * MAX_LEVEL / 0.05) * 0.05, false);
    };
    b.addEventListener("pointerdown", ev => {
        dragging = true;
        b.setPointerCapture(ev.pointerId);
        const r = b.getBoundingClientRect();
        const n = inst.divs[i];
        cur = Math.max(0, Math.min(n - 1, Math.floor((ev.clientX - r.left) / r.width * n)));
        inst.sel = i;
        inst.subSel = cur;
        updateSel(inst);
        apply(ev);
        ev.preventDefault();
    });
    b.addEventListener("pointermove", ev => { if (dragging) apply(ev); });
    const end = ev => { dragging = false; };
    b.addEventListener("pointerup", end);
    b.addEventListener("pointercancel", end);
}

// ---------- audio state & mixing ----------
let ctx = null, noiseBuf = null, playing = false, timer = null;
let drumBus = null;
let instBus = {};       // id -> GainNode (per-instrument channel)
let masterGain = null;
let masterVol = 0.8;
let curBus = null;      // output destination while playDrum is running

function setVol(inst, v) {
    if (!Number.isFinite(v)) return;
    inst.vol = Math.max(0, Math.min(2, v));
    inst.els.vol.value = inst.vol;
    inst.els.volv.textContent = Math.round(inst.vol * 100) + "%";
    if (ctx && instBus[inst.id]) {
        instBus[inst.id].gain.setTargetAtTime(inst.vol, ctx.currentTime, 0.01);
    }
}

function setMasterVol(v) {
    if (!Number.isFinite(v)) return;
    masterVol = Math.max(0, Math.min(2, v));
    document.getElementById("mastervol").value = masterVol;
    document.getElementById("mastervolv").textContent = Math.round(masterVol * 100) + "%";
    if (ctx && masterGain) {
        masterGain.gain.setTargetAtTime(masterVol, ctx.currentTime, 0.01);
    }
}

document.getElementById("mastervol").addEventListener("input", ev => {
    setMasterVol(parseFloat(ev.target.value));
});

// ---------- save / load ----------
function showMsg(text, isErr) {
    const m = document.getElementById("ioMsg");
    m.textContent = text;
    m.style.color = isErr ? "#c00" : "#070";
}

function buildSave() {
    const data = { format: "fibrhythm", version: 1, bpm: bpm, master: masterVol, instruments: {} };
    insts.forEach(inst => {
        const cs = inst.els.cs.value.split(",")
            .map(s => parseInt(s.trim(), 10)).filter(v => Number.isInteger(v));
        data.instruments[inst.id] = {
            cs: cs,
            order: parseInt(inst.els.order.value, 10),
            mute: inst.mute,
            vol: inst.vol,
            divs: inst.divs.slice(),
            levels: inst.levels.map(a => a.slice())
        };
    });
    return JSON.stringify(data, null, 2);
}

document.getElementById("saveBtn").addEventListener("click", () => {
    const blob = new Blob([buildSave()], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "fibrhythm-save.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    showMsg("保存しました", false);
});

document.getElementById("loadBtn").addEventListener("click", () => {
    document.getElementById("loadFile").click();
});

document.getElementById("loadFile").addEventListener("change", ev => {
    const file = ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            applySave(JSON.parse(reader.result));
        } catch (err) {
            showMsg("読み込みに失敗しました: " + err.message, true);
        }
        ev.target.value = "";
    };
    reader.onerror = () => showMsg("ファイルを読めませんでした", true);
    reader.readAsText(file);
});

function applySave(data) {
    if (!data || data.format !== "fibrhythm" || typeof data.instruments !== "object") {
        throw new Error("形式が正しくありません");
    }
    const isNum = v => typeof v === "number" && !isNaN(v);
    // validate everything first so a bad file changes nothing
    const plans = [];
    insts.forEach(inst => {
        const d = data.instruments[inst.id];
        if (!d) return;
        if (!Array.isArray(d.cs) || d.cs.length === 0 ||
            d.cs.some(c => !Number.isInteger(c) || c < 0) || d.cs.every(c => c === 0)) {
            throw new Error(inst.label + ": 係数配列が不正です");
        }
        if (!Number.isInteger(d.order) || d.order < 0 || d.order > 10) {
            throw new Error(inst.label + ": order が不正です");
        }
        if (d.vol !== undefined && !(typeof d.vol === "number" && d.vol >= 0 && d.vol <= 2)) {
            throw new Error(inst.label + ": 音量が不正です");
        }
        // levels: each entry is a number (old format) or a non-empty array of numbers
        if (d.levels !== undefined &&
            (!Array.isArray(d.levels) ||
                d.levels.some(v => !(isNum(v) ||
                    (Array.isArray(v) && v.length > 0 && v.every(isNum)))))) {
            throw new Error(inst.label + ": 強さの配列が不正です");
        }
        if (d.divs !== undefined &&
            (!Array.isArray(d.divs) ||
                d.divs.some(v => !Number.isInteger(v) || v < 1 || v > MAX_DIV))) {
            throw new Error(inst.label + ": 分割数の配列が不正です(1〜" + MAX_DIV + " の整数)");
        }
        if (wordOf(d.cs, d.order).length > MAX_NOTES) {
            throw new Error(inst.label + ": 音数が多すぎます");
        }
        plans.push({ inst: inst, d: d });
    });
    if (data.bpm !== undefined && !(typeof data.bpm === "number" && data.bpm > 0)) {
        throw new Error("BPM が不正です");
    }
    if (data.master !== undefined && !(typeof data.master === "number" && data.master >= 0)) {
        throw new Error("マスター音量が不正です");
    }

    if (data.bpm !== undefined) setBpm(data.bpm);
    if (data.master !== undefined) setMasterVol(data.master);
    plans.forEach(p => {
        const inst = p.inst, d = p.d;
        inst.els.cs.value = d.cs.join(",");
        inst.els.order.value = d.order;
        inst.mute = !!d.mute;
        inst.els.mute.checked = inst.mute;
        setVol(inst, d.vol !== undefined ? d.vol : 1.0);
        inst.levels = [];
        inst.divs = [];
        rebuild(inst);
        // divisions first, so that level arrays have the right lengths
        if (d.divs && d.divs.length > 0) {
            inst.divs = inst.word.map((_, i) => clampDiv(d.divs[i % d.divs.length]));
            refreshDivs(inst);
        }
        if (d.levels && d.levels.length > 0) {
            inst.levels = inst.word.map((_, i) => {
                const ent = d.levels[i % d.levels.length];
                const n = inst.divs[i];
                return Array.from({ length: n }, (_, s) =>
                    clampLv(Array.isArray(ent) ? ent[s % ent.length] : ent));
            });
            refreshLevels(inst);
        }
    });
    showMsg("読み込みました(" + plans.length + " 楽器)", false);
}

// ---------- audio engine ----------
function makeImpulse(sec, decayPow) {
    const len = Math.floor(ctx.sampleRate * sec);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < len; i++) {
            d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decayPow);
        }
    }
    return buf;
}

function initAudio() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    // noise buffer (2 s)
    const len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    // master chain: bus -> compressor -> soft clip -> master -> out
    drumBus = ctx.createGain();

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 12;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.15;

    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) {
        const x = i / (curve.length - 1) * 2 - 1;
        curve[i] = Math.tanh(1.5 * x) / Math.tanh(1.5);
    }
    shaper.curve = curve;

    masterGain = ctx.createGain();
    masterGain.gain.value = masterVol;

    drumBus.connect(comp);
    comp.connect(shaper);
    shaper.connect(masterGain);
    masterGain.connect(ctx.destination);

    // small room reverb
    const conv = ctx.createConvolver();
    conv.buffer = makeImpulse(0.45, 3);
    const wet = ctx.createGain();
    wet.gain.value = 0.12;
    drumBus.connect(conv);
    conv.connect(wet);
    wet.connect(comp);

    // per-instrument channel strips
    insts.forEach(inst => {
        const g = ctx.createGain();
        g.gain.value = inst.vol;
        g.connect(drumBus);
        instBus[inst.id] = g;
    });
}

// ---------- helpers ----------
function env(g, t, peak, decay) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(Math.max(peak, 0.0002), t + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
}

function noise(t, filterType, freq, q, peak, decay, dest) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    env(g, t, peak, decay);
    src.connect(f); f.connect(g); g.connect(dest || curBus);
    src.start(t, Math.random() * 0.9);
    src.stop(t + decay + 0.02);
}

function tone(t, type, f0, f1, tf, peak, decay, dest) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + tf);
    env(g, t, peak, decay);
    o.connect(g); g.connect(dest || curBus);
    o.start(t); o.stop(t + decay + 0.03);
}

// ---------- drums ----------
function playDrum(id, t, level) {
    curBus = instBus[id];

    // humanize: slight random pitch / amplitude fluctuation
    const hz = 1 + (Math.random() - 0.5) * 0.02;
    const a = level * (1 + (Math.random() - 0.5) * 0.06);
    const vel = Math.min(1, level / 1.0);   // 0..1 for timbre control

    if (id === "bd") {
        // body: fast pitch drop then slow tail
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        const f0 = (110 + 70 * vel) * hz;
        o.frequency.setValueAtTime(f0, t);
        o.frequency.exponentialRampToValueAtTime(58 * hz, t + 0.035);
        o.frequency.exponentialRampToValueAtTime(42 * hz, t + 0.35);
        env(g, t, 0.95 * a, 0.45);
        o.connect(g); g.connect(curBus);
        o.start(t); o.stop(t + 0.5);

        // beater click
        noise(t, "bandpass", 2500 + 2500 * vel, 1.0, 0.25 * a * (0.4 + 0.6 * vel), 0.012);
        tone(t, "triangle", 900 * hz, 120, 0.012, 0.2 * a, 0.02);
    } else if (id === "sn") {
        // shell resonances
        tone(t, "triangle", 190 * hz, 165 * hz, 0.06, 0.38 * a, 0.12);
        tone(t, "sine", 335 * hz, 290 * hz, 0.05, 0.2 * a, 0.08);

        // snare wires
        noise(t, "highpass", 1500 + 1200 * vel, 0.7, 0.5 * a, 0.18 + 0.06 * vel);
        noise(t, "bandpass", 5000, 1.0, 0.25 * a, 0.14);

        // stick attack
        noise(t, "bandpass", 1800, 0.8, 0.3 * a, 0.012);
    } else {
        // closed hi-hat: inharmonic square oscillators (metallic) + noise
        const ratios = [2, 3, 4.16, 5.43, 6.79, 8.21];
        const base = 205.3 * hz;
        const decay = 0.045 + 0.04 * vel;
        const mix = ctx.createGain();
        mix.gain.value = 1 / ratios.length;
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass"; bp.frequency.value = 10000; bp.Q.value = 0.6;
        const hp = ctx.createBiquadFilter();
        hp.type = "highpass"; hp.frequency.value = 7000;
        const g = ctx.createGain();
        env(g, t, 0.45 * a, decay);
        mix.connect(bp); bp.connect(hp); hp.connect(g); g.connect(curBus);
        ratios.forEach(r => {
            const o = ctx.createOscillator();
            o.type = "square";
            o.frequency.value = base * r;
            o.connect(mix);
            o.start(t); o.stop(t + decay + 0.03);
        });
        noise(t, "highpass", 8500, 0.8, 0.15 * a, decay * 0.8);
    }
}

// ---------- scheduler ----------
let cycles = [];
let cycBase = 0;

function getCyc(c) {
    while (cycles.length <= c - cycBase) {
        const last = cycles[cycles.length - 1];
        cycles.push({ s: last.s + last.T, T: 60 / bpm });
    }
    return cycles[c - cycBase];
}

const LOOKAHEAD = 0.15;

function resync(inst, now) {
    let c = Math.max(inst.c, cycBase);
    while (getCyc(c).s + getCyc(c).T <= now) c++;
    const ci = getCyc(c);
    let idx = inst.hs.findIndex(st => ci.s + st * ci.T >= now);
    if (idx < 0) { idx = 0; c++; }
    inst.c = c; inst.idx = idx; inst.dirty = false;
}

function tick() {
    const now = ctx.currentTime;
    insts.forEach(inst => {
        if (!inst.valid) return;
        if (inst.dirty) resync(inst, now);
        const n = inst.hs.length;
        while (true) {
            if (inst.idx >= n) { inst.idx = 0; inst.c++; }
            const ci = getCyc(inst.c);
            const i = inst.idx;
            const time = ci.s + inst.hs[i] * ci.T;
            if (time >= now + LOOKAHEAD) break;
            const len = inst.hd[i] * ci.T;
            const row = inst.levels[inst.hn[i]];
            const lv = row ? (row[inst.hl[i]] || 0) : 0;
            if (lv > 0 && !inst.mute && time >= now - 0.01) playDrum(inst.id, time, lv);
            inst.events.push({ t: time, len: len, f0: inst.hs[i], fl: inst.hd[i] });
            inst.idx++;
        }
    });
    const minC = Math.min.apply(null, insts.map(i => i.c));
    while (cycles.length > 2 && cycBase < minC - 1) { cycles.shift(); cycBase++; }
}

function frame() {
    if (!playing) return;
    const now = ctx.currentTime;
    insts.forEach(inst => {
        const sc = inst.els.scan;
        const ev = inst.events;
        while (ev.length > 1 && ev[1].t <= now) ev.shift();
        if (!inst.valid || ev.length === 0 || ev[0].t > now) return;
        const e = ev[0];
        const p = e.f0 + Math.min(1, (now - e.t) / e.len) * e.fl;
        sc.style.left = (p * 100) + "%";
    });
    requestAnimationFrame(frame);
}

function start() {
    initAudio();
    ctx.resume();
    const t0 = ctx.currentTime + 0.1;
    cycles = [{ s: t0, T: 60 / bpm }];
    cycBase = 0;
    insts.forEach(inst => {
        inst.idx = 0; inst.c = 0; inst.dirty = false; inst.events = [];
        inst.els.scan.style.display = "block";
        inst.els.scan.style.left = "0%";
    });
    playing = true;
    timer = setInterval(tick, 25);
    tick();
    requestAnimationFrame(frame);
    document.getElementById("playBtn").textContent = "■ 停止";
}

function stop() {
    playing = false;
    clearInterval(timer);
    insts.forEach(inst => { inst.els.scan.style.display = "none"; inst.events = []; });
    document.getElementById("playBtn").textContent = "▶ 再生";
}

document.getElementById("playBtn").addEventListener("click", () => {
    if (playing) stop(); else start();
});

// ---------- init ----------
insts.forEach(rebuild);
updateGlobalMeta();