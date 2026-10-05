"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ProfileShell } from "@/components/profile/profile-shell";
import { authService } from "@/services/auth.service";
import { toast } from "react-hot-toast";
import { PasswordField } from "@/components/form/password-field";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import { mapApiFormErrors } from "@/lib/auth-form-errors";
import { trackAnalyticsEvent } from "@/lib/analytics/client";

type ChangePasswordField = "currentPassword" | "newPassword" | "confirmPassword";

export default function ChangePasswordPage() {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<{
        currentPassword?: string;
        newPassword?: string;
        confirmPassword?: string;
    }>({});
    const intlMessages = useRouteMessages();

    const handleSave = async () => {
        setFieldErrors({});
        if (newPassword !== confirmPassword) {
            setFieldErrors({
                confirmPassword: intlMessages.profilePages.changePassword.toastMismatch,
            });
            toast.error(intlMessages.profilePages.changePassword.toastMismatch);
            return;
        }

        if (newPassword.length < 8) {
            setFieldErrors({
                newPassword: intlMessages.profilePages.changePassword.toastTooShort,
            });
            toast.error(intlMessages.profilePages.changePassword.toastTooShort);
            return;
        }

        setIsSaving(true);
        try {
            await authService.changePassword(currentPassword, newPassword);
            trackAnalyticsEvent("password_changed");
            toast.success(intlMessages.profilePages.changePassword.toastSuccess);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setFieldErrors({});
        } catch (error) {
            const { fieldErrors: mappedFieldErrors, formError, toastMessage } =
                mapApiFormErrors<ChangePasswordField>({
                    error,
                    dict: intlMessages,
                    fieldAliases: {
                        currentPassword: ["currentPassword", "current password", "old password", "password"],
                        newPassword: ["newPassword", "new password", "password"],
                        confirmPassword: ["confirmPassword", "confirm password", "confirmation"],
                    },
                    fieldLabels: {
                        currentPassword: intlMessages.profilePages.changePassword.oldPassword,
                        newPassword: intlMessages.profilePages.changePassword.newPassword,
                        confirmPassword: intlMessages.profilePages.changePassword.confirmPassword,
                    },
                    codeFieldMap: {
                        AUTH_INVALID_PASSWORD: "currentPassword",
                    },
                    messageFieldMap: {
                        "current password is incorrect": "currentPassword",
                        "old password": "currentPassword",
                        "confirm password": "confirmPassword",
                    },
                });

            setFieldErrors({
                currentPassword: mappedFieldErrors.currentPassword,
                newPassword: mappedFieldErrors.newPassword,
                confirmPassword: mappedFieldErrors.confirmPassword,
            });

            toast.error(toastMessage || formError || intlMessages.profilePages.changePassword.toastError);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <ProfileShell
            title={intlMessages.profilePages.changePassword.title}
            backHref="/profile/security"
            variant="mobile"
        >
            <div className="profile-card profile-form">
                <PasswordField
                    placeholder={intlMessages.profilePages.changePassword.oldPassword}
                    className="profile-field"
                    error={fieldErrors.currentPassword}
                    inputProps={{
                        value: currentPassword,
                        onChange: (event) => {
                            setCurrentPassword(event.target.value);
                            if (fieldErrors.currentPassword) {
                                setFieldErrors((prev) => ({ ...prev, currentPassword: undefined }));
                            }
                        },
                    }}
                />
                <PasswordField
                    placeholder={intlMessages.profilePages.changePassword.newPassword}
                    className="profile-field"
                    error={fieldErrors.newPassword}
                    inputProps={{
                        value: newPassword,
                        onChange: (event) => {
                            setNewPassword(event.target.value);
                            if (fieldErrors.newPassword) {
                                setFieldErrors((prev) => ({ ...prev, newPassword: undefined }));
                            }
                        },
                    }}
                />
                <PasswordField
                    placeholder={intlMessages.profilePages.changePassword.confirmPassword}
                    className="profile-field"
                    error={fieldErrors.confirmPassword}
                    inputProps={{
                        value: confirmPassword,
                        onChange: (event) => {
                            setConfirmPassword(event.target.value);
                            if (fieldErrors.confirmPassword) {
                                setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                            }
                        },
                    }}
                />
                <Button
                    variant="gradient"
                    className="profile-button profile-button-full"
                    onClick={handleSave}
                    disabled={isSaving}
                >
                    {isSaving
                        ? intlMessages.profilePages.changePassword.saving
                        : intlMessages.profilePages.changePassword.save}
                </Button>
            </div>
        </ProfileShell>
    );
}
