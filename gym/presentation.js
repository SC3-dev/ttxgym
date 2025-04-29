var bc = new BroadcastChannel('ttx_gym');
bc.onmessage = function (ev) {
  console.log("Message received: ", ev);
  if (ev.data.type) {
    if (ev.data.type == "pause") {
      if (ev.data.switch == true) {
        var roundDiv = document.getElementById('pause');
        roundDiv.classList.add('hidden-overlay');
      } else {
        var roundDiv = document.getElementById('pause');
        roundDiv.classList.remove('hidden-overlay');
      }
    }
    else if (ev.data.type == "update") {
      var container = document.getElementById('title');
      container.innerHTML = ev.data.title; // Clear existing contentev.data.title
      container = document.getElementById('content');
      container.innerHTML = ev.data.content; // Clear existing contentev.data.title
      container = document.getElementById('observations');
      container.innerHTML = ""; // Clear existing contentev.data.title

      ev.data.observations.forEach(item => {
        row = document.createElement('li');
        row.innerHTML = item;
        container.appendChild(row);
      })
    }
  }
} /* receive */

var cont = document.body;

function changeSizeBySlider() {
  var slider = document.getElementById("slider");

  // Set slider value as fontSize
  cont.style.fontSize = slider.value + "px"; // <- HERE
}

function toggleFullscreen() {
  var doc = window.document;
  var docEl = doc.documentElement;

  var requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
  var cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

  if (!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
    requestFullScreen.call(docEl);
  }
  else {
    cancelFullScreen.call(doc);
  }
}
