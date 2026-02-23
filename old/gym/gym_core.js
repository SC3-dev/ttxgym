let reportHeaderHTML = `
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
  <title>Excercise Report</title>
  <style>
  * {
  box-sizing: border-box;
}
body {
  font-family: "Montserrat", Arial, sans-serif;
  margin: 0;
  padding: 0;
  align-items: center;
  display: flex;
  justify-content: center;
  flex-direction: column;
  width:80%;
  margin:auto;
  color-adjust: exact!important;  
  print-color-adjust:exact !important;
  -webkit-print-color-adjust:exact !important;
  font-size: 80%;
}
#headerRow{
    display: flex;
    width: 100%;
    justify-content: space-between;

}
#logo{

    width: 10rem;
}
#title{

}
#helper{
    background:#bf5f5f;
    border-radius: 0.3rem;
    border-left:5px solid #e00;
    color:#fff;
    padding:1rem;
    margin:1rem;
}
#content{
}
.chart-container {
    display: flex;
    padding: 1rem;
    box-sizing: border-box;
    justify-content: space-evenly;
  }
  
  .bchart {
    display: flex;
    align-items: flex-end;
    margin: 0 2rem;
    flex: 1 0 25%; max-width: 25%
  }
  .chart-title{
      display:flex;
      justify-content: space-evenly;
      text-align: center;
  }
  .chart-title div{
      flex: 1 0 25%; max-width: 25%
  }
  
  .bar {
    flex: 1;
    margin: 0 10px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    position: relative;
    text-align: center;
    font-weight: bold;
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
    margin-bottom: 5px;
  }
  
  .x-axis-label {
    margin-top: 5px;
    font-weight: bold;
  }
  
  .dchart {
    border-radius: 50%;
    position: relative;
    aspect-ratio: 1;
    margin: 0 2rem;
    flex: 1 0 25%; max-width: 25%
  }
  
  .dchart::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 40%;
    height: 40%;
    background-color: #fff;
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
    background: #fff;
    padding: 0.2rem 0.5rem;
    border-radius: 0.2rem;
    font-weight: bold;
    color:#000;
    pointer-events: none;
    width: max-content;
    text-align:center;
  }

  [contenteditable] {
    outline: 0px solid transparent;
  }

  @media screen {
}
@media print{
    body{
        width:100%;
    }
    #helper{
        display:none;
    }
}
</style>
</head>

<body><div id="headerRow"><div id="title"><h1>Exercise Report</h1></div><div id="logo"><svg viewBox="0 0 210 83.999996" xmlns="http://www.w3.org/2000/svg"
xmlns:svg="http://www.w3.org/2000/svg">
<g>
    <path style="fill:#000;stroke-width:0.144177"
        d="m 123.95944,30.43245 0.001,-1.117375 5.11724,-6.112717 c 2.81453,-3.361993 5.11729,-6.171028 5.11729,-6.242298 0,-0.07123 -2.30323,-2.881476 -5.1183,-6.244894 l -5.1183,-6.1153013 v -1.086954 -1.086943 l 3.28003,0.0063 3.28005,0.0063 3.8207,4.544782 c 2.10139,2.499633 3.91803,4.6295583 4.03697,4.7331703 0.18592,0.161956 0.77129,-0.476686 4.17186,-4.5515563 l 3.95559,-4.739934 h 3.28934 3.28932 v 1.052384 1.052384 l -5.19039,6.1834383 c -2.85472,3.400899 -5.1886,6.219979 -5.18639,6.264626 0.002,0.04464 2.33524,2.838581 5.18451,6.208731 l 5.18051,6.127543 0.006,1.117375 0.006,1.117376 -3.28004,-0.0032 -3.28003,-0.0032 -4.03542,-4.764205 c -3.77303,-4.454434 -4.04959,-4.7469 -4.25324,-4.498099 -0.1198,0.146359 -1.92418,2.291532 -4.00975,4.767043 l -3.792,4.500917 h -3.23672 -3.23673 l 0.001,-1.117376 z"
        id="path220" />
    <path style="fill:#000;stroke-width:0.144177"
        d="M 103.62935,20.159802 V 8.7697787 h -5.767107 -5.767099 v -3.171906 -3.171905 h 14.634016 14.63402 v 3.171905 3.171906 h -5.69501 -5.69501 V 20.159802 31.549826 h -3.1719 -3.17191 z"
        id="path218" />
    <path style="fill:#000;stroke-width:0.144177"
        d="M 71.045229,20.159802 V 8.7697787 h -5.695017 -5.695007 v -3.171906 -3.171905 h 14.561929 14.561929 v 3.171905 3.171906 H 83.084046 77.38904 V 20.159802 31.549826 h -3.171906 -3.171905 z"
        id="path216" />
    <path style="fill:#1a6ec0;fill-opacity:1;stroke-width:0.139424"
        d="m 56.568246,44.749266 c 0.132103,-1.130608 0.11982,-5.393817 -0.01826,-6.336905 l -0.09381,-0.640428 h 50.057284 50.05728 l -0.0914,0.775254 c -0.14125,1.198686 -0.15482,4.546774 -0.0241,5.932418 l 0.1177,1.247158 H 106.51352 56.453986 Z"
        id="path214" />
    <path style="fill:#1a6ec0;stroke-width:0.144177;fill-opacity:1"
        d="m 200.94868,51.986986 c 0,-0.01984 -0.19934,-0.522652 -0.44235,-1.117376 -0.24303,-0.594734 -0.62663,-1.835993 -0.85249,-2.758363 -1.17752,-4.80902 -0.86406,-9.679602 0.90117,-14.002281 l 0.57405,-1.405726 h 4.0357 4.03569 l -0.26157,0.39649 c -1.23002,1.864399 -2.0063,3.624311 -2.54655,5.77324 -0.26627,1.059149 -0.3139,1.638572 -0.30464,3.706429 0.0142,3.191363 0.30209,4.354515 1.81632,7.340458 l 1.06655,2.103165 h -4.01068 c -2.20589,0 -4.01093,-0.01625 -4.0112,-0.03609 z"
        id="path212" />
    <path style="fill:#1a6ec0;fill-opacity:1;stroke-width:0.144177"
        d="m 3.0885296,51.941186 c 0,-0.04506 0.44678,-0.969549 0.99284,-2.054529 1.56297,-3.105469 1.81674,-4.159426 1.81148,-7.523519 -0.003,-2.117705 -0.0453,-2.529327 -0.38251,-3.748616 -0.62502,-2.259971 -1.27274,-3.70054 -2.47959,-5.514785 l -0.26374,-0.396489 h 4.03913 4.0391284 l 0.508459,1.214635 c 1.175244,2.807495 1.592501,5.008816 1.600805,8.445255 0.0084,3.455866 -0.441579,6.004916 -1.515078,8.583574 l -0.448069,1.076317 H 7.0399596 c -2.17329,0 -3.95143,-0.03683 -3.95143,-0.08188 z"
        id="path210" />
    <path style="fill:#1a6ec0;stroke-width:0.144177;fill-opacity:1"
        d="m 188.14448,64.45835 c -4.60694,-9.066036 -6.34795,-19.950671 -4.79103,-29.952887 0.79263,-5.092105 2.34256,-10.128325 4.37061,-14.201486 l 0.75375,-1.513865 5.15491,-0.03788 5.15492,-0.03788 -1.44187,2.36676 c -1.68405,2.764325 -2.62234,4.771433 -3.60217,7.705364 -1.48568,4.448683 -2.16923,8.595656 -2.16312,13.123333 0.0109,8.068699 2.41694,16.120002 6.77075,22.656654 0.44893,0.674024 0.86412,1.306609 0.92263,1.405726 0.0843,0.142814 -0.97051,0.180221 -5.08108,0.180221 h -5.18744 z"
        id="path208" />
    <path style="fill:#1a6ec0;fill-opacity:1;stroke-width:0.144177"
        d="M 13.442562,64.890886 C 21.430959,52.97521 22.612598,37.550731 16.537975,24.485129 16.224594,23.811095 15.34227,22.237758 14.577265,20.988827 L 13.186333,18.71803 h 5.166097 5.166087 l 0.803415,1.698254 c 5.365207,11.340999 6.308978,24.008992 2.687685,36.076248 -0.753947,2.512395 -1.94733,5.507012 -3.117002,7.821643 l -0.928945,1.838262 h -5.183434 -5.183435 z"
        id="path206" />
    <path style="fill:#1a6ec0;stroke-width:0.144177;fill-opacity:1"
        d="m 174.53173,78.948193 c -5.15518,-8.267119 -8.66247,-19.326858 -9.79592,-30.890037 -0.24331,-2.48236 -0.24156,-10.536496 0.003,-12.975982 1.12233,-11.203007 4.06279,-20.780917 9.1843,-29.9160563 l 1.53618,-2.74015 h 5.47631 5.47631 l -0.49924,0.68484 c -2.41341,3.310656 -5.29765,8.4418153 -7.00382,12.4600833 -6.83569,16.098892 -7.07266,34.022086 -0.66592,50.365278 1.74301,4.446298 4.74992,9.997815 7.52608,13.895014 0.41656,0.58477 0.72226,1.12003 0.67935,1.18946 -0.0429,0.0694 -2.43321,0.12626 -5.31175,0.12626 h -5.23371 z"
        id="path204" />
    <path style="fill:#000;stroke-width:0.144177"
        d="M 121.65153,67.017498 V 52.888101 l 3.13587,5.7e-4 3.13586,5.8e-4 3.17191,3.780699 c 1.74455,2.079391 3.89837,4.64314 4.78628,5.697244 l 1.61436,1.916538 4.77081,-5.697761 4.77081,-5.69787 h 3.16659 3.16657 v 14.129397 14.129405 h -3.09878 -3.09876 l -0.0371,-9.382769 -0.037,-9.382768 -4.75785,5.697085 c -2.61683,3.1334 -4.7903,5.700884 -4.82996,5.705506 -0.0397,0.0042 -2.24556,-2.565511 -4.90203,-5.711405 l -4.82995,-5.719804 -0.037,9.397077 -0.0371,9.397078 h -3.02668 -3.02669 z"
        id="path202" />
    <path style="fill:#000;stroke-width:0.144177"
        d="m 100.45743,75.865912 v -5.280979 l -1.344169,-1.819764 c -0.739298,-1.000858 -3.6589,-4.950452 -6.487984,-8.776859 -2.829095,-3.826422 -5.143811,-6.989316 -5.143811,-7.028665 0,-0.03936 1.617879,-0.07154 3.595271,-0.07154 h 3.595282 l 4.42039,5.550836 c 2.431221,3.05296 4.432961,5.550842 4.448301,5.550842 0.0153,0 2.00418,-2.497006 4.41964,-5.54889 l 4.39174,-5.548884 3.64048,-0.0021 c 2.00227,-0.001 3.64048,0.03218 3.64048,0.07376 0,0.04168 -1.83591,2.555739 -4.0798,5.586882 -2.24389,3.031139 -5.16348,6.979234 -6.48798,8.773567 l -2.40819,3.262401 v 5.280114 5.2801 h -3.09983 -3.09982 z"
        id="path200" />
    <path style="fill:#000;stroke-width:0.144177"
        d="m 62.502123,80.992853 c -1.603358,-0.38525 -3.146168,-1.67929 -3.90041,-3.2715 l -0.460373,-0.97187 v -9.731985 -9.731983 l 0.47064,-0.962093 c 0.817123,-1.670376 2.149173,-2.774973 3.881596,-3.2188 0.768181,-0.196799 2.098574,-0.22127 10.08887,-0.185561 9.200985,0.04115 9.204277,0.04126 10.016894,0.369845 1.187347,0.480148 2.594836,1.823046 3.180052,3.034115 0.444291,0.91942 0.467685,1.054456 0.522915,3.017034 l 0.05783,2.05453 h -3.115852 -3.115852 v -1.153422 -1.153422 h -8.003075 -8.003064 l 0.03725,7.965804 0.03725,7.965814 7.965804,0.03725 7.965804,0.03725 v -2.163882 -2.163893 h -3.027719 -3.02773 v -3.02772 -3.02773 h 6.134855 6.134866 l -0.04337,6.019414 -0.04337,6.019405 -0.463865,0.94788 c -0.594481,1.21481 -1.698782,2.31911 -2.913576,2.91359 l -0.947886,0.46386 -9.443633,0.0241 c -5.211651,0.0133 -9.686177,-0.0342 -9.984879,-0.106 z"
        id="path198" />
    <path style="fill:#1a6ec0;fill-opacity:1;stroke-width:0.144177"
        d="m 25.519705,81.021453 c -0.0439,-0.071 0.03978,-0.28263 0.185983,-0.47036 1.311927,-1.68534 3.639855,-5.502462 5.220114,-8.559464 C 37.220777,59.814061 39.557125,45.873306 37.606851,32.126537 36.200366,22.212685 32.499604,12.59703 26.939043,4.4084047 l -1.3462,-1.982437 5.436392,0.0021 5.436382,0.0021 1.40982,2.557101 c 2.522363,4.575035 4.243812,8.5214633 5.769337,13.2262383 6.107588,18.835993 4.615545,39.223717 -4.167783,56.950123 -0.589373,1.189457 -1.607315,3.006103 -2.262092,4.036963 l -1.190513,1.87431 -5.212463,0.0379 c -2.957294,0.0214 -5.24697,-0.0179 -5.292218,-0.0912 z"
        id="path179" />
</g>
</svg></div></div><div id="helper"><p>This is the draft exercise report. All text in the report below can be edited directly in the browser, so that any amendments or changes can be made before the report is finalised.</p><p>Once you are ready to produce the final report for reference or for dissemination, simply click <a href="javascript:if(window.print)window.print()">here</a> or press CTRL+P, and select "Print to PDF". This will produce a final exercise report - this text box will not be included.</p></div><div id="content" contenteditable="true">`;
let reportFooterHTML = `</div></body></html>`;

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
  <title>TTX Gym - Participant Window</title>
  <style>
  * {
  box-sizing: border-box;
}

