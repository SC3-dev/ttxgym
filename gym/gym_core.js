let presentationHTML = `
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap"
      rel="stylesheet">
  <meta name="google" content="notranslate" />
  <title>TTX-GYM: Participant Window</title>
  <style>
  * {
  box-sizing: border-box;
}

body {
  font-family: "Montserrat", Arial, sans-serif;
  margin: 0;
  padding: 0;

  background-color: #202634;

  height: 100vh;
  width: 100vw;
  box-sizing: border-box;
  align-items: center;
  display: flex;
  justify-content: center;
  font-size: 80%;
  flex-direction: column;
}


::-webkit-scrollbar {
  width: 10px;
}

::-webkit-scrollbar-track {
  background: #b4b4b4;
  border-radius: 10px;
}

::-webkit-scrollbar-thumb {
  background: #1a6ec0;
  border-radius: 10px;
}


#titleWrap {
  grid-area: 1 / 1 / 2 / 2;
}

#middle {
  display: flex;
  justify-content: center;
  align-content: center;
  flex-direction: column;
}

#middleWrap{
    grid-area: 2 / 1 / 3 / 2;
    overflow-y: auto;
    display:grid;
}

#control {
  grid-area: 3 / 1 / 4 / 2;
  padding-top: 1rem;
  fill:#fff;
}

.SFmedia {
  padding: 1rem;
  display: block;
  margin-left: auto;
  margin-right: auto;
  max-width: 60%;
  max-height: 40%;
  border: 0;
  aspect-ratio: 16 / 9;
}

.container {

  background-repeat: no-repeat;
  background-position: center center;
  width: 80%;
  height: 80%;
  padding: 0 2rem 2rem 2rem;

  background-color: #293042;
  border-radius: 8px;
  box-sizing: border-box;
  color: #fff;

  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto 1fr auto;
  grid-column-gap: 0px;
  grid-row-gap: 0px;
}

h1 {
  text-align: center;
  color: #ccc;
}


#content {
  padding: 0px 20px;
}

#observations {
  padding: 20px 20px 20px 20px;
  margin: 0px 0px 0px 24px;
  font-style: italic;
}


button {
  align-self: center;
  padding: 10px 15px;
  margin: 2px;
  font-size: 16px;
  color: #fff;
  background-color: #1a6ec0;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

#fullscreen {
  margin-left: 3rem;
  cursor: pointer;

}

button:hover {
  background-color: #4dbebd;
}

#control {

  display: flex;
  justify-content: right;
  align-items: right;
}

li {
  padding-bottom: 10px;
}

#pause {

  overflow-y: auto;
  padding: 2rem;
  z-index: 999;
  display: flex;
  align-content: space-around;
  flex-wrap: wrap;
  justify-content: center;
  flex-direction: column;
  background-color: rgba(41, 48, 66, 0.8);
  color: #fff;
  line-height: 2rem;
  font-size: 1.2rem;
  position: absolute;
    width: 100vw;
    height: 100vh;
}

#pause.hidden-overlay {
  display: none;
}

.overlay-message {
  background-color: #202634;
  padding: 2rem;
  border-radius: 0.3rem;
  display: flex;
  flex-wrap: wrap;
  flex-direction: column;
  align-items: center;
  fill:#fff;

  pointer-events: none;
}

.overlay-message img {
  height: 4rem;
}

.chart-container {
  display: flex;
  padding: 1rem;
  box-sizing: border-box;
  justify-content: space-evenly;
}

.bchart {
    width: 30%;
  display: flex;
  align-items: flex-end;
  margin: 0 2rem;
}

.bar {
  flex: 1;
  margin: 0 10px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  position: relative;
  text-align: center;
  height: 100%;
}

.bar-inner {
  width: 100%;
  background-color: #3498db;
  border-radius: 5px 5px 0 0;
  transition: height 0.3s ease;
  display: flex;
  justify-content: center;
  align-items: center;
}

.bar-label {
  color: #f4f4f9;
  font-weight: bold;
  font-size: 0.8rem;
  margin-bottom: 5px;
}

.x-axis-label {
  margin-top: 5px;
  font-size: 0.8rem;
  color: #333;
}

.dchart {
    width: 30%;
  border-radius: 50%;
  position: relative;
  border: 1px solid #202634;
  aspect-ratio: 1;
  margin: 0 2rem;
}

.dchart::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40%;
  height: 40%;
  background-color: #202634;
  border-radius: 50%;
}

.dlabel-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.dlabel {
  position: absolute;
  transform: translate(-50%, -50%);
  background: #202634;
  padding: 0.2rem 0.5rem;
  border-radius: 0.2rem;
  font-size: 0.8rem;
  font-weight: bold;
  pointer-events: none;
  width: 30%;
  text-align:center;
}
  </style>
</head>

<body>
<div id="pause" class="hidden-overlay">
<div class="overlay-message"><svg xmlns="http://www.w3.org/2000/svg" height="4rem"
viewBox="0 -960 960 960" width="4rem">
<path
    d="M360-320h80v-320h-80v320Zm160 0h80v-320h-80v320ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z">
</path>
</svg>
  <h2>Exercise paused</h2>
</div>
</div>
  <div class="container">
    <div id="titleWrap">
      <h1>
        <div id="title"></div>
      </h1>
    </div>
    <div id="middleWrap">
    <div id="middle">
      <div id="content">
      </div>
      <ol id="observations"></ol>
    </div>
    </div>
  </div>
  <div id="control">
  <svg xmlns="http://www.w3.org/2000/svg" height="2rem" viewBox="0 -960 960 960" width="2rem"><path d="M240-80 80-240l160-160 57 56-64 64h494l-63-64 56-56 160 160L720-80l-57-56 64-64H233l63 64-56 56Zm36-360 164-440h80l164 440h-76l-38-112H392l-40 112h-76Zm138-176h132l-64-182h-4l-64 182Z"/></svg>
    <input id="slider" type="range" min="10" max="40" oninput="changeSizeBySlider()">
    <div id="fullscreen" onclick="toggleFullscreen()" name="btn4">
    <svg xmlns="http://www.w3.org/2000/svg" height="2rem" viewBox="0 -960 960 960" width="2rem" fill="#fff"><path d="M560-280h200v-200h-80v120H560v80ZM200-480h80v-120h120v-80H200v200Zm-40 320q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm0-80h640v-480H160v480Zm0 0v-480 480Z"/></svg>
    </div>
  </div>

  <script>
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

  </script>
</body>

</html>
`;

