(() => {
  const sections = [...document.querySelectorAll('.step')];
  const navigation = document.querySelector('.step-navigation');
  const back = navigation.querySelector('.back');
  const next = navigation.querySelector('.next');
  const count = navigation.querySelector('.page-count');
  const heading = document.querySelector('.puzzle-title');
  let current = 0;

  function showPage(moveFocus = false) {
    const requested = sections.findIndex(section => '#' + section.id === location.hash);
    current = requested < 0 ? 0 : requested;
    sections.forEach((section, index) => { section.hidden = index !== current; });
    back.disabled = current === 0;
    next.disabled = current === sections.length - 1;
    heading.textContent = 'PUZZLE #001: ' + (current === 0 ? 'THE START' :
      current === sections.length - 1 ? 'COMPLETED' : 'STEP ' + current);
    count.textContent = current === 0 ? 'The Start' :
      current === sections.length - 1 ? 'Completed' : 'Step ' + current + ' of 8';
    document.title = 'Puzzle #001 · ' + count.textContent + ' | Classic Train Tracks';
    if (moveFocus) {
      heading.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }
  function moveBy(offset) {
    const target = current + offset;
    if (target < 0 || target >= sections.length) return;
    history.pushState(null, '', '#' + sections[target].id);
    showPage(true);
  }
  back.addEventListener('click', () => moveBy(-1));
  next.addEventListener('click', () => moveBy(1));
  window.addEventListener('popstate', () => showPage(true));
  window.addEventListener('hashchange', () => showPage(true));
  document.body.classList.add('enhanced');
  navigation.hidden = false;
  showPage();
})();
