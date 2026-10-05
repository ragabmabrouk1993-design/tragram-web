type SwiperLike = {
  destroy: (deleteInstance?: boolean, cleanStyles?: boolean) => void;
};

type SwiperConstructor = new (
  container: HTMLElement,
  options: Record<string, unknown>
) => SwiperLike;

const registrations: Array<{ selector: string; options: Record<string, unknown> }> = [
  {
    selector: ".social-app-slider .swiper",
    options: {
      slidesPerView: 4,
      speed: 2000,
      spaceBetween: 40,
      loop: true,
      autoplay: {
        delay: 5000,
      },
      breakpoints: {
        768: { slidesPerView: 6 },
        991: { slidesPerView: 9 },
      },
    },
  },
  {
    selector: ".our-interface-slider .swiper",
    options: {
      slidesPerView: 1,
      speed: 2000,
      spaceBetween: 30,
      loop: true,
      autoplay: {
        delay: 5000,
      },
      pagination: {
        el: ".interface-pagination",
        clickable: true,
      },
      breakpoints: {
        768: { slidesPerView: 3 },
        1025: { slidesPerView: 5 },
      },
    },
  },
  {
    selector: ".testimonial-slider .swiper",
    options: {
      slidesPerView: 1,
      speed: 1000,
      spaceBetween: 30,
      loop: true,
      autoplay: {
        delay: 5000,
      },
      pagination: {
        el: ".testimonial-pagination",
        clickable: true,
      },
      navigation: {
        nextEl: ".testimonial-button-next",
        prevEl: ".testimonial-button-prev",
      },
    },
  },
  {
    selector: ".company-supports-slider .swiper",
    options: {
      slidesPerView: 2,
      speed: 1000,
      spaceBetween: 30,
      loop: true,
      autoplay: {
        delay: 5000,
      },
      breakpoints: {
        768: { slidesPerView: 3 },
        991: { slidesPerView: 4 },
        1025: { slidesPerView: 5 },
      },
    },
  },
  {
    selector: ".testimonial-slider-elite .swiper",
    options: {
      slidesPerView: 1,
      speed: 1000,
      spaceBetween: 20,
      loop: true,
      autoplay: {
        delay: 5000,
      },
      breakpoints: {
        768: { slidesPerView: 2 },
        991: { slidesPerView: 2 },
      },
    },
  },
];

export function initSwipers(): () => void {
  const swipers: SwiperLike[] = [];
  let disposed = false;

  void (async () => {
    const swiperModule = await import("swiper/bundle");
    if (disposed) {
      return;
    }

    const Swiper = swiperModule.default as unknown as SwiperConstructor;

    const register = (selector: string, options: Record<string, unknown>) => {
      document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
        if (element.dataset.tgSwiperInitialized === "true") {
          return;
        }

        element.dataset.tgSwiperInitialized = "true";
        const instance = new Swiper(element, options);
        swipers.push(instance);
      });
    };

    registrations.forEach((registration) => {
      register(registration.selector, registration.options);
    });
  })();

  return () => {
    disposed = true;
    swipers.forEach((swiper) => swiper.destroy(true, true));
    document
      .querySelectorAll<HTMLElement>("[data-tg-swiper-initialized]")
      .forEach((element) => {
        delete element.dataset.tgSwiperInitialized;
      });
  };
}
