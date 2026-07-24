# Deploying DocSpace

DocSpace is a client-side Next.js app — no backend, no database. It deploys to
any Next-compatible host. Below is the fastest path (Vercel), then the settings
that matter.

## 1. Push to GitHub (one time)

```bash
git remote add origin https://github.com/deshring-tech/docspace.git
git push -u origin main
```

## 2. Deploy on Vercel (~2 minutes)

1. Go to https://vercel.com and sign in with GitHub.
2. **Add New → Project → Import** the `docspace` repository.
3. Framework preset is auto-detected as **Next.js**. Leave build settings
   default (`next build`).
4. Before deploying, add the environment variable below.
5. Click **Deploy**. You get a live `https://<name>.vercel.app` URL with HTTPS.

Every future `git push` to `main` redeploys automatically.

## 3. Environment variables

Only the first is required. See `.env.example` for the full list.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | **Yes** | Canonical URL for SEO, sitemap, Open Graph. Set to your live URL (e.g. `https://docspace.vercel.app`, later your domain). |
| `NEXT_PUBLIC_ANALYTICS_DOMAIN` | No | Enables cookieless analytics. Leave blank to keep analytics off. |
| `NEXT_PUBLIC_ANALYTICS_SRC` | No | Custom analytics script (self-hosted). |
| `NEXT_PUBLIC_TESSERACT_*`, `NEXT_PUBLIC_TESSDATA_URL` | No | Self-host the OCR engine/models instead of the default CDN. |

After first deploy, set `NEXT_PUBLIC_SITE_URL` to the real URL and redeploy so
canonical tags, `sitemap.xml`, and `robots.txt` point at the right host.

## 4. Custom domain (when ready)

In Vercel: **Project → Settings → Domains → Add**. Point your domain's DNS as
instructed, then update `NEXT_PUBLIC_SITE_URL` to the domain and redeploy.

## 5. After going live — start the SEO clock

1. Verify the site in **Google Search Console** and submit `/sitemap.xml`.
2. Confirm `https://<your-site>/robots.txt` and `/sitemap.xml` load.
3. Check a few tool pages render (e.g. `/tools/us-passport-photo`).

Indexing takes weeks — the sooner these are submitted, the sooner ranking
begins.

## Notes

- `npm run build` must pass locally before pushing (`npm test` too).
- The pdf.js and OCR assets load at runtime; no extra deploy config needed.
- No server or database to provision — hosting is effectively free at low
  traffic.
