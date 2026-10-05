"use client";

import { useEffect, useState } from "react";
import { ProfileShell } from "@/components/profile/profile-shell";
import { MobileSaveBar } from "@/components/profile/mobile-save-bar";
import { authService } from "@/services/auth.service";
import { userService, UpdateProfileData } from "@/services/user.service";
import { toast } from "react-hot-toast";
import { User as ApiUser } from "@/lib/api-client";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import { getLocalizedErrorMessage } from "@/lib/error-utils";
import { Phone } from "lucide-react";
import { getCountryCallingCode, type CountryCode } from "libphonenumber-js";
import { parsePhoneValue } from "@/lib/phone";
import { mapApiFormErrors } from "@/lib/auth-form-errors";
import { cn } from "@/lib/utils";
import { trackAnalyticsEvent } from "@/lib/analytics/client";

type PersonalDataField = "firstName" | "lastName";

const getFlagEmoji = (countryCode: CountryCode) => {
    const codePoints = countryCode
        .toUpperCase()
        .split("")
        .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
};

const PersonalDataSkeleton = () => (
    <div className="profile-personal-skeleton" aria-hidden="true">
        <div className="profile-card profile-personal-skeleton-card">
            <div className="profile-personal-skeleton-grid">
                <span className="profile-personal-skeleton-pill" />
                <span className="profile-personal-skeleton-pill" />
            </div>
            <div className="profile-personal-contact-row">
                <span className="profile-personal-skeleton-pill profile-personal-skeleton-code" />
                <span className="profile-personal-skeleton-pill" />
            </div>
            <span className="profile-personal-skeleton-pill is-block" />
        </div>
        <span className="profile-personal-skeleton-button" />
    </div>
);

