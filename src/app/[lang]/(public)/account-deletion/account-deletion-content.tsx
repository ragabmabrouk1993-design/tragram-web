'use client';

import '../../../styles/pages/account-deletion.css';
import Link from 'next/link';
import { useEffect, useReducer, useRef, useState } from 'react';
import type { CountryCode } from 'libphonenumber-js';
import type { Locale } from '@/lib/i18n';
import { PublicPageHeader } from '@/components/marketing/public-page-header';
import { PhoneInput } from '@/components/phone/phone-input';
import { PasswordField } from '@/components/form/password-field';
import { useRouteMessages } from '@/components/i18n/route-messages-provider';
import type { CountryAccessPolicy } from '@/lib/restricted-countries';
import {
  accountDeletionService,
  type AccountDeletionMode,
} from '@/services/account-deletion.service';
import {
  loadLocalReceipt,
  reduceDeletionFlow,
  saveLocalReceipt,
  type DeletionFlowState,
  type LocalDeletionReceipt,
} from './account-deletion-flow';
import { validateAccountDeletionCredentials } from './account-deletion-credentials';
import { getAccountDeletionJourney, type AccountDeletionJourneyKey } from './account-deletion-journey';

type Copy = {
  kicker: string;
  title: string;
  description: string;
  intro: string;
  credentialTitle: string;
  breadcrumbHome: string;
  stepOf: string;
  stepReview: string;
  stepVerify: string;
  stepConfirm: string;
  stepComplete: string;
  reviewTitle: string;
  reviewDescription: string;
  continueToVerify: string;
  credentialDescription: string;
  phoneLabel: string;
  passwordLabel: string;
  continue: string;
  sendCode: string;
  processing: string;
  otpTitle: string;
  otpLabel: string;
  otpPlaceholder: string;
  resend: string;
  continueToConfirm: string;
  confirmDescription: string;
  completeDescription: string;
  summaryTitle: string;
  summaryAccess: string;
  summaryBroker: string;
  summaryRetention: string;
  back: string;
  modeTitle: string;
  immediate: string;
  scheduled: string;
  ackBroker: string;
  ackRetention: string;
  ackPrepaid: string;
  ackImmediate: string;
  confirm: string;
  confirming: string;
  receiptTitle: string;
  receiptWarning: string;
  requestId: string;
  receipt: string;
  copy: string;
  saved: string;
  status: string;
  refreshStatus: string;
  cancelScheduled: string;
  cancelPassword: string;
  cancel: string;
  cancelling: string;
  support: string;
  retentionTitle: string;
  retentionRows: string[][];
  footerNote: string;
  error: string;
  unavailable: string;
};

const initialState: DeletionFlowState = { step: 'DISCLOSURE' };

const getErrorCode = (error: unknown): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { status?: number; data?: { code?: string } } }).response;
    if (response?.data?.code) return response.data.code;
    if (response?.status === 404) return 'ACCOUNT_DELETION_PUBLIC_DISABLED';
  }
  return 'ACCOUNT_DELETION_ERROR';
};

