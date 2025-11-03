// ==UserScript==
// @name         YouTube Force Desktop + Max Quality + DL + PiP + FS + AdBlock
// @namespace    spyboy
// @version      9.0
// @description  Force desktop URLs, auto max quality, floating DL (cobalt), PiP, Fullscreen, adblock, background play.
// @match        *://*.youtube.com/*
// @match        *://youtu.be/*
// @match        *://m.youtube.com/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  /* ---------------------- URL utils & enforcement ---------------------- */
  function makeDesktopWatchUrl(input) {
    try {
      const url = new URL(input, location.origin);
      // handle short youtu.be
      if (url.hostname.includes("youtu.be")) {
        const vid = url.pathname.split("/").filter(Boolean)[0];
        if (vid) return `https://www.youtube.com/watch?app=desktop&v=${vid}`;
      }
      // normalize youtube host -> www.youtube.com
      if (url.hostname.endsWith("youtube.com") || url.hostname.includes("youtube")) {
        const out = new URL("https://www.youtube.com" + (url.pathname || "/"));
        // if there's a v param or path containing watch
        const v = url.searchParams.get("v") || (url.pathname === "/watch" ? url.searchParams.get("v") : null);
        // sometimes yt uses /watch but v absent (rare). Only set v if present
        if (v) out.searchParams.set("v", v);
        // ensure app=desktop
        if (!out.searchParams.get("app")) out.searchParams.set("app", "desktop");
        // keep playlist if present
        if (url.searchParams.get("list")) out.searchParams.set("list", url.searchParams.get("list"));
        return out.toString();
      }
      return url.toString();
    } catch (e) {
      return String(input);
    }
  }

  function enforceLocationIfNeeded() {
    try {
      const cur = location.href;
      const forced = makeDesktopWatchUrl(cur);
      // don't redirect if identical
      if (forced && forced !== cur) location.replace(forced);
    } catch (e) {}
  }

  // initial enforcement for direct loads (m.youtube.com, youtu.be)
  (function initialRedirect() {
    try {
      const host = location.hostname;
      if (host.includes("m.youtube.com") || host.includes("youtu.be") || (location.pathname === "/watch" && new URL(location.href).searchParams.get("app") !== "desktop")) {
        const forced = makeDesktopWatchUrl(location.href);
        if (forced && forced !== location.href) location.replace(forced);
      }
    } catch (e) {}
  })();

  /* ---------------------- SPA nav interception & anchor rewriting ---------------------- */
  // intercept clicks
  document.addEventListener("click", (ev) => {
    try {
      const a = ev.target.closest && ev.target.closest("a");
      if (!a || !a.href) return;
      if (/youtube\.com|youtu\.be/.test(a.href)) {
        ev.preventDefault();
        const forced = makeDesktopWatchUrl(a.href);
        if (a.target === "_blank" || ev.ctrlKey || ev.metaKey || ev.shiftKey) window.open(forced, "_blank");
        else location.assign(forced);
      }
    } catch (e) {}
  }, true);

  // rewrite anchors periodically (helps dynamic SPA links)
  function rewriteAnchors() {
    document.querySelectorAll('a[href]').forEach(a => {
      try {
        if (a.dataset._desktopified) return;
        if (/youtube\.com|youtu\.be/.test(a.href)) {
          a.href = makeDesktopWatchUrl(a.href);
          a.dataset._desktopified = "1";
        }
      } catch (e) {}
    });
  }
  setInterval(rewriteAnchors, 1200);

  // override history methods to normalize URLs pushed by SPA
  const _push = history.pushState;
  history.pushState = function (s, t, url) {
    try {
      const forced = makeDesktopWatchUrl(url || location.href);
      return _push.call(this, s, t, forced);
    } catch (e) {
      return _push.call(this, s, t, url);
    }
  };
  const _replace = history.replaceState;
  history.replaceState = function (s, t, url) {
    try {
      const forced = makeDesktopWatchUrl(url || location.href);
      return _replace.call(this, s, t, forced);
    } catch (e) {
      return _replace.call(this, s, t, url);
    }
  };
  window.addEventListener("popstate", () => setTimeout(enforceLocationIfNeeded, 40));

  // detect URL changes by SPA
  let lastHref = location.href;
  setInterval(() => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      setTimeout(enforceLocationIfNeeded, 40);
      onNavigate();
    }
  }, 300);

  /* ---------------------- Floating buttons (PiP, FS) ---------------------- */
  function addFloatingButtons() {
    if (document.getElementById("cobalt-float-container")) return;

    const container = document.createElement("div");
    container.id = "cobalt-float-container";
    container.style.cssText = `
      position: fixed;
      bottom: 16px;
      right: 16px;
      display: flex;
      gap: 10px;
      z-index: 999999;
      pointer-events: auto;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
    `;

    const btnStyle = `
      width: 46px;
      height: 46px;
      background: rgba(0,0,0,0.44);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      color: #fff;
      font-size: 18px;
      font-weight: 700;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 6px 18px rgba(0,0,0,0.45);
      transition: transform 0.12s ease, background 0.12s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    `;

    // New PiP SVG icons
    const pipEnterSVG = `<svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 4v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H10a2 2 0 0 0-2 2z"></path>
      <path d="M4 8h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z"></path>
    </svg>`;
    
    const pipExitSVG = `<svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 4v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H10a2 2 0 0 0-2 2z"></path>
      <path d="M4 8h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z"></path>
      <line x1="4" y1="4" x2="20" y2="20"></line>
    </svg>`;
    
    const fsEnterSVG = `<svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/><path d="M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>`;
    const fsExitSVG = `<svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H5v4"/><path d="M15 3h4v4"/><path d="M9 21H5v-4"/><path d="M15 21h4v-4"/></svg>`;

    // PiP button
    const pipBtn = document.createElement("button");
    pipBtn.id = "cobalt-pip-btn";
    pipBtn.innerHTML = pipEnterSVG;
    pipBtn.style.cssText = btnStyle;
    pipBtn.onmouseenter = () => (pipBtn.style.transform = "scale(1.08)");
    pipBtn.onmouseleave = () => (pipBtn.style.transform = "scale(1)");
    async function updatePipIcon() {
      const video = document.querySelector("video");
      const inStd = !!document.pictureInPictureElement;
      const inWebkit = video && (video.webkitPresentationMode === "picture-in-picture");
      pipBtn.innerHTML = (inStd || inWebkit) ? pipExitSVG : pipEnterSVG;
    }
    pipBtn.onclick = async () => {
      const video = document.querySelector("video");
      if (!video) return alert("No video found");
      try {
        try { video.disablePictureInPicture = false; video.setAttribute("playsinline", ""); video.setAttribute("webkit-playsinline", ""); } catch (e) {}
        if (typeof video.webkitSupportsPresentationMode === "function" && video.webkitSupportsPresentationMode("picture-in-picture")) {
          if (video.webkitPresentationMode !== "picture-in-picture") {
            await video.play().catch(() => {});
            video.webkitSetPresentationMode("picture-in-picture");
          } else {
            video.webkitSetPresentationMode("inline");
          }
          updatePipIcon();
          return;
        }
        if (document.pictureInPictureElement) await document.exitPictureInPicture();
        else { await video.play().catch(() => {}); await video.requestPictureInPicture(); }
        updatePipIcon();
      } catch (err) {
        try { await updatePipIcon(); } catch (e) {}
        alert("PiP not available on this browser/platform");
      }
    };

    // Fullscreen button
    const fsBtn = document.createElement("button");
    fsBtn.id = "cobalt-fs-btn";
    fsBtn.innerHTML = fsEnterSVG;
    fsBtn.style.cssText = btnStyle;
    fsBtn.onmouseenter = () => (fsBtn.style.transform = "scale(1.08)");
    fsBtn.onmouseleave = () => (fsBtn.style.transform = "scale(1)");
    function isAnyFullscreen() {
      return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
    }
    async function updateFsIcon() {
      fsBtn.innerHTML = isAnyFullscreen() ? fsExitSVG : fsEnterSVG;
    }
    fsBtn.onclick = async () => {
      const playerEl = document.querySelector(".html5-video-player") || document.getElementById("movie_player") || document.querySelector("ytd-player") || document.querySelector("video");
      const video = document.querySelector("video");
      try {
        if (isAnyFullscreen()) {
          if (document.exitFullscreen) await document.exitFullscreen();
          else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
          else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
          else if (document.msExitFullscreen) document.msExitFullscreen();
        } else {
          const target = playerEl || video;
          if (!target) return;
          try { await (video?.play?.() || Promise.resolve()); } catch (e) {}
          if (target.requestFullscreen) await target.requestFullscreen();
          else if (target.webkitRequestFullscreen) await target.webkitRequestFullscreen();
          else if (target.mozRequestFullScreen) await target.mozRequestFullScreen();
          else if (target.msRequestFullscreen) await target.msRequestFullscreen();
          else if (video && typeof video.webkitEnterFullscreen === "function") video.webkitEnterFullscreen();
          else if (video && typeof video.webkitSetPresentationMode === "function") video.webkitSetPresentationMode("fullscreen");
        }
      } catch (e) {
        // ignore
      } finally {
        setTimeout(updateFsIcon, 220);
      }
    };

    // sync icons
    document.addEventListener("enterpictureinpicture", updatePipIcon);
    document.addEventListener("leavepictureinpicture", updatePipIcon);
    ["fullscreenchange","webkitfullscreenchange","mozfullscreenchange","msfullscreenchange"].forEach(ev=>{
      document.addEventListener(ev, updateFsIcon, { passive: true });
    });

    container.appendChild(pipBtn);
    container.appendChild(fsBtn);
    document.body.appendChild(container);
    setTimeout(() => { updatePipIcon(); updateFsIcon(); }, 500);
  }

  /* ---------------------- Adblock / remove overlays ---------------------- */
  function removeAdsNow() {
    try {
      document.querySelectorAll(
        "#player-ads, .video-ads, ytd-display-ad-renderer, ytd-promoted-sparkles-web-renderer, ytd-promoted-video-renderer, ytp-ad-module, .ytp-ad-overlay-slot, .ytp-ad-player-overlay"
      ).forEach(el => el.remove());
    } catch (e) {}
  }
  setInterval(removeAdsNow, 600);
  const adObserver = new MutationObserver(removeAdsNow);
  adObserver.observe(document.documentElement, { childList: true, subtree: true });

  /* ---------------------- Force PiP availability + background play ---------------------- */
  function enablePiPOnVideo() {
    const v = document.querySelector("video");
    if (v) {
      try { v.disablePictureInPicture = false; v.setAttribute("playsinline",""); v.setAttribute("webkit-playsinline",""); } catch(e){}
    }
  }
  setInterval(enablePiPOnVideo, 500);

  // background play spoofing
  try {
    Object.defineProperty(document, "hidden", { value: false, writable: false });
    Object.defineProperty(document, "visibilityState", { value: "visible", writable: false });
  } catch (e) {}
  const fakeEvents = ["visibilitychange", "webkitvisibilitychange", "blur"];
  window.addEventListener = new Proxy(window.addEventListener, {
    apply(target, thisArg, args) {
      if (fakeEvents.includes(args[0])) return;
      return Reflect.apply(target, thisArg, args);
    }
  });
  function keepPlaying() {
    const v = document.querySelector("video");
    if (v && v.paused) v.play().catch(()=>{});
  }
  setInterval(keepPlaying, 1000);

  /* ---------------------- Set max quality ---------------------- */
  function setMaxQuality() {
    try {
      // primary: YouTube's player element
      const player = document.getElementById("movie_player");
      if (player && typeof player.getAvailableQualityLevels === "function") {
        const levels = player.getAvailableQualityLevels() || [];
        if (levels.length) {
          // sort by numeric resolution if possible (hd1080 -> 1080)
          const sorted = levels.slice().sort((a,b)=>{
            const na = parseInt((a.match(/\d+/) || [0])[0]) || 0;
            const nb = parseInt((b.match(/\d+/) || [0])[0]) || 0;
            return nb - na;
          });
          const best = sorted[0];
          try { if (typeof player.setPlaybackQualityRange === "function") player.setPlaybackQualityRange(best); } catch(e){}
          try { if (typeof player.setPlaybackQuality === "function") player.setPlaybackQuality(best); } catch(e){}
          try { if (typeof player.playVideo === "function") player.playVideo(); } catch(e){}
          return;
        }
      }
      // fallback: sometimes yt uses window.ytplayer
      if (window.ytplayer && window.ytplayer.config && window.ytplayer.config.args && window.ytplayer.config.args.player_response) {
        // can't easily set quality here reliably; skip fallback
      }
    } catch (e) {}
  }

  // call setMaxQuality on navigation + when video appears
  function onNavigate() {
    // ensure buttons exist
    addFloatingButtons();
    // small repeated attempts to set quality while the player initializes
    for (let i=0;i<6;i++){
      setTimeout(setMaxQuality, 400 * (i+1));
    }
  }
  // listen to YouTube SPA event if present
  window.addEventListener("yt-navigate-finish", onNavigate);
  // initial run
  onNavigate();

  // monitor for appended video player nodes and re-apply
  const vidObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const n of m.addedNodes) {
        if (!(n instanceof Element)) continue;
        if (n.querySelector && (n.querySelector("video") || n.id === "movie_player")) {
          onNavigate();
          return;
        }
      }
    }
  });
  vidObserver.observe(document.documentElement, { childList: true, subtree: true });

  // initial anchor rewrite + add buttons if body ready
  const boot = () => { rewriteAnchors(); addFloatingButtons(); removeAdsNow(); enablePiPOnVideo(); onNavigate(); };
  if (document.readyState === "complete" || document.readyState === "interactive") boot();
  else document.addEventListener("DOMContentLoaded", boot);

})();