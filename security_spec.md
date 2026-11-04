# Security Specification for SHPE Texas State App

## 1. Data Invariants
- A user document must have a matching authentication UID (`request.auth.uid == userId`).
- Role assignment is strictly bounded to `["officer", "member", "non_member"]`. Non-privileged users cannot self-escalate to `officer`.
- The initial admin/officer email (`shpetxst@gmail.com`) is bootstrapped with officer privileges.
- Committees are publicly viewable, but modification is strictly restricted to officers.
- Slideshows can only be created, edited, and deleted by officers.
- Event photos under a slideshow can ONLY be created by the officer who created the slideshow or the specifically designated uploader account specified on the slideshow document (`slideshow.designatedUploaderEmail`).
- Photo deletion/update is restricted to the photo uploader or an officer.

## 2. The Dirty Dozen Attack Payloads
1. Non-member trying to self-assign role='officer' upon registration -> REJECTED.
2. Unauthenticated user attempting to create a committee -> REJECTED.
3. Member attempting to modify committee details -> REJECTED.
4. Member attempting to create a new homepage slideshow -> REJECTED.
5. User attempting to upload photo to a slideshow where they are NOT the designated uploader or an officer -> REJECTED.
6. User attempting to spoof another user's `uploadedById` when creating a photo -> REJECTED.
7. User injecting 2MB payload into user's `displayName` -> REJECTED by size bounds.
8. Unauthenticated user writing directly to `/slideshows/{slideshowId}/photos` -> REJECTED.
9. Attacker updating another officer's slideshow to change `createdById` to themselves -> REJECTED (immutability).
10. Attacker modifying another user's private role classification without being an officer -> REJECTED.
11. Malicious user injecting arbitrary script string into document IDs -> REJECTED by `isValidId()`.
12. Attempt to delete all committees or users with batch writes -> REJECTED.