export default function AccountDeletionContent({
  locale,
  copy,
  defaultCountry = 'US',
  countryPolicy,
}: {
  locale: Locale;
  copy: Copy;
  defaultCountry?: CountryCode;
  countryPolicy?: CountryAccessPolicy;
}) {
  const intlMessages = useRouteMessages();
  const [state, dispatch] = useReducer(reduceDeletionFlow, initialState);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [mode, setMode] = useState<AccountDeletionMode>('SCHEDULED');
  const [acknowledgements, setAcknowledgements] = useState({
    brokerControlUnderstood: false,
    retentionUnderstood: false,
    prepaidAccessUnderstood: false,
    immediateIrreversibilityUnderstood: false,
  });
  const [busy, setBusy] = useState(false);
  const [cancelPassword, setCancelPassword] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [credentialErrors, setCredentialErrors] = useState<{ phone?: string; password?: string }>({});
  const headingRef = useRef<HTMLHeadingElement>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const isRtl = locale.startsWith('ar');
  const journey = getAccountDeletionJourney(state);
  const journeyStepLabels: Record<AccountDeletionJourneyKey, string> = {
    review: copy.stepReview,
    verify: copy.stepVerify,
    confirm: copy.stepConfirm,
    complete: copy.stepComplete,
  };
  const journeyTitle = state.step === 'ERROR'
    ? state.code === 'ACCOUNT_DELETION_PUBLIC_DISABLED' ? copy.unavailable : copy.error
    : state.step === 'CREDENTIALS'
      ? copy.credentialTitle
      : state.step === 'OTP' || state.step === 'CONFIRM'
          ? copy.otpTitle
          : state.step === 'RECEIPT' || state.step === 'STATUS' || state.step === 'RECOVERY_PENDING'
            ? state.step === 'STATUS' ? copy.status : copy.receiptTitle
            : copy.reviewTitle;
  const journeyDescription = state.step === 'ERROR'
    ? copy.support
    : state.step === 'CREDENTIALS'
      ? copy.credentialDescription
      : state.step === 'OTP' || state.step === 'CONFIRM'
          ? copy.confirmDescription
          : state.step === 'RECEIPT' || state.step === 'STATUS' || state.step === 'RECOVERY_PENDING'
            ? copy.completeDescription
            : copy.reviewDescription;

  useEffect(() => {
    const receipt = loadLocalReceipt();
    if (receipt) dispatch({ type: 'RECEIPT', receipt });
  }, []);

  useEffect(() => {
    headingRef.current?.focus();
  }, [state.step]);

  const start = async () => {
    const nextCredentialErrors = validateAccountDeletionCredentials({
      phoneNumber: phone,
      password,
      messages: intlMessages.auth.login.schema,
      countryPolicy,
    });
    setCredentialErrors(nextCredentialErrors);
    if (Object.keys(nextCredentialErrors).length > 0) return;

    setBusy(true);
    setNotice(null);
    try {
      const result = await accountDeletionService.startVerification(phone.trim(), password);
      idempotencyKeyRef.current = crypto.randomUUID();
      dispatch({
        type: 'DELIVERY',
        sessionToken: result.verificationSessionToken,
        delivery: result.delivery,
        expiresAt: result.expiresAt,
      });
    } catch (error) {
      dispatch({ type: 'ERROR', recoverTo: 'CREDENTIALS', code: getErrorCode(error) });
    } finally {
      setBusy(false);
    }
  };

  const complete = async () => {
    if (state.step !== 'OTP' && state.step !== 'CONFIRM') return;
    if (!acknowledgements.brokerControlUnderstood || !acknowledgements.retentionUnderstood || !acknowledgements.prepaidAccessUnderstood) {
      setNotice(copy.error);
      return;
    }
    if (mode === 'IMMEDIATE' && !acknowledgements.immediateIrreversibilityUnderstood) {
      setNotice(copy.error);
      return;
    }
    setBusy(true);
    setNotice(null);
    const idempotencyKey = idempotencyKeyRef.current ?? crypto.randomUUID();
    idempotencyKeyRef.current = idempotencyKey;
    try {
      const result = await accountDeletionService.confirm({
        verificationSessionToken: state.sessionToken,
        otp,
        mode,
        acknowledgements: {
          brokerControlUnderstood: true,
          retentionUnderstood: true,
          prepaidAccessUnderstood: true,
          ...(mode === 'IMMEDIATE' ? { immediateIrreversibilityUnderstood: true as const } : {}),
        },
        idempotencyKey,
      });
      if (result.status === 'CONFIRMATION_RECOVERY_PENDING') {
        dispatch({ type: 'RECOVERY_PENDING', requestId: result.requestId, retryAfterSeconds: 5 });
      } else if (result.receiptToken && result.receiptExpiresAt) {
        const receipt: LocalDeletionReceipt = {
          requestId: result.requestId,
          receiptToken: result.receiptToken,
          receiptExpiresAt: result.receiptExpiresAt,
        };
        saveLocalReceipt(receipt);
        dispatch({ type: 'RECEIPT', receipt });
      }
    } catch (error) {
      dispatch({ type: 'ERROR', recoverTo: state.step, code: getErrorCode(error) });
    } finally {
      setBusy(false);
    }
  };

  const refreshStatus = async (receipt: LocalDeletionReceipt) => {
    setBusy(true);
    setNotice(null);
    try {
      const status = await accountDeletionService.getStatus(receipt.requestId, receipt.receiptToken);
      dispatch({ type: 'STATUS', receipt, status });
    } catch (error) {
      dispatch({ type: 'ERROR', recoverTo: 'RECEIPT', code: getErrorCode(error) });
    } finally {
      setBusy(false);
    }
  };

  const cancelScheduled = async (receipt: LocalDeletionReceipt) => {
    if (!cancelPassword.trim()) {
      setNotice(copy.error);
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      await accountDeletionService.cancel(receipt.requestId, receipt.receiptToken, cancelPassword);
      setCancelPassword('');
      await refreshStatus(receipt);
    } catch (error) {
      dispatch({ type: 'ERROR', recoverTo: 'STATUS', code: getErrorCode(error) });
    } finally {
      setBusy(false);
    }
  };

  const renderJourneyIndicator = () => {
    const progressLabel = copy.stepOf
      .replace('{current}', String(journey.number))
      .replace('{total}', '3');
    const steps = [
      { number: 1, key: 'review' as const, label: copy.stepReview },
      { number: 2, key: 'verify' as const, label: copy.stepVerify },
      { number: 3, key: 'confirm' as const, label: copy.stepConfirm },
    ];

    return (
      <div className="account-deletion-stepper" role="group" aria-label={progressLabel}>
        <div className="account-deletion-stepper-meta">
          <span className="account-deletion-stepper-count">{progressLabel}</span>
          <span className="account-deletion-stepper-current">{journeyStepLabels[journey.key]}</span>
        </div>
        <ol className="account-deletion-stepper-list">
          {steps.map((step) => {
            const stepState = step.number < journey.number ? 'complete' : step.number === journey.number ? 'current' : 'pending';
            return (
              <li
                className={`account-deletion-step account-deletion-step--${stepState}`}
                key={step.key}
                aria-current={step.number === journey.number ? 'step' : undefined}
              >
                <span className="account-deletion-step-number" aria-hidden="true">
                  {stepState === 'complete' ? '✓' : step.number}
                </span>
                <span className="account-deletion-step-label">{step.label}</span>
              </li>
            );
          })}
        </ol>
      </div>
    );
  };

  const renderSummary = () => (
    <div className="account-deletion-summary-card">
      <h2 id="account-deletion-summary-title">{copy.summaryTitle}</h2>
      <ul className="account-deletion-summary-list">
        <li className="account-deletion-summary-item"><span aria-hidden="true">01</span><p>{copy.summaryAccess}</p></li>
        <li className="account-deletion-summary-item"><span aria-hidden="true">02</span><p>{copy.summaryBroker}</p></li>
        <li className="account-deletion-summary-item"><span aria-hidden="true">03</span><p>{copy.summaryRetention}</p></li>
      </ul>
      <details className="account-deletion-retention" open>
        <summary>{copy.retentionTitle}</summary>
        <table>
          <tbody>
            {copy.retentionRows.map(([category, deadline]) => (
              <tr key={category}>
                <th scope="row">{category}</th>
                <td>{deadline}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );

  const renderForm = () => {
    if (state.step === 'DISCLOSURE') {
      return (
        <div className="account-deletion-form account-deletion-disclosure-actions">
          <button className="account-deletion-primary" type="button" onClick={() => dispatch({ type: 'START_CREDENTIALS', phone: '' })}>
            {copy.continueToVerify}
          </button>
        </div>
      );
    }
    if (state.step === 'CREDENTIALS') {
      return <form
        className="account-deletion-form account-deletion-credentials-form"
        noValidate
        aria-busy={busy}
        aria-describedby="account-deletion-step-description"
        onSubmit={(event) => {
          event.preventDefault();
          void start();
        }}
      >
        <label className="account-deletion-field">
          <span className="account-deletion-field-label">{copy.phoneLabel}</span>
          <PhoneInput
            defaultCountry={defaultCountry}
            policy={countryPolicy}
            value={phone}
            onChange={(value) => {
              setPhone(value);
              setCredentialErrors((previous) => ({ ...previous, phone: undefined }));
            }}
            ariaLabel={copy.phoneLabel}
            name="phoneNumber"
            disabled={busy}
            error={credentialErrors.phone}
            tone="dark"
          />
        </label>
        <label className="account-deletion-field">
          <span className="account-deletion-field-label">{copy.passwordLabel}</span>
          <PasswordField
            placeholder={intlMessages.auth.login.passwordPlaceholder}
            inputProps={{
              name: 'password',
              autoComplete: 'current-password',
              'aria-label': copy.passwordLabel,
              onChange: (event) => {
                setPassword(event.target.value);
                setCredentialErrors((previous) => ({ ...previous, password: undefined }));
              },
            }}
            disabled={busy}
            error={credentialErrors.password}
            tone="dark"
            showPasswordLabel={intlMessages.auth.passwordVisibility.show}
            hidePasswordLabel={intlMessages.auth.passwordVisibility.hide}
          />
        </label>
        <p className="account-deletion-notice" role="note">
          {intlMessages.auth.telegramDelivery.description}
        </p>
        <button className="account-deletion-primary" type="submit" disabled={busy}>{busy ? copy.processing : copy.sendCode}</button>
      </form>;
    }
    if (state.step === 'OTP' || state.step === 'CONFIRM') {
      return <div className="account-deletion-form account-deletion-confirmation-form">
        {state.deliveryStatus === 'delivery_pending' ? (
          <p className="account-deletion-notice" role="status">{intlMessages.auth.telegramDelivery.gatewayPending}</p>
        ) : null}
        <label className="account-deletion-field">
          <span className="account-deletion-field-label">{copy.otpLabel}</span>
          <input className="account-deletion-otp-input" value={otp} onChange={(event) => setOtp(event.target.value)} placeholder={copy.otpPlaceholder} inputMode="numeric" autoComplete="one-time-code" maxLength={6} aria-label={copy.otpLabel} />
        </label>
        <button
          className="account-deletion-link"
          type="button"
          onClick={async () => {
            if (state.step !== 'OTP') return;
            setBusy(true);
            setNotice(null);
            try {
              const delivery = await accountDeletionService.resend(state.sessionToken);
              dispatch({
                type: 'DELIVERY',
                sessionToken: state.sessionToken,
                delivery,
                expiresAt: new Date(Date.now() + delivery.expiresIn * 1000).toISOString(),
              });
            } catch (error) {
              setNotice(getErrorCode(error));
            } finally {
              setBusy(false);
            }
          }}
          disabled={busy}
        >{copy.resend}</button>
        <h2>{copy.modeTitle}</h2>
        <label className="account-deletion-option"><input type="radio" checked={mode === 'SCHEDULED'} onChange={() => { setMode('SCHEDULED'); dispatch({ type: 'CONFIRM_MODE', mode: 'SCHEDULED' }); }} />{copy.scheduled}</label>
        <label className="account-deletion-option"><input type="radio" checked={mode === 'IMMEDIATE'} onChange={() => { setMode('IMMEDIATE'); dispatch({ type: 'CONFIRM_MODE', mode: 'IMMEDIATE' }); }} />{copy.immediate}</label>
        {[['brokerControlUnderstood', copy.ackBroker], ['retentionUnderstood', copy.ackRetention], ['prepaidAccessUnderstood', copy.ackPrepaid], ...(mode === 'IMMEDIATE' ? [['immediateIrreversibilityUnderstood', copy.ackImmediate]] : [])].map(([key, label]) => <label className="account-deletion-check" key={key}><input type="checkbox" checked={Boolean(acknowledgements[key as keyof typeof acknowledgements])} onChange={(event) => setAcknowledgements((previous) => ({ ...previous, [key]: event.target.checked }))} />{label}</label>)}
        <button className="account-deletion-primary account-deletion-danger" type="button" onClick={() => void complete()} disabled={busy}>{busy ? copy.confirming : copy.confirm}</button>
      </div>;
    }
    if (state.step === 'RECEIPT') {
      return <div className="account-deletion-receipt"><p>{copy.receiptWarning}</p><dl><dt>{copy.requestId}</dt><dd>{state.receipt.requestId}</dd><dt>{copy.receipt}</dt><dd className="account-deletion-code">{state.receipt.receiptToken}</dd></dl><div className="account-deletion-actions"><button className="account-deletion-primary" type="button" onClick={() => navigator.clipboard?.writeText(state.receipt.receiptToken)}>{copy.copy}</button><button className="account-deletion-link" type="button" onClick={() => void refreshStatus(state.receipt)} disabled={busy}>{copy.status}</button></div></div>;
    }
    if (state.step === 'STATUS') {
      return <div className="account-deletion-receipt"><p className="account-deletion-status-message">{state.status.status}</p><dl><dt>{copy.requestId}</dt><dd>{state.receipt.requestId}</dd><dt>{copy.receipt}</dt><dd className="account-deletion-code">{state.receipt.receiptToken}</dd></dl><button className="account-deletion-link" type="button" onClick={() => void refreshStatus(state.receipt)} disabled={busy}>{copy.refreshStatus}</button>{state.status.status === 'SCHEDULED' ? <><label className="account-deletion-field"><span className="account-deletion-field-label">{copy.cancelPassword}</span><input type="password" value={cancelPassword} onChange={(event) => setCancelPassword(event.target.value)} autoComplete="current-password" aria-label={copy.cancelPassword} /></label><button className="account-deletion-primary" type="button" onClick={() => void cancelScheduled(state.receipt)} disabled={busy}>{busy ? copy.cancelling : copy.cancelScheduled}</button></> : null}</div>;
    }
    if (state.step === 'RECOVERY_PENDING') return <div className="account-deletion-recovery" role="status"><p>{state.requestId}</p><p>{copy.support}</p></div>;
    if (state.step === 'ERROR') return <div role="alert" className="account-deletion-alert"><p>{state.code === 'ACCOUNT_DELETION_PUBLIC_DISABLED' ? copy.unavailable : copy.error}</p><button className="account-deletion-primary" type="button" onClick={() => dispatch({ type: 'START_CREDENTIALS', phone })}>{copy.continueToVerify}</button></div>;
    return null;
  };

  return <>
    <div className="account-deletion-route-shell">
      <PublicPageHeader lang={locale} title={copy.title} breadcrumbs={[{ label: copy.breadcrumbHome, href: `/${locale}` }, { label: copy.title }]} />
      <main id="main-content" tabIndex={-1} className="account-deletion-page" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="account-deletion-container">
          <div className="account-deletion-context"><span>{copy.kicker}</span><span>{journeyStepLabels[journey.key]}</span></div>
          <div className="account-deletion-layout" aria-live="polite">
            <section className="account-deletion-task" aria-labelledby="account-deletion-step-title">
              <div className="account-deletion-card">
                {renderJourneyIndicator()}
                <h2 id="account-deletion-step-title" tabIndex={-1} ref={headingRef}>{journeyTitle}</h2>
                <p className="account-deletion-intro" id="account-deletion-step-description">{journeyDescription}</p>
                {notice ? <p className="account-deletion-notice" role="alert">{notice}</p> : null}
                {renderForm()}
                <p className="account-deletion-footer">{copy.footerNote} <Link href={`/${locale}/contact`}>{copy.support}</Link></p>
              </div>
            </section>
            <aside className="account-deletion-summary" aria-labelledby="account-deletion-summary-title">
              {renderSummary()}
            </aside>
          </div>
        </div>
      </main>
    </div>
  </>;
}