var finish = {
    "type": "update",
    "title": "Excercise Outcomes", "content": "Finish the exercise by discussing and collating what you learned, how your understanding of this type of threat has changed and what processes you might update as a result.", "observations": ["What did you learn from running the exercise?",
        "How has your understanding of preventing this type of cyber security threat changed?",
        "What will you look to change or implement across your organisation?"]
};
var start;
let firsttimer = 0;
let timeron = 0;
let timerInterval = null;
let currentTimerLabel = '#';
let stageTime = [];
let questionTrakcer = [];
let questionCounter = 0;  // Global counter for unique IDs
let roundCounter = 0;  // Global counter for unique IDs
let ActiveStage = 0;
let fileName, fileContent, data;
let timer = false;
let ExcerciseComplete = false;
let qList = [];
let rawFileData;
let bc = new BroadcastChannel('ttx_gym');

const form = document.getElementById('questionsForm');
let progressDiv = document.createElement('div'); progressDiv.id = "progress-sections";
let overallScoreDiv = document.createElement('div'); overallScoreDiv.id = "overall-score";
let overallScore = "";
const recapList = document.getElementById('recap-list');
document.getElementById('fileInput').addEventListener('change', handleFileSelect, false);
const urlParams = new URLSearchParams(window.location.search);

if (urlParams.has('q')) {
    const targetFile = urlParams.get('q').replace(/\W/g, '');
    const filepath = "../lib/scenarios/" + targetFile + ".ttxf";
    fileName = targetFile + ".ttxf";


    fetch(filepath)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            // Limit file size to prevent DoS
            if (response.headers.get('content-length') > 100000) { // Example limit: 100KB
                throw new Error('File too large');
            }
            return response.text();
        })
        .then(data => {
            rawFileData = data;
            fileContent = parseConfigToJSON(data);
            populateScenario();
        })
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
        });




}


//Handler for scenario files. Calls populateQuestions() to initalise the dashboard.
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    resetExercise();
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            fileName = file.name;
            rawFileData = e.target.result;
            fileContent = parseConfigToJSON(e.target.result);
            populateScenario();
        } catch (error) {
            alert('Error parsing Scenario file.');
        }
    };
    reader.readAsText(file);
}

