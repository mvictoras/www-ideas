# Team Member photos

One photo per Team Member, referenced from `_data/team.yml`.

## Adding a photo

1. Add the file here, named after the member: `<first>-<last>.jpg`
   (lowercase, hyphenated, e.g. `victor-mateevitsi.jpg`). Use `.png` only if
   the source requires it.
2. Crop it square (1:1) and resize to **512×512** — the layout renders it as a
   96px circle with `object-fit: cover`, so a centered square crop works best:

   ```sh
   magick input.jpg -resize 512x512^ -gravity center -extent 512x512 victor-mateevitsi.jpg
   ```

3. Reference it in `_data/team.yml` on the member's entry:

   ```yaml
   - name: Victor Mateevitsi
     photo: victor-mateevitsi.jpg
   ```

4. Run `./bin/cibuild` — the harness asserts the photo renders and fails if
   the file is missing from `assets/img/team/`.

Only add photos you have the right to publish (your own, or one the person
sent you). Members without a photo get an initials avatar automatically.
