export function initWowReveal(): () => void {
  const wowElements = Array.from(document.querySelectorAll<HTMLElement>(".wow"));
  if (wowElements.length === 0) {
    return () => {};
  }

  const previousVisibility = wowElements.map(element => element.style.visibility);
  // Content and controls must remain usable before/without the scroll observer.
  wowElements.forEach(element => { element.style.visibility = 'visible'; });

  const observer = new IntersectionObserver(
    (entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        const target = entry.target as HTMLElement;
        target.style.visibility = "visible";
        target.classList.add("animated");

        const delay = target.dataset.wowDelay;
        if (delay) {
          target.style.animationDelay = delay;
        }

        currentObserver.unobserve(target);
      });
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.1 }
  );

  wowElements.forEach((element) => observer.observe(element));

  return () => {
    observer.disconnect();
    wowElements.forEach((element, index) => { element.style.visibility = previousVisibility[index]; });
  };
}