function populateScenario() {
    if (fileContent.length === 0) {
        alert('content missing from Scenario file.');
        return;
    }
    roundCounter = 0;
    let timingdiv, timeslot, timestage, timenum;
    document.getElementById('scribe').classList.remove('hide');
    document.getElementById('timer').classList.remove('hide');

    //start is the inital screen for the participants (effectively treated as 'stage 0'). title, summary, and topics pulled from scenario data.
    start = { "type": "update", "title": fileContent.title, "content": fileContent.summary, "observations": fileContent.topics };
    if (fileContent.conclusion) {
        finish.content = fileContent.conclusion;
    }
    let container = document.getElementById('questionsContainer');//parent div for round data in 'scribe' window
    container.innerHTML = ''; // Clear existing content

    let stageContainer = document.getElementById('stageWrapper');//parent div for stage navigation indicators
    stageContainer.innerHTML = ''; // Clear existing content
    timingdiv = document.getElementById("times");
    timingdiv.innerHTML = ''; // Clear existing content

    // Create navigation button
    let roundMarker = document.createElement('div');
    roundMarker.id = 'previous';
    roundMarker.className = 'link';
    roundMarker.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="2rem" viewBox="0 -960 960 960" width="2rem"><path d="M400-80 0-480l400-400 71 71-329 329 329 329-71 71Z"/></svg><span>Previous</span>`;
    roundMarker.onclick = function () { previousStage(); };
    stageContainer.appendChild(roundMarker);

    // Create start marker, prior to loop to populate stage markeres
    roundMarker = document.createElement('div');
    roundMarker.id = 'marker0';
    roundMarker.innerHTML = '<img src="../images/start.svg"/>'; // Clear existing content
    roundMarker.setAttribute("onclick", `goToStage(${roundCounter})`);
    roundMarker.className = 'stage';
    stageContainer.appendChild(roundMarker);

    // Connector element
    roundMarker = document.createElement('div');
    roundMarker.className = 'connector';
    stageContainer.appendChild(roundMarker);

    data = fileContent.stages; // load the stage data from the scenario file

    if (Array.isArray(data)) {
        data.forEach(round => {
            roundCounter++; //increment at the start of the loop. All the ID assignments for the first are therefore '1' not '0'.
            const roundDiv = document.createElement('div');
            roundDiv.classList.add('round');
            roundDiv.classList.add('sc_collapsible');
            roundDiv.setAttribute('data-section', round.stage);
            roundDiv.id = "round" + roundCounter;
            //stage title
            const roundTitle = document.createElement('div');
            roundTitle.classList.add('sc_title-bar');
            roundDiv.appendChild(roundTitle);

            const roundTitleSpan = document.createElement('span');
            roundTitleSpan.classList.add('sc_title');
            roundTitleSpan.textContent = round.stage;
            roundTitle.appendChild(roundTitleSpan);
            const roundTitlebutton = document.createElement('button');
            roundTitlebutton.classList.add('sc_toggle-btn');
            roundTitlebutton.textContent = "▼";
            roundTitle.appendChild(roundTitlebutton);

            //Stage description
            const descriptionWrapper = document.createElement('div');
            descriptionWrapper.classList.add('sc_content-wrapper');
            const content = document.createElement('div');
            content.classList.add('sc_content');
            content.innerHTML = round.content;
            descriptionWrapper.appendChild(content);
            //Facilitator Prompts
            if (round.prompts) {

                const promptDiv = document.createElement('div');
                promptDiv.className = 'prompt';
                const promptIcon = document.createElement('div');
                promptIcon.className = 'icon';
                promptIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="2rem" viewBox="0 -960 960 960" width="2rem"><path d="M480-360q17 0 28.5-11.5T520-400q0-17-11.5-28.5T480-440q-17 0-28.5 11.5T440-400q0 17 11.5 28.5T480-360Zm-40-160h80v-240h-80v240ZM80-80v-720q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H240L80-80Zm126-240h594v-480H160v525l46-45Zm-46 0v-480 480Z"/></svg>';
                promptDiv.appendChild(promptIcon);
                promptContent = document.createElement('div');
                const promptList = document.createElement('ul');

                round.prompts.forEach(item => {
                    const currentPrompt = document.createElement('li');
                    currentPrompt.innerHTML = item;
                    promptList.appendChild(currentPrompt);
                });
                promptContent.appendChild(promptList);
                promptDiv.appendChild(promptContent);
                descriptionWrapper.appendChild(promptDiv);
            }
            //stage comments
            const comment = document.createElement('textarea');
            comment.className = 'description';
            comment.placeholder = "Record comments and observations here";
            descriptionWrapper.appendChild(comment);

            if (round.questions) {
                console.log(round.questions);
                round.questions.forEach(item => {
                    const questionDiv = document.createElement('div');
                    questionDiv.className = 'question';

                    const questionLabel = document.createElement('label');
                    questionLabel.textContent = item.question;
                    questionDiv.appendChild(questionLabel);

                    if (item.description) {
                        const description = document.createElement('p');
                        description.className = 'description';
                        description.textContent = item.description;
                        questionDiv.appendChild(description);
                    }
                    qList[`question_${questionCounter}`] = item.question;

                    const choicesContainer = document.createElement('div');
                    choicesContainer.className = 'choices';

                    item.answers.forEach((choice, choiceIndex) => {
                        const choiceContainer = document.createElement('div');
                        choiceContainer.className = 'choice';

                        const choiceInput = document.createElement('input');
                        choiceInput.type = 'radio';
                        choiceInput.name = `question_${questionCounter}`;
                        choiceInput.value = choice;
                        choiceInput.id = `q${questionCounter}_c${choiceIndex}`;

                        const choiceLabel = document.createElement('label');
                        choiceLabel.htmlFor = choiceInput.id;
                        choiceLabel.textContent = choice;

                        choiceContainer.appendChild(choiceInput);
                        choiceContainer.appendChild(choiceLabel);
                        choicesContainer.appendChild(choiceContainer);
                    });

                    questionDiv.appendChild(choicesContainer);
                    descriptionWrapper.appendChild(questionDiv);
                    questionCounter++;  // Increment the counter after each question
                });
            }
            roundDiv.appendChild(descriptionWrapper);
            container.appendChild(roundDiv);

            // timing table
            timingdiv = document.getElementById("times");


            timeslot = document.createElement('div');
            timeslot.className = "data-row";
            timestage = document.createElement('div');
            timestage.className = "data-label";
            timestage.innerHTML = "Stage " + roundCounter;
            timenum = document.createElement('div');
            timenum.className = "data-number";
            timenum.id = "time" + roundCounter;
            timenum.innerHTML = "00:00";
            timeslot.appendChild(timestage);
            timeslot.appendChild(timenum);

            timeslot.className = "data-row";
            timingdiv.appendChild(timeslot);


            stageTime[roundCounter] = 0;

            // stage roundels
            roundMarker = document.createElement('div');
            roundMarker.innerHTML = roundCounter; // Clear existing content
            roundMarker.className = 'stage';
            roundMarker.id = 'marker' + roundCounter;
            roundMarker.setAttribute("onclick", `goToStage(${roundCounter})`);
            stageContainer.appendChild(roundMarker);
            roundMarker = document.createElement('div');
            roundMarker.className = 'connector';
            stageContainer.appendChild(roundMarker);
        });

    }

    // Add event listeners for the title bars
    document.querySelectorAll('.sc_collapsible').forEach(collapsible => {
        const titleBar = collapsible.querySelector('.sc_title-bar');
        const button = collapsible.querySelector('.sc_toggle-btn');
        const contentWrapper = collapsible.querySelector('.sc_content-wrapper');
        const content = collapsible.querySelector('.sc_content');

        titleBar.addEventListener('click', () => {
            toggleCollapsible(collapsible.id);
        });
    });

    let titleField = document.getElementById('title-text');
    titleField.innerHTML = "<h2>" + fileContent.title + "</h2>";

    let confirmer = document.getElementById('scenario-loader-data');
    confirmer.innerHTML = ''; // Clear existing content
    fileInfo = document.createElement('div');
    fileInfo.id = "file-name";
    fileInfo.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="2rem" viewBox="0 -960 960 960" width="2rem"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h440l200 200v440q0 33-23.5 56.5T760-120H200Zm0-80h560v-400H600v-160H200v560Zm80-80h400v-80H280v80Zm0-320h200v-80H280v80Zm0 160h400v-80H280v80Zm-80-320v160-160 560-560Z"/></svg><span class="indent">${fileName}</span>`;


    statfields = document.createElement('div');
    statfields.className = 'stat indent';
    statfields.innerHTML = roundCounter + " Stages"; // Clear existing content
    confirmer.prepend(statfields);

    statfields = document.createElement('div');
    statfields.className = 'stat indent';
    statfields.innerHTML = questionCounter + " Questions"; // Clear existing content
    confirmer.prepend(statfields);

    confirmer.prepend(fileInfo);
    confirmer.classList.add('scdone');

    document.getElementById('launcher').classList.remove('hide');


    roundMarker = document.createElement('div');
    roundMarker.className = 'stage';
    roundMarker.id = 'marker' + (roundCounter + 1);
    roundMarker.innerHTML = '<img src="../images/finish.svg"/>'; // Clear existing content
    roundMarker.setAttribute("onclick", `goToStage(${roundCounter + 1})`);
    stageContainer.appendChild(roundMarker);
    roundMarker = document.createElement('div');
    roundMarker.id = 'next';
    roundMarker.className = 'link';
    roundMarker.innerHTML = `<span>Next</span><svg xmlns="http://www.w3.org/2000/svg" height="2rem" viewBox="0 -960 960 960" width="2rem"><path d="m321-80-71-71 329-329-329-329 71-71 400 400L321-80Z"/></svg>`;
    roundMarker.onclick = function () { nextStage(); };
    stageContainer.appendChild(roundMarker);
    previousStage();
} // End of scenario initalisation


