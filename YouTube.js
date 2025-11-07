// ==UserScript==
// @name         YouTube Enhancer
// @author       Spyboy
// @namespace    https://t.me/SPYxTube
// @version      1.1
// @description  Desktop player; QC; PiP; FS; autoplay/auto-next; background play; ad removal.
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @updateURL    https://github.com/IM-SPYBOY/YouTube-Enhancer/blob/main/YouTube.js
// @match        *://*.youtube.com/*
// @match        *://www.youtube.com/*
// @match        *://m.youtube.com/*
// @match        *://youtu.be/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
  "use strict";

  /* ===== Desktop UA + app=desktop enforce ===== */
  (function () {
    try {
      const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36";
      const set = (o,k,v)=>{ try{ Object.defineProperty(o,k,{configurable:true,get:()=>v}); }catch{} };
      set(navigator,"userAgent",ua);
      set(navigator,"platform","MacIntel");
      set(navigator,"maxTouchPoints",0);
      if ("userAgentData" in navigator) {
        const fake = new Proxy(navigator.userAgentData,{ get(t,p){ if(p==="mobile") return false; return Reflect.get(t,p); }});
        Object.defineProperty(navigator,"userAgentData",{configurable:true,get:()=>fake});
      }
    } catch {}
  })();

  const isYT = (h)=> /\byoutube\.com$/.test(h) || h.includes("youtube") || h.includes("youtu.be");

  function ensureDesktop(){
    try{
      const u = new URL(location.href);
      let changed = false;
      if (u.hostname !== "www.youtube.com") { u.hostname = "www.youtube.com"; changed = true; }
      if (u.searchParams.get("app") !== "desktop") { u.searchParams.set("app", "desktop"); changed = true; }
      if (!changed) return;
      try { history.replaceState(history.state,"",u.toString()); } catch { location.replace(u.toString()); }
    }catch{}
  }

  (function(){
    const _push=history.pushState, _replace=history.replaceState;
    history.pushState=function(s,t,url){ try{
      if (url){ const u=new URL(url,location.href); if (isYT(u.hostname)){ u.hostname="www.youtube.com"; u.searchParams.set("app","desktop"); return _push.call(this,s,t,u.toString()); } }
    }catch{} return _push.call(this,s,t,url); };
    history.replaceState=function(s,t,url){ try{
      if (url){ const u=new URL(url,location.href); if (isYT(u.hostname)){ u.hostname="www.youtube.com"; u.searchParams.set("app","desktop"); return _replace.call(this,s,t,u.toString()); } }
    }catch{} return _replace.call(this,s,t,url); };
    ["popstate","yt-navigate-start","yt-navigate-finish"].forEach(ev=>window.addEventListener(ev, ensureDesktop, {passive:true}));
    setInterval(ensureDesktop, 1500);
  })();

  function rewriteAnchors(){
    try{
      document.querySelectorAll("a[href]").forEach(a=>{
        try{
          if (a.dataset._desktopified) return;
          const u=new URL(a.href, location.href);
          if (isYT(u.hostname)){ u.hostname="www.youtube.com"; u.searchParams.set("app","desktop"); a.href=u.toString(); a.dataset._desktopified="1"; }
        }catch{}
      });
    }catch{}
  }
  new MutationObserver(rewriteAnchors).observe(document.documentElement,{childList:true,subtree:true});
  setInterval(rewriteAnchors, 1200);

  /* ===== Helpers / keys ===== */
  const LS_KEY_QUALITY="cobaltPreferredQuality";
  const LS_KEY_STICKY ="cobaltQualitySticky";
  const $v = ()=> document.querySelector("video");
  const $p = ()=> document.getElementById("movie_player") || window.ytplayer?.player || null;
  const getVid = ()=> {
    try {
      const u=new URL(location.href);
      if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2]||"";
      return u.searchParams.get("v") || "";
    } catch { return ""; }
  };

  /* ===== Ad removal (CSS + sweep, silent) ===== */
  (function(){
    try{
      const style=document.createElement("style");
      style.textContent = `
        ytd-enforcement-message-view-model, .ytd-ad-slot-renderer, .ytp-ad-player-overlay,
        #player-ads, .video-ads, .player-ads, ytd-display-ad-renderer,
        ytd-promoted-sparkles-web-renderer, ytd-promoted-video-renderer,
        tp-yt-paper-dialog.ytd-popup-container, ytd-mealbar-promo-renderer { display:none !important; visibility:hidden !important; }
      `;
      document.documentElement.appendChild(style);
    }catch{}
  })();

  function adSweep(){
    try{
      document.querySelectorAll(`
        #player-ads, .video-ads, .player-ads,
        ytd-display-ad-renderer, ytd-promoted-sparkles-web-renderer, ytd-promoted-video-renderer,
        .ytd-ad-slot-renderer, .ytp-ad-player-overlay, ytd-enforcement-message-view-model,
        tp-yt-paper-dialog.ytd-popup-container, ytd-mealbar-promo-renderer
      `.replace(/\n/g,"")).forEach(el=>el.remove());
      const skip = document.querySelector('#ytp-ad-skip-button, #ytp-ad-skip-button-modern');
      if (skip) skip.click();
      const player = document.querySelector(".html5-video-player");
      if (player) player.classList.remove("ad-interrupting","ad-showing");
    }catch{}
  }
  setInterval(adSweep, 250);
  new MutationObserver(adSweep).observe(document.documentElement,{childList:true,subtree:true});

  /* ===== Background play spoof ===== */
  try{
    Object.defineProperty(document,"hidden",{get:()=>false});
    Object.defineProperty(document,"visibilityState",{get:()=>"visible"});
  }catch{}
  const blockEv=new Set(["visibilitychange","webkitvisibilitychange","blur"]);
  const _add=window.addEventListener.bind(window);
  window.addEventListener=function(type, ...rest){ if (blockEv.has(type)) return; return _add(type, ...rest); };

  /* ===== Quality control ===== */
  function tokenToPixels(q){
    const map={ tiny:"144p", small:"240p", medium:"360p", large:"480p", hd720:"720p", hd1080:"1080p", hd1440:"1440p", hd2160:"2160p", highres:"2160p" };
    if (map[q]) return map[q];
    const m=q && q.match(/(\d{3,4})/); return m ? (m[1]+"p") : (q||"");
  }

  function getCurrentQualityToken(){
    try { return $p()?.getPlaybackQuality?.() || null; } catch { return null; }
  }

  // NO seeking, NO restoring — zero jitter
  function setQualityToken(q){
    try{
      const p=$p(); if (!p) return;
      if (!q || q==="default" || q==="auto"){
        try{ p.setPlaybackQuality?.("default"); }catch{}
        try{ p.setPlaybackQualityRange?.("default"); }catch{}
        return;
      }
      try{ p.setPlaybackQualityRange?.(q); }catch{}
      try{ p.setPlaybackQuality?.(q); }catch{}
    }catch{}
  }

  /* ===== UI: QC → PiP → FS (right) ===== */
  function addButtons(){
    if (document.getElementById("cobalt-float-container")) return;
    const c=document.createElement("div");
    c.id="cobalt-float-container";
    c.style.cssText="position:fixed;bottom:16px;right:16px;display:flex;gap:10px;z-index:2147483647;pointer-events:auto;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica Neue,Arial;";
    const btn="width:46px;height:46px;background:rgba(0,0,0,.44);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);color:#fff;border:none;border-radius:50%;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.45);display:inline-flex;align-items:center;justify-content:center;transition:transform .12s ease;padding:0;";
    const gear=`<svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1 1.51 1.65 1.65 0 0 0-1.82-.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h-.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 1 1 7.04 3.4l.06.06A1.65 1.65 0 0 0 8.92 3.8 1.65 1.65 0 0 0 9.91 2H10a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`;
    const pipIn =`<svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H10a2 2 0 0 0-2 2z"></path><path d="M4 8h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z"></path></svg>`;
    const pipOut=`<svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H10a2 2 0 0 0-2 2z"></path><path d="M4 8h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z"></path><line x1="4" y1="4" x2="20" y2="20"></line></svg>`;
    const fsIn  =`<svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/><path d="M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>`;
    const fsOut =`<svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H5v4"/><path d="M15 3h4v4"/><path d="M9 21H5v-4"/><path d="M15 21h4v-4"/></svg>`;

    const qc=document.createElement("button"); qc.innerHTML=gear; qc.style.cssText=btn;
    const popup=document.createElement("div");
    popup.style.cssText="display:none;position:absolute;bottom:64px;right:0;min-width:160px;max-width:260px;background:rgba(18,18,18,.98);color:#fff;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.5);padding:8px;z-index:1000000;font-size:13px;max-height:320px;overflow:auto;";
    function buildQC(){
      popup.innerHTML="";
      const head=document.createElement("div"); head.style.cssText="font-weight:700;margin-bottom:6px;padding:4px 6px;border-bottom:1px solid rgba(255,255,255,.06)"; head.textContent="Quality"; popup.appendChild(head);
      const row=document.createElement("label"); row.style.cssText="display:flex;align-items:center;gap:8px;padding:6px 6px 0 6px;user-select:none;cursor:pointer";
      const chk=document.createElement("input"); chk.type="checkbox"; chk.checked = localStorage.getItem(LS_KEY_STICKY)!=="0";
      const span=document.createElement("span"); span.textContent="Use this quality for all videos";
      row.appendChild(chk); row.appendChild(span); popup.appendChild(row);
      chk.onchange=()=> localStorage.setItem(LS_KEY_STICKY, chk.checked ? "1":"0");

      const p=$p(); let levels=[]; try{ levels=p?.getAvailableQualityLevels?.()||[]; }catch{} levels=levels.filter(x=>x!=="auto" && x!=="default");
      const order=["highres","hd2160","hd1440","hd1080","hd720","large","medium","small","tiny"];
      const list=document.createElement("div"); list.style.cssText="display:flex;flex-direction:column;gap:6px;padding:6px";
      const ordered = order.filter(q=>levels.includes(q));
      if (!ordered.length){ const m=document.createElement("div"); m.style.cssText="padding:8px;color:rgba(255,255,255,.75)"; m.textContent="Start playing, then open again for qualities."; list.appendChild(m); }
      else ordered.forEach(q=>{ const b=document.createElement("button"); b.textContent=tokenToPixels(q); b.style.cssText="text-align:left;padding:8px;border-radius:6px;background:rgba(255,255,255,.02);border:none;color:#fff;cursor:pointer";
        b.onclick=()=>{ if (chk.checked) localStorage.setItem(LS_KEY_QUALITY,q); setQualityToken(q); popup.style.display="none"; }; list.appendChild(b); });
      const auto=document.createElement("button"); auto.textContent="Auto"; auto.style.cssText="text-align:left;padding:8px;border-radius:6px;background:rgba(255,255,255,.02);border:none;color:#fff;cursor:pointer";
      auto.onclick=()=>{ if (chk.checked) localStorage.setItem(LS_KEY_QUALITY,"auto"); setQualityToken("auto"); popup.style.display="none"; };
      list.appendChild(auto); popup.appendChild(list);
    }
    const showQC=()=>{ buildQC(); popup.style.display="block"; };
    const hideQC=()=>{ popup.style.display="none"; };
    qc.onclick=(e)=>{ e.stopPropagation(); (popup.style.display==="block")?hideQC():showQC(); };
    document.addEventListener("click",(ev)=>{ if (popup.style.display!=="block") return; if (ev.target===qc||qc.contains(ev.target)||popup.contains(ev.target)) return; hideQC(); }, true);

    const pip=document.createElement("button"); pip.innerHTML=pipIn; pip.style.cssText=btn;
    const fs =document.createElement("button"); fs .innerHTML=fsIn ; fs .style.cssText=btn;

    const updPIP=()=>{ const v=$v(); const std=!!document.pictureInPictureElement; const wk=v&&(v.webkitPresentationMode==="picture-in-picture"); pip.innerHTML=(std||wk)?pipOut:pipIn; };
    pip.onclick=async()=>{
      const v=$v(); if(!v) return alert("No video found");
      try{
        v.disablePictureInPicture=false; v.setAttribute("playsinline",""); v.setAttribute("webkit-playsinline","");
        if (typeof v.webkitSupportsPresentationMode==="function" && v.webkitSupportsPresentationMode("picture-in-picture")){
          if (v.webkitPresentationMode!=="picture-in-picture"){ await v.play().catch(()=>{}); v.webkitSetPresentationMode("picture-in-picture"); }
          else { v.webkitSetPresentationMode("inline"); }
          updPIP(); return;
        }
        if (document.pictureInPictureElement) await document.exitPictureInPicture();
        else { await v.play().catch(()=>{}); await v.requestPictureInPicture(); }
        updPIP();
      }catch{}
    };

    const isFS =()=> !!(document.fullscreenElement||document.webkitFullscreenElement||document.mozFullScreenElement||document.msFullscreenElement);
    const updFS=()=>{ fs.innerHTML = isFS()?fsOut:fsIn; };
    fs.onclick=async()=>{
      const el=document.querySelector(".html5-video-player")||document.getElementById("movie_player")||document.querySelector("ytd-player")||$v();
      const v=$v();
      try{
        if (isFS()){
          if (document.exitFullscreen) await document.exitFullscreen();
          else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
          else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
          else if (document.msExitFullscreen) document.msExitFullscreen();
        } else {
          if (!el) return;
          try{ await (v?.play?.()||Promise.resolve()); }catch{}
          if (el.requestFullscreen) await el.requestFullscreen();
          else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
          else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
          else if (el.msRequestFullscreen) el.msRequestFullscreen();
          else if (v && typeof v.webkitEnterFullscreen==="function") v.webkitEnterFullscreen();
          else if (v && typeof v.webkitSetPresentationMode==="function") v.webkitSetPresentationMode("fullscreen");
        }
      }catch{} finally{ setTimeout(updFS,220); }
    };

    c.appendChild(qc);
    c.appendChild(pip);
    c.appendChild(fs);
    c.appendChild(popup);
    document.body.appendChild(c);

    document.addEventListener("enterpictureinpicture", updPIP);
    document.addEventListener("leavepictureinpicture", updPIP);
    ["fullscreenchange","webkitfullscreenchange","mozfullscreenchange","msfullscreenchange"].forEach(e=>document.addEventListener(e, updFS, {passive:true}));
    setTimeout(()=>{ updPIP(); updFS(); }, 400);
  }

  /* ===== Autoplay (single-shot) + hard unmute ===== */
  let kickTimer=null, didKick=false, didBigClick=false;
  function clearKick(){ if (kickTimer){ clearInterval(kickTimer); kickTimer=null; } }

  function forceUnmute(){
    const v=$v(), p=$p(); if (!v) return;
    try{ v.muted=false; if (typeof v.volume==="number") v.volume=Math.max(0.6, v.volume||1); p?.unMute?.(); p?.setVolume?.(100); }catch{}
  }

  function kickPlayOnce(){
    if (didKick) return; const v=$v(); if (!v) return; didKick=true; let tries=0;
    const onPlaying=()=> setTimeout(forceUnmute, 200);
    document.removeEventListener("playing", onPlaying, true);
    document.addEventListener("playing", onPlaying, true);

    kickTimer=setInterval(()=>{
      tries++; const v=$v(), p=$p(); if (!v) return;

      if (!v.paused && !v.ended && (v.currentTime > 0.3 || v.played?.length)){
        clearKick(); forceUnmute(); return;
      }

      try{
        v.setAttribute("playsinline",""); v.setAttribute("webkit-playsinline","");
        if (!didBigClick){
          const big=document.querySelector(".ytp-large-play-button");
          if (big && big.offsetParent!==null){ big.click(); didBigClick=true; }
        }
        if (tries<=2){ v.muted=true; p?.mute?.(); v.play?.().catch(()=>{}); }
      }catch{}

      if (tries>12){ clearKick(); forceUnmute(); }
    }, 200);
  }

  setInterval(()=>{ const v=$v(); if (!v) return;
    if (v.paused && !v.ended){ try{ v.play?.(); $p()?.playVideo?.(); }catch{} }
    if (v.muted || ($p()?.isMuted?.()===true)) forceUnmute();
  }, 1200);

  function goNext(){
    try{ const t=document.querySelector(".ytp-autonav-toggle-button"); if (t && t.getAttribute("aria-checked")==="false") t.click(); }catch{}
    try{ const u=new URL(location.href); u.searchParams.set("autoplay","1"); history.replaceState(history.state,"",u.toString()); }catch{}
    const p=$p();
    if (p?.nextVideo) p.nextVideo();
    else {
      document.querySelector(".ytp-next-button")?.click() ||
      document.querySelector("a[aria-label='Next']")?.click() ||
      document.querySelector(".ytp-autonav-endscreen-upnext-link")?.click();
    }
    setTimeout(()=>{ didKick=false; didBigClick=false; kickPlayOnce(); }, 350);
  }

  function wireVideo(){
    const v=$v(); if (!v) return;
    v.removeEventListener("ended", goNext);
    v.addEventListener("ended", goNext, {passive:true});
  }

  /* ===== Sticky quality: only once per video, after playback, and only if different ===== */
  let lastAppliedVideoId = "";
  function applyStickyOnceIfNeeded(){
    try{
      const stickyOn = (localStorage.getItem(LS_KEY_STICKY) ?? "1") === "1";
      const pref = stickyOn ? localStorage.getItem(LS_KEY_QUALITY) : null;
      if (!pref) return;

      const vid = getVid(); if (!vid || vid === lastAppliedVideoId) return;

      const tryApply = ()=>{
        const p=$p(), v=$v(); if (!p || !v) return;
        const cur = getCurrentQualityToken();
        if (!v.paused && v.currentTime > 1.2 && cur && cur !== pref) {
          setQualityToken(pref);
          lastAppliedVideoId = vid; // mark done, no repeats
          v.removeEventListener("timeupdate", tryApply);
        }
      };
      const v=$v(); if (!v) return;
      v.addEventListener("timeupdate", tryApply, {passive:true});
    }catch{}
  }

  /* ===== Boot / SPA ===== */
  function onNavigate(){
    try{
      ensureDesktop();
      addButtons();
      rewriteAnchors();
      wireVideo();
      didKick=false; didBigClick=false;
      setTimeout(kickPlayOnce, 400);
      applyStickyOnceIfNeeded();
      adSweep();
    }catch{}
  }

  let lastHref=location.href;
  setInterval(()=>{ if (location.href!==lastHref){ lastHref=location.href; setTimeout(onNavigate,80); } }, 300);

  const obs=new MutationObserver((muts)=>{
    for (const m of muts) for (const n of m.addedNodes){
      if (!(n instanceof Element)) continue;
      if (n.querySelector && (n.querySelector("video") || n.id==="movie_player")){ setTimeout(onNavigate,80); return; }
    }
  });
  obs.observe(document.documentElement,{childList:true,subtree:true});

  const boot=()=>{ rewriteAnchors(); adSweep(); onNavigate(); };
  if (document.readyState==="complete" || document.readyState==="interactive") boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();