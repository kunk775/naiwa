/* 问题门禁：顶替 MetaH5Ad 广告 SDK
 * 游戏在死亡后点击「重闯」时会调用 window.MetaH5Ad.showAd，
 * 我们在这里换成「你是猪吗？」的问答，答「是」才回调奖励状态。 */
(function () {
  "use strict";
  if (window.MetaH5Ad) return;

  // ===== 想改问题就改这里 =====
  var CONF = window.PIG_QUIZ || {};
  var QUESTION = CONF.question || "你是猪吗？";
  var SUBHINT = CONF.subhint || "回答「是」才能按当前进度继续";
  var YES_TEXT = CONF.yes || "是";
  var NO_TEXT = CONF.no || "不是";
  // ===========================

  var CSS = [
    "#pq-mask{position:fixed;inset:0;z-index:2147483000;display:none;place-items:center;",
    "background:rgba(8,5,16,.78);backdrop-filter:blur(3px);font-family:'Microsoft YaHei','PingFang SC',system-ui,sans-serif}",
    "#pq-mask.on{display:grid}",
    "#pq-card{width:min(420px,86vw);padding:30px 28px 24px;border-radius:20px;text-align:center;",
    "background:linear-gradient(180deg,#2b2040,#1d1630);border:1px solid rgba(255,209,102,.28);",
    "box-shadow:0 30px 80px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.06);",
    "animation:pq-in .22s cubic-bezier(.2,.9,.3,1.2)}",
    "@keyframes pq-in{from{transform:scale(.9) translateY(12px);opacity:0}to{transform:none;opacity:1}}",
    "#pq-card .pq-emoji{font-size:40px;line-height:1}",
    "#pq-card h2{margin:14px 0 6px;font-size:24px;color:#ffe9c4;letter-spacing:.02em}",
    "#pq-card p{margin:0 0 22px;font-size:13px;color:rgba(255,255,255,.5)}",
    "#pq-btns{display:flex;gap:12px}",
    "#pq-btns button{flex:1;padding:13px 0;border-radius:12px;font-size:16px;font-weight:700;",
    "font-family:inherit;cursor:pointer;border:1px solid transparent;transition:transform .1s,filter .15s}",
    "#pq-btns button:active{transform:scale(.97)}",
    "#pq-yes{background:linear-gradient(180deg,#ffd978,#f0b93c);color:#2a1c08}",
    "#pq-yes:hover{filter:brightness(1.08)}",
    "#pq-no{background:rgba(255,255,255,.06);color:rgba(255,255,255,.72);border-color:rgba(255,255,255,.14)}",
    "#pq-no:hover{background:rgba(255,255,255,.1)}",
    "#pq-hint{margin-top:16px;font-size:11px;color:rgba(255,255,255,.32)}",
  ].join("");

  var mask = null;

  function build() {
    var style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    mask = document.createElement("div");
    mask.id = "pq-mask";
    mask.setAttribute("role", "dialog");
    mask.setAttribute("aria-modal", "true");
    mask.innerHTML =
      '<div id="pq-card">' +
      '<div class="pq-emoji">🐸</div>' +
      "<h2>" + QUESTION + "</h2>" +
      "<p>" + SUBHINT + "</p>" +
      '<div id="pq-btns">' +
      '<button id="pq-yes" type="button">' + YES_TEXT + "</button>" +
      '<button id="pq-no" type="button">' + NO_TEXT + "</button>" +
      "</div>" +
      '<div id="pq-hint">Enter 选「' + YES_TEXT + "」 · Esc 选「" + NO_TEXT + "」</div>" +
      "</div>";
    document.body.appendChild(mask);
  }

  var pending = null;
  var answered = false;

  function close() {
    if (mask) mask.classList.remove("on");
  }

  function finish(ok) {
    if (answered) return;
    answered = true;
    var cb = pending;
    pending = null;
    close();
    setTimeout(function () {
      if (typeof cb !== "function") return;
      // code:0 + data.status:4 = REWARDED，游戏据此解锁「按当前进度重闯」
      cb(ok ? { code: 0, data: { status: 4 } } : { code: 0, data: { status: 1 } });
      if (ok) autoContinue();
    }, 220);
  }

  // 答对后自动点一下游戏自己的「重闯本关」按钮（失败也不影响，手动点即可）
  function autoContinue() {
    setTimeout(function () {
      var btn = document.querySelector('[data-action="retry"]');
      if (btn && !btn.disabled) btn.click();
    }, 520);
  }

  function ask(cb) {
    if (!mask) build();
    // 已经有一个问题在显示：不叠层，直接按「未通过」回掉
    if (mask.classList.contains("on")) {
      if (typeof cb === "function") cb({ code: 0, data: { status: 1 } });
      return;
    }
    pending = cb;
    answered = false;
    mask.classList.add("on");
    var yes = document.getElementById("pq-yes");
    if (yes) yes.focus();
  }

  function onKey(e) {
    if (!mask || !mask.classList.contains("on")) return;
    if (e.key === "Enter") { e.preventDefault(); finish(true); }
    else if (e.key === "Escape") { e.preventDefault(); finish(false); }
  }

  document.addEventListener("keydown", onKey, true);

  window.MetaH5Ad = {
    // 游戏先问「是否支持激励视频」，这里直接说支持
    isAdSupport: function (type, cb) {
      setTimeout(function () { if (typeof cb === "function") cb({ code: 0, data: 1 }); }, 80);
    },
    // 真正被调用的地方：换成问答
    showAd: function (type, cb) { ask(cb); },
    init: function () {},
  };

  document.addEventListener("DOMContentLoaded", function () {
    if (mask) return;
    // 预建 DOM，避免首次点击时闪一下
    if (document.body) build();
  });
  if (document.readyState !== "loading" && document.body && !mask) build();

  // 点击按钮绑定（用事件委托，避免重建时丢绑定）
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || !t.id) return;
    if (t.id === "pq-yes") { e.preventDefault(); finish(true); }
    else if (t.id === "pq-no") { e.preventDefault(); finish(false); }
  });
})();
