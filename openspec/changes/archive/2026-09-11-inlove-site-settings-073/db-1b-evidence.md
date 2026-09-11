# DB-1b local site-settings evidence

- Executed: 2026-09-11 against the local `eqsitecms-db` container only.
- Tenant selector: `inlove`.
- Resolved tenant UUID: `685c6079-3922-4dbb-95b6-533bc9060547`.
- Snapshot: `/tmp/inlove_site_settings_before_073.csv` (local, mode `0600`, not committed).
- Snapshot rows: 76 (77 CSV lines including the header).
- Snapshot SHA-256: `4e8edb92f1a297454debd4ed980990cd74493da8ad6ce77d8a64b1c71edf6964`.
- Before relational fingerprint: 76 rows, MD5 `814c40d27d584f04ebb181bfb1a18d45`.
- Other-tenant counts before and after: `aleksandrova-dacha:12`, `default-equestrian:0`, `development:0`.

The first run of `services/backend/maintain/curate_inlove_site_settings.sql`
inserted four rows and deleted 64 rows. The second run inserted/deleted zero
rows. Both post-run relational fingerprints were 16 rows, MD5
`746124b13651c865852e358e64fc0ce6`.

Final key/type inventory:

```text
about_1_text|string
about_1_title|string
about_2_text|string
about_2_title|string
contacts.address|string
contacts.coordinates|object
contacts.maps_url|string
contacts.nearest_stop|object
contacts.primary_phone|string
contacts.working_hours|object
footer.copyright_name|string
footer.description|string
home.hero_subtitle|string
home.hero_title|string
social.instagram_url|string
social.vk_url|string
```

Rollback was rehearsed inside a transaction: delete the 16 curated tenant
rows, client-side `COPY` all 76 exact snapshot rows, verify the before
fingerprint, then `ROLLBACK`. The restored fingerprint matched
`814c40d27d584f04ebb181bfb1a18d45`; after rollback the curated fingerprint
remained `746124b13651c865852e358e64fc0ce6`.

For a real tenant-scoped rollback, copy the protected snapshot into the local
database container, start a transaction, delete only rows with the UUID above,
restore the snapshot with psql `\copy` using the explicit nine-column list,
verify the 76-row before fingerprint, and commit. No connection string or
credential is stored in this evidence.

Anonymous Public Read verification returned HTTP 200 and exactly the 16 keys
above for the selected-key request with selector `inlove`. Missing and invalid
selectors both returned HTTP 401.
