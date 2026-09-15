document.querySelectorAll('.prototype-carousel').forEach(carousel => {
  const slides = [...carousel.querySelectorAll('[data-slide]')];
  const choices = [...carousel.querySelectorAll('[data-goto]')];
  let current = 0;
  const show = index => {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => { slide.hidden = i !== current; });
    choices.forEach((button, i) => button.setAttribute('aria-pressed', String(i === current)));
    carousel.querySelector('.carousel-count').textContent = `${current + 1} / ${slides.length}`;
  };
  carousel.querySelectorAll('[data-direction]').forEach(button => button.addEventListener('click', () => show(current + Number(button.dataset.direction))));
  choices.forEach(button => button.addEventListener('click', () => show(Number(button.dataset.goto))));
  carousel.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault(); show(current + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
});