body {
  font-family: "Montserrat", Arial, sans-serif;
  margin: 0;
  padding: 0;

  background-color: #202634;
  background-image: radial-gradient(circle at 82% 60%, rgba(59, 59, 59, 0.06) 0%, rgba(59, 59, 59, 0.06) 69%, transparent 69%, transparent 100%), radial-gradient(circle at 36% 0%, rgba(185, 185, 185, 0.06) 0%, rgba(185, 185, 185, 0.06) 59%, transparent 59%, transparent 100%), radial-gradient(circle at 58% 82%, rgba(183, 183, 183, 0.06) 0%, rgba(183, 183, 183, 0.06) 17%, transparent 17%, transparent 100%), radial-gradient(circle at 71% 32%, rgba(19, 19, 19, 0.06) 0%, rgba(19, 19, 19, 0.06) 40%, transparent 40%, transparent 100%), radial-gradient(circle at 77% 5%, rgba(31, 31, 31, 0.06) 0%, rgba(31, 31, 31, 0.06) 52%, transparent 52%, transparent 100%), radial-gradient(circle at 96% 80%, rgba(11, 11, 11, 0.06) 0%, rgba(11, 11, 11, 0.06) 73%, transparent 73%, transparent 100%), radial-gradient(circle at 91% 59%, rgba(252, 252, 252, 0.06) 0%, rgba(252, 252, 252, 0.06) 44%, transparent 44%, transparent 100%), radial-gradient(circle at 52% 82%, rgba(223, 223, 223, 0.06) 0%, rgba(223, 223, 223, 0.06) 87%, transparent 87%, transparent 100%), radial-gradient(circle at 84% 89%, rgba(160, 160, 160, 0.06) 0%, rgba(160, 160, 160, 0.06) 57%, transparent 57%, transparent 100%), linear-gradient(90deg, rgb(25, 43, 143), rgb(28, 122, 104));

  height: 100vh;
  width: 100vw;
  box-sizing: border-box;
  align-items: center;
  display: flex;
  justify-content: center;
  flex-direction: column;
}

