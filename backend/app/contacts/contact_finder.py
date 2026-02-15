"""Contact finder — discover decision-makers from company websites.

Scrapes team/about/leadership pages, uses AI to extract names, titles, and phones,
scores each contact by seniority level.
"""

import httpx
import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from bs4 import BeautifulSoup

from app.processing.llm_client import llm_client
from app.models.company import Company
from app.models.contact import Contact

logger = structlog.get_logger()

CONTACT_PROMPT = """From this company website content, extract people in leadership/management roles.

Company: {company_name}
Website Content:
{content}

Return ONLY a JSON array (no markdown, no code blocks). Each object should have:
{{
    "first_name": "John",
    "last_name": "Doe",
    "full_name": "John Doe",
    "title": "CEO",
    "phone": "555-123-4567"
}}

Only include people with clear leadership/management titles (CEO, President, VP, Director, Manager, Owner, Founder, Partner, etc.).
For phone: include any direct phone number, extension, or mobile number visible on the page for that person. Use null if no phone is found.
If no leadership contacts are found, return an empty array: []"""

SENIORITY_MAP = {
    "owner": ("c_level", 95),
    "founder": ("c_level", 95),
    "co-founder": ("c_level", 93),
    "ceo": ("c_level", 95),
    "chief executive": ("c_level", 95),
    "president": ("c_level", 93),
    "coo": ("c_level", 90),
    "cfo": ("c_level", 88),
    "cto": ("c_level", 88),
    "chief": ("c_level", 88),
    "managing director": ("c_level", 88),
    "general manager": ("c_level", 85),
    "evp": ("vp", 85),
    "svp": ("vp", 85),
    "vp": ("vp", 82),
    "vice president": ("vp", 82),
    "partner": ("vp", 80),
    "principal": ("vp", 78),
    "director": ("director", 75),
    "head of": ("director", 75),
    "senior manager": ("manager", 65),
    "manager": ("manager", 60),
    "supervisor": ("manager", 55),
    "coordinator": ("manager", 50),
}

# Pages likely to have team/leadership info
TEAM_PAGE_PATHS = [
    "/about", "/about-us", "/our-team", "/team", "/leadership",
    "/management", "/staff", "/people", "/company",
    "/about/team", "/about/leadership", "/about/management",
    "/our-leadership", "/executive-team", "/founders",
    "/who-we-are", "/meet-the-team", "/our-people",
    "/about/our-team", "/company/team", "/company/leadership",
    "/contact", "/contact-us",
]


async def find_contacts_for_company(db: AsyncSession, company: Company) -> list[Contact]:
    """Find decision-makers for a company by scraping website pages.

    1. Scrape team/about/leadership pages and use AI to extract contacts
    2. As a last resort, scrape the homepage for any mentioned names
    """
    if not company.domain:
        return []

    base_url = f"https://{company.domain}"

    # Step 1: Scrape team/about pages + AI extraction
    contacts = await _scrape_and_extract_contacts(db, company, base_url)
    if contacts:
        return contacts

    # Step 2: Try the homepage as a last resort
    contacts = await _try_homepage_extraction(db, company, base_url)
    return contacts


async def _scrape_with_playwright(base_url: str, paths: list[str]) -> str:
    """Render JS-heavy pages with headless Chromium. Fallback when httpx fails."""
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        logger.warning("playwright.not_installed")
        return ""

    all_text = ""
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
            )
            page = await context.new_page()

            for path in paths:
                try:
                    url = f"{base_url}{path}"
                    await page.goto(url, timeout=10000, wait_until="networkidle")
                    await page.evaluate("""
                        document.querySelectorAll('script, style, nav, footer')
                            .forEach(el => el.remove())
                    """)
                    text = await page.evaluate("document.body.innerText")
                    if text and len(text.strip()) > 100:
                        all_text += f"\n\n--- {path} ---\n{text.strip()}"
                        if len(all_text) > 5000:
                            break
                except Exception:
                    continue

            await browser.close()
    except Exception as e:
        logger.error("playwright.scrape_failed", error=str(e))

    return all_text[:5000]


