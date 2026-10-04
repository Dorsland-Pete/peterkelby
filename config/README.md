# PDA book tag reference

Edit `pda-book-tags.json` to approve books for the signup page.

The key is the value in `?book=...`; the value is the ActiveCampaign tag:

```json
{
  "tt01": "tt01",
  "tt02": "tt02"
}
```

Every signup also receives `PDA`. Missing or unrecognised book values receive only `PDA`. Matches are case-sensitive after trimming surrounding spaces. Existing tags are retained. Deploy through GitHub/Netlify after changing this file. Only add tags intended for this signup; other tags may trigger unrelated ActiveCampaign automations.

The server uses ActiveCampaign Form 8 on the Peter Kelby list for double opt-in. Keep that form's confirmation redirect at `https://peterkelby.com/pda/signup/thanks` and its On Submit action set to Show Thank You. Keep Allow Blank Fields off to preserve existing contact details. The server adds tags after form acceptance; email automations should also require a confirmed subscription.

Production Netlify settings: `ACTIVE_CAMPAIGN_API_URL` and `ACTIVE_CAMPAIGN_API_KEY`. Store credentials only in Netlify, never this repository. The page stays disabled when those settings are missing.

Run mocked integration checks with `node tests/pda-signup.cjs`. These do not send email or create real contacts.
