const revealItems = document.querySelectorAll(".post-row");

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal");
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12 }
  );

  revealItems.forEach((item) => {
    item.classList.remove("reveal");
    observer.observe(item);
  });
}