async def _scrape_and_extract_contacts(
    db: AsyncSession, company: Company, base_url: str
) -> list[Contact]:
    """Scrape team/about pages and use AI to extract contacts."""
    all_text = ""

    async with httpx.AsyncClient(timeout=5.0, follow_redirects=True, verify=False) as client:
        for path in TEAM_PAGE_PATHS:
            try:
                url = f"{base_url}{path}"
                response = await client.get(
                    url,
                    headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"},
                )
                if response.status_code == 200:
                    soup = BeautifulSoup(response.text, "html.parser")
                    for tag in soup(["script", "style", "nav", "footer"]):
                        tag.decompose()
                    text = soup.get_text(separator=" ", strip=True)
                    if len(text) > 100:
                        all_text += f"\n\n--- {path} ---\n{text}"
                        if len(all_text) > 5000:
                            break
            except Exception:
                continue

    # If httpx found nothing, try Playwright for JS-rendered pages
    if not all_text:
        logger.info("contacts.trying_playwright", company=company.name, domain=company.domain)
        all_text = await _scrape_with_playwright(base_url, TEAM_PAGE_PATHS)

    if not all_text:
        return []

    return await _ai_extract_contacts(db, company, all_text[:5000], "website")


async def _try_homepage_extraction(
    db: AsyncSession, company: Company, base_url: str
) -> list[Contact]:
    """Last resort: try the homepage for any mentioned names."""
    try:
        async with httpx.AsyncClient(timeout=5.0, follow_redirects=True, verify=False) as client:
            response = await client.get(
                base_url,
                headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"},
            )
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, "html.parser")
                for tag in soup(["script", "style", "nav", "footer"]):
                    tag.decompose()
                text = soup.get_text(separator=" ", strip=True)

                if len(text) >= 100:
                    return await _ai_extract_contacts(db, company, text[:5000], "homepage")
    except Exception:
        pass

    # Try Playwright for JS-rendered homepage
    logger.info("contacts.trying_playwright_homepage", company=company.name)
    all_text = await _scrape_with_playwright(base_url, [""])
    if all_text and len(all_text.strip()) > 100:
        return await _ai_extract_contacts(db, company, all_text[:5000], "homepage")

    return []


async def _ai_extract_contacts(
    db: AsyncSession, company: Company, text: str, source: str
) -> list[Contact]:
    """Use AI to extract contacts from website text."""
    try:
        prompt = CONTACT_PROMPT.format(
            company_name=company.name,
            content=text,
        )
        contacts_data = await llm_client.complete_json(prompt, model="haiku", max_tokens=512)

        if not isinstance(contacts_data, list):
            return []

        contacts = []
        for c in contacts_data[:5]:
            seniority, score = _score_contact(c.get("title", ""))

            phone = c.get("phone")
            if phone and isinstance(phone, str):
                phone = phone.strip()
                if phone.lower() in ("null", "n/a", "none", ""):
                    phone = None

            contact = Contact(
                company_id=company.id,
                first_name=c.get("first_name"),
                last_name=c.get("last_name"),
                full_name=c.get("full_name"),
                title=c.get("title"),
                seniority_level=seniority,
                decision_maker_score=score,
                phone=phone,
                discovery_source=source,
            )
            db.add(contact)
            contacts.append(contact)

        await db.flush()

        logger.info(
            "contacts.found",
            company=company.name,
            count=len(contacts),
            source=source,
        )
        return contacts

    except Exception as e:
        logger.error("contacts.extraction_failed", company=company.name, error=str(e))
        return []


def _score_contact(title: str) -> tuple[str, int]:
    """Determine seniority level and decision-maker score from job title."""
    if not title:
        return "unknown", 30

    title_lower = title.lower()

    for keyword, (seniority, score) in SENIORITY_MAP.items():
        if keyword in title_lower:
            return seniority, score

    return "unknown", 30
