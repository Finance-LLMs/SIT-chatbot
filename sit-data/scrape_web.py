# scrape_web.py
import asyncio
import aiofiles
from firecrawl import AsyncFirecrawlApp

API_KEY = "fc-167d7467b9a143638df92ee60e45fca0"  # your Firecrawl key
TARGET_URL = "https://www.singaporetech.edu.sg"
OUTPUT_FILE = "singaporetech_main.md"

async def scrape_and_save():
    app = AsyncFirecrawlApp(api_key=API_KEY)

    # scrape only the main content, in markdown format
    response = await app.scrape_url(
        url=TARGET_URL,
        formats=["markdown"],
        only_main_content=True
    )

    # access the markdown field directly
    markdown = response.markdown or ""
    if not markdown:
        print("No markdown returned. Full response object:")
        print(response.json(indent=2))
        return

    # save to file
    async with aiofiles.open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        await f.write(markdown)
    print(f"✅ Saved main content to {OUTPUT_FILE}")

if __name__ == "__main__":
    asyncio.run(scrape_and_save())
