

var exs = [];


//Handler for scenario files. Calls populateQuestions() to initalise the dashboard.
function handleFileSelect() {
  const file = "lib/manifest.json";
  fetch(file)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok ' + response.statusText);
      }
      return response.text();
    })
    .then(data => {
      exs = JSON.parse(data);
      console.log(exs);
      // Event listener for modal close button
      document.getElementById('close-modal').addEventListener('click', closeModal);

      // Event listener for search input to trigger filtering
      document.getElementById('search').addEventListener('input', filterexs);

      // Initialize filters and display exs on load
      initializeFilters();
      displayexs(exs);
    })
    .catch(error => {
      console.error('There was a problem with the fetch operation:', error);
    });


  //   } catch (error) {
  //     alert('Error parsing Scenario file.');
  //}
}

// Function to display exs
function displayexs(filteredexs) {


  const gallery = document.getElementById('gallery');
  gallery.innerHTML = '';
  filteredexs.forEach(ex => {
    const exTile = document.createElement('div');
    exTile.classList.add('ex-tile');

    // Updated HTML structure of ex tiles
    if (ex.image) {
      exTile.style.background = "#ccc";
      exTile.style.backgroundImage = `url(lib/images/${ex.image}.png)`;
      exTile.style.backgroundSize = "cover";
      exTile.style.backgroundBlendMode = "multiply";
      exTile.style.backgroundPosition = "center";


    }
    exTile.innerHTML = `
      <h3>${ex.title}</h3>
      <div class="ex-attributes">
        
        <p><img src="images/level.svg"/><br/>${ex.level}</p>
        <p><img src="images/group.svg"/><br/>${ex.size}</p>
        <p><img src="images/clock.svg"/><br/>${ex.duration}</p>
      </div>
    `;
    exTile.addEventListener('click', () => openModal(ex));
    gallery.appendChild(exTile);
  });
}

// Function to filter exs based on selected filters and search
function filterexs() {
  const searchValue = document.getElementById('search').value.toLowerCase();
  const selectedCategories = Array.from(document.querySelectorAll('#category-filter input:checked')).map(el => el.value);
  const selectedLevels = Array.from(document.querySelectorAll('#level-filter input:checked')).map(el => el.value);
  const selectedSizes = Array.from(document.querySelectorAll('#size-filter input:checked')).map(el => el.value);
  const selectedDurations = Array.from(document.querySelectorAll('#duration-filter input:checked')).map(el => el.value);

  const filteredexs = exs.filter(ex => {
    const matchesCategory = selectedCategories.length === 0 || ex.categories.some(category => selectedCategories.includes(category));
    const matchesLevel = selectedLevels.length === 0 || selectedLevels.includes(ex.level);
    const matchesSize = selectedSizes.length === 0 || selectedSizes.includes(ex.size);
    const matchesDuration = selectedDurations.length === 0 || selectedDurations.includes(ex.duration);

    // Updated to search both title and description
    const matchesSearch = ex.title.toLowerCase().includes(searchValue) || ex.summary.toLowerCase().includes(searchValue);

    return matchesCategory && matchesLevel && matchesDuration && matchesSize && matchesSearch;
  });

  displayexs(filteredexs);
}

// Initialize filters dynamically
function initializeFilters() {
  const categories = [...new Set(exs.flatMap(ex => ex.categories))];
  const levels = [...new Set(exs.map(ex => ex.level))];
  const sizes = [...new Set(exs.map(ex => ex.size))];
  const durations = [...new Set(exs.map(ex => ex.duration))];

  const categoryFilter = document.getElementById('category-filter');
  const levelFilter = document.getElementById('level-filter');
  const sizeFilter = document.getElementById('size-filter');
  const durationFilter = document.getElementById('duration-filter');

  categories.forEach(category => {
    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" value="${category}"> ${category}`;
    label.addEventListener('change', filterexs);
    categoryFilter.appendChild(label);
  });

  levels.forEach(level => {
    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" value="${level}"> ${level}`;
    label.addEventListener('change', filterexs);
    levelFilter.appendChild(label);
  });
  /*
    sizes.forEach(size => {
      const label = document.createElement('label');
      label.innerHTML = `<input type="checkbox" value="${size}"> ${size}`;
      label.addEventListener('change', filterexs);
      sizeFilter.appendChild(label);
    });
  */
  durations.forEach(duration => {
    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" value="${duration}"> ${duration}`;
    label.addEventListener('change', filterexs);
    durationFilter.appendChild(label);
  });
}

// Function to open modal with ex details
function openModal(ex) {
  const modal = document.getElementById('modal');
  const modalContent = document.querySelector('.modal-header');
  document.getElementById('modal-title').textContent = ex.title;
  document.getElementById('modal-summary').innerHTML = ex.summary;
  document.getElementById('tag-content').textContent = ex.categories.join(', ');
  document.getElementById('modal-attributes').innerHTML = `
        <p><img src="images/level.svg"/><br/>${ex.level}</p>
        <p><img src="images/group.svg"/><br/>${ex.size}</p>
        <p><img src="images/clock.svg"/><br/>${ex.duration}</p>
      </div>
    `;
  document.getElementById("downloader").href = `lib/scenarios/${ex.image}.ttxf`;
  document.getElementById("starter").href = `gym?q=${ex.image}`;

  modal.style.display = 'flex';
  modalContent.style.background = "#ccc";
  modalContent.style.backgroundImage = `url(lib/images/${ex.image}.png)`;
  modalContent.style.backgroundSize = "cover";
  modalContent.style.backgroundPosition = "center";
  modalContent.style.backgroundBlendMode = "multiply";
}

// Function to close modal
function closeModal() {
  document.getElementById('modal').style.display = 'none';
}

handleFileSelect();