function exportScenario() {
    serveFile(rawFileData, "export.ttxf");
}

function exportReport() {

    let Scores = updateProgress();
    serveFile(overallScoreDiv.innerHTML + generateCharts(Scores) + progressDiv.innerHTML, "report.html"); /* send */
}

function serveFile(text, downloadAs) {
    const blob = new Blob([text], { type: "text/html" });
    const url = URL.createObjectURL(blob);

    const domNode = document.createElement('a');
    downloadAs && (domNode.download = downloadAs);
    !downloadAs && (domNode.target = "_blank");
    domNode.href = url;
    domNode.style.display = 'none';
    document.body.appendChild(domNode);
    domNode.click();
    document.body.removeChild(domNode);
}


// report generation

document.getElementById('questionsForm').addEventListener('submit', function (event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const answers = {};

    formData.forEach((value, key) => {
        answers[key] = value;
    });
    let Scores = updateProgress();
    bc.postMessage({ "type": "update", "title": overallScore, "content": generateCharts(Scores) + progressDiv.innerHTML }); /* send */

    console.log('Submitted answers:', answers);
    // You can now send `answers` to a server or process it as needed
});

document.getElementById('questionsForm').addEventListener('change', updateProgress);



function setActiveStage(stageNumber) {
    var stages = document.querySelectorAll('.stage');
    stages.forEach((stage, index) => {
        if (index == stageNumber) {
            stage.classList.add('active');
        } else {
            stage.classList.remove('active');
        }
    });
    stages = document.querySelectorAll('.round');
    stages.forEach((stage, index) => {
        collapseCollapsible("round" + (index + 1));
        if (index == stageNumber - 1) {
            stage.classList.add('active');
        } else {
            stage.classList.remove('active');
        }
    });

    if (stageNumber > 0 && stageNumber < roundCounter + 1) {
        expandCollapsible("round" + (stageNumber));
        document.getElementById("timer").innerHTML = currentTimerLabel;
    }

    if (stageNumber == 0) {
        document.getElementById('previous').classList.add('hidden');
        document.getElementById("timer").innerHTML = `    <svg xmlns="http://www.w3.org/2000/svg" height="2rem" viewBox="0 -960 960 960" width="2rem"><path d="M320-320h80v-320h-80v320Zm160 0 240-160-240-160v320Zm0 240q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z" /></svg><span class="indent">Timer Ready</span>`;
    } else {
        document.getElementById('previous').classList.remove('hidden');
    }
    if (stageNumber == roundCounter + 1) {
        if (ExcerciseComplete) {
            var roundDiv = document.getElementById('marker' + (stageNumber));
            roundDiv.classList.add('complete');
        }
        document.getElementById('next').classList.add('hidden');
        document.getElementById("timer").innerHTML = `    <svg xmlns="http://www.w3.org/2000/svg" height="2rem" viewBox="0 -960 960 960" width="2rem"><path d="M320-320h80v-320h-80v320Zm160 0 240-160-240-160v320Zm0 240q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z" /></svg><span class="indent">Timer Ready</span>`;
    } else {
        document.getElementById('next').classList.remove('hidden');
    }

    const sections = document.querySelectorAll('.round');
    let i = 0;
    let inputDisabled = true;
    sections.forEach(section => {
        i++;
        const inputs = section.querySelectorAll('input[type="radio"]');

        const textinputs = section.querySelectorAll('textarea');
        if (i == stageNumber) {
            inputDisabled = false;
        }
        else {
            inputDisabled = true;
        }
        inputs.forEach(question => {
            question.disabled = inputDisabled;
        });
        textinputs.forEach(question => {
            question.disabled = inputDisabled;
        });

    });

}

