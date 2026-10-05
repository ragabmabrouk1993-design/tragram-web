import enHomeMessages from "@/messages/en/home.json";
export type Home2Copy = {
  nav: {
    home: string;
    homeVersion1: string;
    homeVersion2: string;
    homeVersion3: string;
    about: string;
    features: string;
    blog: string;
    pages: string;
    blogDetails: string;
    team: string;
    teamDetails: string;
    pricing: string;
    testimonials: string;
    imageGallery: string;
    faqs: string;
    notFound: string;
    contact: string;
    downloadApp: string;
    login: string;
    dashboard: string;
    logout: string;
  };
  hero: {
    kicker: string;
    title: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    playLabel: string;
    weeklyTaskTitle: string;
    weeklyTaskSubtitle: string;
    taskCompleted: string;
    engagedUsers: string;
  };
  about: {
    kicker: string;
    title: string;
    body: string;
    item1Title: string;
    item1Body: string;
    item2Title: string;
    item2Body: string;
    counter1Label: string;
    counter2Label: string;
    counter3Label: string;
  };
  features: {
    kicker: string;
    title: string;
    item1Title: string;
    item1Body: string;
    item1Tag: string;
    item2Title: string;
    item2Body: string;
    item2Tag: string;
    item3Title: string;
    item3Body: string;
    item3Tag: string;
    item4Title: string;
    item4Body: string;
    item4Tag: string;
    footerTag1: string;
    footerTag2: string;
    footerTag3: string;
    footerTag4: string;
    footerText: string;
    footerLink: string;
  };
  whyChoose: {
    kicker: string;
    title: string;
    body: string;
    ratingLabel: string;
    item1Title: string;
    item1Body: string;
    item2Title: string;
    item2Body: string;
    item3Title: string;
    item3Body: string;
  };
  digitalCompanion: {
    kicker: string;
    title: string;
    body: string;
    listItem1: string;
    listItem2: string;
    listItem3: string;
    listItem4: string;
    item1Title: string;
    item1Body: string;
    item2Title: string;
    item2Body: string;
    cta: string;
  };
  benefits: {
    kicker: string;
    title: string;
    body: string;
    cta: string;
    feature1Title: string;
    feature1Body: string;
    activeUsersLabel: string;
    feature2Title: string;
    feature2Body: string;
    feature3Title: string;
    feature3Body: string;
    feature3ListItem1: string;
    feature3ListItem2: string;
  };
  tools: {
    kicker: string;
    title: string;
    body: string;
    featureItem1: string;
    featureItem2: string;
    featureItem3: string;
    cta: string;
    playLabel: string;
    ctaSecondary: string;
  };
  pricing: {
    kicker: string;
    title: string;
    tabMonthly: string;
    tabYearly: string;
    planBasic: string;
    planStandard: string;
    planEnterprise: string;
    planDescription: string;
    monthlySuffix: string;
    yearlySuffix: string;
    includedTitle: string;
    feature1: string;
    feature2: string;
    feature3: string;
    cta: string;
    benefit1: string;
    benefit2: string;
    benefit3: string;
  };
  testimonials: {
    kicker: string;
    title: string;
    dragLabel: string;
    slide1Quote: string;
    slide1Name: string;
    slide1Role: string;
    slide2Quote: string;
    slide2Name: string;
    slide2Role: string;
    slide3Quote: string;
    slide3Name: string;
    slide3Role: string;
    ctaTitle: string;
    ctaBody: string;
    footerText: string;
    footerReviews: string;
  };
  faqs: {
    kicker: string;
    title: string;
    body: string;
    cta: string;
    ratingLabel: string;
    ratingBody: string;
    satisfactionLabel: string;
    questions: {
      q: string;
      a: string;
    }[];
  };
  cta: {
    kicker: string;
    title: string;
    body: string;
    downloadsLabel: string;
  };
  blog: {
    kicker: string;
    title: string;
    readMore: string;
    viewLabel: string;
    post1Title: string;
    post1Body: string;
    post2Title: string;
    post2Body: string;
    post3Title: string;
    post3Body: string;
  };
  footer: {
    about: string;
    addressLabel: string;
    addressValue: string;
    quickLinksTitle: string;
    quickLinkHome: string;
    quickLinkAbout: string;
    quickLinkBlog: string;
    quickLinkPricing: string;
    quickLinkFeatures: string;
    quickLinkContact: string;
    quickLinkAccountDeletion: string;
    supportTitle: string;
    supportHelpCenter: string;
    supportPrivacy: string;
    supportFaqs: string;
    supportTerms: string;
    supportRefund: string;
    newsletterTitle: string;
    newsletterBody: string;
    newsletterPlaceholder: string;
    copyright: string;
    socialsTitle: string;
  };
  notFound: {
    title: string;
    breadcrumbHome: string;
    breadcrumbActive: string;
    errorTitle: string;
    errorBody: string;
    backHome: string;
  };
  preloader: {
    alt: string;
  };
};

