/**
 * Terms of Use, Privacy Notice and Disclaimer. DRAFT written by engineering from what the product actually stores and does
 * (audit 2026-11-18, SEC-02). Pending review and replacement by 5nance Legal. Text in [square brackets] is a fact only 5nance can
 * supply and must be filled in before launch.
 *
 * LEGAL_TEXT_VERSION must equal backend LEGAL_TEXT_VERSION (app/domains/governance/service.py): sign-up records which version a
 * person accepted, and the server refuses an outdated one. Change both together whenever any text below changes.
 */
export const LEGAL_TEXT_VERSION = "2026-11-18-draft";
export const LEGAL_UPDATED = "18 November 2026";

export type LegalSection = { heading: string; paragraphs?: string[]; bullets?: string[] };
export type LegalDoc = { slug: "privacy" | "terms" | "disclaimer"; title: string; intro: string; sections: LegalSection[] };

const CONTACT = [
  "Company: [5nance legal entity name], [registered address].",
  "Grievance Officer: [name], [email address]. We acknowledge complaints within [48 hours] and aim to resolve them within [30 days].",
  "You can also use “Talk to a person” in Settings once you are signed in.",
];

export const PRIVACY: LegalDoc = {
  slug: "privacy",
  title: "Privacy Notice",
  intro:
    "This notice explains what FinScore AI collects, why, who can see it, how long we keep it and how you control it. FinScore AI is provided by [5nance legal entity name] (“5nance”, “we”).",
  sections: [
    {
      heading: "What we collect",
      bullets: [
        "Account details: your email address, your name if you give it, and your password (stored only as a secure hash, never readable).",
        "Financial answers you choose to give: for example age, income, monthly spending, loan EMIs and balances, savings and investments, insurance cover, dependants and tax deductions.",
        "What you type to the coach or in “Talk”, your goals and the what-if scenarios you run. Conversation text is encrypted in our database.",
        "Technical records: the device and browser you sign in from, your IP address, and a log of important account events (for security and so any score can be reproduced).",
        "Usage events: which screens and steps you use (for example “finished the first chapter”), so we can see where the product is confusing. They never include your answers or amounts, and we run them ourselves: no advertising or analytics company receives them.",
      ],
    },
    {
      heading: "What we do not collect",
      bullets: [
        "We do not ask for your PAN, Aadhaar, bank account numbers, card numbers or bank log-in details.",
        "We do not connect to your bank or any other account. If we offer that in future, it will only happen after you give separate, explicit consent.",
      ],
    },
    {
      heading: "Why we use it",
      bullets: [
        "To provide the service: work out your FinScore, health checks and goal projections from your answers, and keep your account secure. You agree to this when you create an account.",
        "AI processing: the coach and the conversation feature use an AI model to word answers. This needs a separate consent, which you can withdraw at any time in Settings; your saved answers stay.",
        "We do not sell your data and we do not use it for advertising.",
      ],
    },
    {
      heading: "Who can see it",
      bullets: [
        "Our support and compliance staff, only when you ask for help or when a safety concern is raised, and every such access is logged.",
        "Service providers who run parts of the service for us under contract: [hosting provider and region], [email delivery provider]. If an AI model provider is used, it is [AI provider name], under terms that do not allow it to keep or train on your data.",
        "Authorities, only where the law requires it.",
      ],
    },
    {
      heading: "How long we keep it",
      paragraphs: [
        "We keep your data while your account is open. When you ask us to delete your account, there is a cooling-off period of [7 days] during which you can change your mind; after that your personal data is permanently deleted. A minimal record that a deletion happened, and security logs that no longer identify you, are kept [for the period required by law].",
      ],
    },
    {
      heading: "Your rights and controls",
      bullets: [
        "See and correct what we hold: the Memory page shows every saved answer and where it came from.",
        "Download everything: Settings › Download my data gives you a complete copy in one file.",
        "Delete your account: Settings › Delete my account.",
        "Withdraw consent for AI processing at any time in Settings.",
        "Nominate someone to exercise these rights for you in case of death or incapacity, by contacting the Grievance Officer.",
        "Complain to the Grievance Officer (below) and, if you are not satisfied, to the Data Protection Board of India.",
      ],
    },
    { heading: "Security", paragraphs: ["Data is encrypted in transit, passwords are hashed, conversation text is encrypted at rest, and access by staff is limited and logged. No system is perfectly secure; tell us at once if you think your account has been misused."] },
    { heading: "Children", paragraphs: ["FinScore AI is for people aged 18 and over."] },
    { heading: "Contact", bullets: CONTACT },
  ],
};

