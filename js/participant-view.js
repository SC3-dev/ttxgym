/* The participant window — the document the room actually sees.
 *
 * Lived inside gym/index.html until the builder needed to show an author the
 * same thing. A second, smaller reimplementation in the builder would have
 * drifted from this one, which is the argument that already retired three
 * copies of the parser in favour of js/ttxf.js.
 *
 * Depends on js/ttxf.js being loaded first (for MEDIA_HYDRATE_JS) and defines
 * PRESENTATION_HTML as a global, which is the name gym/index.html already used.
 * tools/build-standalone.js inlines both.
 */
(function (root) {
  var TTXF = root.TTXF || {};
  var MEDIA_HYDRATE_JS = TTXF.MEDIA_HYDRATE_JS || '';
  root.PRESENTATION_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="google" content="notranslate">
  <link rel="stylesheet" href="https://ttxgym.com/css/fonts.css">
  <title>TTX Gym — Participant Window</title>
  <style>
  *{box-sizing:border-box;margin:0}
  :root{--accent:#2e7de0;--green:#3ec9c8;--text:#e8ecf2;--text2:rgba(232,236,242,.55);
        --muted:rgba(232,236,242,.5);--icon:rgba(232,236,242,.42);--heading:rgba(232,236,242,.9);--card:#1e2535;--card-line:rgba(255,255,255,.08);
        --scrim:rgba(20,24,32,.85);--panel:rgba(255,255,255,.05);--danger:#e05252;--track:rgba(232,236,242,.16);--track-done:rgba(232,236,242,.38);
        --bg-filter:blur(8px) brightness(.6);--bg-opacity:1;--card-bg:rgba(30,37,53,.96);--ground:#141820}
  /* The projector theme redefines the tokens; no rule below needs to know which
     theme is active. */
  body.projector{--accent:#1a6ec0;--green:#127c7b;--text:#141820;--text2:rgba(20,24,32,.6);
        --muted:rgba(20,24,32,.55);--icon:rgba(20,24,32,.45);--heading:#141820;--card:#fff;--card-line:rgba(20,24,32,.12);
        --scrim:rgba(244,246,250,.9);--panel:rgba(20,24,32,.04);--danger:#b0433d;--track:rgba(20,24,32,.16);--track-done:rgba(20,24,32,.4);
        --bg-filter:blur(10px) brightness(1.45) saturate(.55);--bg-opacity:.4;--card-bg:rgba(255,255,255,.96);--ground:#f4f6fa}
  body{font-family:"Montserrat",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:var(--ground);background-image:radial-gradient(circle at 82% 60%,rgba(59,59,59,.06) 0,rgba(59,59,59,.06) 69%,transparent 69%),linear-gradient(135deg,#141c33 0%,#0d2040 100%);height:100vh;height:100dvh;width:100%;display:flex;align-items:center;justify-content:center;color:var(--text)}
  #bgimg{position:fixed;inset:0;z-index:0;background-size:cover;background-position:center;filter:var(--bg-filter);opacity:var(--bg-opacity);transform:scale(1.08);display:none}
  #bgimg.show{display:block}
  .container{position:relative;z-index:1;background:var(--card-bg);border:1px solid var(--card-line);border-radius:12px;width:84%;height:84%;padding:0 2rem 1.5rem;display:grid;grid-template-rows:auto 1fr auto;gap:0;overflow:hidden;font-size:inherit}
  ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-thumb{background:rgba(46,125,224,.4);border-radius:99px}
  #pause{position:absolute;inset:0;z-index:9;display:flex;align-items:center;justify-content:center;background:var(--scrim);backdrop-filter:blur(6px)}
  #pause.hidden-overlay{display:none}
  /* Projector theme — the dark palette washes out under room lighting */
  body.projector{background:var(--ground);background-image:none}
  body.projector .container{box-shadow:0 4px 32px rgba(20,24,32,.14)}
  body.projector h1{border-bottom-color:var(--card-line)}
  body.projector #content strong{color:var(--text)}
  body.projector blockquote{background:rgba(26,110,192,.07)}
  body.projector #discussionWrap{background:rgba(26,110,192,.08)}
  body.projector #discussion{color:var(--text)}
  body.projector .pq{background:rgba(20,24,32,.04);border-color:rgba(20,24,32,.1)}
  body.projector .pq-choice{background:rgba(20,24,32,.03);border-color:rgba(20,24,32,.12)}
  body.projector #control{border-top-color:var(--card-line)}
  /* Deliberately dark in both themes: this is a screen-off state, not a page. */
  #blankout{position:fixed;inset:0;z-index:20;background:#0b0e14;display:none}
  #blankout.on{display:block}
  #injectBox{margin:.75rem 0 0;padding:.85rem 1.1rem;background:rgba(245,166,35,.14);border-left:3px solid #f5a623;border-radius:0 4px 4px 0;display:none;font-weight:600}
  #injectBox.show{display:block}
  body.projector #injectBox{background:rgba(245,166,35,.18)}
  #themeToggle{cursor:pointer;fill:var(--icon);transition:fill .15s;display:flex;align-items:center}
  #themeToggle:hover{fill:var(--accent)}

  .overlay-card{background:var(--card);color:var(--text);border:1px solid var(--card-line);border-radius:10px;padding:2.5rem 3rem;display:flex;flex-direction:column;align-items:center;gap:.75rem;text-align:center}
  .overlay-card svg{fill:var(--icon);width:40px;height:40px}
  .overlay-card h2{font-size:18px;font-weight:700}
  h1{text-align:center;font-size:1.7em;font-weight:800;color:var(--heading);padding:1.5rem 0 .75rem;border-bottom:1px solid rgba(255,255,255,.07)}
  /* Nobody in the room could otherwise tell how far through the exercise they were.
     It lives in the footer bar so it never competes with the content. */
  #progress{display:flex;align-items:center;gap:.6em;min-width:0;flex:1}
  #progress-label{font-size:.68em;letter-spacing:.1em;text-transform:uppercase;color:var(--text2);white-space:nowrap}
  #progress-track{display:flex;gap:3px;align-items:center;min-width:0;flex-wrap:wrap}
  #progress-track i{display:block;width:1.4em;height:3px;border-radius:99px;background:var(--track)}
  #progress-track i.done{background:var(--track-done)}
  #progress-track i.now{background:var(--accent)}
  .sizeglyph{fill:var(--icon)}
  /* A short stage on a large screen otherwise hugs the title and leaves a gulf
     above the footer. Auto margins centre it when there is spare room, and resolve
     to zero the moment the content overflows — so a long stage still starts at the
     top and scrolls, rather than being centred with its opening line cut off
     (which is what justify-content:center would do here). */
  #middleWrap{overflow-y:auto;padding:.5rem 0;display:flex;flex-direction:column}
  #middle{flex:0 0 auto;margin-block:auto;width:100%}
  #content{padding:.75rem 0;line-height:1.8;font-size:1em}
  #content p{margin-bottom:.75rem}
  #content p:empty{margin-bottom:0;min-height:.75rem}
  #content strong{color:var(--text)}
  blockquote{padding:1rem 1.25rem;margin:1rem 0;background:rgba(30,75,86,.5);border-left:3px solid var(--green);border-radius:0 4px 4px 0}
  code{font-family:"DM Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.88em;padding:.1em .35em;border-radius:4px;background:color-mix(in srgb,currentColor 12%,transparent);border:1px solid color-mix(in srgb,currentColor 20%,transparent);white-space:pre-wrap;overflow-wrap:break-word}
  figure.SFnews{position:relative;display:block;margin:1em auto;max-width:min(100%,36.8em);border-radius:6px;overflow:hidden;container-type:inline-size;font-size:13px;line-height:1.25}
  @supports (container-type:inline-size){figure.SFnews{font-size:clamp(7px,2.5cqi,21px)}}
  figure.SFnews .SFnews-shot{display:block;width:100%;height:auto;border-radius:0;max-width:none;margin:0}
  figure.SFnews .SFnews-ticker{position:absolute;left:0;right:0;bottom:0;display:flex;align-items:stretch;text-align:left}
  figure.SFnews .SFnews-flag{flex:0 0 auto;display:flex;align-items:center;background:#c8102e;color:#fff;font-weight:800;font-size:.78em;letter-spacing:.06em;text-transform:uppercase;padding:.75em .9em;print-color-adjust:exact;-webkit-print-color-adjust:exact}
  figure.SFnews .SFnews-line{flex:1 1 auto;min-width:0;display:flex;align-items:center;font-size:.78em;background:rgba(11,14,20,.9);color:#fff;font-weight:700;padding:.75em .9em;overflow-wrap:break-word;print-color-adjust:exact;-webkit-print-color-adjust:exact}
  pre.SFpre{font-family:"DM Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.78em;line-height:1.55;margin:.9em 0;padding:.7em .85em;border-radius:6px;background:color-mix(in srgb,currentColor 8%,transparent);border:1px solid color-mix(in srgb,currentColor 16%,transparent);white-space:pre-wrap;overflow-wrap:break-word;tab-size:4}
  pre.SFpre>code{background:none;border:0;padding:0;font-size:inherit;white-space:inherit}
  pre.SFpre[data-label]::before{content:attr(data-label);display:block;font-family:inherit;font-size:.8em;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--text2);margin-bottom:.5em}
  .SFmedia{display:block;margin:1em auto;max-width:min(100%,32em);height:auto;border-radius:6px;object-fit:contain}
  #discussionWrap{margin:.75rem 0 0;padding:.75rem 1rem;background:rgba(0,51,102,.3);border-left:3px solid var(--accent);border-radius:0 4px 4px 0;display:none;gap:.75rem;align-items:flex-start}
  #discussionWrap.show{display:flex;    align-items: center;}
  #discussionWrap svg{fill:var(--accent);width:18px;height:18px;flex-shrink:0;margin-top:2px}
  #discussion{font-style:italic;color:var(--text);padding-left:1rem}
  #discussion li{margin-bottom:.4rem}
  #control{display:flex;justify-content:space-between;align-items:center;gap:1rem;padding-top:.75rem;border-top:1px solid rgba(255,255,255,.07)}
  #control-right{display:flex;align-items:center;gap:1rem;flex-shrink:0}
  input[type=range]{accent-color:var(--accent);cursor:pointer}
  #fullscreen{cursor:pointer;fill:var(--icon);transition:fill .15s}
  #fullscreen:hover{fill:var(--accent)}
  li{padding-bottom:6px}
  .outer{display:flex;justify-content:center;margin:1em 0}
  .chart-container{display:flex;flex-direction:column;gap:.75em;padding:.5em;min-width:16em}
  .bchart{display:flex;align-items:flex-end;gap:.35em;justify-content:center;height:9em}
  .bar{display:flex;flex-direction:column;justify-content:flex-end;min-width:3em;width:4em;height:9em;text-align:center;flex-shrink:0}
  .bar-inner{border-radius:4px 4px 0 0;display:flex;align-items:center;justify-content:center;min-height:0.25em}
  .bar-label{font-size:0.65em;font-weight:700;color:#fff}
  .x-axis-label{margin-top:3px;font-size:0.65em;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:4em}
  .dchart{display:flex;height:1.4em;border-radius:4px;overflow:hidden;margin:.25em 0;min-height:1.4em}
  .segment{display:flex;align-items:center;justify-content:center;color:#fff;font-size:0.65em;font-weight:600}
  .chart-title{display:flex;justify-content:space-evenly;margin-top:.25em}
  .chart-title div{flex:1;text-align:center;font-size:0.7em;color:var(--muted)}
  .outer h3{margin:0;font-size:0.7em;color:var(--muted)}
  /* ---- exercise summary, shared with the facilitator view ---- */
  #content h3{font-size:.95em;margin:1.1em 0 .35em;color:var(--heading)}
  #content h4{font-size:.85em;margin:.9em 0 .2em;color:var(--heading)}
  .summary-metrics{display:flex;flex-wrap:wrap;gap:.6em;margin:.4em 0 .7em}
  .metric{flex:1 1 8em;background:var(--panel);border:1px solid var(--card-line);border-radius:6px;padding:.6em .75em}
  .metric-value{font-size:1.5em;font-weight:800;line-height:1.2;color:var(--heading)}
  .metric-label{font-size:.7em;color:var(--muted);margin-top:.15em}
  .metric-delta{font-size:.7em;margin-top:.3em}
  .metric-delta.up{color:var(--green)}
  .metric-delta.down{color:var(--danger)}
  .metric-delta.flat{color:var(--muted)}
  .summary-caveat{font-size:.72em;color:var(--muted);line-height:1.6;margin-bottom:.9em}
  .focus-list{padding-left:1.2em;margin-bottom:.9em}
  .focus-list li{margin-bottom:.25em}
  .focus-stage{color:var(--muted);font-size:.8em}
  .summary-stage{margin-bottom:1em}
  .summary-stage-meta{font-size:.75em;color:var(--text2);margin:.1em 0 .35em}
  .dist-row{margin-bottom:.55em}
  .dist-question{font-size:.8em;margin-bottom:.2em}
  .dist-bar{display:flex;height:1.2em;border-radius:3px;overflow:hidden}
  .dist-seg{display:flex;align-items:center;justify-content:center;color:#fff;font-size:.62em;font-weight:700;min-width:1em}
  .dist-legend{display:flex;flex-wrap:wrap;gap:.5em;font-size:.68em;color:var(--muted);margin-top:.2em}
  .dist-empty{font-size:.72em;color:var(--muted);font-style:italic}
  .actions-table{width:100%;border-collapse:collapse;font-size:.78em;margin-bottom:.9em}
  .actions-table th,.actions-table td{text-align:left;padding:.35em .45em;border-bottom:1px solid var(--card-line);vertical-align:top}
  .actions-table th{color:var(--muted);font-weight:600;font-size:.9em}
  #questionsWrap{margin:.75rem 0 0;display:none;flex-direction:column;gap:.6rem}
  #questionsWrap.show{display:flex}
  .pq{background:rgba(44,54,80,.7);border:1px solid rgba(255,255,255,.07);border-left:3px solid #2e7de0;border-radius:6px;padding:.7rem .9rem}
  .pq.pq-quiz{border-left-color:var(--green)}
  .pq-header{display:flex;align-items:center;gap:.45rem;margin-bottom:.5rem}
  .pq-badge{display:inline-block;font-size:0.62em;font-weight:600;letter-spacing:.06em;text-transform:uppercase;padding:.12rem .4rem;border-radius:99px;flex-shrink:0;align-self:center}
  .pq-badge.rating{background:rgba(46,125,224,.12);color:var(--accent);border:1px solid rgba(46,125,224,.25)}
  .pq-badge.quiz{background:rgba(62,201,200,.14);color:var(--green);border:1px solid rgba(62,201,200,.3)}
  .pq-label{font-size:.88em;font-weight:600;color:var(--heading);line-height:1.45}
  .pq-choices{display:flex;flex-wrap:wrap;gap:.4rem}
  .pq-choice{display:inline-flex;align-items:center;gap:.4em;font-size:.78em;font-style:italic;padding:.28rem .65rem;border-radius:99px;border:1px solid var(--card-line);background:var(--panel);transition:background .2s,border-color .2s,color .2s}
  /* Once a question has any responses, the ones with none recede. */
  .pq-choices.has-tally .pq-choice{opacity:.55}
  .pq-choice.counted{opacity:1;font-style:normal;color:var(--heading);border-color:var(--accent);background:rgba(46,125,224,.14)}
  .pq-choice.leading{border-color:var(--accent);background:rgba(46,125,224,.24)}
  .pq-tally{display:none;font-style:normal;font-weight:700;font-size:.92em;min-width:1.5em;height:1.5em;border-radius:99px;align-items:center;justify-content:center;background:var(--accent);color:#fff;margin-right:-.25em}
  .pq-choice.counted .pq-tally{display:inline-flex}
  body.projector .pq-choice.counted{background:rgba(26,110,192,.12)}
  body.projector .pq-choice.leading{background:rgba(26,110,192,.2)}
  </style>
</head>
<body>
<div id="bgimg"></div>
<div id="blankout"></div>
<div id="pause" class="hidden-overlay">
  <div class="overlay-card">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M360-320h80v-320h-80v320Zm160 0h80v-320h-80v320ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>
    <h2>Exercise Paused</h2>
  </div>
</div>
<div class="container">
  <div><h1 id="title"></h1></div>
  <div id="middleWrap">
    <div id="middle">
      <div id="content"></div>
      <div id="discussionWrap">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M240-400h320v-80H240v80Zm0-120h480v-80H240v80Zm0-120h480v-80H240v80ZM80-80v-720q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H240L80-80Zm126-240h594v-480H160v525l46-45Zm-46 0v-480 480Z"/></svg>
        <ol id="discussion"></ol>
      </div>
      <div id="injectBox"></div>
      <div id="questionsWrap"></div>
    </div>
  </div>
  <div id="control">
    <div id="progress" aria-hidden="true">
      <div id="progress-label"></div>
      <div id="progress-track"></div>
    </div>
    <div id="control-right">
    <svg xmlns="http://www.w3.org/2000/svg" height="1.5rem" viewBox="0 -960 960 960" width="1.5rem" class="sizeglyph"><path d="M240-80 80-240l160-160 57 56-64 64h494l-63-64 56-56 160 160L720-80l-57-56 64-64H233l63 64-56 56Zm36-360 164-440h80l164 440h-76l-38-112H392l-40 112h-76Zm138-176h132l-64-182h-4l-64 182Z"/></svg>
    <input id="slider" type="range" min="10" max="40" value="14" oninput="changeSizeBySlider()" aria-label="Font size">
    <div id="themeToggle" onclick="toggleProjector()" title="Switch between screen and projector themes" role="button" tabindex="0">
      <svg xmlns="http://www.w3.org/2000/svg" height="1.5rem" viewBox="0 -960 960 960" width="1.5rem"><path d="M480-120q-150 0-255-105T120-480q0-150 105-255t255-105q14 0 27.5 1t26.5 3q-41 29-65.5 75.5T444-660q0 90 63 153t153 63q55 0 101-24.5t75-65.5q2 13 3 26.5t1 27.5q0 150-105 255T480-120Zm0-80q88 0 158-48.5T740-375q-20 5-40 8t-40 3q-123 0-209.5-86.5T364-660q0-20 3-40t8-40q-78 32-126.5 102T200-480q0 116 82 198t198 82Zm-10-270Z"/></svg>
    </div>
    <div id="fullscreen" onclick="toggleFullscreen()" title="Toggle fullscreen">
      <svg xmlns="http://www.w3.org/2000/svg" height="1.75rem" viewBox="0 -960 960 960" width="1.75rem"><path d="M560-280h200v-200h-80v120H560v80ZM200-480h80v-120h120v-80H200v200Zm-40 320q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm0-80h640v-480H160v480Zm0 0v-480 480Z"/></svg>
    </div>
    </div>
  </div>
</div>
<script>
var bc=new BroadcastChannel('ttx_gym');
var contacted=false;
/* The facilitator's mirror runs this same document in an iframe. Only a real
   participant window should describe its size — the mirror measuring itself would
   be circular. An embedded copy has a parent; a window does not. */
var isEmbedded = (window.parent !== window);
function handleMessage(ev){
  contacted=true;
  if(!ev.data.type)return;
  if(ev.data.type=="pause"){
    document.getElementById('pause').classList.toggle('hidden-overlay',ev.data.switch===true);
  }else if(ev.data.type=="blank"){
    document.getElementById('blankout').classList.toggle('on',ev.data.on===true);
  }else if(ev.data.type=="inject"){
    var ib=document.getElementById('injectBox');
    ib.textContent=ev.data.text||'';
    ib.classList.toggle('show',!!(ev.data.text||'').trim());
  }else if(ev.data.type=="responses"){
    var counts=ev.data.counts||{};
    for(var name in counts){ if(Object.prototype.hasOwnProperty.call(counts,name)) paintTally(name,counts[name]); }
  }else if(ev.data.type=="view"){
    applyView(ev.data);
  }else if(ev.data.type=="scroll"){
    applyScroll(ev.data.ratio||0);
  }else if(ev.data.type=="update"){
    document.getElementById('title').textContent=ev.data.title||'';
    document.getElementById('content').innerHTML=ev.data.content||'';
    hydrateMedia(document.getElementById('content'));
    var ib=document.getElementById('injectBox');
    ib.textContent=''; ib.classList.remove('show');
    renderProgress(ev.data.step, ev.data.steps);
    applyingScroll=true;
    scrollWrap.scrollTop=0;                       // a new stage starts at the top
    setTimeout(function(){applyingScroll=false;},60);
    var dw=document.getElementById('discussionWrap');
    var dl=document.getElementById('discussion');
    dl.innerHTML='';
    if(ev.data.discussion&&ev.data.discussion.length){
      dw.classList.add('show');
      ev.data.discussion.forEach(function(item){var li=document.createElement('li');li.innerHTML=item;dl.appendChild(li);});
    }else{dw.classList.remove('show');}
    var qw=document.getElementById('questionsWrap');
    qw.innerHTML='';
    if(ev.data.questions&&ev.data.questions.length){
      qw.classList.add('show');
      ev.data.questions.forEach(function(q){
        var isQuiz=!!q.quiz;
        var pq=document.createElement('div');
        pq.className='pq'+(isQuiz?' pq-quiz':'');
        var pqHeader=document.createElement('div');
        pqHeader.className='pq-header';
        var badge=document.createElement('div');
        badge.className='pq-badge '+(isQuiz?'quiz':'rating');
        badge.textContent=isQuiz?'Quiz':'Rating';
        var label=document.createElement('div');
        label.className='pq-label';
        label.textContent=q.question;
        pqHeader.appendChild(badge);
        pqHeader.appendChild(label);
        var choices=document.createElement('div');
        choices.className='pq-choices';
        if(q.name) choices.setAttribute('data-q',q.name);
        (q.answers||[]).forEach(function(a,i){
          var span=document.createElement('span');
          span.className='pq-choice';
          span.setAttribute('data-i',i);
          var text=document.createElement('span');
          text.textContent=a;
          var tally=document.createElement('b');
          tally.className='pq-tally';
          span.appendChild(text);
          span.appendChild(tally);
          choices.appendChild(span);
        });
        pq.appendChild(pqHeader);
        pq.appendChild(choices);
        qw.appendChild(pq);
        if(q.counts) paintTally(q.name,q.counts);
      });
    }else{qw.classList.remove('show');}
    var bg=document.getElementById('bgimg');
    if(ev.data.image){
      bg.style.backgroundImage='url("'+String(ev.data.image).replace(/"/g,'%22')+'")';
      bg.classList.add('show');
    }else{
      bg.style.backgroundImage='';
      bg.classList.remove('show');
    }
  }
};
  var cont=document.body;
${MEDIA_HYDRATE_JS}
function applySize(){
  var val=document.getElementById('slider').value+'px';
  // Apply to container so all content text scales correctly
  var container=document.querySelector('.container');
  if(container){container.style.fontSize=val;}
  cont.style.fontSize=val;
}
function changeSizeBySlider(){ applySize(); announceView(); }

/* Theme and text size belong to the *view*, not to one window. The facilitator's
   mirror runs this same document in an iframe, so without this the preview would
   quietly disagree with the screen the room is actually looking at. Changes are
   announced upward and the facilitator relays them to every participant surface. */
var applyingView=false;
function currentView(){
  return {type:'view',
    theme: document.body.classList.contains('projector')?'projector':'screen',
    fontSize: parseInt(document.getElementById('slider').value,10)};
}
function announceView(){
  if(applyingView) return;
  var msg=currentView();
  try{bc.postMessage(msg);}catch(e){}
  try{if(window.opener&&window.opener!==window) window.opener.postMessage(msg,'*');}catch(e){}
  try{if(window.parent&&window.parent!==window) window.parent.postMessage(msg,'*');}catch(e){}
}
function applyView(v){
  applyingView=true;
  try{
    if(v.theme) document.body.classList.toggle('projector', v.theme==='projector');
    if(v.fontSize){
      var slider=document.getElementById('slider');
      if(String(slider.value)!==String(v.fontSize)) slider.value=v.fontSize;
      applySize();
    }
  }finally{ applyingView=false; }
}

/* Where the content is scrolled to is part of the view as well. The two windows
   are different sizes, so a pixel offset would not line up — share the proportion
   of the way down instead. */
var scrollWrap=document.getElementById('middleWrap');
var applyingScroll=false, scrollThrottle=null;

function scrollRatio(){
  var range=scrollWrap.scrollHeight-scrollWrap.clientHeight;
  return range>0 ? scrollWrap.scrollTop/range : 0;
}

function announceScroll(){
  if(applyingScroll||applyingView) return;
  if(scrollThrottle) return;
  scrollThrottle=setTimeout(function(){
    scrollThrottle=null;
    var msg={type:'scroll', ratio:scrollRatio()};
    try{bc.postMessage(msg);}catch(e){}
    try{if(window.opener&&window.opener!==window) window.opener.postMessage(msg,'*');}catch(e){}
    try{if(window.parent&&window.parent!==window) window.parent.postMessage(msg,'*');}catch(e){}
  },70);
}

function applyScroll(ratio){
  var range=scrollWrap.scrollHeight-scrollWrap.clientHeight;
  if(range<=0) return;
  var next=Math.round(ratio*range);
  if(Math.abs(next-scrollWrap.scrollTop)<2) return;   // already there; do not fight
  applyingScroll=true;
  scrollWrap.scrollTop=next;
  setTimeout(function(){applyingScroll=false;},60);
}

scrollWrap.addEventListener('scroll',announceScroll,{passive:true});
function toggleFullscreen(){var d=window.document,el=d.documentElement,req=el.requestFullscreen||el.webkitRequestFullScreen||el.msRequestFullscreen,ex=d.exitFullscreen||d.webkitExitFullscreen||d.msExitFullscreen;if(!d.fullscreenElement&&!d.webkitFullscreenElement&&!d.msFullscreenElement)req.call(el);else ex.call(d);}
// The room watches its own answers accumulate on the pills.
function paintTally(name,counts){
  if(!name||!counts) return;
  var group=document.querySelector('.pq-choices[data-q="'+name+'"]');
  if(!group) return;
  var total=0,i;
  for(i=0;i<counts.length;i++) total+=(counts[i]||0);
  group.classList.toggle('has-tally',total>0);
  var pills=group.querySelectorAll('.pq-choice');
  for(i=0;i<pills.length;i++){
    var n=counts[i]||0;
    var lead=total>0&&n===Math.max.apply(null,counts)&&n>0;
    pills[i].classList.toggle('counted',n>0);
    pills[i].classList.toggle('leading',!!lead);
    pills[i].querySelector('.pq-tally').textContent=n>0?n:'';
  }
}

function renderProgress(step,steps){
  var label=document.getElementById('progress-label');
  var track=document.getElementById('progress-track');
  var wrap=document.getElementById('progress');
  if(typeof steps!=='number'||steps<1){wrap.style.display='none';return;}
  wrap.style.display='';
  if(step<=0) label.textContent='Introduction';
  else if(step>steps) label.textContent='Wrap-up';
  else label.textContent='Stage '+step+' of '+steps;
  track.innerHTML='';
  for(var i=1;i<=steps;i++){
    var seg=document.createElement('i');
    if(i<step) seg.className='done';
    else if(i===step) seg.className='now';
    track.appendChild(seg);
  }
}
function toggleProjector(){
  var on=document.body.classList.toggle('projector');
  try{localStorage.setItem('ttxgym_participant_theme',on?'projector':'screen');}catch(e){}
  announceView();
}
try{if(localStorage.getItem('ttxgym_participant_theme')==='projector')document.body.classList.add('projector');}catch(e){}
// Tell the facilitator window we are live so it can send the current stage.
bc.onmessage=function(ev){handleMessage(ev);};
// A window opened from a file:// page has an opaque origin, so the channel above
// never reaches the facilitator. Window handles do.
window.addEventListener('message',function(ev){handleMessage({data:ev.data});});

// Announce on every route we have: the channel, whoever opened us, and whoever
// embedded us (the facilitator's mirror runs this same document in an iframe).
function viewportSize(){
  return {width: Math.round(window.innerWidth), height: Math.round(window.innerHeight)};
}

function announceViewport(){
  if(isEmbedded) return;
  var vp=viewportSize();
  var msg={type:'viewport', width:vp.width, height:vp.height};
  try{bc.postMessage(msg);}catch(e){}
  try{if(window.opener&&window.opener!==window) window.opener.postMessage(msg,'*');}catch(e){}
}

var viewportThrottle=null;
window.addEventListener('resize',function(){
  if(isEmbedded||viewportThrottle) return;
  viewportThrottle=setTimeout(function(){viewportThrottle=null;announceViewport();},150);
});

function announceReady(){
  var msg={type:'ready', view: currentView(), viewport: isEmbedded?null:viewportSize()};
  try{bc.postMessage(msg);}catch(e){}
  try{if(window.opener&&window.opener!==window) window.opener.postMessage(msg,'*');}catch(e){}
  try{if(window.parent&&window.parent!==window) window.parent.postMessage(msg,'*');}catch(e){}
}
announceReady();
announceViewport();
// The facilitator window may still be starting up and have no listener yet. Retry
// until something arrives, then stop.
function retryReady(delay){
  setTimeout(function(){ if(!contacted){ announceReady(); if(delay<2000) retryReady(delay*2); } }, delay);
}
retryReady(250);
</script>
</body></html>`;
})(typeof window !== 'undefined' ? window : this);
