

var products = [];


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
      products = JSON.parse(data);
      console.log(products);
      // Event listener for modal close button
      document.getElementById('close-modal').addEventListener('click', closeModal);

      // Event listener for search input to trigger filtering
      document.getElementById('search').addEventListener('input', filterProducts);

      // Initialize filters and display products on load
      initializeFilters();
      displayProducts(products);
    })
    .catch(error => {
      console.error('There was a problem with the fetch operation:', error);
    });


  //   } catch (error) {
  //     alert('Error parsing Scenario file.');
  //}
}

// Function to display products
function displayProducts(filteredProducts) {


  const gallery = document.getElementById('gallery');
  gallery.innerHTML = '';
  filteredProducts.forEach(product => {
    const productTile = document.createElement('div');
    productTile.classList.add('product-tile');

    // Updated HTML structure of product tiles
    if (product.image) {
      productTile.style.background = "#ccc";
      productTile.style.backgroundImage = `url(lib/images/${product.image}.png)`;
      productTile.style.backgroundSize = "cover";
      productTile.style.backgroundBlendMode = "multiply";


    }
    productTile.innerHTML = `
      <h3>${product.title}</h3>
      <div class="product-attributes">
        
        <p><img src="images/level.svg"/><br/>${product.level}</p>
        <p><img src="images/group.svg"/><br/>${product.size}</p>
        <p><img src="images/clock.svg"/><br/>${product.duration}</p>
      </div>
    `;
    productTile.addEventListener('click', () => openModal(product));
    gallery.appendChild(productTile);
  });
}

// Function to filter products based on selected filters and search
function filterProducts() {
  const searchValue = document.getElementById('search').value.toLowerCase();
  const selectedCategories = Array.from(document.querySelectorAll('#category-filter input:checked')).map(el => el.value);
  const selectedLevels = Array.from(document.querySelectorAll('#level-filter input:checked')).map(el => el.value);
  const selectedSizes = Array.from(document.querySelectorAll('#size-filter input:checked')).map(el => el.value);
  const selectedDurations = Array.from(document.querySelectorAll('#duration-filter input:checked')).map(el => el.value);

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategories.length === 0 || product.categories.some(category => selectedCategories.includes(category));
    const matchesLevel = selectedLevels.length === 0 || selectedLevels.includes(product.level);
    const matchesSize = selectedSizes.length === 0 || selectedSizes.includes(product.size);
    const matchesDuration = selectedDurations.length === 0 || selectedDurations.includes(product.duration);

    // Updated to search both title and description
    const matchesSearch = product.title.toLowerCase().includes(searchValue) || product.summary.toLowerCase().includes(searchValue);

    return matchesCategory && matchesLevel && matchesDuration && matchesSize && matchesSearch;
  });

  displayProducts(filteredProducts);
}

// Initialize filters dynamically
function initializeFilters() {
  const categories = [...new Set(products.flatMap(product => product.categories))];
  const levels = [...new Set(products.map(product => product.level))];
  const sizes = [...new Set(products.map(product => product.size))];
  const durations = [...new Set(products.map(product => product.duration))];

  const categoryFilter = document.getElementById('category-filter');
  const levelFilter = document.getElementById('level-filter');
  const sizeFilter = document.getElementById('size-filter');
  const durationFilter = document.getElementById('duration-filter');

  categories.forEach(category => {
    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" value="${category}"> ${category}`;
    label.addEventListener('change', filterProducts);
    categoryFilter.appendChild(label);
  });

  levels.forEach(level => {
    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" value="${level}"> ${level}`;
    label.addEventListener('change', filterProducts);
    levelFilter.appendChild(label);
  });
  /*
    sizes.forEach(size => {
      const label = document.createElement('label');
      label.innerHTML = `<input type="checkbox" value="${size}"> ${size}`;
      label.addEventListener('change', filterProducts);
      sizeFilter.appendChild(label);
    });
  */
  durations.forEach(duration => {
    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" value="${duration}"> ${duration}`;
    label.addEventListener('change', filterProducts);
    durationFilter.appendChild(label);
  });
}

// Function to open modal with product details
function openModal(product) {
  const modal = document.getElementById('modal');
  const modalContent = document.querySelector('.modal-header');
  document.getElementById('modal-title').textContent = product.title;
  document.getElementById('modal-summary').textContent = product.summary;
  document.getElementById('tag-content').textContent = product.categories.join(', ');
  document.getElementById('modal-attributes').innerHTML = `
        <p><img src="images/level.svg"/><br/>${product.level}</p>
        <p><img src="images/group.svg"/><br/>${product.size}</p>
        <p><img src="images/clock.svg"/><br/>${product.duration}</p>
      </div>
    `;
  document.getElementById("downloader").href = `lib/scenarios/${product.image}.ttxf`;
  document.getElementById("starter").href = `gym?q=${product.image}`;

  modal.style.display = 'flex';
  modalContent.style.background = "#ccc";
  modalContent.style.backgroundImage = `url(lib/images/${product.image}.png)`;
  modalContent.style.backgroundSize = "cover";
  modalContent.style.backgroundPosition = "center";
  modalContent.style.backgroundBlendMode = "multiply";
}

// Function to close modal
function closeModal() {
  document.getElementById('modal').style.display = 'none';
}

handleFileSelect();