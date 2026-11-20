# FinScore Quest: UI/UX review

Scope: Simple view (Home, My plan, Ask Fin, My info, Link hub) and Full detail view (Overview, Quests, Skills, Realm map, Vault). Method: automated checks run in the browser pane (touch-target size, text contrast, font size, accessible names, page landmarks) plus reading the markup and CSS. No dedicated "frontend design" skill was available in this session, so the review follows common UI/UX and WCAG 2.1 AA practice. Not tested with a screen reader or on real devices.

## Scorecard

| Area | Rating | Notes |
|---|---|---|
| Clarity of purpose (Simple view) | Strong | One score, one next step, four dock buttons |
| Visual hierarchy | Strong | Large score, gold primary action, muted secondary text |
| Information load (Full view) | Fair | Much lighter than before, but Vault, Time machine, Crew, Quiet hours are still dense |
| Navigation | Good | Dock is consistent; More sheet is grouped; easy return to Simple |
| Touch targets | Fair, fixed in part | See findings 1 and 2 |
| Text size | Fair | Many labels at 10.5 to 11.5px (finding 3) |
| Colour contrast | Good | Body and muted text pass; no real failures found (see note) |
| Accessibility basics | Good | lang set, viewport meta, main landmark, live region, focus-visible and reduced-motion rules present |
| Responsive | Good | No horizontal overflow at 390 and 1280 on every scene checked |
| Trust and honesty cues | Strong | Draft banner, provisional labels, "not a forecast", source tags |

## Findings, most important first

1. **Settings (gear) button collapsed to about 14px wide** on a narrow header (flex shrink). Fixed: `flex:none`, 44x44, no padding.
2. **Small buttons were 38px tall** (`.btn.sm`, below the 44px touch guideline). Fixed: now 44px. The number of small buttons on the Link hub is high (11), so recheck its density on a phone.
3. **Tiny type:** between 8 and 23 text elements per scene render under 12px (smallest 10.5px), mostly captions, pills and source tags. Recommendation: raise the floor to 12px and keep 10.5px only for decorative labels.
4. **Skills items had no text name when read by script** in the closed-area state (11 buttons). They have visible text when open, so this is likely a measurement artefact of hidden content, but confirm with a screen reader.
5. **No skip link** to jump past the top bar and dock. Low effort to add.
6. **Primary-button contrast reported as 1.1** by my script on the Link hub, Ask and Add buttons. This is a false positive: the buttons use a gold gradient and the script read the page background. Real contrast is dark text (28,20,4) on gold (232,196,124 to 184,138,46), well above 4.5.
7. **Colour-only meaning:** skill level rings use green, gold and coral. The number is also shown, so meaning is not lost, but add a text label ("strong", "middling", "attention") for colour-blind users.
8. **Density in Full view:** Vault has the most small text (23 items under 12px). Candidates for the next simplification pass: Vault, Time machine, Crew, Quiet hours.
9. **Link hub on phone:** collapse is in place, but the hub still has many controls. Only checked for overflow, not for comfort.

## Strengths worth keeping

- The Simple view answers the three questions a user has: where do I stand, what next, who can I ask.
- Plain words replace jargon (levels, XP and realms are hidden by default).
- Every number has a source or reason, and drafts and open decisions are labelled.
- Motion and reward intensity can be turned down (Calm).

## Suggested next steps

1. Re-run the checks after this round of fixes on a real phone.
2. Raise the minimum font size to 12px.
3. Add a skip link and text labels for skill levels.
4. Simplify Vault, Time machine, Crew and Quiet hours the way Skills and Realm map were.
5. Test Simple view with 3 to 5 real people, giving them only the task "find out what to do next".