export default function PersonalDataPage() {
    const [user, setUser] = useState<ApiUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<{
        firstName?: string;
        lastName?: string;
        form?: string;
    }>({});
    const intlMessages = useRouteMessages();

    useEffect(() => {
        const loadProfile = async () => {
            setIsLoading(true);
            try {
                const profile = await authService.getProfile();
                if (profile) {
                    setUser(profile);
                    setFirstName(profile.firstName ?? "");
                    setLastName(profile.lastName ?? "");
                }
            } catch (error) {
                toast.error(
                    getLocalizedErrorMessage(error, intlMessages) ||
                        intlMessages.profilePages.personalData.toastLoadError
                );
            } finally {
                setIsLoading(false);
            }
        };
        loadProfile();
    }, [intlMessages]);

    const handleSave = async () => {
        if (!user) return;
        setFieldErrors({});
        setIsSaving(true);
        try {
            const payload: UpdateProfileData = {
                firstName,
                lastName,
            };
            const updated = await userService.updateProfile(payload);
            const changedFields = [
                ...(user.firstName !== firstName ? ["firstName"] : []),
                ...(user.lastName !== lastName ? ["lastName"] : []),
            ];
            if (changedFields.length > 0) {
                trackAnalyticsEvent("profile_updated", { changed_fields: changedFields });
            }
            setUser(updated);
            toast.success(intlMessages.profilePages.personalData.toastSaveSuccess);
        } catch (error) {
            const { fieldErrors: mappedFieldErrors, formError, toastMessage } =
                mapApiFormErrors<PersonalDataField>({
                    error,
                    dict: intlMessages,
                    fieldAliases: {
                        firstName: ["firstName", "first name", "name"],
                        lastName: ["lastName", "last name", "name"],
                    },
                    fieldLabels: {
                        firstName: intlMessages.profilePages.personalData.firstNamePlaceholder,
                        lastName: intlMessages.profilePages.personalData.lastNamePlaceholder,
                    },
                    messageFieldMap: {
                        "first name": "firstName",
                        lastname: "lastName",
                        "last name": "lastName",
                    },
                });

            setFieldErrors({
                firstName: mappedFieldErrors.firstName,
                lastName: mappedFieldErrors.lastName,
                form: formError,
            });
            toast.error(toastMessage || formError || intlMessages.profilePages.personalData.toastSaveError);
        } finally {
            setIsSaving(false);
        }
    };

    const dirty = user ? user.firstName !== firstName || user.lastName !== lastName : false;
    const phoneValue = (user?.phoneNumber ?? "").trim();
    const parsedPhone = parsePhoneValue(phoneValue);
    const phoneCode = parsedPhone.country ? `+${getCountryCallingCode(parsedPhone.country)}` : "";
    const phoneNumber = parsedPhone.nationalNumber || phoneValue;
    const phoneFlag = parsedPhone.country ? getFlagEmoji(parsedPhone.country) : "🌐";

    if (isLoading) {
        return (
            <ProfileShell
                title={intlMessages.profilePages.personalData.title}
                backHref="/profile"
                variant="mobile"
            >
                <PersonalDataSkeleton />
            </ProfileShell>
        );
    }

    return (
        <ProfileShell
            title={intlMessages.profilePages.personalData.title}
            backHref="/profile"
            variant="mobile"
        >
            <div className="profile-personal-layout profile-mobile-adaptive-layout">
                <div className="profile-personal-card">
                    <div className="profile-pill-grid">
                        <div
                            className={cn(
                                "profile-pill-field profile-personal-field",
                                fieldErrors.firstName && "border-red-400/90 ring-1 ring-red-400/40"
                            )}
                        >
                            <i className="fa-regular fa-user profile-pill-icon" aria-hidden />
                            <input
                                className="profile-pill-input"
                                value={firstName}
                                onChange={(event) => {
                                    setFirstName(event.target.value);
                                    if (fieldErrors.firstName || fieldErrors.form) {
                                        setFieldErrors((prev) => ({
                                            ...prev,
                                            firstName: undefined,
                                            form: undefined,
                                        }));
                                    }
                                }}
                                placeholder={intlMessages.profilePages.personalData.firstNamePlaceholder}
                            />
                        </div>
                        <div
                            className={cn(
                                "profile-pill-field profile-personal-field",
                                fieldErrors.lastName && "border-red-400/90 ring-1 ring-red-400/40"
                            )}
                        >
                            <i className="fa-regular fa-user profile-pill-icon" aria-hidden />
                            <input
                                className="profile-pill-input"
                                value={lastName}
                                onChange={(event) => {
                                    setLastName(event.target.value);
                                    if (fieldErrors.lastName || fieldErrors.form) {
                                        setFieldErrors((prev) => ({
                                            ...prev,
                                            lastName: undefined,
                                            form: undefined,
                                        }));
                                    }
                                }}
                                placeholder={intlMessages.profilePages.personalData.lastNamePlaceholder}
                            />
                        </div>
                    </div>
                    {fieldErrors.firstName && (
                        <p className="profile-error">{fieldErrors.firstName}</p>
                    )}
                    {fieldErrors.lastName && (
                        <p className="profile-error">{fieldErrors.lastName}</p>
                    )}
                    {fieldErrors.form && <p className="profile-error">{fieldErrors.form}</p>}

                    <div className="profile-personal-contact-row">
                        <div className="profile-pill-field profile-personal-code-field">
                            <span className="profile-pill-flag">{phoneFlag}</span>
                            <span className="profile-personal-code-value">{phoneCode || "—"}</span>
                        </div>
                        <div className="profile-pill-field profile-personal-field profile-personal-phone-field">
                            <Phone className="profile-pill-icon" />
                            <input
                                className="profile-pill-input"
                                value={phoneNumber || "—"}
                                disabled
                                readOnly
                            />
                        </div>
                    </div>

                    <div className="profile-pill-field profile-personal-field profile-personal-email-field">
                        <i className="fa-regular fa-envelope profile-pill-icon" aria-hidden />
                        <input
                            className="profile-pill-input"
                            value={user?.email ?? ""}
                            disabled
                            readOnly
                        />
                    </div>
                </div>

                <MobileSaveBar
                    label={intlMessages.profilePages.personalData.save}
                    loadingLabel={intlMessages.profilePages.personalData.saving}
                    isLoading={isSaving}
                    disabled={!dirty || isSaving}
                    onClick={handleSave}
                    className="profile-mobile-save-bar--profile-forms"
                />
            </div>
        </ProfileShell>
    );
}
