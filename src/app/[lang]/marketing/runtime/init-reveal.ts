export function initReveal(): () => void {
  const revealElements = Array.from(
    document.querySelectorAll<HTMLElement>(".reveal, .text-anime-style-3")
  );

  if (revealElements.length === 0) {
    return () => {};
  }

  const observer = new IntersectionObserver(
    (entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        const target = entry.target as HTMLElement;
        target.classList.add("tg-in-view");
        currentObserver.unobserve(target);
      });
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
  );

  revealElements.forEach((element) => observer.observe(element));

  return () => {
    observer.disconnect();
  };
}
