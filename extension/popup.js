document.addEventListener('DOMContentLoaded', () => {
  // Search filter
  const searchInput = document.getElementById('search-input');
  const toolCards = document.querySelectorAll('.tool-card');

  searchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    toolCards.forEach(card => {
      const match = !q || card.dataset.title.toLowerCase().includes(q) || card.textContent.toLowerCase().includes(q);
      card.style.display = match ? 'flex' : 'none';
    });
  });

  // Open links in new tab cleanly
  document.querySelectorAll('a').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      e.preventDefault();
      const url = anchor.getAttribute('href');
      if (url) {
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
          chrome.tabs.create({ url });
        } else {
          window.open(url, '_blank');
        }
      }
    });
  });
});
