# Verified rules and component facts

This folder is research only and is excluded from the app and publication. Do not ship the downloaded reference art or rulebook pages as product assets.

`card-facts-2021.json` is a hand-reviewed mechanical dataset for the 2021 base rules with the standard 56-guest deck (printed IDs 49-104), 48 staff cards (IDs 1-48), 12 goals, the common night hotel, and all four alternative day hotels. The public 2021 crowdfunding rulebook mentions 58 guests because it includes two extra promotional guests; those extras are excluded here.

## Primary sources

- Publisher 2021 English rulebook: https://www.lookout-spiele.de/upload/de_gah_deluxe_crowdfunding.html_GAH_Regeln_EN_WEB.pdf
- Licensed online implementation and rules: https://www.yucata.de/en/Rules/GrandAustria
- Online implementation credits and license status: https://www.yucata.de/en/GameInfo/GrandAustria
- Older printed staff cost reference (2015-2016 version 2.2, publisher rulebook mirror): https://cdn.1j1ju.com/medias/fa/5d/33-grand-austria-hotel-rulebook.pdf

Public reference images are retained in this ignored directory for visual verification. Guest GIF source URLs are recorded per card in the JSON. No Yucata implementation code is reused. The downloaded public JavaScript was inspected only to check order tooltip resource counts and hotel colors, then removed. All implemented rules must be independently written.

## Open source reference checked

https://github.com/brdgm/grand-austria-hotel-solo-helper is Apache-2.0, checked via its LICENSE and repository metadata. It is a solo helper, not a full online game engine.

https://github.com/javipacheco/multi-language-bg-card-system declares Apache-2.0 in its README. Its game JSON contains names and rule descriptions, but no guest order/VP or staff cost data. It helped cross-check the publisher appendix. Its English ID 73 is mislabeled Countess instead of Count; ID 33 mistakenly adds a red-guest restriction. Neither error is used in our mechanical dataset.

## Verification and material corrections

- All 56 guest VP values were read visually from the public card GIFs in four review sheets. Resource requirements were checked against the public UI tooltip data and card images. No blank, estimated, or synthetic cards are present.
- Sculptor 49 is worth 0 printed VP and requires 1 wine. A joke in older rule prose says 3 VP; the card image is authoritative for this field.
- All 48 staff costs come from the printed staff index, with Kitchen Hand updated from 3 to 5 for 2021.
- Custodian 23 earns money for a room occupied by any means in the 2021 appendix, including room-flip effects.
- Male Floor Housekeeper 33 works for any guest with at least four ordered items.
- E. Gizia 97 grants a bonus action from an action space containing dice; do not remove a die, boost it, trigger taking-a-die staff, or start a whole extra turn.
- Operator 41 has no 12-VP cap under 2021 rules.
- A, B and C goals all score 15, 10 and 5 in claim order. Full politics1/5/9 GIFs were visually checked; values do not increase by category.
- Emperor track scoring for positions 0-13 is 0,1,2,3,3,4,4,5,5,6,6,7,8,9.
- Group rewards for size 1-4 are blue VP 2/5/9/15; red money 1/3/6/10; yellow emperor steps 1/3/6/10.
- The night hotel has preparation rewards 1/2 VP at floor 3 columns 4/5, and 3/4/5 VP at floor 4 columns 3/4/5. The four day hotels instead have 1/1 and 2/2/2 in those positions.
- Hotel coordinate floor 1 is the bottom; columns run 1-5 left to right. Every hotel contains exactly 20 rooms in 10 groups.

Guest rewards are optional; any or all depicted benefit components may be declined. Do not interleave additional actions inside the resolution of an action or a guest reward. Check the 2021 appendix for ordering around a guest reward and a completed room-group bonus; Yucata imposes a fixed sequence in its own adaptation.

Publisher confirmation that Ferdinand and Moras originated as 2017 promotional memorial cards: https://www.lookout-spiele.de/de/news.php?nn=2017-12-12+13%3A09%3A19