// Example usage: Highlight the second stage

function nextStage() {
    if (ActiveStage < roundCounter) {
        ActiveStage++;
        if (firsttimer == 0) {
            var roundDiv = document.getElementById('marker0');
            roundDiv.classList.add('complete');
            firsttimer = 1;
            toggleTimer();
            startStopTimer();
        }
        setActiveStage(ActiveStage);
        bc.postMessage({ "type": "update", "title": data[ActiveStage - 1].stage, "content": data[ActiveStage - 1].content, "observations": data[ActiveStage - 1].observations }); /* send */
    }
    else {
        ActiveStage = roundCounter + 1;
        setActiveStage(ActiveStage);
        bc.postMessage(finish); /* send */
    }
}
function previousStage() {
    if (ActiveStage > 1) {
        ActiveStage--;
        setActiveStage(ActiveStage);
        bc.postMessage({ "type": "update", "title": data[ActiveStage - 1].stage, "content": data[ActiveStage - 1].content, "observations": data[ActiveStage - 1].observations }); /* send */
    }
    else {
        ActiveStage = 0;
        setActiveStage(ActiveStage);
        bc.postMessage(start); /* send */
    }
}

function goToStage(stage) {

    ActiveStage = stage;
    if (stage > 0 && stage <= roundCounter) {

        if (firsttimer == 0) {

            var roundDiv = document.getElementById('marker0');
            roundDiv.classList.add('complete');
            firsttimer = 1;
            toggleTimer();
            startStopTimer();
        }
        setActiveStage(ActiveStage);
        bc.postMessage({ "type": "update", "title": data[ActiveStage - 1].stage, "content": data[ActiveStage - 1].content, "observations": data[ActiveStage - 1].observations }); /* send */
    } else if (stage == 0) {
        setActiveStage(ActiveStage);
        bc.postMessage(start); /* send */
    } else if (stage == roundCounter + 1) {
        setActiveStage(ActiveStage);
        bc.postMessage(finish); /* send */

    }

}

function toggleSidebar() {
    document.getElementById('controller').classList.toggle('show');
}

function resetExercise() {
    stageTime = [];
    questionTrakcer = [];
    questionCounter = 0;  // Global counter for unique IDs
    roundCounter = 0;  // Global counter for unique IDs
    ActiveStage = 0;
    fileName, fileContent, data = "";
    timer = false;
    ExcerciseComplete = false;
    qList = [];
    rawFileData = "";

}

function launchPresentation() {

    serveFile(presentationHTML);
    setTimeout(() => {
        nextStage();
        previousStage(); /* send */
    }, "750");

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

const startStopTimer = () => {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    } else {
        timerInterval = setInterval(toggleClock, 1000);
    }
};


const toggleTimer = () => {

    if (ActiveStage > 0 && ActiveStage < roundCounter + 1) {
        if (firsttimer > 0) {
            if (timer) {
                currentTimerLabel = `    <svg xmlns="http://www.w3.org/2000/svg" height="2rem" viewBox="0 -960 960 960" width="2rem"><path d="m380-300 280-180-280-180v360ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg><span class="indent">Resume</span>`;
                document.getElementById("timer").innerHTML = currentTimerLabel;

                var roundDiv = document.getElementById('pause');
                roundDiv.classList.remove('hidden-overlay');
                timer = false;
                bc.postMessage({ "type": "pause", "switch": timer });
            }
            else {
                currentTimerLabel = `    <svg xmlns="http://www.w3.org/2000/svg" height="2rem" viewBox="0 -960 960 960" width="2rem"><path d="M360-320h80v-320h-80v320Zm160 0h80v-320h-80v320ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg><span class="indent">Pause</span>`;
                document.getElementById("timer").innerHTML = currentTimerLabel;
                var roundDiv = document.getElementById('pause');
                roundDiv.classList.add('hidden-overlay');
                timer = true;
                bc.postMessage({ "type": "pause", "switch": timer });
            }
        }
    } else {

    }
};

const toggleClock = () => {
    if (timer) {
        if (ActiveStage > 0 && ActiveStage < roundCounter + 1) {
            stageTime[ActiveStage] += 1;

            document.getElementById("time" + ActiveStage).innerHTML = formatTime(Number(stageTime[ActiveStage]));
        }
    }
};




const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};


///////////////////////////////////////////
// Collapsible Behaviours for Scribe panel
///////////////////////////////////////////