input[type="range"]{
	color: #1a6ec0;
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
  padding: 0px 1rem;
}

#discussionWrap{
    margin: 1rem;
    padding: 1rem;
    background-color: rgb(0, 51, 102);
    border-left: 5px solid rgb(20, 129, 184);
    border-radius: 0.3rem;
    box-sizing: border-box;
    fill: rgb(20, 129, 184);
    display: none;
}
#discussionWrap.show{
    display:flex;
    align-items: center;
}

#discussion {
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
  fill:#fff;

}
#fullscreen:hover {
    fill:#1a6ec0;
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
  display: flex;
  align-items: flex-end;
  margin: 0 2rem;
  flex: 1 0 25%; max-width: 25%
}
.chart-title{
    display:flex;
    justify-content: space-evenly;
    text-align: center;
}
.chart-title div{
    flex: 1 0 25%; max-width: 25%
}

.bar {
  flex: 1;
  margin: 0 10px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  position: relative;
  text-align: center;
  font-weight: bold;
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
  margin-bottom: 5px;
}

.x-axis-label {
  margin-top: 5px;
  font-weight: bold;
}

.dchart {
  border-radius: 50%;
  position: relative;
  border: 1px solid #202634;
  aspect-ratio: 1;
  margin: 0 2rem;
  flex: 1 0 25%; max-width: 25%
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
  font-weight: bold;
  color:#fff;
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
      <div id="discussionWrap">
      <div id="icon"><svg xmlns="http://www.w3.org/2000/svg" height="2rem" viewBox="0 -960 960 960" width="2rem"><path d="M240-400h320v-80H240v80Zm0-120h480v-80H240v80Zm0-120h480v-80H240v80ZM80-80v-720q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H240L80-80Zm126-240h594v-480H160v525l46-45Zm-46 0v-480 480Z"/></svg></div>
      <ol id="discussion"></ol>
      </div>
    </div>
    </div>
  </div>
  <div id="control">
  <svg xmlns="http://www.w3.org/2000/svg" height="2rem" viewBox="0 -960 960 960" width="2rem"><path d="M240-80 80-240l160-160 57 56-64 64h494l-63-64 56-56 160 160L720-80l-57-56 64-64H233l63 64-56 56Zm36-360 164-440h80l164 440h-76l-38-112H392l-40 112h-76Zm138-176h132l-64-182h-4l-64 182Z"/></svg>
    <input id="slider" type="range" min="10" max="40" oninput="changeSizeBySlider()">
    <div id="fullscreen" onclick="toggleFullscreen()" name="btn4">
    <svg xmlns="http://www.w3.org/2000/svg" height="2rem" viewBox="0 -960 960 960" width="2rem"><path d="M560-280h200v-200h-80v120H560v80ZM200-480h80v-120h120v-80H200v200Zm-40 320q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm0-80h640v-480H160v480Zm0 0v-480 480Z"/></svg>
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
      container.innerHTML = ev.data.content; // Clear existing contentev.data.content
      container = document.getElementById('discussion');
      container.innerHTML = ""; // Clear existing discussion

      if( ev.data.discussion) {

        var discussionDiv = document.getElementById('discussionWrap');
        discussionDiv.classList.add('show');
        ev.data.discussion.forEach(item => {
        row = document.createElement('li');
        row.innerHTML = item;
        container.appendChild(row);
      })
    }else{        var discussionDiv = document.getElementById('discussionWrap');
    discussionDiv.classList.remove('show');
    }
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
    "title": "Excercise Outcomes", "content": "<p>Finish the exercise by discussing and collating what you learned, how your understanding of this scenario has changed and what processes you might update as a result.</p><p>Make recommendations that will develop confidence in the areas that have been identified as having scope for improvement. Allocate the recommendations to the people in your organisation who can facilitate change and action improvement.</p><p>Discuss the risks associated with not addressing the recommendations. Ensure any recommendations are implemented and when ready, run the exercise again to see how those changes have impacted upon your organisation.</p>", "discussion": ["What did you learn from running the exercise?",
        "How has your understanding of this scenario changed?",
        "What will you look to change or implement across your organisation?", "How can recommendations be assigned and tracked within your organisation?"]
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
let reportDiv = document.createElement('div');
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
    // document.getElementById('scribe').classList.remove('hide');
    // document.getElementById('timer').classList.remove('hide');

    //start is the inital screen for the participants (effectively treated as 'stage 0'). title, summary, and topics pulled from scenario data.
    start = { "type": "update", "title": fileContent.title, "content": fileContent.summary, "discussion": fileContent.topics };
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
    let showUI = document.querySelectorAll(".hide");
    showUI.forEach(name => { name.classList.remove('hide'); });

    // document.getElementById('launcher').classList.remove('hide');


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
    let reportBuilder = reportHeaderHTML;
    reportBuilder += "<p><h2>" + start.title + "</h2><h3>" + new Date().toLocaleDateString() + "</h3>" + start.content + "</p>";
    reportBuilder += "<p><h2>" + overallScore + "</h2>";
    reportBuilder += generateCharts(Scores) + reportDiv.innerHTML + reportFooterHTML;
    serveFile(reportBuilder, "report.html"); /* send */
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
        bc.postMessage({ "type": "update", "title": data[ActiveStage - 1].stage, "content": data[ActiveStage - 1].content, "discussion": data[ActiveStage - 1].discussion }); /* send */
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
        bc.postMessage({ "type": "update", "title": data[ActiveStage - 1].stage, "content": data[ActiveStage - 1].content, "discussion": data[ActiveStage - 1].discussion }); /* send */
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
        bc.postMessage({ "type": "update", "title": data[ActiveStage - 1].stage, "content": data[ActiveStage - 1].content, "discussion": data[ActiveStage - 1].discussion }); /* send */
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
    questionCounter = 0;
    roundCounter = 0;
    ActiveStage = 0;
    fileName, fileContent, data = "";
    timer = false;
    ExcerciseComplete = false;
    qList = [];
    rawFileData = "";
    firsttimer = 0;
    clearInterval(timerInterval);
    timerInterval = null;

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
    reportDiv.innerHTML = ''; // Clear progress info
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
        const reportProgress = document.createElement('div');
        const sectionTitle = document.createElement('h3');
        sectionTitle.innerHTML = sectionName;
        reportProgress.appendChild(sectionTitle);
        const scribeNotes = document.createElement('div');
        scribeNotes.style = "white-space:pre";
        scribeNotes.innerHTML = section.querySelector('textarea').value;
        reportProgress.appendChild(scribeNotes);
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

        if (answeredQuestions > 0) {
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
            sectionOverallScore.innerHTML = `<strong>Overall Score for stage ${tick} ("${sectionName}"): ${overallScore}%</strong> (${formatTime(Number(stageTime[tick]))} mins - ${isFullyAnswered ? "Complete" : "Incomplete"})`;
            sectionProgress.prepend(sectionOverallScore);
            SectionScores.push({ name: "Stage " + tick, value: Number(overallScore), time: Number(stageTime[tick]) });

            progressDiv.appendChild(sectionProgress);
            reportProgress.appendChild(progressDiv.cloneNode(sectionProgress));
            reportDiv.appendChild(reportProgress);
        }
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
    let charttitle = document.createElement('div');
    charttitle.classList.add('chart-title');
    let bartitle = document.createElement('div');
    bartitle.innerHTML = "<h3>Score by Stage</h3>";
    let pietitle = document.createElement('div');
    pietitle.innerHTML = "<h3>Stage by Duration</h3>";
    charttitle.appendChild(bartitle);
    charttitle.appendChild(pietitle);
    let chart = document.createElement('div');
    chart.classList.add('chart-container');

    chart.appendChild(barchart(data));
    chart.appendChild(donutchart(data));
    return charttitle.outerHTML + chart.outerHTML;
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