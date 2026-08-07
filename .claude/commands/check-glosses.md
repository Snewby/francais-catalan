---
description: Check every taxonomy leaf has glosses.fr and a valid contrast_fr
allowed-tools: Bash, PowerShell, Read, Grep, Glob
---

Run `npm run check-glosses`.

Report, grouped by domain:

- leaves with a missing or empty `glosses.fr`;
- leaves with no `contrast_fr`, or a `status` outside
  `transfer | near-miss | false-friend | novel`;
- leaves carrying a flat `gloss` string rather than the keyed `glosses` map;
- any node whose status contradicts `data/contrast-overrides.json`.

Do not author glosses as part of this command. Gloss authoring is a separate
reviewed pass run through the `gloss-author` agent, because wrong French is
plausible-looking and only the user can catch it.