// Function to toggle a collapsible by ID
function toggleCollapsible(id) {
    const collapsible = document.getElementById(id);
    const contentWrapper = collapsible.querySelector('.sc_content-wrapper');
    const button = collapsible.querySelector('.sc_toggle-btn');
    const content = collapsible.querySelector('.sc_content');

    if (contentWrapper.style.height === '0px' || !contentWrapper.style.height) {
        contentWrapper.style.height = `${contentWrapper.scrollHeight}px`;
        button.textContent = '▲';
    } else {
        contentWrapper.style.height = '0px';
        button.textContent = '▼';
    }
}

// Function to expand a collapsible by ID
function expandCollapsible(id) {
    const collapsible = document.getElementById(id);
    const contentWrapper = collapsible.querySelector('.sc_content-wrapper');
    const button = collapsible.querySelector('.sc_toggle-btn');
    const content = collapsible.querySelector('.sc_content');

    contentWrapper.style.height = `${contentWrapper.scrollHeight}px`;
    button.textContent = '▲';
}

// Function to collapse a collapsible by ID
function collapseCollapsible(id) {
    const collapsible = document.getElementById(id);
    const contentWrapper = collapsible.querySelector('.sc_content-wrapper');
    const button = collapsible.querySelector('.sc_toggle-btn');

    contentWrapper.style.height = '0px';
    button.textContent = '▼';
}




/////////////////////////////////////////////
// Report Handling
////////////////////////////////////////////

function updateProgress() {
    const sections = document.querySelectorAll('.round');
    progressDiv.innerHTML = ''; // Clear progress info
    let totalSectionScores = 0;
    let totalSections = 0;
    let tick = 0;
    let SectionScores = [];
    let completion = true;
    sections.forEach(section => {
        tick += 1;

        const inputs = section.querySelectorAll('input[type="radio"]');
        const uniqueQuestions = [...new Set(Array.from(inputs).map(input => input.name))];
        let totalScore = 0;
        let answeredQuestions = 0;

        const sectionName = section.getAttribute('data-section');
        const sectionProgress = document.createElement('ul');
        //sectionProgress.innerHTML = `< strong > ${ sectionName }</strong >: `;

        uniqueQuestions.forEach(questionName => {
            const options = section.querySelectorAll(`input[name="${questionName}"]`);
            const selectedOption = form.querySelector(`input[name="${questionName}"]:checked`);
            const questionScore = document.createElement('li');
            if (selectedOption) {
                const selectedIndex = Array.from(options).indexOf(selectedOption) + 1;
                const score = ((selectedIndex - 1) / (options.length - 1)) * 100;
                totalScore += score;
                answeredQuestions++;
                questionScore.innerHTML = `${qList[questionName]} : <strong>${selectedOption.value}</strong>  (${score.toFixed(0)}% indicative score)`;
            } else {
                questionScore.innerHTML = `${qList[questionName]} : <strong>Not Answered</strong>`;
            }
            sectionProgress.appendChild(questionScore);
        });

        // Calculate overall score for the section
        let overallScore = answeredQuestions > 0 ? (totalScore / answeredQuestions).toFixed(0) : 0;

        if (uniqueQuestions.length == 0) { overallScore = 100 };
        const isFullyAnswered = answeredQuestions === uniqueQuestions.length;
        completion = completion && isFullyAnswered;  //boolean AND to test of all sections are fully answered up to this point
        if (isFullyAnswered) {
            var roundDiv = document.getElementById('marker' + (tick));
            roundDiv.classList.add('complete');

            var roundDiv = document.getElementById('round' + (tick));
            roundDiv.classList.add('complete');
        }
        totalSectionScores += parseFloat(totalScore);
        totalSections += answeredQuestions;

        const sectionOverallScore = document.createElement('p');
        sectionOverallScore.innerHTML = `<strong>Overall Score for ${sectionName}: ${overallScore}%</strong> (${formatTime(Number(stageTime[tick]))} mins - ${isFullyAnswered ? "Complete" : "Incomplete"})`;
        sectionProgress.prepend(sectionOverallScore);
        SectionScores.push({ name: sectionName, value: Number(overallScore), time: Number(stageTime[tick]) });
        const fullAnswerStatus = document.createElement('p');
        //fullAnswerStatus.innerHTML = `< strong > ${ sectionName } Fully Answered:</strong > ${ isFullyAnswered ? "Yes" : "No" } `;
        sectionProgress.appendChild(fullAnswerStatus);

        progressDiv.appendChild(sectionProgress);

    });
    if (completion) {
        ExcerciseComplete = true;
    }
    // Calculate overall score for the entire form
    const overallFormScore = totalSections > 0 ? (totalSectionScores / totalSections).toFixed(0) : 0;
    overallScore = `Exercise Summary (Indicative Score: ${overallFormScore}%)`;
    return SectionScores;
};

/////////////////////////////////////////////
// Report Generation and Charting
/////////////////////////////////////////////
function generateCharts(data) {

    let chart = document.createElement('div');
    chart.classList.add('chart-container');
    chart.appendChild(barchart(data));
    chart.appendChild(donutchart(data));
    return chart.outerHTML;
}

