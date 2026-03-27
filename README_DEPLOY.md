# SST Clock - GitHub Pages Deployment Guide
## How to Deploy
1.  **Build the project**: Run the following command in your terminal:
    ```bash
    npm run build
    ```
    This will create a folder named `docs` in your project's root.

2.  **Commit and Push**
    ```bash
    git add docs
    git commit -m "Build for deployment"
    git push origin main
    ```
3. **Data insertion:** Use the following scripts to first fetch the new twitch data and then manually insert the delays
    ```
    python sst_tracker.py 
    python manual_delay_editor.py
    ```

