
var finish = {
    "title": "Excercise Outcomes", "content": "Finish the exercise by discussing and collating what you learned, how your understanding of this type of threat has changed and what processes you might update as a result.", "observations": ["What did you learn from running the exercise?",
        "How has your understanding of preventing this type of cyber security threat changed?",
        "What will you look to change or implement across your organisation?"]
};
var start;
let firsttimer = 0;
let timeron = 0;
let timerInterval = null;
let stageTime = [];
let questionCounter = 0;  // Global counter for unique IDs
let roundCounter = 0;  // Global counter for unique IDs
let ActiveStage = 0;
let fileContent, data;
let timer = false;
let bc = new BroadcastChannel('cyex_channel');
document.getElementById('fileInput').addEventListener('change', handleFileSelect, false);
const urlParams = new URLSearchParams(window.location.search);

if (urlParams.has('q')) {
    const targetFile = urlParams.get('q').replace(/\W/g, '');
    const filepath = "../lib/scenarios/" + targetFile + ".ttxf";



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

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
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
    document.getElementById('times-header').classList.remove('hide');
    document.getElementById('timer').classList.remove('hide');

    //start is the inital screen for the participants (effectively treated as 'stage 0'). title, summary, and topics pulled from scenario data.
    start = { "title": fileContent.title, "content": fileContent.summary, "observations": fileContent.topics };
    let container = document.getElementById('questionsContainer');//parent div for round data in 'scribe' window
    container.innerHTML = ''; // Clear existing content

    let stageContainer = document.getElementById('stageWrapper');//parent div for stage navigation indicators
    stageContainer.innerHTML = ''; // Clear existing content

    // Create navigation button
    let roundMarker = document.createElement('button');
    roundMarker.id = 'previous';
    roundMarker.innerHTML = '<img src="../images/previous.svg"/> <span>previous</span>'; // Clear existing content
    roundMarker.onclick = function () { previousStage(); };
    stageContainer.appendChild(roundMarker);

    // Create start marker, prior to loop to populate stage markeres
    roundMarker = document.createElement('div');
    roundMarker.innerHTML = '<img src="../images/start.svg"/>'; // Clear existing content
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
            //stage comments
            const comment = document.createElement('textarea');
            comment.className = 'description';
            comment.placeholder = "Record comments and observations here";
            descriptionWrapper.appendChild(comment);

            if (round.questions) {
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

    let confirmer = document.getElementById('scenarioLoader');
    confirmer.innerHTML = "<h2>" + fileContent.title + "</h2>";
    statfields = document.createElement('div');
    statfields.className = 'stat';
    statfields.innerHTML = roundCounter + " Stages"; // Clear existing content
    confirmer.appendChild(statfields);

    statfields = document.createElement('div');
    statfields.className = 'stat';
    statfields.innerHTML = questionCounter + " Questions"; // Clear existing content
    confirmer.appendChild(statfields);
    confirmer.classList.add('scdone');

    document.getElementById('launcher').classList.remove('hide');


    roundMarker = document.createElement('div');
    roundMarker.className = 'stage';
    roundMarker.innerHTML = '<img src="../images/finish.svg"/>'; // Clear existing content
    stageContainer.appendChild(roundMarker);
    roundMarker = document.createElement('button');
    roundMarker.id = 'next';
    roundMarker.innerHTML = '<span>next </span><img src="../images/next.svg"/>'; // Clear existing content
    roundMarker.onclick = function () { nextStage(); };
    stageContainer.appendChild(roundMarker);
    previousStage();
} // End of scenario initalisation




// report generation

document.getElementById('questionsForm').addEventListener('submit', function (event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const answers = {};

    formData.forEach((value, key) => {
        answers[key] = value;
    });

    console.log('Submitted answers:', answers);
    // You can now send `answers` to a server or process it as needed
});


function setActiveStage(stageNumber) {
    var stages = document.querySelectorAll('.stage');
    stages.forEach((stage, index) => {
        if (index <= stageNumber) {
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
        document.getElementById("timer").innerHTML = '<span>Ready&nbsp;</span> <img src="../images/playpause.svg" />';
    } else {
        document.getElementById('previous').classList.remove('hidden');
    }
    if (stageNumber == roundCounter + 1) {
        document.getElementById('next').classList.add('hidden');
        document.getElementById('reportlauncher').classList.remove('hide');
        document.getElementById("timer").innerHTML = '<span>Ready&nbsp;</span> <img src="../images/playpause.svg" />';
    } else {
        document.getElementById('next').classList.remove('hidden');
    }
}

// Example usage: Highlight the second stage

function nextStage() {
    if (ActiveStage < roundCounter) {
        ActiveStage++;
        if (firsttimer == 0) {
            firsttimer = 1;
            toggleTimer();
            startStopTimer();
        }
        setActiveStage(ActiveStage);
        bc.postMessage({ "title": data[ActiveStage - 1].stage, "content": data[ActiveStage - 1].content, "observations": data[ActiveStage - 1].observations }); /* send */
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
        bc.postMessage({ "title": data[ActiveStage - 1].stage, "content": data[ActiveStage - 1].content, "observations": data[ActiveStage - 1].observations }); /* send */
    }
    else {
        ActiveStage = 0;
        setActiveStage(ActiveStage);
        bc.postMessage(start); /* send */
    }
}

function launchPresentation() {
    var link = document.createElement("a");
    link.href = "presentation.html";
    link.target = "_blank";
    link.click();
    setTimeout(() => {
        nextStage();
        previousStage(); /* send */
    }, "250");

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
                currentTimerLabel = '<span>Resume&nbsp;</span> <img src="../images/start.svg" />';
                document.getElementById("timer").innerHTML = currentTimerLabel;
                timer = false;
            }
            else {
                currentTimerLabel = '<span>Pause&nbsp;</span> <img src="../images/pause.svg" />';
                document.getElementById("timer").innerHTML = currentTimerLabel;
                timer = true;
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