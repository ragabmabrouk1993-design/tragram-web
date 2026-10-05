"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import Home2Image from "../../marketing/components/marketing-image";
import { localizePath, type Dictionary, type Locale } from "@/lib/i18n";
import { AppzenCta } from "@/components/ui/appzen-cta";
import { PublicPageHeader } from "@/components/marketing/public-page-header";
import AppStoreButtons from "@/components/marketing/app-store-buttons";
import { contactService } from "@/services/contact.service";
import { createContactFormSchema, type ContactFormValues } from './contact-form-schema';
import { currentAccessCopy } from '@/lib/public-commercial-copy';
import { trackAnalyticsEvent } from '@/lib/analytics/client';

type ContactUsContentProps = {
  locale: Locale;
  legacyPages: Pick<Dictionary["legacyPages"], 'contact'>;
};


const getApiErrorMessage = (error: unknown): string | null => {
  if (!error || typeof error !== "object") {
    return null;
  }

  const apiError = error as {
    response?: {
      data?: {
        message?: string;
        error?: string;
      };
    };
    message?: string;
  };

  return apiError.response?.data?.message || apiError.response?.data?.error || apiError.message || null;
};

export default function ContactUsContent({ locale, legacyPages }: ContactUsContentProps) {
  const contactFormSchema = createContactFormSchema(locale);
  const withLocale = (href: string) => localizePath(locale, href);
  const content = legacyPages.contact;
  const isArabic = locale.startsWith("ar");

  const feedbackCopy = {
    submitting: isArabic ? "جارٍ الإرسال..." : "Sending...",
    success: isArabic
      ? "تم إرسال رسالتك بنجاح. سيتواصل معك فريق الدعم قريباً."
      : "Your message has been sent successfully. Support will contact you shortly.",
    error: isArabic
      ? "تعذر إرسال الرسالة الآن. يرجى المحاولة مرة أخرى لاحقاً."
      : "We could not send your message right now. Please try again shortly.",
  };

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      message: "",
      type:
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("type") === "ACCOUNT_DELETION_ACCESS"
          ? "ACCOUNT_DELETION_ACCESS"
          : "GENERAL_INQUIRY",
      requestedAction: "DELETE_ACCOUNT",
      requestedMode: "SCHEDULED",
      accessProblem: "OTHER",
      brokerControlUnderstood: false,
      retentionUnderstood: false,
      prepaidAccessUnderstood: false,
      website: "",
    },
  });
  const selectedType = useWatch({ control, name: "type" });
  const selectedAction = useWatch({ control, name: "requestedAction" });

  const [submitState, setSubmitState] = useState<FormSubmitState>({
    type: "idle",
    message: "",
  });

  async function onSubmit(values: ContactFormValues) {
    setSubmitState({ type: "idle", message: "" });

    try {
      const pagePath =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : withLocale("/contact");

      const response = await contactService.createSubmission({
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
        email: values.email,
        subject: content.form.kicker,
        message: values.message,
        type: values.type,
        locale,
        pagePath,
        website: values.website,
        ...(values.type === "ACCOUNT_DELETION_ACCESS"
          ? {
              accountDeletion: {
                requestedAction: values.requestedAction!,
                ...(values.requestedAction === "DELETE_ACCOUNT"
                  ? { requestedMode: values.requestedMode! }
                  : {}),
                accessProblem: values.accessProblem!,
                acknowledgements: {
                  brokerControlUnderstood: true,
                  retentionUnderstood: true,
                  prepaidAccessUnderstood: true,
                },
              },
            }
          : {}),
      });

      if (!response.success) {
        throw new Error("Submission was not accepted");
      }
      trackAnalyticsEvent("contact_form_submitted", { success: true });

      reset({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        message: "",
        type: "GENERAL_INQUIRY",
        requestedAction: "DELETE_ACCOUNT",
        requestedMode: "SCHEDULED",
        accessProblem: "OTHER",
        brokerControlUnderstood: false,
        retentionUnderstood: false,
        prepaidAccessUnderstood: false,
        website: "",
      });
      setSubmitState({ type: "success", message: feedbackCopy.success });
    } catch (error) {
      trackAnalyticsEvent("contact_form_submitted", { success: false });
      const apiMessage = getApiErrorMessage(error);
      setSubmitState({
        type: "error",
        message: apiMessage || feedbackCopy.error,
      });
    }
  }

  return (
    <>
      <PublicPageHeader
        lang={locale}
        title={content.header.title}
        breadcrumbs={[
          { label: content.header.breadcrumbHome, href: withLocale("/") },
          { label: content.header.breadcrumbActive },
        ]}
      />

      <div className="contact-info-list">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="contact-info-list-box">
                <div className="contact-info-item wow fadeInUp">
                  <div className="icon-box">
                    <Home2Image src="/images/icon-mail-primary.svg" alt="" />
                  </div>
                  <div className="contact-info-item-content">
                    <h3>{content.info.emailLabel}</h3>
                    <p>
                      <a href={`mailto:${content.info.emailValue}`}>{content.info.emailValue}</a>
                    </p>
                  </div>
                </div>

                <div className="contact-info-item wow fadeInUp" data-wow-delay="0.2s">
                  <div className="icon-box">
                    <Home2Image src="/images/icon-location-primary.svg" alt="" />
                  </div>
                  <div className="contact-info-item-content">
                    <h3>{content.info.locationLabel}</h3>
                    <p>{content.info.locationValue}</p>
                  </div>
                </div>

                <div className="contact-info-item wow fadeInUp" data-wow-delay="0.4s">
                  <div className="icon-box">
                    <Home2Image src="/images/icon-clock-primary.svg" alt="" />
                  </div>
                  <div className="contact-info-item-content">
                    <h3>{content.info.hoursLabel}</h3>
                    <p>{content.info.hoursValue}</p>
                  </div>
                </div>

                <div className="contact-info-item wow fadeInUp" data-wow-delay="0.6s">
                  <div className="icon-box">
                    <Home2Image src="/images/icon-download-primary.svg" alt="" />
                  </div>
                  <div className="contact-info-item-content">
                    <h3>{content.info.downloadLabel}</h3>
                    <AppStoreButtons locale={locale} />
                    <p>{content.info.downloadNote}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="page-contact-us bg-section">
        <div className="container">
          <div className="contact-page-shell">
            <div className="row align-items-stretch">
              <div className="col-xl-5">
                <div className="contact-image-box wow fadeInUp" data-wow-delay="0.2s">
                  <div className="contact-us-image">
                    <figure className="image-anime">
                      <Home2Image src="/images/contact-us-image.jpg" alt="" />
                    </figure>
                  </div>

                  <div className="contact-client-box">
                    <div className="contact-client-counter">
                      <p>{isArabic ? "الوصول الحالي" : "Current access"}</p>
                      <h2>{isArabic ? "Basic المجاني" : "Free Basic"}</h2>
                    </div>
                    <p>{currentAccessCopy[isArabic ? 'ar' : 'en']}</p>
                  </div>
                </div>
              </div>

              <div className="col-xl-7">
                <div className="contact-us-form">
                  <div className="section-title">
                    <h3 className="wow fadeInUp">{content.form.kicker}</h3>
                    <h2 className="text-anime-style-3" data-cursor="-opaque">
                      {content.form.title}
                    </h2>
                    <p className="wow fadeInUp" data-wow-delay="0.2s">
                      {content.form.body}
                    </p>
                  </div>

                  <div className="contact-form">
                    <form
                      id="contactForm"
                      onSubmit={handleSubmit(onSubmit)}
                      className="wow fadeInUp"
                      data-wow-delay="0.4s"
                    >
                      <input
                        type="text"
                        autoComplete="off"
                        tabIndex={-1}
                        aria-hidden="true"
                        {...register("website")}
                        style={{
                          position: "absolute",
                          left: "-9999px",
                          opacity: 0,
                          pointerEvents: "none",
                        }}
                      />

                      <div className="row">
                        <div className="form-group col-md-12 mb-4">
                          <label htmlFor="contactType">{content.form.typeLabel}</label>
                          <select id="contactType" className="form-control" {...register("type")}>
                            <option value="GENERAL_INQUIRY">{content.form.generalType}</option>
                            <option value="ACCOUNT_DELETION_ACCESS">{content.form.deletionType}</option>
                          </select>
                        </div>

                        {selectedType === "ACCOUNT_DELETION_ACCESS" ? (
                          <div className="form-group col-md-12 mb-4">
                            <p className="contact-deletion-warning">{content.form.deletionWarning}</p>
                            <div className="row">
                              <div className="form-group col-md-6 mb-4">
                                <label htmlFor="requestedAction">{content.form.requestedActionLabel}</label>
                                <select id="requestedAction" className="form-control" {...register("requestedAction")}>
                                  <option value="DELETE_ACCOUNT">{content.form.deleteAccountOption}</option>
                                  <option value="CANCEL_SCHEDULED_DELETION">{content.form.cancelDeletionOption}</option>
                                </select>
                                <div className="help-block with-errors">{errors.requestedAction?.message || ""}</div>
                              </div>
                              {selectedAction === "DELETE_ACCOUNT" ? (
                                <div className="form-group col-md-6 mb-4">
                                  <label htmlFor="requestedMode">{content.form.requestedModeLabel}</label>
                                  <select id="requestedMode" className="form-control" {...register("requestedMode")}>
                                    <option value="SCHEDULED">{content.form.scheduledOption}</option>
                                    <option value="IMMEDIATE">{content.form.immediateOption}</option>
                                  </select>
                                  <div className="help-block with-errors">{errors.requestedMode?.message || ""}</div>
                                </div>
                              ) : null}
                              <div className="form-group col-md-12 mb-4">
                                <label htmlFor="accessProblem">{content.form.accessProblemLabel}</label>
                                <select id="accessProblem" className="form-control" {...register("accessProblem")}>
                                  <option value="PASSWORD_UNAVAILABLE">{content.form.passwordProblem}</option>
                                  <option value="TELEGRAM_CODE_NOT_RECEIVED">{content.form.telegramCodeMissing}</option>
                                  <option value="OTHER">{content.form.otherProblem}</option>
                                </select>
                                <div className="help-block with-errors">{errors.accessProblem?.message || ""}</div>
                              </div>
                              <label className="contact-deletion-check"><input type="checkbox" {...register("brokerControlUnderstood")} />{content.form.ackBroker}</label>
                              <label className="contact-deletion-check"><input type="checkbox" {...register("retentionUnderstood")} />{content.form.ackRetention}</label>
                              <label className="contact-deletion-check"><input type="checkbox" {...register("prepaidAccessUnderstood")} />{content.form.ackPrepaid}</label>
                            </div>
                          </div>
                        ) : null}
                        <div className="form-group col-md-6 mb-4">
                          <label htmlFor="fname">{content.form.firstName}</label>
                          <input
                            type="text"
                            className="form-control"
                            id="fname"
                            autoComplete="given-name"
                            placeholder={content.form.firstName}
                            {...register("firstName")}
                            aria-invalid={Boolean(errors.firstName)}
                            aria-describedby="fname-error"
                          />
                          <div id="fname-error" className="help-block with-errors">{errors.firstName?.message || ""}</div>
                        </div>

                        <div className="form-group col-md-6 mb-4">
                          <label htmlFor="lname">{content.form.lastName}</label>
                          <input
                            type="text"
                            className="form-control"
                            id="lname"
                            autoComplete="family-name"
                            placeholder={content.form.lastName}
                            {...register("lastName")}
                            aria-invalid={Boolean(errors.lastName)}
                            aria-describedby="lname-error"
                          />
                          <div id="lname-error" className="help-block with-errors">{errors.lastName?.message || ""}</div>
                        </div>

                        <div className="form-group col-md-6 mb-4">
                          <label htmlFor="phone">{content.form.phone} {isArabic ? "(اختياري)" : "(optional)"}</label>
                          <input
                            type="tel"
                            className="form-control"
                            id="phone"
                            autoComplete="tel"
                            placeholder={content.form.phone}
                            {...register("phone")}
                            aria-invalid={Boolean(errors.phone)}
                            aria-describedby="phone-error"
                          />
                          <div id="phone-error" className="help-block with-errors">{errors.phone ? (isArabic ? "رقم الهاتف غير صالح" : "Invalid phone number") : ""}</div>
                        </div>

                        <div className="form-group col-md-6 mb-4">
                          <label htmlFor="email">{content.form.email}</label>
                          <input
                            type="email"
                            className="form-control"
                            id="email"
                            autoComplete="email"
                            placeholder={content.form.email}
                            {...register("email")}
                            aria-invalid={Boolean(errors.email)}
                            aria-describedby="email-error"
                          />
                          <div id="email-error" className="help-block with-errors">{errors.email?.message || ""}</div>
                        </div>

                        <div className="form-group col-md-12 mb-5">
                          <label htmlFor="message">{content.form.message}</label>
                          <p id="message-safety">{isArabic ? "لا ترسل كلمات المرور أو رموز التحقق أو بيانات دخول الوسيط أو مفاتيح API." : "Do not send passwords, verification codes, broker credentials, or API keys."}</p>
                          <textarea
                            className="form-control"
                            id="message"
                            rows={6}
                            placeholder={content.form.message}
                            {...register("message")}
                            aria-invalid={Boolean(errors.message)}
                            aria-describedby="message-safety message-error"
                          ></textarea>
                          <div id="message-error" className="help-block with-errors">{errors.message?.message || ""}</div>
                        </div>

                        <div className="col-lg-12">
                          <div className="contact-form-btn">
                            <AppzenCta type="submit" variant="primary" disabled={isSubmitting}>
                              {isSubmitting ? feedbackCopy.submitting : content.form.submit}
                            </AppzenCta>
                            <div
                              id="msgSubmit"
                              role="status"
                              aria-live="polite"
                              aria-atomic="true"
                              className="h3"
                              style={{
                                marginTop: submitState.type === "idle" ? 0 : "12px",
                                color: submitState.type === "success" ? "#34d399" : "#fda4af",
                              }}
                            >
                              {submitState.message}
                            </div>
                          </div>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="google-map">
        <div className="container">
          <div className="contact-map-shell">
            <div className="row section-row">
              <div className="col-lg-12">
                <div className="section-title section-title-center">
                  <h3 className="wow fadeInUp">{content.map.kicker}</h3>
                  <h2 className="text-anime-style-3" data-cursor="-opaque">
                    {content.map.title}
                  </h2>
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-lg-12">
                <div className="google-map-iframe wow fadeInUp" data-wow-delay="0.2s">
                  <iframe
                    src={content.map.embedUrl}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Map"
                  ></iframe>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="contact-download-cta">
        <div className="container">
          <div className="contact-download-cta-box">
            <div className="section-title">
              <h3 className="wow fadeInUp">{content.footerCta.kicker}</h3>
              <h2 className="text-anime-style-3" data-cursor="-opaque">
                {content.footerCta.title}
              </h2>
              <p className="wow fadeInUp" data-wow-delay="0.2s">
                {content.footerCta.body}
              </p>
            </div>

            <div className="app-download-buttons wow fadeInUp" data-wow-delay="0.4s">
              <AppStoreButtons locale={locale} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

type FormSubmitState = {
  type: "idle" | "success" | "error";
  message: string;
};