export const defaultHome2Copy: Home2Copy = enHomeMessages.home2 as Home2Copy;

export function getHome2Copy(dict: { home2?: Partial<Home2Copy> } | null | undefined): Home2Copy {
  const nav: Partial<Home2Copy["nav"]> = dict?.home2?.nav ?? {};
  const hero: Partial<Home2Copy["hero"]> = dict?.home2?.hero ?? {};
  const about: Partial<Home2Copy["about"]> = dict?.home2?.about ?? {};
  const features: Partial<Home2Copy["features"]> = dict?.home2?.features ?? {};
  const whyChoose: Partial<Home2Copy["whyChoose"]> = dict?.home2?.whyChoose ?? {};
  const digitalCompanion: Partial<Home2Copy["digitalCompanion"]> =
    dict?.home2?.digitalCompanion ?? {};
  const benefits: Partial<Home2Copy["benefits"]> = dict?.home2?.benefits ?? {};
  const tools: Partial<Home2Copy["tools"]> = dict?.home2?.tools ?? {};
  const pricing: Partial<Home2Copy["pricing"]> = dict?.home2?.pricing ?? {};
  const testimonials: Partial<Home2Copy["testimonials"]> = dict?.home2?.testimonials ?? {};
  const faqs: Partial<Home2Copy["faqs"]> = dict?.home2?.faqs ?? {};
  const cta: Partial<Home2Copy["cta"]> = dict?.home2?.cta ?? {};
  const blog: Partial<Home2Copy["blog"]> = dict?.home2?.blog ?? {};
  const footer: Partial<Home2Copy["footer"]> = dict?.home2?.footer ?? {};
  const notFound: Partial<Home2Copy["notFound"]> = dict?.home2?.notFound ?? {};
  const preloader: Partial<Home2Copy["preloader"]> = dict?.home2?.preloader ?? {};
  return {
    nav: {
      home: nav.home ?? defaultHome2Copy.nav.home,
      homeVersion1: nav.homeVersion1 ?? defaultHome2Copy.nav.homeVersion1,
      homeVersion2: nav.homeVersion2 ?? defaultHome2Copy.nav.homeVersion2,
      homeVersion3: nav.homeVersion3 ?? defaultHome2Copy.nav.homeVersion3,
      about: nav.about ?? defaultHome2Copy.nav.about,
      features: nav.features ?? defaultHome2Copy.nav.features,
      blog: nav.blog ?? defaultHome2Copy.nav.blog,
      pages: nav.pages ?? defaultHome2Copy.nav.pages,
      blogDetails: nav.blogDetails ?? defaultHome2Copy.nav.blogDetails,
      team: nav.team ?? defaultHome2Copy.nav.team,
      teamDetails: nav.teamDetails ?? defaultHome2Copy.nav.teamDetails,
      pricing: nav.pricing ?? defaultHome2Copy.nav.pricing,
      testimonials: nav.testimonials ?? defaultHome2Copy.nav.testimonials,
      imageGallery: nav.imageGallery ?? defaultHome2Copy.nav.imageGallery,
      faqs: nav.faqs ?? defaultHome2Copy.nav.faqs,
      notFound: nav.notFound ?? defaultHome2Copy.nav.notFound,
      contact: nav.contact ?? defaultHome2Copy.nav.contact,
      downloadApp: nav.downloadApp ?? defaultHome2Copy.nav.downloadApp,
      login: nav.login ?? defaultHome2Copy.nav.login,
      dashboard: nav.dashboard ?? defaultHome2Copy.nav.dashboard,
      logout: nav.logout ?? defaultHome2Copy.nav.logout,
    },
    hero: {
      kicker: hero.kicker ?? defaultHome2Copy.hero.kicker,
      title: hero.title ?? defaultHome2Copy.hero.title,
      subtitle: hero.subtitle ?? defaultHome2Copy.hero.subtitle,
      ctaPrimary: hero.ctaPrimary ?? defaultHome2Copy.hero.ctaPrimary,
      ctaSecondary: hero.ctaSecondary ?? defaultHome2Copy.hero.ctaSecondary,
      playLabel: hero.playLabel ?? defaultHome2Copy.hero.playLabel,
      weeklyTaskTitle: hero.weeklyTaskTitle ?? defaultHome2Copy.hero.weeklyTaskTitle,
      weeklyTaskSubtitle: hero.weeklyTaskSubtitle ?? defaultHome2Copy.hero.weeklyTaskSubtitle,
      taskCompleted: hero.taskCompleted ?? defaultHome2Copy.hero.taskCompleted,
      engagedUsers: hero.engagedUsers ?? defaultHome2Copy.hero.engagedUsers,
    },
    about: {
      kicker: about.kicker ?? defaultHome2Copy.about.kicker,
      title: about.title ?? defaultHome2Copy.about.title,
      body: about.body ?? defaultHome2Copy.about.body,
      item1Title: about.item1Title ?? defaultHome2Copy.about.item1Title,
      item1Body: about.item1Body ?? defaultHome2Copy.about.item1Body,
      item2Title: about.item2Title ?? defaultHome2Copy.about.item2Title,
      item2Body: about.item2Body ?? defaultHome2Copy.about.item2Body,
      counter1Label: about.counter1Label ?? defaultHome2Copy.about.counter1Label,
      counter2Label: about.counter2Label ?? defaultHome2Copy.about.counter2Label,
      counter3Label: about.counter3Label ?? defaultHome2Copy.about.counter3Label,
    },
    features: {
      kicker: features.kicker ?? defaultHome2Copy.features.kicker,
      title: features.title ?? defaultHome2Copy.features.title,
      item1Title: features.item1Title ?? defaultHome2Copy.features.item1Title,
      item1Body: features.item1Body ?? defaultHome2Copy.features.item1Body,
      item1Tag: features.item1Tag ?? defaultHome2Copy.features.item1Tag,
      item2Title: features.item2Title ?? defaultHome2Copy.features.item2Title,
      item2Body: features.item2Body ?? defaultHome2Copy.features.item2Body,
      item2Tag: features.item2Tag ?? defaultHome2Copy.features.item2Tag,
      item3Title: features.item3Title ?? defaultHome2Copy.features.item3Title,
      item3Body: features.item3Body ?? defaultHome2Copy.features.item3Body,
      item3Tag: features.item3Tag ?? defaultHome2Copy.features.item3Tag,
      item4Title: features.item4Title ?? defaultHome2Copy.features.item4Title,
      item4Body: features.item4Body ?? defaultHome2Copy.features.item4Body,
      item4Tag: features.item4Tag ?? defaultHome2Copy.features.item4Tag,
      footerTag1: features.footerTag1 ?? defaultHome2Copy.features.footerTag1,
      footerTag2: features.footerTag2 ?? defaultHome2Copy.features.footerTag2,
      footerTag3: features.footerTag3 ?? defaultHome2Copy.features.footerTag3,
      footerTag4: features.footerTag4 ?? defaultHome2Copy.features.footerTag4,
      footerText: features.footerText ?? defaultHome2Copy.features.footerText,
      footerLink: features.footerLink ?? defaultHome2Copy.features.footerLink,
    },
    whyChoose: {
      kicker: whyChoose.kicker ?? defaultHome2Copy.whyChoose.kicker,
      title: whyChoose.title ?? defaultHome2Copy.whyChoose.title,
      body: whyChoose.body ?? defaultHome2Copy.whyChoose.body,
      ratingLabel: whyChoose.ratingLabel ?? defaultHome2Copy.whyChoose.ratingLabel,
      item1Title: whyChoose.item1Title ?? defaultHome2Copy.whyChoose.item1Title,
      item1Body: whyChoose.item1Body ?? defaultHome2Copy.whyChoose.item1Body,
      item2Title: whyChoose.item2Title ?? defaultHome2Copy.whyChoose.item2Title,
      item2Body: whyChoose.item2Body ?? defaultHome2Copy.whyChoose.item2Body,
      item3Title: whyChoose.item3Title ?? defaultHome2Copy.whyChoose.item3Title,
      item3Body: whyChoose.item3Body ?? defaultHome2Copy.whyChoose.item3Body,
    },
    digitalCompanion: {
      kicker: digitalCompanion.kicker ?? defaultHome2Copy.digitalCompanion.kicker,
      title: digitalCompanion.title ?? defaultHome2Copy.digitalCompanion.title,
      body: digitalCompanion.body ?? defaultHome2Copy.digitalCompanion.body,
      listItem1: digitalCompanion.listItem1 ?? defaultHome2Copy.digitalCompanion.listItem1,
      listItem2: digitalCompanion.listItem2 ?? defaultHome2Copy.digitalCompanion.listItem2,
      listItem3: digitalCompanion.listItem3 ?? defaultHome2Copy.digitalCompanion.listItem3,
      listItem4: digitalCompanion.listItem4 ?? defaultHome2Copy.digitalCompanion.listItem4,
      item1Title: digitalCompanion.item1Title ?? defaultHome2Copy.digitalCompanion.item1Title,
      item1Body: digitalCompanion.item1Body ?? defaultHome2Copy.digitalCompanion.item1Body,
      item2Title: digitalCompanion.item2Title ?? defaultHome2Copy.digitalCompanion.item2Title,
      item2Body: digitalCompanion.item2Body ?? defaultHome2Copy.digitalCompanion.item2Body,
      cta: digitalCompanion.cta ?? defaultHome2Copy.digitalCompanion.cta,
    },
    benefits: {
      kicker: benefits.kicker ?? defaultHome2Copy.benefits.kicker,
      title: benefits.title ?? defaultHome2Copy.benefits.title,
      body: benefits.body ?? defaultHome2Copy.benefits.body,
      cta: benefits.cta ?? defaultHome2Copy.benefits.cta,
      feature1Title: benefits.feature1Title ?? defaultHome2Copy.benefits.feature1Title,
      feature1Body: benefits.feature1Body ?? defaultHome2Copy.benefits.feature1Body,
      activeUsersLabel: benefits.activeUsersLabel ?? defaultHome2Copy.benefits.activeUsersLabel,
      feature2Title: benefits.feature2Title ?? defaultHome2Copy.benefits.feature2Title,
      feature2Body: benefits.feature2Body ?? defaultHome2Copy.benefits.feature2Body,
      feature3Title: benefits.feature3Title ?? defaultHome2Copy.benefits.feature3Title,
      feature3Body: benefits.feature3Body ?? defaultHome2Copy.benefits.feature3Body,
      feature3ListItem1:
        benefits.feature3ListItem1 ?? defaultHome2Copy.benefits.feature3ListItem1,
      feature3ListItem2:
        benefits.feature3ListItem2 ?? defaultHome2Copy.benefits.feature3ListItem2,
    },
    tools: {
      kicker: tools.kicker ?? defaultHome2Copy.tools.kicker,
      title: tools.title ?? defaultHome2Copy.tools.title,
      body: tools.body ?? defaultHome2Copy.tools.body,
      featureItem1: tools.featureItem1 ?? defaultHome2Copy.tools.featureItem1,
      featureItem2: tools.featureItem2 ?? defaultHome2Copy.tools.featureItem2,
      featureItem3: tools.featureItem3 ?? defaultHome2Copy.tools.featureItem3,
      cta: tools.cta ?? defaultHome2Copy.tools.cta,
      playLabel: tools.playLabel ?? defaultHome2Copy.tools.playLabel,
      ctaSecondary: tools.ctaSecondary ?? defaultHome2Copy.tools.ctaSecondary,
    },
    pricing: {
      kicker: pricing.kicker ?? defaultHome2Copy.pricing.kicker,
      title: pricing.title ?? defaultHome2Copy.pricing.title,
      tabMonthly: pricing.tabMonthly ?? defaultHome2Copy.pricing.tabMonthly,
      tabYearly: pricing.tabYearly ?? defaultHome2Copy.pricing.tabYearly,
      planBasic: pricing.planBasic ?? defaultHome2Copy.pricing.planBasic,
      planStandard: pricing.planStandard ?? defaultHome2Copy.pricing.planStandard,
      planEnterprise: pricing.planEnterprise ?? defaultHome2Copy.pricing.planEnterprise,
      planDescription: pricing.planDescription ?? defaultHome2Copy.pricing.planDescription,
      monthlySuffix: pricing.monthlySuffix ?? defaultHome2Copy.pricing.monthlySuffix,
      yearlySuffix: pricing.yearlySuffix ?? defaultHome2Copy.pricing.yearlySuffix,
      includedTitle: pricing.includedTitle ?? defaultHome2Copy.pricing.includedTitle,
      feature1: pricing.feature1 ?? defaultHome2Copy.pricing.feature1,
      feature2: pricing.feature2 ?? defaultHome2Copy.pricing.feature2,
      feature3: pricing.feature3 ?? defaultHome2Copy.pricing.feature3,
      cta: pricing.cta ?? defaultHome2Copy.pricing.cta,
      benefit1: pricing.benefit1 ?? defaultHome2Copy.pricing.benefit1,
      benefit2: pricing.benefit2 ?? defaultHome2Copy.pricing.benefit2,
      benefit3: pricing.benefit3 ?? defaultHome2Copy.pricing.benefit3,
    },
    testimonials: {
      kicker: testimonials.kicker ?? defaultHome2Copy.testimonials.kicker,
      title: testimonials.title ?? defaultHome2Copy.testimonials.title,
      dragLabel: testimonials.dragLabel ?? defaultHome2Copy.testimonials.dragLabel,
      slide1Quote: testimonials.slide1Quote ?? defaultHome2Copy.testimonials.slide1Quote,
      slide1Name: testimonials.slide1Name ?? defaultHome2Copy.testimonials.slide1Name,
      slide1Role: testimonials.slide1Role ?? defaultHome2Copy.testimonials.slide1Role,
      slide2Quote: testimonials.slide2Quote ?? defaultHome2Copy.testimonials.slide2Quote,
      slide2Name: testimonials.slide2Name ?? defaultHome2Copy.testimonials.slide2Name,
      slide2Role: testimonials.slide2Role ?? defaultHome2Copy.testimonials.slide2Role,
      slide3Quote: testimonials.slide3Quote ?? defaultHome2Copy.testimonials.slide3Quote,
      slide3Name: testimonials.slide3Name ?? defaultHome2Copy.testimonials.slide3Name,
      slide3Role: testimonials.slide3Role ?? defaultHome2Copy.testimonials.slide3Role,
      ctaTitle: testimonials.ctaTitle ?? defaultHome2Copy.testimonials.ctaTitle,
      ctaBody: testimonials.ctaBody ?? defaultHome2Copy.testimonials.ctaBody,
      footerText: testimonials.footerText ?? defaultHome2Copy.testimonials.footerText,
      footerReviews: testimonials.footerReviews ?? defaultHome2Copy.testimonials.footerReviews,
    },
    faqs: {
      kicker: faqs.kicker ?? defaultHome2Copy.faqs.kicker,
      title: faqs.title ?? defaultHome2Copy.faqs.title,
      body: faqs.body ?? defaultHome2Copy.faqs.body,
      cta: faqs.cta ?? defaultHome2Copy.faqs.cta,
      ratingLabel: faqs.ratingLabel ?? defaultHome2Copy.faqs.ratingLabel,
      ratingBody: faqs.ratingBody ?? defaultHome2Copy.faqs.ratingBody,
      satisfactionLabel: faqs.satisfactionLabel ?? defaultHome2Copy.faqs.satisfactionLabel,
      questions: faqs.questions ?? defaultHome2Copy.faqs.questions,
    },
    cta: {
      kicker: cta.kicker ?? defaultHome2Copy.cta.kicker,
      title: cta.title ?? defaultHome2Copy.cta.title,
      body: cta.body ?? defaultHome2Copy.cta.body,
      downloadsLabel: cta.downloadsLabel ?? defaultHome2Copy.cta.downloadsLabel,
    },
    blog: {
      kicker: blog.kicker ?? defaultHome2Copy.blog.kicker,
      title: blog.title ?? defaultHome2Copy.blog.title,
      readMore: blog.readMore ?? defaultHome2Copy.blog.readMore,
      viewLabel: blog.viewLabel ?? defaultHome2Copy.blog.viewLabel,
      post1Title: blog.post1Title ?? defaultHome2Copy.blog.post1Title,
      post1Body: blog.post1Body ?? defaultHome2Copy.blog.post1Body,
      post2Title: blog.post2Title ?? defaultHome2Copy.blog.post2Title,
      post2Body: blog.post2Body ?? defaultHome2Copy.blog.post2Body,
      post3Title: blog.post3Title ?? defaultHome2Copy.blog.post3Title,
      post3Body: blog.post3Body ?? defaultHome2Copy.blog.post3Body,
    },
    footer: {
      about: footer.about ?? defaultHome2Copy.footer.about,
      addressLabel: footer.addressLabel ?? defaultHome2Copy.footer.addressLabel,
      addressValue: footer.addressValue ?? defaultHome2Copy.footer.addressValue,
      quickLinksTitle: footer.quickLinksTitle ?? defaultHome2Copy.footer.quickLinksTitle,
      quickLinkHome: footer.quickLinkHome ?? defaultHome2Copy.footer.quickLinkHome,
      quickLinkAbout: footer.quickLinkAbout ?? defaultHome2Copy.footer.quickLinkAbout,
      quickLinkBlog: footer.quickLinkBlog ?? defaultHome2Copy.footer.quickLinkBlog,
      quickLinkPricing: footer.quickLinkPricing ?? defaultHome2Copy.footer.quickLinkPricing,
      quickLinkFeatures: footer.quickLinkFeatures ?? defaultHome2Copy.footer.quickLinkFeatures,
      quickLinkContact: footer.quickLinkContact ?? defaultHome2Copy.footer.quickLinkContact,
      quickLinkAccountDeletion:
        footer.quickLinkAccountDeletion ?? defaultHome2Copy.footer.quickLinkAccountDeletion,
      supportTitle: footer.supportTitle ?? defaultHome2Copy.footer.supportTitle,
      supportHelpCenter: footer.supportHelpCenter ?? defaultHome2Copy.footer.supportHelpCenter,
      supportPrivacy: footer.supportPrivacy ?? defaultHome2Copy.footer.supportPrivacy,
      supportFaqs: footer.supportFaqs ?? defaultHome2Copy.footer.supportFaqs,
      supportTerms: footer.supportTerms ?? defaultHome2Copy.footer.supportTerms,
      supportRefund: footer.supportRefund ?? defaultHome2Copy.footer.supportRefund,
      newsletterTitle: footer.newsletterTitle ?? defaultHome2Copy.footer.newsletterTitle,
      newsletterBody: footer.newsletterBody ?? defaultHome2Copy.footer.newsletterBody,
      newsletterPlaceholder:
        footer.newsletterPlaceholder ?? defaultHome2Copy.footer.newsletterPlaceholder,
      copyright: footer.copyright ?? defaultHome2Copy.footer.copyright,
      socialsTitle: footer.socialsTitle ?? defaultHome2Copy.footer.socialsTitle,
    },
    notFound: {
      title: notFound.title ?? defaultHome2Copy.notFound.title,
      breadcrumbHome: notFound.breadcrumbHome ?? defaultHome2Copy.notFound.breadcrumbHome,
      breadcrumbActive: notFound.breadcrumbActive ?? defaultHome2Copy.notFound.breadcrumbActive,
      errorTitle: notFound.errorTitle ?? defaultHome2Copy.notFound.errorTitle,
      errorBody: notFound.errorBody ?? defaultHome2Copy.notFound.errorBody,
      backHome: notFound.backHome ?? defaultHome2Copy.notFound.backHome,
    },
    preloader: {
      alt: preloader.alt ?? defaultHome2Copy.preloader.alt,
    },
  };
}