export const TERMS: LegalDoc = {
  slug: "terms",
  title: "Terms of Use",
  intro: "These terms are an agreement between you and [5nance legal entity name] about your use of FinScore AI. Please read them with the Privacy Notice and the Disclaimer.",
  sections: [
    { heading: "Who can use FinScore AI", paragraphs: ["You must be 18 or older and live in India. You may hold one personal account and must give answers that are true to the best of your knowledge."] },
    {
      heading: "What the service is",
      paragraphs: [
        "FinScore AI helps you understand your finances: it calculates a financial health score and checks from the answers you give, explains them, and lets you try what-if scenarios. It is education and information, not investment, tax, legal or insurance advice. See the Disclaimer.",
        "The service is in beta: the scoring method is still being finalised and may change, which can change your score.",
      ],
    },
    { heading: "Your account", paragraphs: ["Keep your password secret and tell us if you think someone else has used your account. You are responsible for activity on your account until you tell us."] },
    {
      heading: "Acceptable use",
      bullets: [
        "Do not try to access other people's data, break or overload the service, or get around its limits or security.",
        "Do not use the service to give financial advice to others or to make decisions about other people (for example lending or hiring).",
      ],
    },
    { heading: "Price", paragraphs: ["The personal service is free during the beta. If we introduce paid features we will tell you the price before you are charged, and nothing is charged without your agreement."] },
    { heading: "Ending your account", paragraphs: ["You can delete your account at any time in Settings. We may suspend an account that breaks these terms, and will tell you why unless the law prevents it."] },
    {
      heading: "Responsibility",
      paragraphs: [
        "Decisions about your money are yours. We work hard to make calculations correct, but the service is provided “as is” and we are not liable for decisions you make based on it, except where the law does not allow that limit. [Legal to confirm liability wording and any cap.]",
      ],
    },
    { heading: "Changes", paragraphs: ["If we change these terms in a way that matters, we will tell you in the app and ask you to accept the new version before you continue."] },
    { heading: "Law", paragraphs: ["These terms are governed by the laws of India. Courts at [city] have jurisdiction. [Legal to confirm.]"] },
    { heading: "Contact", bullets: CONTACT },
  ],
};

export const DISCLAIMER: LegalDoc = {
  slug: "disclaimer",
  title: "Disclaimer",
  intro: "Please read this before relying on anything FinScore AI shows you.",
  sections: [
    {
      heading: "Education, not advice",
      paragraphs: [
        "FinScore AI gives general education and information about your own finances. It does not recommend specific stocks, mutual funds, insurance policies, loans or other products, and it is not a substitute for a qualified, registered adviser who knows your full situation. [Legal to confirm and state 5nance's regulatory status here.]",
      ],
    },
    {
      heading: "About the FinScore",
      bullets: [
        "The FinScore is a financial health score from 0 to 900, based only on the answers you give. It is not a credit score, it is not reported to any credit bureau, and it is not used for lending decisions.",
        "The scoring method is in beta and still being finalised, so treat the number as an indication, not a verdict.",
        "Anything you have not told us is left out rather than guessed. Where we assume a value (for example a retirement age), we say so and you can change it.",
      ],
    },
    {
      heading: "Projections",
      paragraphs: [
        "What-if results and goal projections depend on the assumptions you choose, such as returns and inflation. They are not predictions or guarantees: real returns can be lower, and investments can lose value.",
      ],
    },
    { heading: "AI", paragraphs: ["The coach uses an AI model to word its answers, but every number comes from a calculation engine, not from the AI. The coach is not a human adviser. If you want a person to look at your situation, use “Talk to a person”."] },
  ],
};

export const LEGAL_DOCS = { privacy: PRIVACY, terms: TERMS, disclaimer: DISCLAIMER } as const;