function barchart(data) {
    const colors = generateDistinctColorVariations(200, data.length);
    // Calculate the total value
    const totalValue = data.reduce((sum, item) => sum + item.value, 0);

    // Get the chart container
    let chart = document.createElement('div');
    chart.classList.add('bchart');

    // Generate bars and labels dynamically
    data.forEach((item, i) => {
        // Create bar container
        const bar = document.createElement('div');
        bar.classList.add('bar');

        // Create the inner bar
        const barInner = document.createElement('div');
        barInner.classList.add('bar-inner');
        barInner.style.height = `${item.value}% `;
        barInner.style.background = `${colors[i]} `;
        // Add percentage label
        const barLabel = document.createElement('div');
        barLabel.classList.add('bar-label');
        barLabel.textContent = `${item.value}% `;

        // Create x-axis label
        const xAxisLabel = document.createElement('div');
        xAxisLabel.classList.add('x-axis-label');
        xAxisLabel.textContent = item.name;

        // Append everything
        barInner.appendChild(barLabel);
        bar.appendChild(barInner);
        bar.appendChild(xAxisLabel);
        chart.appendChild(bar);
    });
    return chart;
}

function donutchart(inputData) {
    const colors = generateDistinctColorVariations(200, inputData.length);
    // Generate dynamic percentages and colors
    const totalValue = inputData.reduce((sum, item) => sum + item.time, 0);
    const data = inputData.map(item => (item.time / totalValue) * 100);

    // Generate the conic-gradient segments dynamically
    const segments = data
        .map((percentage, index) => {
            const start = index === 0
                ? 0
                : data.slice(0, index).reduce((a, b) => a + b, 0);
            return `${colors[index]} ${start}% ${start + percentage}% `;
        })
        .join(', ');
    document.documentElement.style.setProperty('--segments', segments);

    // Get the chart container
    let chart = document.createElement('div');
    chart.classList.add('dchart');
    chart.style.background = `conic-gradient(${segments})`;
    let labelContainer = document.createElement('div');
    labelContainer.classList.add('dlabel-container');
    let cumulativePercentage = 0;

    const offsetRadians = -Math.PI / 2; // Aligns with CSS 12 o'clock start

    inputData.forEach((item, index) => {
        const percentage = data[index];
        const angle = (cumulativePercentage + percentage / 2) * 3.6; // Convert percentage to degrees
        cumulativePercentage += percentage;

        const radians = (angle * Math.PI) / 180 + offsetRadians; // Add the offset for alignment

        const x = 50 + 40 * Math.cos(radians); // Adjust radius for label placement
        const y = 50 + 40 * Math.sin(radians);

        const label = document.createElement('div');
        label.classList.add('dlabel');
        label.style.left = `${x}% `;
        label.style.top = `${y}% `;
        label.textContent = `${item.name} (${Math.round(percentage)}%)`;
        label.style.color = '#fff';

        labelContainer.appendChild(label);
    });
    chart.appendChild(labelContainer);
    return chart;
}

function generateDistinctColorVariations(baseHue, numVariants) {
    const colors = [];
    const saturationStep = 40; // Step size for saturation
    const lightnessStep = 30; // Step size for lightness

    let currentSaturation = 40; // Starting saturation
    let currentLightness = 40; // Starting lightness

    for (let i = 0; i < numVariants; i++) {
        // Clamp lightness to stay between 20% and 80%
        const clampedLightness = Math.min(80, Math.max(40, currentLightness));
        // Clamp saturation to stay above 20%
        const clampedSaturation = Math.max(40, currentSaturation);
        colors.push(`hsl(${baseHue}, ${clampedSaturation}%, ${clampedLightness}%)`);

        // Alternate adjustments for distinct variations
        if (i % 2 === 0) {
            currentSaturation = (currentSaturation + saturationStep) % 100;
        } else {
            currentLightness = (currentLightness + lightnessStep) % 100;
        }
    }

    return colors;
}


/////////////////////////////////////////////
// Markdown processing
/////////////////////////////////////////////



