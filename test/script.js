// Add event listeners for the title bars
document.querySelectorAll('.collapsible').forEach(collapsible => {
    const titleBar = collapsible.querySelector('.title-bar');
    const button = collapsible.querySelector('.toggle-btn');
    const contentWrapper = collapsible.querySelector('.content-wrapper');
    const content = collapsible.querySelector('.content');

    titleBar.addEventListener('click', () => {
        toggleCollapsible(collapsible.id);
    });
});

// Function to toggle a collapsible by ID
function toggleCollapsible(id) {
    const collapsible = document.getElementById(id);
    const contentWrapper = collapsible.querySelector('.content-wrapper');
    const button = collapsible.querySelector('.toggle-btn');
    const content = collapsible.querySelector('.content');

    if (contentWrapper.style.height === '0px' || !contentWrapper.style.height) {
        contentWrapper.style.height = `${content.scrollHeight}px`;
        contentWrapper.style.padding = '10px';

        button.textContent = '▲';
    } else {
        contentWrapper.style.height = '0px';
        contentWrapper.style.padding = `0`;
        button.textContent = '▼';
    }
}

// Function to expand a collapsible by ID
function expandCollapsible(id) {
    const collapsible = document.getElementById(id);
    const contentWrapper = collapsible.querySelector('.content-wrapper');
    const button = collapsible.querySelector('.toggle-btn');
    const content = collapsible.querySelector('.content');

    contentWrapper.style.height = `${content.scrollHeight}px`;
    contentWrapper.style.padding = "1rem";
    button.textContent = '▲';
}

// Function to collapse a collapsible by ID
function collapseCollapsible(id) {
    const collapsible = document.getElementById(id);
    const contentWrapper = collapsible.querySelector('.content-wrapper');
    const button = collapsible.querySelector('.toggle-btn');

    contentWrapper.style.height = '0px';
    contentWrapper.style.padding = `0`;
    button.textContent = '▼';
}
