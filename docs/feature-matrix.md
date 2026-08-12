# Feromeet feature matrix

Observed from Google Play metadata, Android resources, navigation state, data
models, and API interfaces in client `1.1.4`.

| Area | Confirmed behaviour | Web implementation |
| --- | --- | --- |
| Authentication | Phone SMS login and registration, four-digit code, resend | Login and OTP screens |
| Onboarding | Location, basic profile, photos, interests and ideal-date tags | Responsive multi-step flow |
| Discovery | Swipe cards, profile details, like/dislike and search filters | Card stack plus desktop detail pane |
| Invitation | Price/budget, date format, expense split and comment | Invite modal and validation |
| Favourites | Add/remove favourite and reaction list | Dedicated favourites view |
| Meets | Active/past lists and invitation/planning/date/rating stages | Timeline cards and details view |
| Chat | History, realtime messages, status, typing and online state | Conversation view; realtime degrades gracefully |
| Profile | Photos, about text, height, tags, location and readiness | Editable profile sections |
| Safety | Report by email, logout and irreversible account deletion | Settings and confirmation dialogs |
| Notifications | FCM on Android | In-app badges; browser push is out of scope |

## Main navigation

- Swipes
- Favourites
- Meets
- Profile

Mobile uses a bottom bar. Desktop uses a persistent left rail and a bounded
content/detail layout.

## Meet lifecycle

1. One user sends an invitation with a budget and expense split.
2. The invited user accepts or rejects it.
3. Both users agree on details in chat and confirm.
4. At the scheduled date, both users confirm arrival.
5. After the date, each participant rates the meeting.

## Runtime confirmation still required

- Real SMS delivery and the exact registration status values.
- Live payload envelopes and backend validation messages.
- STOMP send destinations for message and typing events.
- Whether production throttling or device-attestation rules apply.
- Payment/wallet endpoints: the build contains balance labels but no Retrofit
  payment interface, so no financial action is fabricated.