function parseConfigToJSON(configString) {
    const lines = configString.split(/\r?\n/);
    let json = {
        stages: []
    };
    let currentKey = null;
    let currentQuestion = null;
    let currentStage = null;
    let currentArrayContext = null;
    let multiLineKey = null;
    let multiLineValue = "";
    const MAX_MULTI_LINE_LENGTH = 10000; // Limit for multi-line value to prevent memory issues

    lines.forEach(line => {
        // Skip comments
        if (line.trim().startsWith('//')) {
            return;
        }
        const trimmedLine = line.trim();

        if (multiLineKey && (trimmedLine.startsWith('! ') || trimmedLine.startsWith('# ') || trimmedLine.startsWith('? ') || trimmedLine.startsWith('@ ') || trimmedLine.startsWith('+ '))) {
            // If we encounter a new line type, flush the multi-line value
            if (currentStage) {
                currentStage[multiLineKey] = processMarkdown(multiLineValue.trim());
            } else {
                json[multiLineKey] = processMarkdown(multiLineValue.trim());
            }
            multiLineKey = null;
            multiLineValue = "";
        }

        if (trimmedLine.startsWith('! ')) {
            // Handle key-value pairs or start of multi-line value
            const keyValue = trimmedLine.slice(2).split(/:(.+)/).filter(item => item.trim() !== '');
            if (keyValue.length === 2) {
                const key = keyValue[0].trim();
                const value = keyValue[1].trim();
                if (currentStage) {
                    // Add key-value pair to the current stage
                    currentStage[key] = escapeHTML(value);
                } else {
                    // Add key-value pair to the root level
                    json[key] = escapeHTML(value);
                }
            } else if (keyValue.length === 1) {
                // Start of a multi-line value
                multiLineKey = keyValue[0].trim();
                multiLineValue = "";
            }
            currentKey = null; // Reset current key since it's not an array context
            currentQuestion = null; // Reset current question context
            currentArrayContext = null; // Reset array context
        } else if (trimmedLine.startsWith('# ')) {
            // Handle new array declaration
            currentKey = trimmedLine.slice(2).trim();
            if (currentStage) {
                currentStage[currentKey] = [];
            } else {
                json[currentKey] = [];
            }
            currentQuestion = null; // Reset current question context
            currentArrayContext = currentKey; // Set current array context
        } else if (trimmedLine.startsWith('? ')) {
            // Handle question declaration
            const questionText = trimmedLine.slice(2).trim();
            currentQuestion = {
                question: escapeHTML(questionText),
                answers: []
            };
            if (currentStage) {
                if (!currentStage.questions) {
                    currentStage.questions = [];
                }
                currentStage.questions.push(currentQuestion);
            } else {
                if (!json.questions) {
                    json.questions = [];
                }
                json.questions.push(currentQuestion);
            }
            currentKey = null; // Reset current key since it's not an array context
            currentArrayContext = null; // Reset array context
        } else if (trimmedLine.startsWith('@ ')) {
            // Handle new stage declaration
            const stageName = trimmedLine.slice(2).trim();
            currentStage = {
                stage: escapeHTML(stageName)
            };
            json.stages.push(currentStage);
            currentKey = null; // Reset current key since it's not an array context
            currentQuestion = null; // Reset current question context
            currentArrayContext = null; // Reset array context
        } else if (trimmedLine.startsWith('+ ')) {
            // Handle array items or question answers
            const itemText = trimmedLine.slice(2).trim();
            if (currentArrayContext && currentStage && Array.isArray(currentStage[currentArrayContext])) {
                currentStage[currentArrayContext].push(itemText);
            } else if (currentArrayContext && Array.isArray(json[currentArrayContext])) {
                json[currentArrayContext].push(itemText);
            } else if (currentQuestion) {
                currentQuestion.answers.push(itemText);
            }
        } else if (multiLineKey) {
            // Accumulate multi-line value, prevent excessive length
            if (multiLineValue.length + trimmedLine.length <= MAX_MULTI_LINE_LENGTH) {
                multiLineValue += trimmedLine + "\n";
            }
        }
    });

    // Flush any remaining multi-line value
    if (multiLineKey) {
        if (currentStage) {
            currentStage[multiLineKey] = processMarkdown(multiLineValue.trim());
        } else {
            json[multiLineKey] = processMarkdown(multiLineValue.trim());
        }
    }

    return json;
}

function processMarkdown(text) {
    // Basic markdown processing for paragraphs, bold, italics, lists, quotes
    let paragraphs = text.split(/\n\n+/);
    let processedText = "";

    paragraphs.forEach(paragraph => {
        let processed = escapeHTML(paragraph.trim());
        // Bold text **text**
        processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Italic text *text*
        processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Embedded videos %%[alt text](url)
        processed = processed.replace(/%%\((.*?)\)/g, (match, url) => {
            return `<iframe width="100%" class="SFmedia" src="${url}"></iframe>`;
        });
        // Embedded images %[alt text](url)
        processed = processed.replace(/%\((.*?)\)/g, (match, url) => {
            return `<img class="SFmedia" src="${url}">`;
        });


        // Media canvases =[title](optional image URL)
        processed = processed.replace(/=\[(.*?)\](?:\((.*?)\))?/g, (match, title, url) => {

            const safeTitle = title.trim();
            const imagePart = url ? `<img src="${url}" alt="${escapeHTML(safeTitle)}">` : "";
            return `<div class="canvas-object"><h3>${escapeHTML(safeTitle)}</h3>${imagePart}</div>`;
        });

        processed = processed.replace(/=\[(.*?)\](?:\((.*?)\))?/g, (match, title, url) => {
            const safeTitle = title.trim();
            const imagePart = url ? `<img src="${url}" alt="${escapeHTML(safeTitle)}">` : "";
            return `<div class="canvas-object"><h3>${escapeHTML(safeTitle)}</h3>${imagePart}</div>`;
        });

        // Accumulate list items for bulleted and numbered lists
        let bulletItems = [];
        let numberedItems = [];
        const lines = processed.split('\n');
        lines.forEach(line => {
            if (/^\s*\-\s+(.*)$/.test(line)) {
                bulletItems.push(line.replace(/^\s*\-\s+/, ''));
            } else if (/^\s*\d+\.\s+(.*)$/.test(line)) {
                numberedItems.push(line.replace(/^\s*\d+\.\s+/, ''));
            } else {
                if (bulletItems.length > 0) {
                    processedText += '<ul>' + bulletItems.map(item => `<li>${item}</li>`).join('') + '</ul>';
                    bulletItems = [];
                }
                if (numberedItems.length > 0) {
                    processedText += '<ol>' + numberedItems.map(item => `<li>${item}</li>`).join('') + '</ol>';
                    numberedItems = [];
                }
                processedText += `<p>${line}</p>`;
            }
        });

        // Flush remaining list items
        if (bulletItems.length > 0) {
            processedText += '<ul>' + bulletItems.map(item => `<li>${item}</li>`).join('') + '</ul>';
        }
        if (numberedItems.length > 0) {
            processedText += '<ol>' + numberedItems.map(item => `<li>${item}</li>`).join('') + '</ol>';
        }
    });

    // Blockquotes
    processedText = processedText.replace(/<p>~\s+(.*?)<\/p>/g, '<blockquote>$1</blockquote>');

    return processedText;
}

function escapeHTML(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}