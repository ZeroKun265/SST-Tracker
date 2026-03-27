# SST Clock - GitHub Pages Deployment Guide

I have updated the project to use the **`docs/`** folder for deployment, which is a common and simple way to host on GitHub Pages.

## How to Deploy (Manual Method)

1.  **Build the project**: Run the following command in your terminal:
    ```bash
    npm run build
    ```
    This will create a folder named `docs` in your project's root.

2.  **Commit and Push**: Add the `docs` folder to your Git repository and push it to GitHub:
    ```bash
    git add docs
    git commit -m "Build for deployment"
    git push origin main
    ```

3.  **Configure GitHub Settings**:
    - Go to your repository on GitHub.
    - Navigate to **Settings** > **Pages**.
    - Under **Build and deployment** > **Source**, select **Deploy from a branch**.
    - Under **Branch**, select **main** and change the folder from `/ (root)` to **`/docs`**.
    - Click **Save**.

## Option 2: GitHub Actions (Automated)

If you prefer the fully automated way (where you don't have to push the `docs` folder manually), I have also updated the `.github/workflows/deploy.yml` to use the `docs` folder.

1.  Go to **Settings** > **Pages**.
2.  Under **Build and deployment** > **Source**, select **GitHub Actions**.

## Important Notes

- **Base Path**: I have set `base: './'` in `vite.config.ts` to ensure assets load correctly.
- **Output Directory**: I have configured Vite to output to `docs/` instead of `dist/`.
- **Data Updates**: Remember to push your updated `stats.json` inside the `public/` folder whenever you run the Python tracker!
