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

## Important Notes

- **Base Path**: I have set `base: './'` in `vite.config.ts` to ensure assets load correctly.
- **Output Directory**: I have configured Vite to output to `docs/` instead of `dist/`.
- **Data Updates**: Remember to push your updated `stats.json` inside the `public/` folder whenever you run the Python tracker!
- **Manual Delays**: I have added `manual_delay_editor.py`. Run this script after the main tracker to manually input delay values for any new streams.
- **Build After Changes**: Every time I (the AI) make changes to the source code, you will need to pull the changes locally and run `npm run build` again to update the `docs` folder for deployment.
