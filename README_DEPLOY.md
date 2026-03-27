# SST Clock - GitHub Pages Deployment Guide

This project is configured to be deployed to GitHub Pages. You have two options for deployment:

## Option 1: GitHub Actions (Recommended)

This is the most modern and automated way. Every time you push to the `main` branch, GitHub will automatically build and deploy your site.

1.  **Push your code** to a GitHub repository.
2.  Go to your repository on GitHub.
3.  Navigate to **Settings** > **Pages**.
4.  Under **Build and deployment** > **Source**, select **GitHub Actions**.
5.  The workflow I created in `.github/workflows/deploy.yml` will take care of the rest!

## Option 2: Manual Deployment

If you prefer to deploy manually from your terminal:

1.  Ensure you have a `homepage` field in your `package.json` pointing to your URL:
    `"homepage": "https://<username>.github.io/<repo-name>/"`
2.  Run the following command:
    ```bash
    npm run deploy
    ```

## Important Notes

- **Base Path**: I have updated `vite.config.ts` with `base: './'` to ensure that assets (CSS, JS, Images) load correctly regardless of whether the site is at the root or in a subfolder.
- **Data Updates**: Remember that the website displays data from `stats.json`. You need to run the `sst_tracker.py` script locally and push the updated `stats.json` to GitHub for the website to show new data.
- **API Keys**: Do NOT push your `config.json` to GitHub. GitHub Pages is for the **frontend only**. The Python script is meant to be run locally or in a private environment.
