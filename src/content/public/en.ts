import type { PublicPageCopy } from './types';

export const enPublicPages: Record<string, PublicPageCopy> = {
  "/": {
    "title": "Tragram: Telegram signals, your trading rules",
    "h1": "Copy Telegram signals to MT4 and MT5 with your own trading rules.",
    "description": "Connect Telegram channels you are authorized to access, select an execution account and configure your rules. Follow signals, orders and broker outcomes from your account.",
    "intro": "Connect Telegram channels you are authorized to access, select an execution account and configure your rules. Follow signals, orders and broker outcomes from your account.",
    "sections": [
      {
        "id": "telegram",
        "title": "How do I connect Telegram?",
        "body": "Open the Telegram connection flow in your account and complete its verification steps. Check connection status before selecting a signal channel."
      },
      {
        "id": "broker",
        "title": "What do I need to connect MT4 or MT5?",
        "body": "Use the correct platform, broker server, account login and required credentials in the secure connection form. A read-only account cannot place trades. Never send credentials through support chat."
      },
      {
        "id": "selected",
        "title": "Which account receives new trades?",
        "body": "The selected execution account is the primary account used for new entries. Confirm that it is active, connected and eligible before enabling a channel."
      }
    ],
    "faqs": [
      {
        "id": "purpose",
        "topic": "getting-started",
        "question": "What does Tragram do?",
        "answer": "It reads eligible Telegram signals, applies your configured rules and routes eligible orders to the selected MT4 or MT5 account. It does not supply a trading strategy or guarantee results.",
        "relatedPath": "/help-center"
      },
      {
        "id": "demo",
        "topic": "getting-started",
        "question": "Should I start with a demo account?",
        "answer": "Yes. Use a broker demo account to check symbols, sizing, stops and history before considering live use. A successful demo test does not predict live execution or returns.",
        "relatedPath": "/help-center"
      },
      {
        "id": "access",
        "topic": "access",
        "question": "What access do I have now?",
        "answer": "Tragram currently provides Free Basic access. Your account shows your actual features and limits; the public catalog is not proof of the plan version granted to you.",
        "relatedPath": "/help-center"
      },
      {
        "id": "mobile",
        "topic": "mobile",
        "question": "Is Tragram available on iOS and Android?",
        "answer": "Yes. Use the official App Store and Google Play links on this website. Web and native interfaces may differ; consult the settings and account state actually shown in your installed version.",
        "relatedPath": "/help-center"
      }
    ],
    "relatedPaths": [
      "/help-center",
      "/contact"
    ],
    "image": {
      "src": "/images/hero-image-elite.png",
      "alt": "Illustration of the Tragram interface",
      "width": 736,
      "height": 520
    },
    "updatedAt": "2026-09-08"
  },
  "/features": {
    "title": "Telegram automation features and controls",
    "h1": "Configure what happens before and after an entry",
    "description": "See how Tragram handles Telegram signal intake, parsing, MT4/MT5 routing, execution rules, risk controls, and execution history.",
    "intro": "See how Tragram handles Telegram signal intake, parsing, MT4/MT5 routing, execution rules, risk controls, and execution history.",
    "sections": [
      {
        "id": "telegram",
        "title": "Telegram connection and channel selection",
        "body": "Open the Telegram connection flow in your account and complete its verification steps. Check connection status before selecting a signal channel.",
        "steps": [
          {
            "title": "Start here",
            "body": "Sign in, open the Telegram connection flow and verify the Telegram account you intend to use."
          },
          {
            "title": "Check the result",
            "body": "Confirm that the connection is available, then choose a channel you are authorized to access. Do not send Telegram codes or session data to support."
          }
        ]
      },
      {
        "id": "selected",
        "title": "Selected execution account",
        "body": "The selected execution account is the primary account used for new entries. Confirm that it is active, connected and eligible before enabling a channel.",
        "steps": [
          {
            "title": "Start here",
            "body": "Open your connected accounts and check which account is selected for execution; connection capacity is not simultaneous execution."
          },
          {
            "title": "Check the result",
            "body": "Confirm the number, broker and demo/live status before enabling new entries. Review existing broker orders separately when changing accounts."
          }
        ]
      },
      {
        "id": "symbols",
        "title": "Broker symbols and channel filters",
        "body": "The broker may use a different symbol name or not offer the instrument. Check the available broker instrument and channel symbol policy, including suffixes, before retrying.",
        "steps": [
          {
            "title": "Start here",
            "body": "Compare the signal instrument with the instruments available on the connected broker account, including prefixes and suffixes."
          },
          {
            "title": "Check the result",
            "body": "Review the channel symbol settings and the rejection reason. Do not substitute a similarly named instrument without checking its contract specifications."
          }
        ]
      },
      {
        "id": "sizing",
        "title": "Position sizing",
        "body": "Settings support fixed amount, percentage and fixed lot sizing, subject to your access and broker specifications. Check the calculated volume on demo; no sizing choice removes trading risk.",
        "steps": [
          {
            "title": "Start here",
            "body": "Review the channel sizing mode, stop-loss and take-profit handling, and applicable limits before enabling entries."
          },
          {
            "title": "Check the result",
            "body": "Save the intended settings and inspect a demo result, including volume and broker stop-distance constraints. A saved setting does not guarantee broker acceptance."
          }
        ]
      },
      {
        "id": "stops",
        "title": "Missing-stop handling",
        "body": "The configured missing-stop policy and eligibility checks determine the outcome. Configure and test it explicitly; do not assume every message without a stop will execute.",
        "steps": [
          {
            "title": "Start here",
            "body": "Review the channel sizing mode, stop-loss and take-profit handling, and applicable limits before enabling entries."
          },
          {
            "title": "Check the result",
            "body": "Save the intended settings and inspect a demo result, including volume and broker stop-distance constraints. A saved setting does not guarantee broker acceptance."
          }
        ]
      },
      {
        "id": "targets",
        "title": "Take-profit handling",
        "body": "Use the available TP settings to choose target handling. Partial closes and stop adjustments depend on configuration, broker constraints and execution results.",
        "steps": [
          {
            "title": "Start here",
            "body": "Review the channel sizing mode, stop-loss and take-profit handling, and applicable limits before enabling entries."
          },
          {
            "title": "Check the result",
            "body": "Save the intended settings and inspect a demo result, including volume and broker stop-distance constraints. A saved setting does not guarantee broker acceptance."
          }
        ]
      },
      {
        "id": "limits",
        "title": "New-entry limits",
        "body": "Configure daily and active-trade limits where available. These are entry controls, not a promise to cap losses, drawdown or all activity on your broker account.",
        "steps": [
          {
            "title": "Start here",
            "body": "Review the channel sizing mode, stop-loss and take-profit handling, and applicable limits before enabling entries."
          },
          {
            "title": "Check the result",
            "body": "Save the intended settings and inspect a demo result, including volume and broker stop-distance constraints. A saved setting does not guarantee broker acceptance."
          }
        ]
      },
      {
        "id": "updates",
        "title": "Signal updates and lifecycle",
        "body": "Supported updates need a resolvable original signal or trade target. An unmatched reply or ambiguous instruction is not a safe reason to modify unrelated positions.",
        "steps": [
          {
            "title": "Start here",
            "body": "Locate the signal by channel and time, then compare its parsed fields with the execution history."
          },
          {
            "title": "Check the result",
            "body": "Use the recorded reason to distinguish parsing, rule, connection and broker failures. Before retrying, check whether an order already exists to avoid a duplicate."
          }
        ]
      },
      {
        "id": "pause",
        "title": "Pause new entries",
        "body": "Disabling new entries is not a broker close instruction. Review open positions and pending orders at the broker; do not treat a pause, logout or app uninstall as a close action.",
        "steps": [
          {
            "title": "Start here",
            "body": "Pause new entries for the affected channel while checking the exact broker server and connection error."
          },
          {
            "title": "Check the result",
            "body": "Reconnect through the secure account flow if required, confirm the selected account is available, and reconcile existing orders at the broker before resuming."
          }
        ]
      },
      {
        "id": "notifications",
        "title": "History and notifications",
        "body": "Notifications help you follow activity, but execution history and the broker result are the places to confirm an order. Check device permissions if alerts are missing.",
        "steps": [
          {
            "title": "Start here",
            "body": "Check notification settings and device permissions, then compare the event time with the signal and execution history."
          },
          {
            "title": "Check the result",
            "body": "Confirm an order using the broker result, not the alert alone. Report missing alerts with the platform, app version and time, without credentials."
          }
        ]
      },
      {
        "id": "broker-connection",
        "title": "MT4 and MT5 broker connections",
        "body": "Use the correct platform, broker server, account login and required credentials in the secure connection form. A read-only account cannot place trades. Never send credentials through support chat.",
        "steps": [
          {
            "title": "Start here",
            "body": "Confirm whether your broker account is MT4 or MT5 and obtain its exact server name from the broker."
          },
          {
            "title": "Check the result",
            "body": "Enter the details only in the connection form. Confirm the displayed account number and connection state; use a demo account for the first setup."
          }
        ]
      },
      {
        "id": "mobile",
        "title": "Web, iOS and Android access",
        "body": "Use the official App Store and Google Play links on this website. Web and native interfaces may differ; consult the settings and account state actually shown in your installed version.",
        "steps": [
          {
            "title": "Start here",
            "body": "Install Tragram using the official store buttons and sign in to your existing account, or complete signup if you are new."
          },
          {
            "title": "Check the result",
            "body": "Confirm the installed version and selected account before changing settings. If a control is unavailable in that version, check the web app rather than assuming feature parity."
          }
        ]
      }
    ],
    "faqs": [],
    "relatedPaths": [
      "/help-center",
      "/blog/telegram-to-mt4-copier-guide",
      "/blog/telegram-to-mt5-copier-setup",
      "/blog/copy-telegram-signals-with-risk-controls",
      "/blog/telegram-signal-updates-close-sl-tp",
      "/blog/copy-telegram-signals-from-phone"
    ],
    "image": {
      "src": "/images/hero-image-elite.png",
      "alt": "Illustration of the Tragram interface",
      "width": 736,
      "height": 520
    },
    "updatedAt": "2026-09-08"
  },
  "/pricing": {
    "title": "Tragram plans and current access",
    "h1": "Plans and current access",
    "description": "Compare features and limits using the plan information shown in your account. Paid purchases and upgrades are currently unavailable.",
    "intro": "Compare features and limits using the plan information shown in your account. Paid purchases and upgrades are currently unavailable.",
    "sections": [],
    "faqs": [],
    "relatedPaths": [
      "/help-center",
      "/contact"
    ],
    "image": {
      "src": "/images/hero-image-elite.png",
      "alt": "Illustration of the Tragram interface",
      "width": 736,
      "height": 520
    }
  },
  "/faqs": {
    "title": "Tragram questions and answers",
    "h1": "Answers before you connect",
    "description": "Answers about connecting Telegram channels, copying signals to MT4/MT5, using execution rules, and controlling risk in Tragram.",
    "intro": "Answers about connecting Telegram channels, copying signals to MT4/MT5, using execution rules, and controlling risk in Tragram.",
    "sections": [],
    "faqs": [
      {
        "id": "purpose",
        "topic": "getting-started",
        "question": "What does Tragram do?",
        "answer": "It reads eligible Telegram signals, applies your configured rules and routes eligible orders to the selected MT4 or MT5 account. It does not supply a trading strategy or guarantee results.",
        "relatedPath": "/help-center"
      },
      {
        "id": "demo",
        "topic": "getting-started",
        "question": "Should I start with a demo account?",
        "answer": "Yes. Use a broker demo account to check symbols, sizing, stops and history before considering live use. A successful demo test does not predict live execution or returns.",
        "relatedPath": "/help-center"
      },
      {
        "id": "verification",
        "topic": "account-security",
        "question": "How do I verify my account?",
        "answer": "Follow the verification steps shown during signup. Keep verification codes private and use password recovery if you cannot sign in.",
        "relatedPath": "/help-center"
      },
      {
        "id": "telegram",
        "topic": "telegram",
        "question": "How do I connect Telegram?",
        "answer": "Open the Telegram connection flow in your account and complete its verification steps. Check connection status before selecting a signal channel.",
        "relatedPath": "/help-center"
      },
      {
        "id": "private",
        "topic": "telegram",
        "question": "Can I use a private channel?",
        "answer": "You must already have authorized access through the connected Telegram account. Tragram does not bypass channel membership or a provider’s access rules.",
        "relatedPath": "/help-center"
      },
      {
        "id": "channels",
        "topic": "telegram",
        "question": "Which channels are copied?",
        "answer": "Configure the channels you want to follow and their execution settings. Connecting Telegram alone is not permission to copy every channel.",
        "relatedPath": "/help-center"
      },
      {
        "id": "broker",
        "topic": "mt-accounts",
        "question": "What do I need to connect MT4 or MT5?",
        "answer": "Use the correct platform, broker server, account login and required credentials in the secure connection form. A read-only account cannot place trades. Never send credentials through support chat.",
        "relatedPath": "/help-center"
      },
      {
        "id": "connection",
        "topic": "mt-accounts",
        "question": "What if my broker connection is unavailable?",
        "answer": "Check the server, credentials and connection status. Resolve the connection issue before enabling new entries; do not assume another connected account will be used automatically.",
        "relatedPath": "/help-center"
      },
      {
        "id": "selected",
        "topic": "mt-accounts",
        "question": "Which account receives new trades?",
        "answer": "The selected execution account is the primary account used for new entries. Confirm that it is active, connected and eligible before enabling a channel.",
        "relatedPath": "/help-center"
      },
      {
        "id": "multiple",
        "topic": "mt-accounts",
        "question": "Do multiple connections mean simultaneous copying?",
        "answer": "No. Connection capacity and execution selection are different. New entries target the selected account; check your account for the number of connections available to you.",
        "relatedPath": "/help-center"
      },
      {
        "id": "symbols",
        "topic": "execution",
        "question": "Why is a symbol unsupported?",
        "answer": "The broker may use a different symbol name or not offer the instrument. Check the available broker instrument and channel symbol policy, including suffixes, before retrying.",
        "relatedPath": "/help-center"
      },
      {
        "id": "sizing",
        "topic": "execution",
        "question": "Which sizing modes are available?",
        "answer": "Settings support fixed amount, percentage and fixed lot sizing, subject to your access and broker specifications. Check the calculated volume on demo; no sizing choice removes trading risk.",
        "relatedPath": "/help-center"
      },
      {
        "id": "stops",
        "topic": "execution",
        "question": "What happens when a signal has no stop loss?",
        "answer": "The configured missing-stop policy and eligibility checks determine the outcome. Configure and test it explicitly; do not assume every message without a stop will execute.",
        "relatedPath": "/help-center"
      },
      {
        "id": "targets",
        "topic": "execution",
        "question": "How are take-profit targets handled?",
        "answer": "Use the available TP settings to choose target handling. Partial closes and stop adjustments depend on configuration, broker constraints and execution results.",
        "relatedPath": "/help-center"
      },
      {
        "id": "limits",
        "topic": "execution",
        "question": "Can I limit new entries?",
        "answer": "Configure daily and active-trade limits where available. These are entry controls, not a promise to cap losses, drawdown or all activity on your broker account.",
        "relatedPath": "/help-center"
      },
      {
        "id": "skipped",
        "topic": "execution",
        "question": "Why was a signal skipped?",
        "answer": "Check the signal and execution history for parsing, account, symbol, rule or broker reasons. Repeatedly reconnecting does not resolve a policy rejection.",
        "relatedPath": "/help-center"
      },
      {
        "id": "updates",
        "topic": "execution",
        "question": "Are signal updates followed?",
        "answer": "Supported updates need a resolvable original signal or trade target. An unmatched reply or ambiguous instruction is not a safe reason to modify unrelated positions.",
        "relatedPath": "/help-center"
      },
      {
        "id": "pause",
        "topic": "execution",
        "question": "Does pausing close my trades?",
        "answer": "No. Disabling new entries is not a broker close instruction. Review open positions and pending orders at the broker; do not treat a pause, logout or app uninstall as a close action.",
        "relatedPath": "/help-center"
      },
      {
        "id": "access",
        "topic": "access",
        "question": "What access do I have now?",
        "answer": "Tragram currently provides Free Basic access. Your account shows your actual features and limits; the public catalog is not proof of the plan version granted to you.",
        "relatedPath": "/help-center"
      },
      {
        "id": "purchases",
        "topic": "access",
        "question": "Can I purchase or upgrade now?",
        "answer": "Paid purchases and upgrades are currently unavailable. Existing payment-policy pages explain applicable terms, but do not enable checkout.",
        "relatedPath": "/help-center"
      },
      {
        "id": "mobile",
        "topic": "mobile",
        "question": "Is Tragram available on iOS and Android?",
        "answer": "Yes. Use the official App Store and Google Play links on this website. Web and native interfaces may differ; consult the settings and account state actually shown in your installed version.",
        "relatedPath": "/help-center"
      },
      {
        "id": "notifications",
        "topic": "mobile",
        "question": "Are notifications proof of execution?",
        "answer": "No. Notifications help you follow activity, but execution history and the broker result are the places to confirm an order. Check device permissions if alerts are missing.",
        "relatedPath": "/help-center"
      },
      {
        "id": "recovery",
        "topic": "account-security",
        "question": "What if I cannot sign in?",
        "answer": "Use password recovery and follow the displayed verification instructions. Contact support if recovery is unavailable, without sharing passwords or verification codes.",
        "relatedPath": "/help-center"
      },
      {
        "id": "deletion",
        "topic": "account-security",
        "question": "How do I delete my account?",
        "answer": "Use Account deletion and complete the requested account verification. Review immediate versus scheduled deletion, retained records and broker responsibilities before confirming.",
        "relatedPath": "/account-deletion"
      }
    ],
    "relatedPaths": [
      "/help-center",
      "/contact"
    ],
    "image": {
      "src": "/images/hero-image-elite.png",
      "alt": "Illustration of the Tragram interface",
      "width": 736,
      "height": 520
    },
    "updatedAt": "2026-09-08"
  },
  "/blog": {
    "title": "Tragram setup and troubleshooting guides",
    "h1": "Learn the workflow, then test it",
    "description": "Read plain-English guides about Telegram signal copiers, Telegram-to-MT4/MT5 setup, parsing, cloud workflows, and risk controls.",
    "intro": "Read plain-English guides about Telegram signal copiers, Telegram-to-MT4/MT5 setup, parsing, cloud workflows, and risk controls.",
    "sections": [],
    "faqs": [],
    "relatedPaths": [
      "/help-center",
      "/contact"
    ],
    "image": {
      "src": "/images/hero-image-elite.png",
      "alt": "Illustration of the Tragram interface",
      "width": 736,
      "height": 520
    }
  },
  "/about": {
    "title": "About Tragram and its purpose",
    "h1": "Built around your execution rules",
    "description": "Learn how Tragram helps traders connect Telegram signals to MT4 and MT5 while keeping execution rules visible and under user control.",
    "intro": "Learn how Tragram helps traders connect Telegram signals to MT4 and MT5 while keeping execution rules visible and under user control.",
    "sections": [
      {
        "id": "purpose",
        "title": "What we build",
        "body": "It reads eligible Telegram signals, applies your configured rules and routes eligible orders to the selected MT4 or MT5 account. It does not supply a trading strategy or guarantee results."
      },
      {
        "id": "responsibility",
        "title": "Clear responsibilities",
        "body": "You choose the signal source, broker and rules. Tragram processes signals according to configuration; the broker determines order acceptance and execution. We do not promise profits or outcomes."
      },
      {
        "id": "company",
        "title": "Company and support",
        "body": "The Terms of Service identify Tragram F.Z.C, licence 49251, Ajman, as the operator. Website support is available through the contact form or at support@tragram.app."
      }
    ],
    "faqs": [],
    "relatedPaths": [
      "/help-center",
      "/contact"
    ],
    "image": {
      "src": "/images/hero-image-elite.png",
      "alt": "Illustration of the Tragram interface",
      "width": 736,
      "height": 520
    },
    "updatedAt": "2026-09-08"
  },
  "/contact": {
    "title": "Contact Tragram support",
    "h1": "Get help with your Tragram account",
    "description": "Contact Tragram support for help with Telegram channel setup, MT4/MT5 connection, signal automation, and billing questions.",
    "intro": "Contact Tragram support for help with Telegram channel setup, MT4/MT5 connection, signal automation, and billing questions.",
    "sections": [],
    "faqs": [],
    "relatedPaths": [
      "/help-center",
      "/contact"
    ],
    "image": {
      "src": "/images/hero-image-elite.png",
      "alt": "Illustration of the Tragram interface",
      "width": 736,
      "height": 520
    }
  },
  "/account-deletion": {
    "title": "Delete your Tragram account",
    "h1": "Delete your Tragram account",
    "description": "Request immediate or seven-day scheduled Tragram account deletion with account verification, a consequences review and a private receipt.",
    "intro": "Review Tragram account deletion options and complete the required verification. Read retained-record information and your broker responsibilities before confirming.",
    "sections": [],
    "faqs": [],
    "relatedPaths": [
      "/help-center",
      "/contact"
    ],
    "image": {
      "src": "/images/hero-image-elite.png",
      "alt": "Illustration of the Tragram interface",
      "width": 736,
      "height": 520
    }
  },
  "/help-center": {
    "title": "Tragram Help Center: setup and recovery",
    "h1": "Find your next setup step",
    "description": "Get help with Telegram signal copying, MT4/MT5 account setup, channel rules, risk controls, and execution visibility.",
    "intro": "Get help with Telegram signal copying, MT4/MT5 account setup, channel rules, risk controls, and execution visibility.",
    "sections": [
      {
        "id": "account-setup",
        "title": "How do I verify my account?",
        "body": "Follow the verification steps shown during signup. Keep verification codes private and use password recovery if you cannot sign in.",
        "steps": [
          {
            "title": "Start here",
            "body": "Start signup with contact details you control and complete the verification prompt."
          },
          {
            "title": "Check the result",
            "body": "Wait for the resend timer before requesting another code. If verification fails, note the error and contact support without sharing the code."
          }
        ]
      },
      {
        "id": "telegram",
        "title": "How do I connect Telegram?",
        "body": "Open the Telegram connection flow in your account and complete its verification steps. Check connection status before selecting a signal channel.",
        "steps": [
          {
            "title": "Start here",
            "body": "Sign in, open the Telegram connection flow and verify the Telegram account you intend to use."
          },
          {
            "title": "Check the result",
            "body": "Confirm that the connection is available, then choose a channel you are authorized to access. Do not send Telegram codes or session data to support."
          }
        ]
      },
      {
        "id": "broker-connection",
        "title": "What do I need to connect MT4 or MT5?",
        "body": "Use the correct platform, broker server, account login and required credentials in the secure connection form. A read-only account cannot place trades. Never send credentials through support chat.",
        "steps": [
          {
            "title": "Start here",
            "body": "Confirm whether your broker account is MT4 or MT5 and obtain its exact server name from the broker."
          },
          {
            "title": "Check the result",
            "body": "Enter the details only in the connection form. Confirm the displayed account number and connection state; use a demo account for the first setup."
          }
        ]
      },
      {
        "id": "selected-account",
        "title": "Which account receives new trades?",
        "body": "The selected execution account is the primary account used for new entries. Confirm that it is active, connected and eligible before enabling a channel.",
        "steps": [
          {
            "title": "Start here",
            "body": "Open your connected accounts and check which account is selected for execution; connection capacity is not simultaneous execution."
          },
          {
            "title": "Check the result",
            "body": "Confirm the number, broker and demo/live status before enabling new entries. Review existing broker orders separately when changing accounts."
          }
        ]
      },
      {
        "id": "symbols",
        "title": "Why is a symbol unsupported?",
        "body": "The broker may use a different symbol name or not offer the instrument. Check the available broker instrument and channel symbol policy, including suffixes, before retrying.",
        "steps": [
          {
            "title": "Start here",
            "body": "Compare the signal instrument with the instruments available on the connected broker account, including prefixes and suffixes."
          },
          {
            "title": "Check the result",
            "body": "Review the channel symbol settings and the rejection reason. Do not substitute a similarly named instrument without checking its contract specifications."
          }
        ]
      },
      {
        "id": "settings",
        "title": "Which sizing modes are available?",
        "body": "Settings support fixed amount, percentage and fixed lot sizing, subject to your access and broker specifications. Check the calculated volume on demo; no sizing choice removes trading risk.",
        "steps": [
          {
            "title": "Start here",
            "body": "Review the channel sizing mode, stop-loss and take-profit handling, and applicable limits before enabling entries."
          },
          {
            "title": "Check the result",
            "body": "Save the intended settings and inspect a demo result, including volume and broker stop-distance constraints. A saved setting does not guarantee broker acceptance."
          }
        ]
      },
      {
        "id": "signal-statuses",
        "title": "Why was a signal skipped?",
        "body": "Check the signal and execution history for parsing, account, symbol, rule or broker reasons. Repeatedly reconnecting does not resolve a policy rejection.",
        "steps": [
          {
            "title": "Start here",
            "body": "Locate the signal by channel and time, then compare its parsed fields with the execution history."
          },
          {
            "title": "Check the result",
            "body": "Use the recorded reason to distinguish parsing, rule, connection and broker failures. Before retrying, check whether an order already exists to avoid a duplicate."
          }
        ]
      },
      {
        "id": "connection-recovery",
        "title": "What if my broker connection is unavailable?",
        "body": "Check the server, credentials and connection status. Resolve the connection issue before enabling new entries; do not assume another connected account will be used automatically.",
        "steps": [
          {
            "title": "Start here",
            "body": "Pause new entries for the affected channel while checking the exact broker server and connection error."
          },
          {
            "title": "Check the result",
            "body": "Reconnect through the secure account flow if required, confirm the selected account is available, and reconcile existing orders at the broker before resuming."
          }
        ]
      },
      {
        "id": "current-access",
        "title": "What access do I have now?",
        "body": "Tragram currently provides Free Basic access. Your account shows your actual features and limits; the public catalog is not proof of the plan version granted to you.",
        "steps": [
          {
            "title": "Start here",
            "body": "Check the features and usage limits displayed in your account rather than assuming every connected account or channel is active."
          },
          {
            "title": "Check the result",
            "body": "Paid purchases remain disabled. For an access mismatch, send support the affected feature and error text, not payment or account credentials."
          }
        ]
      },
      {
        "id": "mobile",
        "title": "Is Tragram available on iOS and Android?",
        "body": "Yes. Use the official App Store and Google Play links on this website. Web and native interfaces may differ; consult the settings and account state actually shown in your installed version.",
        "steps": [
          {
            "title": "Start here",
            "body": "Install Tragram using the official store buttons and sign in to your existing account, or complete signup if you are new."
          },
          {
            "title": "Check the result",
            "body": "Confirm the installed version and selected account before changing settings. If a control is unavailable in that version, check the web app rather than assuming feature parity."
          }
        ]
      },
      {
        "id": "notifications",
        "title": "Are notifications proof of execution?",
        "body": "No. Notifications help you follow activity, but execution history and the broker result are the places to confirm an order. Check device permissions if alerts are missing.",
        "steps": [
          {
            "title": "Start here",
            "body": "Check notification settings and device permissions, then compare the event time with the signal and execution history."
          },
          {
            "title": "Check the result",
            "body": "Confirm an order using the broker result, not the alert alone. Report missing alerts with the platform, app version and time, without credentials."
          }
        ]
      },
      {
        "id": "deletion",
        "title": "How do I delete my account?",
        "body": "Use Account deletion and complete the requested account verification. Review immediate versus scheduled deletion, retained records and broker responsibilities before confirming.",
        "steps": [
          {
            "title": "Start here",
            "body": "Open the public Account deletion page and read the scope, retained-record information and broker responsibilities before choosing a deletion mode."
          },
          {
            "title": "Check the result",
            "body": "Complete the verification requested by that flow and keep the private receipt. Manage open broker positions separately; deleting Tragram is not an instruction to close them."
          }
        ]
      }
    ],
    "faqs": [],
    "relatedPaths": [
      "/blog/telegram-to-mt4-copier-guide",
      "/blog/telegram-to-mt5-copier-setup",
      "/blog/telegram-to-mt4-mt5-copier-troubleshooting",
      "/blog/copy-telegram-signals-from-phone",
      "/contact"
    ],
    "image": {
      "src": "/images/hero-image-elite.png",
      "alt": "Illustration of the Tragram interface",
      "width": 736,
      "height": 520
    },
    "updatedAt": "2026-09-08"
  },
  "/privacy-policy": {
    "title": "Tragram Privacy Policy",
    "h1": "Privacy Policy",
    "description": "Read how Tragram handles account, Telegram, MT4/MT5, billing, and support data for the signal automation workflow.",
    "intro": "Read how Tragram handles account, Telegram, MT4/MT5, billing, and support data for the signal automation workflow.",
    "sections": [],
    "faqs": [],
    "relatedPaths": [
      "/help-center",
      "/contact"
    ],
    "image": {
      "src": "/images/hero-image-elite.png",
      "alt": "Illustration of the Tragram interface",
      "width": 736,
      "height": 520
    }
  },
  "/refund-policy": {
    "title": "Tragram Refund Policy",
    "h1": "Refund Policy",
    "description": "Read Tragram refund terms for Telegram signal automation subscriptions and billing changes.",
    "intro": "Read Tragram refund terms for Telegram signal automation subscriptions and billing changes.",
    "sections": [],
    "faqs": [],
    "relatedPaths": [
      "/help-center",
      "/contact"
    ],
    "image": {
      "src": "/images/hero-image-elite.png",
      "alt": "Illustration of the Tragram interface",
      "width": 736,
      "height": 520
    }
  },
  "/terms-of-service": {
    "title": "Tragram Terms of Service",
    "h1": "Terms of Service",
    "description": "Read the terms for using Tragram to connect Telegram channels, apply user rules, and route eligible signals to MT4/MT5.",
    "intro": "Read the terms for using Tragram to connect Telegram channels, apply user rules, and route eligible signals to MT4/MT5.",
    "sections": [],
    "faqs": [],
    "relatedPaths": [
      "/help-center",
      "/contact"
    ],
    "image": {
      "src": "/images/hero-image-elite.png",
      "alt": "Illustration of the Tragram interface",
      "width": 736,
      "height": 520
    }
  },
  "/telegram-signal-copier": {
    "title": "Telegram Signal Copier for MT4 and MT5",
    "h1": "Telegram Signal Copier for MT4 and MT5",
    "description": "Copy Telegram signals to MT4 or MT5 with user rules, risk controls, configured execution rules, execution logs, and pause controls.",
    "intro": "Tragram helps you follow the Telegram channels you trust and send eligible signals to your own MT4 or MT5 account. You choose the channels, set the rules, and keep control of what can be copied.",
    "sections": [
      {
        "id": "section-1",
        "title": "How the signal copier works",
        "body": "Tragram listens to selected Telegram channels, reads signal messages, checks your channel rules, and routes eligible trades to the MT account you connected.",
        "bullets": [
          "Connect Telegram and choose the channels to follow.",
          "Link the MT4 or MT5 account that should receive eligible trades.",
          "Use execution rules, symbol filters, sizing rules, and pause controls before automation goes live."
        ]
      },
      {
        "id": "section-2",
        "title": "Control before execution",
        "body": "Automation should not hide the decision path. Tragram shows the signal, the rule checks, and the execution result so you can understand what happened."
      },
      {
        "id": "section-3",
        "title": "Built for signal followers",
        "body": "Tragram does not sell signals or provide trading advice. It helps you manage signals from sources you already choose and keeps the execution workflow visible."
      },
      {
        "id": "verify-fit",
        "title": "Follow one message end to end",
        "body": "Start with a channel you are allowed to access and a demo account. A message may describe a symbol, direction, entry, stop and targets. Parsing creates structured fields; it does not prove the order is tradable. The selected account, channel rules and broker specifications are checked separately."
      }
    ],
    "faqs": [
      {
        "id": "question-1",
        "topic": "execution",
        "question": "What is a Telegram signal copier?",
        "answer": "A Telegram signal copier reads trading signal messages from selected Telegram channels and can send eligible trades to a connected trading account based on the user's rules."
      },
      {
        "id": "question-2",
        "topic": "execution",
        "question": "Does Tragram copy every signal automatically?",
        "answer": "No. You choose which channels can run, which symbols are allowed, which entry conditions must be met, and when automation should be paused."
      },
      {
        "id": "question-3",
        "topic": "execution",
        "question": "Does Tragram provide trading advice?",
        "answer": "No. Tragram is a user-controlled automation tool. It does not sell signals, recommend trades, or decide which channels you should follow."
      }
    ],
    "relatedPaths": [
      "/blog/what-is-a-telegram-signal-copier",
      "/best-telegram-signal-copier",
      "/blog/low-latency-telegram-trade-copier",
      "/blog/telegram-to-mt4-mt5-copier-troubleshooting"
    ],
    "image": {
      "src": "/images/hero-image-elite.png",
      "alt": "Illustration of the Tragram interface",
      "width": 736,
      "height": 520
    },
    "updatedAt": "2026-09-08"
  },
  "/best-telegram-signal-copier": {
    "title": "Best Telegram Signal Copier Checklist",
    "h1": "Best Telegram Signal Copier Checklist",
    "description": "Compare Telegram signal copiers by parsing quality, MT4/MT5 support, risk controls, cloud setup, execution logs, and product boundaries.",
    "intro": "There is no single best Telegram signal copier for every trader. The useful question is whether the copier matches your signal sources, MT4/MT5 setup, risk rules, and review workflow.",
    "sections": [
      {
        "id": "section-1",
        "title": "Check the full workflow",
        "body": "A good copier should explain how Telegram messages move through parsing, rule checks, MT4/MT5 routing, broker response, and execution history.",
        "bullets": [
          "Can you see accepted, skipped, and failed signals?",
          "Can you pause a channel without disconnecting the whole account?",
          "Can you review the rules that allowed or blocked a signal?"
        ]
      },
      {
        "id": "section-2",
        "title": "Compare controls, not only speed claims",
        "body": "Fast routing matters, but unchecked speed can copy the wrong signal faster. Compare configured execution rules, symbol filters, lot controls, stop-loss handling, and audit logs."
      },
      {
        "id": "section-3",
        "title": "Keep platform claims clear",
        "body": "Tragram focuses on Telegram-to-MT4/MT5 workflows. If you need cTrader, TradeLocker, DXTrade, or TradingView routing, check the current product scope before choosing a copier."
      },
      {
        "id": "verify-fit",
        "title": "Start at the first missing stage",
        "body": "No message: check Telegram access and channel selection. Message but no parsed entry: review message completeness and status. Parsed entry but no command: check selected account, eligibility, symbols and limits. Command but no accepted order: review the broker error and account permissions."
      }
    ],
    "faqs": [
      {
        "id": "question-1",
        "topic": "execution",
        "question": "What makes a Telegram signal copier a good fit?",
        "answer": "A good fit depends on your signal format, MT4/MT5 account setup, rule controls, visibility needs, and support expectations."
      },
      {
        "id": "question-2",
        "topic": "execution",
        "question": "Should I choose the fastest Telegram copier?",
        "answer": "Speed matters, but it should not replace rule checks, stop-loss controls, execution logs, and the ability to pause risky channels."
      },
      {
        "id": "question-3",
        "topic": "execution",
        "question": "Does Tragram claim to be the best copier for everyone?",
        "answer": "No. Tragram explains its Telegram-to-MT4/MT5 workflow so users can decide whether it matches their own signal sources and account rules."
      }
    ],
    "relatedPaths": [
      "/blog/telegram-to-mt4-mt5-copier-troubleshooting",
      "/telegram-to-mt4-copier",
      "/telegram-to-mt5-copier",
      "/telegram-signal-parser",
      "/risk-controls",
      "/blog/low-latency-telegram-trade-copier",
      "/blog/telegram-signal-updates-close-sl-tp",
      "/blog/multi-account-telegram-copier-checklist",
      "/blog/broker-symbol-mapping-telegram-signals",
      "/blog/telegram-pending-orders-mt4-mt5",
      "/blog/telegram-copier-supported-platforms",
      "/blog/copy-telegram-signals-from-phone"
    ],
    "image": {
      "src": "/images/hero-image-elite.png",
      "alt": "Illustration of the Tragram interface",
      "width": 736,
      "height": 520
    },
    "updatedAt": "2026-09-08"
  },
  "/telegram-to-mt4-copier": {
    "title": "Telegram to MT4 Copier",
    "h1": "Telegram to MT4 Copier",
    "description": "Connect Telegram signals to MetaTrader 4 with channel rules, lot controls, symbol filters, configured execution rules, and execution history.",
    "intro": "Use Tragram to connect Telegram signal channels to MT4 while keeping the workflow clear. You decide which channels can trade, which signals meet your entry rules, and which rules protect your account.",
    "sections": [
      {
        "id": "section-1",
        "title": "From Telegram message to MT4 order",
        "body": "Tragram reads the signal message, extracts the symbol, direction, entry, stop loss, and take-profit details, then checks your rules before sending an eligible order to MT4."
      },
      {
        "id": "section-2",
        "title": "MT4 rules stay under your control",
        "body": "Set channel-level controls such as allowed symbols, sizing behavior, configured execution rules, missing stop-loss handling, and execution pause."
      },
      {
        "id": "section-3",
        "title": "Review what happened",
        "body": "Use the dashboard to see incoming signals, skipped signals, open trades, and execution history so MT4 automation is not a black box."
      },
      {
        "id": "verify-fit",
        "title": "Match the MT4 server exactly",
        "body": "Use the MT4 server name associated with the account, including any demo/live distinction. Enter credentials only in the protected connection screen. If connection fails, confirm the platform and server with the broker; trying unrelated servers is not a reliable diagnosis."
      }
    ],
    "faqs": [
      {
        "id": "selected",
        "topic": "mt-accounts",
        "question": "Which account receives new trades?",
        "answer": "The selected execution account is the primary account used for new entries. Confirm that it is active, connected and eligible before enabling a channel.",
        "relatedPath": "/help-center"
      },
      {
        "id": "limits",
        "topic": "execution",
        "question": "Can I limit new entries?",
        "answer": "Configure daily and active-trade limits where available. These are entry controls, not a promise to cap losses, drawdown or all activity on your broker account.",
        "relatedPath": "/help-center"
      },
      {
        "id": "pause",
        "topic": "execution",
        "question": "Does pausing close my trades?",
        "answer": "No. Disabling new entries is not a broker close instruction. Review open positions and pending orders at the broker; do not treat a pause, logout or app uninstall as a close action.",
        "relatedPath": "/help-center"
      }
    ],
    "relatedPaths": [
      "/blog/telegram-to-mt4-copier-guide",
      "/help-center",
      "/blog/telegram-to-mt4-mt5-copier-troubleshooting"
    ],
    "image": {
      "src": "/images/hero-image-elite.png",
      "alt": "Illustration of the Tragram interface",
      "width": 736,
      "height": 520
    },
    "updatedAt": "2026-09-08"
  },
  "/telegram-to-mt5-copier": {
    "title": "Telegram to MT5 Copier",
    "h1": "Telegram to MT5 Copier",
    "description": "Copy Telegram signals to MetaTrader 5 with user-defined rules, symbol filters, execution controls, and visible execution logs.",
    "intro": "Tragram connects selected Telegram channels to MT5 so eligible signals can be routed through your own rules. You stay in control of the channel, the account, and the execution behavior.",
    "sections": [
      {
        "id": "section-1",
        "title": "Connect Telegram to MT5",
        "body": "Choose the channels you want Tragram to follow, connect your MT5 account, and decide how each channel is allowed to trade."
      },
      {
        "id": "section-2",
        "title": "Rules before routing",
        "body": "Tragram checks your settings before eligible signals reach MT5. You can control symbols, lot sizing, entry rules, stop-loss behavior, and channel status."
      },
      {
        "id": "section-3",
        "title": "Clear execution history",
        "body": "Every accepted, skipped, and executed signal should be easy to review from the dashboard so you can adjust rules when needed."
      },
      {
        "id": "verify-fit",
        "title": "Prepare the MT5 connection",
        "body": "Obtain the exact MT5 broker server and account login from your broker. Use the secure connection form, not the public contact form. Check that the account permits trading, then verify the displayed connection status and select the intended execution account. An MT4 login/server pair is not a substitute for MT5 credentials."
      }
    ],
    "faqs": [
      {
        "id": "question-1",
        "topic": "execution",
        "question": "Does Tragram support MT5?",
        "answer": "Yes. Tragram supports MT5 account connection and can route eligible Telegram signals to MT5 based on your settings."
      },
      {
        "id": "question-2",
        "topic": "execution",
        "question": "Can I use different rules for different channels?",
        "answer": "Yes. Channel-specific settings let you control how each Telegram source is handled."
      },
      {
        "id": "question-3",
        "topic": "execution",
        "question": "Can I pause MT5 signal copying?",
        "answer": "Yes. You can pause a channel or stop execution from the dashboard when you want to review the setup."
      }
    ],
    "relatedPaths": [
      "/blog/telegram-to-mt5-copier-setup",
      "/help-center",
      "/blog/telegram-to-mt4-mt5-copier-troubleshooting"
    ],
    "image": {
      "src": "/images/hero-image-elite.png",
      "alt": "Illustration of the Tragram interface",
      "width": 736,
      "height": 520
    },
    "updatedAt": "2026-09-08"
  },
  "/telegram-signals-automation": {
    "title": "Telegram Signals Automation",
    "h1": "Telegram Signals Automation",
    "description": "Automate Telegram signal handling with visible rules, entry rules, MT4/MT5 routing, risk controls, and execution review.",
    "intro": "Tragram automates the repetitive parts of following Telegram signals while keeping the trading decision path visible. You define the rules and decide how much automation is allowed.",
    "sections": [
      {
        "id": "section-1",
        "title": "Automation with review points",
        "body": "You can run a configured execution rules flow, allow rule-based execution for trusted channels, or pause automation when market conditions change."
      },
      {
        "id": "section-2",
        "title": "Channel settings matter",
        "body": "Automation is safer when every channel has its own limits. Tragram lets you configure symbol filters, risk behavior, and execution rules per source."
      },
      {
        "id": "section-3",
        "title": "Visibility after execution",
        "body": "After a signal is handled, the dashboard helps you see whether it was accepted, skipped, or executed."
      },
      {
        "id": "verify-fit",
        "title": "Identify the intended trade",
        "body": "A follow-up such as a stop change or close instruction needs an identifiable original signal and a supported target. Reply context and message relationships matter. Do not assume an update applies to every open position with the same symbol."
      }
    ],
    "faqs": [
      {
        "id": "question-1",
        "topic": "execution",
        "question": "Can Telegram signal automation be manual?",
        "answer": "Yes. Automation can include configured execution rules. You can require review before signals become trades."
      },
      {
        "id": "question-2",
        "topic": "execution",
        "question": "Can I automate only trusted channels?",
        "answer": "Yes. You choose which channels are connected and which channels are allowed to execute."
      },
      {
        "id": "question-3",
        "topic": "execution",
        "question": "Can I change automation rules later?",
        "answer": "Yes. You can update rules, pause channels, or change account settings from the dashboard."
      }
    ],
    "relatedPaths": [
      "/blog/telegram-signal-updates-close-sl-tp",
      "/help-center",
      "/blog/telegram-to-mt4-mt5-copier-troubleshooting"
    ],
    "image": {
      "src": "/images/hero-image-elite.png",
      "alt": "Illustration of the Tragram interface",
      "width": 736,
      "height": 520
    },
    "updatedAt": "2026-09-08"
  },
  "/telegram-signal-parser": {
    "title": "Telegram Signal Parser",
    "h1": "Telegram Signal Parser",
    "description": "Parse Telegram trading signals into structured trade details before MT4/MT5 execution rules decide what can be copied.",
    "intro": "Signal messages are not always written the same way. Tragram reads Telegram signal text and turns it into structured details that can be checked against your rules.",
    "sections": [
      {
        "id": "section-1",
        "title": "From message text to trade fields",
        "body": "Tragram looks for the symbol, direction, entry area, stop loss, take-profit levels, and follow-up instructions that matter for execution."
      },
      {
        "id": "section-2",
        "title": "Parsing is not the final decision",
        "body": "A parsed signal still has to pass your channel rules before it can be routed to MT4 or MT5."
      },
      {
        "id": "section-3",
        "title": "Useful for mixed channel formats",
        "body": "Different Telegram channels write signals differently. A parser helps normalize the message before the execution rules are applied."
      },
      {
        "id": "verify-fit",
        "title": "Read the fields before the outcome",
        "body": "An illustrative message might contain BUY, a broker instrument, an entry, SL and TP values. Check how each field was interpreted. Commentary, performance recaps and incomplete instructions should not be assumed to be executable entries. Do not invent a missing direction or instrument to make a message fit."
      }
    ],
    "faqs": [
      {
        "id": "question-1",
        "topic": "execution",
        "question": "What does a Telegram signal parser do?",
        "answer": "It reads a signal message and extracts structured trade details such as symbol, direction, entry, stop loss, and take-profit levels."
      },
      {
        "id": "question-2",
        "topic": "execution",
        "question": "Does parsing mean the trade is executed?",
        "answer": "No. Parsing prepares the signal for rule checks. Your settings decide whether the signal can be executed."
      },
      {
        "id": "question-3",
        "topic": "execution",
        "question": "Can a parser handle every message format?",
        "answer": "No parser can guarantee every format. Tragram is designed to support common signal layouts and keep skipped or unclear signals visible for review."
      }
    ],
    "relatedPaths": [
      "/blog/telegram-signal-parser-guide",
      "/help-center",
      "/blog/telegram-to-mt4-mt5-copier-troubleshooting"
    ],
    "image": {
      "src": "/images/hero-image-elite.png",
      "alt": "Illustration of the Tragram interface",
      "width": 736,
      "height": 520
    },
    "updatedAt": "2026-09-08"
  },
  "/risk-controls": {
    "title": "Telegram Signal Copier Risk Controls",
    "h1": "Risk Controls for Telegram Signal Copying",
    "description": "Control Telegram signal copying with entry rules, symbol filters, sizing rules, stop-loss checks, trade limits, and instant pause controls.",
    "intro": "Tragram is built around user rules. Before a Telegram signal can become a trade, it should pass the controls you set for that channel and account.",
    "sections": [
      {
        "id": "section-1",
        "title": "Per-channel controls",
        "body": "Use different rules for different Telegram channels so one noisy source does not affect your whole setup."
      },
      {
        "id": "section-2",
        "title": "Execution guardrails",
        "body": "Controls can include configured execution rules, symbol filters, lot sizing behavior, missing stop-loss handling, and trade limits."
      },
      {
        "id": "section-3",
        "title": "Pause when needed",
        "body": "If a channel changes behavior or market conditions are unusual, pause execution and review the signal history before turning it back on."
      },
      {
        "id": "verify-fit",
        "title": "Configure before enabling entries",
        "body": "Review fixed amount, percentage or fixed lot sizing according to the options available in your account. Check allowed symbols, daily and active-order limits, missing-stop handling and entry tolerance. Save the settings and verify their displayed values; do not rely on the plan name to infer exact limits."
      }
    ],
    "faqs": [
      {
        "id": "question-1",
        "topic": "execution",
        "question": "Can I block signals without a stop loss?",
        "answer": "Tragram supports channel settings that let you control how missing stop-loss signals are handled."
      },
      {
        "id": "question-2",
        "topic": "execution",
        "question": "Can I limit symbols by channel?",
        "answer": "Yes. Symbol filters help decide which signals a channel is allowed to copy."
      },
      {
        "id": "question-3",
        "topic": "execution",
        "question": "Can I stop automation quickly?",
        "answer": "Yes. Pause controls let you stop new execution while keeping the rest of your setup available."
      }
    ],
    "relatedPaths": [
      "/blog/copy-telegram-signals-with-risk-controls",
      "/help-center",
      "/blog/telegram-to-mt4-mt5-copier-troubleshooting"
    ],
    "image": {
      "src": "/images/hero-image-elite.png",
      "alt": "Illustration of the Tragram interface",
      "width": 736,
      "height": 520
    },
    "updatedAt": "2026-09-08"
  },
  "/copy-trading-without-vps": {
    "title": "Copy Telegram Signals Without a VPS",
    "h1": "Copy Telegram Signals Without a VPS",
    "description": "Use Tragram's web-based Telegram-to-MT4/MT5 workflow to manage signal copying without running your own VPS copier setup.",
    "intro": "Traditional signal copying often depends on a VPS, local scripts, or a desktop terminal that must stay online. Tragram gives you a web-based workflow for connecting Telegram channels and MT accounts.",
    "sections": [
      {
        "id": "section-1",
        "title": "A web dashboard instead of local scripts",
        "body": "Manage channels, account connection, rules, and execution history from the Tragram dashboard instead of maintaining your own copier script."
      },
      {
        "id": "section-2",
        "title": "Still your rules",
        "body": "Not running a VPS does not mean giving up control. You still choose channels, entry rules, filters, and pause behavior."
      },
      {
        "id": "section-3",
        "title": "Designed for daily monitoring",
        "body": "The dashboard gives you one place to check signals, open trades, account state, and channel settings."
      },
      {
        "id": "verify-fit",
        "title": "Separate hosting from trading responsibility",
        "body": "A self-managed VPS adds responsibility for terminal installation, updates, connectivity and recovery. A managed service moves hosting operations to the provider, but you still own channel choice, account credentials and execution settings. Neither model removes Telegram or broker dependencies."
      }
    ],
    "faqs": [
      {
        "id": "question-1",
        "topic": "execution",
        "question": "Do I need my own VPS to use Tragram?",
        "answer": "Tragram is designed as a web-based workflow, so you do not manage a traditional local copier script or your own VPS for the dashboard experience."
      },
      {
        "id": "question-2",
        "topic": "execution",
        "question": "Can I still control risk without a VPS?",
        "answer": "Yes. Risk and execution controls are part of the Tragram channel settings."
      },
      {
        "id": "question-3",
        "topic": "execution",
        "question": "Does no VPS mean no monitoring?",
        "answer": "No. You still monitor channels, signals, trades, and rules from the web dashboard."
      }
    ],
    "relatedPaths": [
      "/blog/cloud-vs-vps-telegram-copier",
      "/help-center",
      "/blog/telegram-to-mt4-mt5-copier-troubleshooting"
    ],
    "image": {
      "src": "/images/hero-image-elite.png",
      "alt": "Illustration of the Tragram interface",
      "width": 736,
      "height": 520
    },
    "updatedAt": "2026-09-08"
  },
  "/prop-firm-telegram-copier": {
    "title": "Telegram Signal Copier for Prop Firm Traders",
    "h1": "Telegram Signal Copier for Prop Firm Traders",
    "description": "Use Telegram signal copying with stricter controls, configured execution rules, channel filters, and pause options for funded-account workflows.",
    "intro": "Funded-account and prop firm traders usually need tighter control. Tragram helps you follow Telegram signals with review points, channel rules, and clear execution history.",
    "sections": [
      {
        "id": "section-1",
        "title": "Use stricter channel rules",
        "body": "Set conservative rules for channels that should not trade freely. Configure entry rules, limit symbols, and pause sources that become too risky."
      },
      {
        "id": "section-2",
        "title": "Keep decisions visible",
        "body": "Execution history helps you understand why a signal was copied, skipped, or waiting for review."
      },
      {
        "id": "section-3",
        "title": "No trading advice",
        "body": "Tragram does not tell you which trades to take. It helps you control the workflow around signals you choose to follow."
      },
      {
        "id": "verify-fit",
        "title": "Configure before enabling entries",
        "body": "Review fixed amount, percentage or fixed lot sizing according to the options available in your account. Check allowed symbols, daily and active-order limits, missing-stop handling and entry tolerance. Save the settings and verify their displayed values; do not rely on the plan name to infer exact limits."
      },
      {
        "id": "permission",
        "title": "Check the firm’s rules first",
        "body": "Review your trading firm’s rules on signal copying, automation and third-party services before connecting. Entry controls are not a compliance system for drawdown limits and do not guarantee passing a challenge. Ask the firm for confirmation when its rules are unclear."
      }
    ],
    "faqs": [
      {
        "id": "selected",
        "topic": "mt-accounts",
        "question": "Which account receives new trades?",
        "answer": "The selected execution account is the primary account used for new entries. Confirm that it is active, connected and eligible before enabling a channel.",
        "relatedPath": "/help-center"
      },
      {
        "id": "limits",
        "topic": "execution",
        "question": "Can I limit new entries?",
        "answer": "Configure daily and active-trade limits where available. These are entry controls, not a promise to cap losses, drawdown or all activity on your broker account.",
        "relatedPath": "/help-center"
      },
      {
        "id": "pause",
        "topic": "execution",
        "question": "Does pausing close my trades?",
        "answer": "No. Disabling new entries is not a broker close instruction. Review open positions and pending orders at the broker; do not treat a pause, logout or app uninstall as a close action.",
        "relatedPath": "/help-center"
      }
    ],
    "relatedPaths": [
      "/blog/copy-telegram-signals-with-risk-controls",
      "/help-center",
      "/blog/telegram-to-mt4-mt5-copier-troubleshooting"
    ],
    "image": {
      "src": "/images/hero-image-elite.png",
      "alt": "Illustration of the Tragram interface",
      "width": 736,
      "height": 520
    },
    "updatedAt": "2026-09-08"
  },
  "/blog/what-is-a-telegram-signal-copier": {
    "title": "What Is a Telegram Signal Copier?",
    "h1": "What Is a Telegram Signal Copier?",
    "description": "Learn what a Telegram signal copier does, how it reads signal messages, and how Tragram keeps copying under user control.",
    "intro": "A Telegram signal copier helps turn signal messages from selected Telegram channels into trades on a connected trading account. The important part is control: the user should choose the channels, rules, and account before anything is copied.",
    "sections": [
      {
        "id": "section-1",
        "title": "The basic idea",
        "body": "A copier listens to Telegram messages, looks for trade details, and prepares the signal for execution. A good workflow does not copy blindly; it checks the user's rules first."
      },
      {
        "id": "section-2",
        "title": "What Tragram adds",
        "body": "Tragram brings Telegram channels, signal parsing, MT4/MT5 connection, execution settings, and execution history into one dashboard."
      },
      {
        "id": "section-3",
        "title": "What it does not do",
        "body": "Tragram does not provide financial advice or sell trading signals. It helps users manage automation for signal sources they choose themselves."
      },
      {
        "id": "procedure",
        "title": "Follow one message end to end",
        "body": "Start with a channel you are allowed to access and a demo account. A message may describe a symbol, direction, entry, stop and targets. Parsing creates structured fields; it does not prove the order is tradable. The selected account, channel rules and broker specifications are checked separately."
      },
      {
        "id": "verification",
        "title": "Trace the outcome, not just the message",
        "body": "Compare the original message with the parsed fields and execution history. A skipped signal is different from a broker rejection or an accepted order. If there is no broker result, do not infer that a position exists. Keep the message time and displayed reason when asking support."
      }
    ],
    "faqs": [],
    "relatedPaths": [
      "/telegram-signal-copier",
      "/help-center",
      "/contact"
    ],
    "image": {
      "src": "/images/hero-image-elite.png",
      "alt": "Illustration of the Tragram interface",
      "width": 736,
      "height": 520
    },
    "updatedAt": "2026-09-08"
  },
  "/blog/telegram-to-mt5-copier-setup": {
    "title": "Telegram to MT5 Copier Setup Guide",
    "h1": "Telegram to MT5 Copier Setup Guide",
    "description": "A simple guide to setting up Telegram-to-MT5 signal copying with channel selection, account connection, rules, and review controls.",
    "intro": "A careful MT5 setup starts before automation is enabled. Choose the Telegram channels, connect the MT5 account, set rules, then review how signals are handled.",
    "sections": [
      {
        "id": "section-1",
        "title": "Step 1: Choose channels",
        "body": "Start with the Telegram channels you actually want to follow. Avoid connecting every source at once; rules are easier to review channel by channel."
      },
      {
        "id": "section-2",
        "title": "Step 2: Connect MT5",
        "body": "Link the MT5 account that should receive eligible trades, then confirm the account is active before enabling execution."
      },
      {
        "id": "section-3",
        "title": "Step 3: Set rules and monitor",
        "body": "Use execution rules, symbol filters, sizing behavior, and pause controls. Watch the first signals carefully before trusting a channel with more automation."
      },
      {
        "id": "procedure",
        "title": "Prepare the MT5 connection",
        "body": "Obtain the exact MT5 broker server and account login from your broker. Use the secure connection form, not the public contact form. Check that the account permits trading, then verify the displayed connection status and select the intended execution account. An MT4 login/server pair is not a substitute for MT5 credentials."
      },
      {
        "id": "verification",
        "title": "Check instrument and order constraints",
        "body": "Review the actual MT5 symbol, volume step and supported order behavior. A familiar instrument name does not establish identical contract specifications across brokers. Test on demo and compare order history with the broker terminal. Resolve symbol or permission failures before enabling additional channels."
      }
    ],
    "faqs": [],
    "relatedPaths": [
      "/telegram-to-mt5-copier",
      "/help-center",
      "/contact"
    ],
    "image": {
      "src": "/images/hero-image-elite.png",
      "alt": "Illustration of the Tragram interface",
      "width": 736,
      "height": 520
    },
    "updatedAt": "2026-09-08"
  },
  "/blog/telegram-to-mt4-copier-guide": {
    "title": "Telegram to MT4 Copier Guide",
    "h1": "Telegram to MT4 Copier Guide",
    "description": "Understand how Telegram-to-MT4 signal copying works and which controls matter before signals reach your MT4 account.",
    "intro": "Copying Telegram signals to MT4 should be simple to review. The goal is not just fast execution; it is a workflow where you can see the signal, rules, and result.",
    "sections": [
      {
        "id": "section-1",
        "title": "Signal intake",
        "body": "Tragram reads messages from selected Telegram channels and prepares trade details such as symbol, direction, entry, stop loss, and take-profit levels."
      },
      {
        "id": "section-2",
        "title": "Rule checks",
        "body": "Before MT4 execution, the signal should pass channel settings such as allowed symbols, execution mode, sizing behavior, and missing stop-loss handling."
      },
      {
        "id": "section-3",
        "title": "Execution review",
        "body": "After the signal is handled, use history and status views to understand whether it was copied, skipped, or held for review."
      },
      {
        "id": "procedure",
        "title": "Match the MT4 server exactly",
        "body": "Use the MT4 server name associated with the account, including any demo/live distinction. Enter credentials only in the protected connection screen. If connection fails, confirm the platform and server with the broker; trying unrelated servers is not a reliable diagnosis."
      },
      {
        "id": "verification",
        "title": "Verify the selected account and first result",
        "body": "Confirm the connected account is selected for execution. Check the broker’s symbol suffix and lot constraints, then review an eligible demo signal. Compare requested versus accepted order details. A connection indicator alone proves neither order permission nor a completed trade."
      }
    ],
    "faqs": [],
    "relatedPaths": [
      "/telegram-to-mt4-copier",
      "/help-center",
      "/contact"
    ],
    "image": {
      "src": "/images/hero-image-elite.png",
      "alt": "Illustration of the Tragram interface",
      "width": 736,
      "height": 520
    },
    "updatedAt": "2026-09-08"
  },
  "/blog/cloud-vs-vps-telegram-copier": {
    "title": "Cloud vs VPS Telegram Copier",
    "h1": "Cloud vs VPS Telegram Copier",
    "description": "Compare cloud-based Telegram signal copying with VPS copier setups and learn why dashboard controls and visibility matter.",
    "intro": "Many traders start with scripts or VPS setups because they want Telegram signals to reach MT4 or MT5 quickly. A web-based workflow can reduce setup work while keeping controls in one dashboard.",
    "sections": [
      {
        "id": "section-1",
        "title": "VPS copier setups",
        "body": "A VPS setup can work, but it often means maintaining scripts, terminals, updates, and monitoring yourself."
      },
      {
        "id": "section-2",
        "title": "Cloud dashboard workflow",
        "body": "Tragram focuses on a managed web workflow where channel settings, account state, signal history, and pause controls stay visible."
      },
      {
        "id": "section-3",
        "title": "Control still matters",
        "body": "Whether the workflow is cloud-based or VPS-based, the user should still control which signals can execute and when automation should stop."
      },
      {
        "id": "procedure",
        "title": "Separate hosting from trading responsibility",
        "body": "A self-managed VPS adds responsibility for terminal installation, updates, connectivity and recovery. A managed service moves hosting operations to the provider, but you still own channel choice, account credentials and execution settings. Neither model removes Telegram or broker dependencies."
      },
      {
        "id": "verification",
        "title": "Compare recovery and visibility",
        "body": "Ask how each option exposes skipped signals, broker errors and reconnects. Consider maintenance effort and the full service cost, not only server rent. Tragram does not require you to maintain a copier VPS, but that is not a guarantee of uninterrupted connectivity or execution."
      }
    ],
    "faqs": [],
    "relatedPaths": [
      "/copy-trading-without-vps",
      "/help-center",
      "/contact"
    ],
    "image": {
      "src": "/images/hero-image-elite.png",
      "alt": "Illustration of the Tragram interface",
      "width": 736,
      "height": 520
    },
    "updatedAt": "2026-09-08"
  },
  "/blog/telegram-signal-parser-guide": {
    "title": "Telegram Signal Parser Guide",
    "h1": "Telegram Signal Parser Guide",
    "description": "Learn how Telegram signal parsing turns message text into structured trade details before execution rules are applied.",
    "intro": "Telegram signals come in many formats. A parser helps turn message text into structured fields that can be checked before a trade is sent to MT4 or MT5.",
    "sections": [
      {
        "id": "section-1",
        "title": "What the parser looks for",
        "body": "Common fields include symbol, buy or sell direction, entry area, stop loss, take-profit levels, and updates such as close or move stop loss."
      },
      {
        "id": "section-2",
        "title": "Parsing is not execution",
        "body": "A parsed signal still needs to pass the user's rules. This keeps parsing separate from the decision to copy a trade."
      },
      {
        "id": "section-3",
        "title": "Why visibility matters",
        "body": "When a message is unclear or skipped, the user should be able to review what happened instead of guessing why a trade did not open."
      },
      {
        "id": "procedure",
        "title": "Read the fields before the outcome",
        "body": "An illustrative message might contain BUY, a broker instrument, an entry, SL and TP values. Check how each field was interpreted. Commentary, performance recaps and incomplete instructions should not be assumed to be executable entries. Do not invent a missing direction or instrument to make a message fit."
      },
      {
        "id": "verification",
        "title": "Handle ambiguity and updates safely",
        "body": "A reply or edit needs a resolvable original target before it can affect an existing trade. Compare the message context and displayed status. If interpretation is unclear, retain the message reference and contact support; avoid repeatedly resubmitting it and creating uncertainty about duplicates."
      }
    ],
    "faqs": [],
    "relatedPaths": [
      "/telegram-signal-parser",
      "/help-center",
      "/contact"
    ],
    "image": {
      "src": "/images/hero-image-elite.png",
      "alt": "Illustration of the Tragram interface",
      "width": 736,
      "height": 520
    },
    "updatedAt": "2026-09-08"
  },
  "/blog/copy-telegram-signals-with-risk-controls": {
    "title": "Copy Telegram Signals With Risk Controls",
    "h1": "Copy Telegram Signals With Risk Controls",
    "description": "Learn which risk controls matter when copying Telegram signals, including entry rules, symbol filters, stop-loss rules, and pause controls.",
    "intro": "The safest Telegram signal workflow is not the one that copies everything. It is the one where every channel has clear rules before signals can reach MT4 or MT5.",
    "sections": [
      {
        "id": "section-1",
        "title": "configured execution rules",
        "body": "configured execution rules lets you review signals before they become trades. It is useful for new channels or unusual market conditions."
      },
      {
        "id": "section-2",
        "title": "Symbol and stop-loss rules",
        "body": "Symbol filters and missing stop-loss handling help stop trades that do not match the way you want a channel to behave."
      },
      {
        "id": "section-3",
        "title": "Pause controls",
        "body": "A channel should be easy to pause when signal quality changes. You can review history, adjust settings, and restart only when the setup makes sense."
      },
      {
        "id": "procedure",
        "title": "Configure before enabling entries",
        "body": "Review fixed amount, percentage or fixed lot sizing according to the options available in your account. Check allowed symbols, daily and active-order limits, missing-stop handling and entry tolerance. Save the settings and verify their displayed values; do not rely on the plan name to infer exact limits."
      },
      {
        "id": "verification",
        "title": "Test protective behavior separately",
        "body": "Break-even, trailing and take-profit handling have their own configuration and broker constraints. Test the relevant states on demo and verify the broker outcome rather than assuming a enabled toggle guarantees a fill. These controls do not guarantee a maximum loss or protect unrelated manually placed positions."
      }
    ],
    "faqs": [],
    "relatedPaths": [
      "/risk-controls",
      "/help-center",
      "/contact"
    ],
    "image": {
      "src": "/images/hero-image-elite.png",
      "alt": "Illustration of the Tragram interface",
      "width": 736,
      "height": 520
    },
    "updatedAt": "2026-09-08"
  },
  "/blog/low-latency-telegram-trade-copier": {
    "title": "Low-Latency Telegram Trade Copier Guide",
    "h1": "Low-Latency Telegram Trade Copier Guide",
    "description": "Learn what affects Telegram copier execution delay, from message intake and parsing to rule checks, MT bridge health, and broker response.",
    "intro": "Low latency is not just one number on a landing page. A Telegram trade copier has several steps between a channel message and an MT4 or MT5 result, and each step can affect delay.",
    "sections": [
      {
        "id": "section-1",
        "title": "Where delay can happen",
        "body": "Delay can come from Telegram delivery, parser queue time, rule checks, MT session health, bridge response time, broker execution, or network conditions."
      },
      {
        "id": "section-2",
        "title": "Speed still needs checks",
        "body": "A faster copier is only useful when it still respects symbol filters, stop-loss rules, execution settings, and channel pause controls."
      },
      {
        "id": "section-3",
        "title": "Use logs, not guesses",
        "body": "Execution history and failure reasons help you see whether a delay came from parsing, settings, account connection, or broker response."
      },
      {
        "id": "procedure",
        "title": "Measure separate stages",
        "body": "Record the source message time, observed ingestion time, parsed result, command submission and broker response where those timestamps are available. Compare timestamps from a consistent clock and distinguish queue delay from broker execution time. A browser notification arrival time is not the complete end-to-end latency."
      },
      {
        "id": "verification",
        "title": "Interpret samples honestly",
        "body": "Collect more than one sample and retain failed or delayed cases. Market hours, broker connectivity, message ambiguity and rule checks can change results. Without a controlled measurement set, do not describe a best case as a guaranteed execution speed. Tragram makes no numerical latency promise on this page."
      }
    ],
    "faqs": [],
    "relatedPaths": [
      "/blog/telegram-signal-parser-guide",
      "/blog/telegram-to-mt4-mt5-copier-troubleshooting",
      "/risk-controls",
      "/telegram-signals-automation",
      "/help-center",
      "/contact"
    ],
    "image": {
      "src": "/images/hero-image-elite.png",
      "alt": "Illustration of the Tragram interface",
      "width": 736,
      "height": 520
    },
    "updatedAt": "2026-09-08"
  },
  "/blog/telegram-signal-updates-close-sl-tp": {
    "title": "Telegram Signal Updates: Close, SL, and TP",
    "h1": "Telegram Signal Updates: Close, SL, and TP",
    "description": "Understand how Telegram copier workflows should handle follow-up messages for close commands, stop-loss moves, TP updates, and cancellations.",
    "intro": "Many signal channels do not stop after the first entry message. They may send follow-up instructions to close, cancel, move stop loss, or update take-profit levels.",
    "sections": [
      {
        "id": "section-1",
        "title": "Follow-up messages need context",
        "body": "A close or stop-loss update should be matched to the correct earlier signal before any account action is attempted."
      },
      {
        "id": "section-2",
        "title": "Common update types",
        "body": "Signal updates can include close now, cancel pending order, move SL to breakeven, change stop loss, or manage take-profit levels."
      },
      {
        "id": "section-3",
        "title": "Visibility matters",
        "body": "Users should be able to review whether a follow-up was accepted, skipped, or could not be matched to an active trade."
      },
      {
        "id": "procedure",
        "title": "Identify the intended trade",
        "body": "A follow-up such as a stop change or close instruction needs an identifiable original signal and a supported target. Reply context and message relationships matter. Do not assume an update applies to every open position with the same symbol."
      },
      {
        "id": "verification",
        "title": "Distinguish close, cancel and stop changes",
        "body": "Closing an open position differs from cancelling an unfilled pending order or modifying a stop. Check the current order state and the broker response after the supported action. An unmatched update should be investigated through history, not treated as evidence that unrelated orders were changed."
      }
    ],
    "faqs": [],
    "relatedPaths": [
      "/blog/telegram-signal-parser-guide",
      "/blog/copy-telegram-signals-with-risk-controls",
      "/blog/telegram-pending-orders-mt4-mt5",
      "/risk-controls",
      "/help-center",
      "/contact"
    ],
    "image": {
      "src": "/images/hero-image-elite.png",
      "alt": "Illustration of the Tragram interface",
      "width": 736,
      "height": 520
    },
    "updatedAt": "2026-09-08"
  },
  "/blog/multi-account-telegram-copier-checklist": {
    "title": "Multi-Account Telegram Copier Checklist",
    "h1": "Multi-Account Telegram Copier Checklist",
    "description": "Review the controls to check before copying Telegram signals across more than one MT4 or MT5 account, including account capacity and routing.",
    "intro": "Multi-account copying can increase operational risk. Before using any copier with more than one account, check how it separates accounts, applies rules, and shows execution history.",
    "sections": [
      {
        "id": "section-1",
        "title": "Start with product scope",
        "body": "Check whether the available account model supports the number of MT accounts you want to manage, and do not assume every copier routes one signal to every account."
      },
      {
        "id": "section-2",
        "title": "Separate account rules",
        "body": "Each account can have different risk needs. Review lot sizing, allowed symbols, channel rules, and pause controls before scaling signal copying."
      },
      {
        "id": "section-3",
        "title": "Review account-level history",
        "body": "A multi-account workflow should make it clear which account received a signal, which account skipped it, and why."
      },
      {
        "id": "procedure",
        "title": "Inventory connections before selection",
        "body": "Record which connection belongs to which broker and platform without publishing credentials. Review the actual capacity displayed in your account. More permitted connections means more connections can be stored; it does not change the primary-account execution rule."
      },
      {
        "id": "verification",
        "title": "Confirm selection before new entries",
        "body": "Check the selected execution account and its readiness before enabling a channel or changing the selection. Review positions already held on other accounts directly with the broker. Selecting another account does not migrate existing positions, and an unavailable primary account is not permission to route to an arbitrary secondary one."
      }
    ],
    "faqs": [],
    "relatedPaths": [
      "/prop-firm-telegram-copier",
      "/risk-controls",
      "/best-telegram-signal-copier",
      "/features",
      "/help-center",
      "/contact"
    ],
    "image": {
      "src": "/images/hero-image-elite.png",
      "alt": "Illustration of the Tragram interface",
      "width": 736,
      "height": 520
    },
    "updatedAt": "2026-09-08"
  },
  "/blog/broker-symbol-mapping-telegram-signals": {
    "title": "Broker Symbol Mapping for Telegram Signals",
    "h1": "Broker Symbol Mapping for Telegram Signals",
    "description": "Learn why Telegram signal copiers need symbol validation for broker suffixes, prefixes, gold symbols, and MT4/MT5 naming differences.",
    "intro": "A Telegram channel may write XAUUSD, but a broker may expose XAUUSDm, GOLD, or another symbol name. Symbol handling affects whether a signal can be copied safely.",
    "sections": [
      {
        "id": "section-1",
        "title": "Symbols are not always identical",
        "body": "Different brokers can use suffixes, prefixes, or alternate names for the same market, especially for gold, indices, and crypto symbols."
      },
      {
        "id": "section-2",
        "title": "Validation before execution",
        "body": "A copier should validate that the connected MT account can trade the parsed symbol before routing an order."
      },
      {
        "id": "section-3",
        "title": "Skipped signals should be visible",
        "body": "If a symbol cannot be matched or is blocked by channel rules, the user should see the skip reason instead of wondering why no trade opened."
      },
      {
        "id": "procedure",
        "title": "Compare the broker instrument, not just its label",
        "body": "A signal name and a broker symbol can differ by suffix or alias. Review the instruments available through the selected broker account and the channel symbol policy. Similar names can represent different contract sizes, tick values or minimum volumes."
      },
      {
        "id": "verification",
        "title": "Verify after changing a mapping",
        "body": "Save the intended symbol choice and test an eligible demo message. Check the parsed instrument and resulting broker order. If the instrument is unavailable, resolve it with the broker or supported configuration; do not replace it with a merely similar instrument and assume equivalent exposure."
      }
    ],
    "faqs": [],
    "relatedPaths": [
      "/telegram-signal-parser",
      "/telegram-to-mt5-copier",
      "/blog/telegram-to-mt4-mt5-copier-troubleshooting",
      "/help-center",
      "/contact"
    ],
    "image": {
      "src": "/images/hero-image-elite.png",
      "alt": "Illustration of the Tragram interface",
      "width": 736,
      "height": 520
    },
    "updatedAt": "2026-09-08"
  },
  "/blog/telegram-pending-orders-mt4-mt5": {
    "title": "Telegram Pending Orders for MT4 and MT5",
    "h1": "Telegram Pending Orders for MT4 and MT5",
    "description": "Learn how Telegram copier workflows should handle buy limit, sell limit, buy stop, sell stop, entry ranges, and pending-order expiry.",
    "intro": "Not every Telegram signal is a market order. Many channels send entry ranges or pending-order instructions that need careful handling before MT4 or MT5 execution.",
    "sections": [
      {
        "id": "section-1",
        "title": "Market orders and pending orders differ",
        "body": "A market signal asks for immediate execution. A pending signal waits for price to reach an entry level, which means expiration and entry rules matter."
      },
      {
        "id": "section-2",
        "title": "Entry ranges need rules",
        "body": "When a signal gives an entry range, the copier should use the user's configured behavior instead of guessing silently."
      },
      {
        "id": "section-3",
        "title": "Expired signals should be clear",
        "body": "If a pending order expires or is skipped, the dashboard should make the reason visible so the user can tune channel settings."
      },
      {
        "id": "procedure",
        "title": "Review pending handling before the message arrives",
        "body": "Check the channel’s pending-order handling and expiry settings, and review market-entry tolerance separately. An entry level away from the current market is not automatically a market-order instruction. Broker support and instrument rules still apply."
      },
      {
        "id": "verification",
        "title": "Follow the full state transition",
        "body": "A submitted pending order can remain unfilled, be cancelled, expire or become a position. Verify its state with the broker before interpreting a later close or update message. Pausing new entries does not by itself prove that existing pending orders were cancelled."
      }
    ],
    "faqs": [],
    "relatedPaths": [
      "/blog/telegram-to-mt4-copier-guide",
      "/blog/telegram-to-mt5-copier-setup",
      "/blog/telegram-signal-updates-close-sl-tp",
      "/risk-controls",
      "/help-center",
      "/contact"
    ],
    "image": {
      "src": "/images/hero-image-elite.png",
      "alt": "Illustration of the Tragram interface",
      "width": 736,
      "height": 520
    },
    "updatedAt": "2026-09-08"
  },
  "/blog/telegram-to-mt4-mt5-copier-troubleshooting": {
    "title": "Telegram to MT4/MT5 Copier Troubleshooting",
    "h1": "Telegram to MT4/MT5 Copier Troubleshooting",
    "description": "Fix common Telegram copier issues: signals not copying, parser failures, symbol mismatches, paused channels, execution mode, and MT account state.",
    "intro": "When a Telegram signal does not copy, the cause is usually somewhere in the workflow: channel intake, parsing, settings, account state, or broker response.",
    "sections": [
      {
        "id": "section-1",
        "title": "Check channel state first",
        "body": "Confirm the channel is connected, enabled, not paused, and allowed to execute under the current settings."
      },
      {
        "id": "section-2",
        "title": "Check parser and symbol reasons",
        "body": "Unclear formats, unsupported symbols, missing stop loss, or blocked symbols can stop a signal before it reaches MT4 or MT5."
      },
      {
        "id": "section-3",
        "title": "Check account and execution eligibility",
        "body": "A disconnected MT account, configured execution rules mode, or account-level problem can make it look like copying failed when the signal is waiting or blocked."
      },
      {
        "id": "procedure",
        "title": "Start at the first missing stage",
        "body": "No message: check Telegram access and channel selection. Message but no parsed entry: review message completeness and status. Parsed entry but no command: check selected account, eligibility, symbols and limits. Command but no accepted order: review the broker error and account permissions."
      },
      {
        "id": "verification",
        "title": "Give support a useful, safe report",
        "body": "Include platform, approximate event time, affected channel and the displayed error/status. Remove passwords, OTPs, broker credentials and customer identifiers from screenshots. Do not retry an uncertain trade action until you have checked whether the broker already accepted it."
      }
    ],
    "faqs": [],
    "relatedPaths": [
      "/blog/broker-symbol-mapping-telegram-signals",
      "/blog/low-latency-telegram-trade-copier",
      "/telegram-signal-parser",
      "/help-center",
      "/contact"
    ],
    "image": {
      "src": "/images/hero-image-elite.png",
      "alt": "Illustration of the Tragram interface",
      "width": 736,
      "height": 520
    },
    "updatedAt": "2026-09-08"
  },
  "/blog/telegram-copier-supported-platforms": {
    "title": "Tragram platforms: web, iOS, Android, MT4 and MT5",
    "h1": "Understand each platform’s role in the workflow",
    "description": "Understand Tragram client apps, Telegram signal sources and MT4/MT5 broker execution, with connection checks and selected-account responsibilities.",
    "intro": "Telegram supplies messages; MT4 and MT5 are broker execution destinations. The Tragram website and its iOS and Android apps provide access to the service. These roles are not interchangeable.",
    "sections": [
      {
        "id": "clients",
        "title": "Start with the right client",
        "body": "Install Tragram through the official store links on this website. Screens may vary by release; use the website when a required step is not available in your installed app."
      },
      {
        "id": "source",
        "title": "Telegram: the source, not the broker",
        "body": "Connect the Telegram account authorized to access the channel. Check channel selection and settings before enabling execution. A message or notification alone does not prove that the broker accepted an order."
      },
      {
        "id": "execution",
        "title": "MT4 and MT5: connection and execution",
        "body": "Choose the platform and broker server matching your account. Check the selected execution account, connection status and available symbols. Having several connections does not make new signals copy simultaneously to all accounts."
      },
      {
        "id": "verify",
        "title": "Verify before live use",
        "body": "Use a demo account and follow a signal through execution history to the broker result. If a stage is missing, use the troubleshooting guide. Closing or uninstalling the app is not an instruction to close broker positions."
      }
    ],
    "faqs": [],
    "relatedPaths": [
      "/help-center",
      "/blog/telegram-to-mt4-copier-guide",
      "/blog/telegram-to-mt5-copier-setup",
      "/blog/telegram-to-mt4-mt5-copier-troubleshooting"
    ],
    "image": {
      "src": "/images/hero-image-elite.png",
      "alt": "Illustration of the Tragram interface",
      "width": 736,
      "height": 520
    },
    "updatedAt": "2026-09-08"
  },
  "/blog/copy-telegram-signals-from-phone": {
    "title": "Use Tragram from your phone: iOS and Android",
    "h1": "Follow your Tragram workflow from your phone",
    "description": "Get started with Tragram on iOS or Android using official downloads, account and connection checks, signal history and broker-result verification.",
    "intro": "Tragram is available on the App Store and Google Play, and its website also works in a phone browser. Begin by checking your account and connections: installing an app alone does not enable copying.",
    "sections": [
      {
        "id": "install",
        "title": "1. Install and sign in",
        "body": "Open the official store link for your device, then sign in to the intended Tragram account. Complete the displayed verification without sharing passwords or codes. Use password recovery when needed."
      },
      {
        "id": "connections",
        "title": "2. Review connections",
        "body": "Check the Telegram account and channel, then the broker connection and selected execution account. If a step is unavailable in your release, open the website in your browser and follow the MT4 or MT5 guide. Do not use live-account credentials to experiment with an unfamiliar step."
      },
      {
        "id": "rules",
        "title": "3. Test rules and outcomes",
        "body": "On a demo account, review the symbol, order size, stop, targets and entry limits. Check signal and execution history and the broker outcome. A phone alert does not replace these checks."
      },
      {
        "id": "recovery",
        "title": "4. When alerts or connectivity fail",
        "body": "Review phone notification permissions, internet connectivity and account status in Tragram. If the issue persists, send support the event time and error message without secrets. Disabling new entries does not close open trades, and uninstalling the app does not delete the account."
      }
    ],
    "faqs": [],
    "relatedPaths": [
      "/help-center",
      "/blog/telegram-to-mt4-copier-guide",
      "/blog/telegram-to-mt5-copier-setup",
      "/blog/telegram-to-mt4-mt5-copier-troubleshooting"
    ],
    "image": {
      "src": "/images/hero-image-elite.png",
      "alt": "Illustration of the Tragram interface",
      "width": 736,
      "height": 520
    },
    "updatedAt": "2026-09-08"
  }
};
