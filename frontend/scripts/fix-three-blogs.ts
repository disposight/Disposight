/**
 * Fix images for the first 3 blog posts with curated, topic-relevant photos.
 */
import fs from "fs";
import path from "path";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

interface BlogImage { url: string; alt: string; credit: string; }

function img(url: string, alt: string, name: string, username: string): BlogImage {
  return {
    url: `${url}&w=1200&q=80`,
    alt,
    credit: `Photo by [${name}](https://unsplash.com/@${username}) on [Unsplash](https://unsplash.com)`,
  };
}

const FIXES: Record<string, { hero: BlogImage; body: BlogImage[] }> = {
  "how-warn-act-filings-create-early-warning-signals-for-asset-buyers": {
    hero: img(
      "https://images.unsplash.com/photo-1692133226337-55e513450a32?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMjA3fDB8MXxzZWFyY2h8Mnx8Y29ycG9yYXRlJTIwbGF5b2ZmJTIwZW1wdHklMjBvZmZpY2UlMjBidWlsZGluZ3xlbnwwfDB8fHwxNzcxNzc4NjA4fDA&ixlib=rb-4.1.0&q=80&w=1080",
      "Empty office with desk and bookshelf after corporate layoff",
      "Brian Wangenheim", "brianwangenheim"
    ),
    body: [
      img(
        "https://images.unsplash.com/photo-1583521214690-73421a1829a9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMjA3fDB8MXxzZWFyY2h8Mnx8Z292ZXJubWVudCUyMGRvY3VtZW50cyUyMGZpbGluZyUyMHBhcGVyd29yayUyMGxlZ2FsfGVufDB8MHx8fDE3NzE3Nzg2MDl8MA&ixlib=rb-4.1.0&q=80&w=1080",
        "Stack of government filing documents and legal paperwork",
        "Wesley Tingey", "wesleyphotography"
      ),
      img(
        "https://images.unsplash.com/photo-1605742212958-4a7f96787ea9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMjA3fDB8MXxzZWFyY2h8Mnx8ZmFjdG9yeSUyMHdvcmtlcnMlMjBsZWF2aW5nJTIwcGxhbnQlMjBzaHV0ZG93bnxlbnwwfDB8fHwxNzcxNzc4NjExfDA&ixlib=rb-4.1.0&q=80&w=1080",
        "Workers leaving a plant during daytime shutdown",
        "Jorge Maya", "mayaibuki"
      ),
      img(
        "https://images.unsplash.com/photo-1670283125447-7c86adcf11f1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMjA3fDB8MXxzZWFyY2h8Mnx8Y2xvc2VkJTIwYnVzaW5lc3MlMjBzdG9yZWZyb250JTIwYm9hcmRlZCUyMHZhY2FudHxlbnwwfDB8fHwxNzcxNzc4NjEyfDA&ixlib=rb-4.1.0&q=80&w=1080",
        "Closed business storefront with sign on the door",
        "Earl Wilcox", "earl_plannerzone"
      ),
    ],
  },

  "distressed-asset-acquisition-a-comprehensive-guide": {
    hero: img(
      "https://images.unsplash.com/photo-1656646424292-cf207f3f1749?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMjA3fDB8MXxzZWFyY2h8Mnx8Y29ycG9yYXRlJTIwbWVyZ2VyJTIwYWNxdWlzaXRpb24lMjBib2FyZHJvb20lMjBkZWFsfGVufDB8MHx8fDE3NzE3Nzg2MjJ8MA&ixlib=rb-4.1.0&q=80&w=1080",
      "Corporate boardroom conference room for merger negotiations",
      "Point3D Commercial Imaging Ltd.", "3dottawa"
    ),
    body: [
      img(
        "https://images.unsplash.com/photo-1765868017186-18a3fc4c2942?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMjA3fDB8MXxzZWFyY2h8Mnx8YnVzaW5lc3MlMjBkdWUlMjBkaWxpZ2VuY2UlMjBmaW5hbmNpYWwlMjBkb2N1bWVudHN8ZW58MHwwfHx8MTc3MTc3ODYyNHww&ixlib=rb-4.1.0&q=80&w=1080",
        "Pen and money scattered on financial due diligence documents",
        "Jakub \u017berdzicki", "jakubzerdzicki"
      ),
      img(
        "https://images.unsplash.com/photo-1669003152226-b37b58281b84?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMjA3fDB8MXxzZWFyY2h8Mnx8Y29tbWVyY2lhbCUyMHJlYWwlMjBlc3RhdGUlMjBpbmR1c3RyaWFsJTIwcHJvcGVydHl8ZW58MHwwfHx8MTc3MTc3ODYyNHww&ixlib=rb-4.1.0&q=80&w=1080",
        "Aerial view of a large commercial industrial property",
        "Point3D Commercial Imaging Ltd.", "3dottawa"
      ),
      img(
        "https://images.unsplash.com/photo-1758518727707-b023e285b709?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMjA3fDB8MXxzZWFyY2h8Mnx8Y29ycG9yYXRlJTIwYm9hcmRyb29tJTIwc3RyYXRlZ3klMjBtZWV0aW5nJTIwbmVnb3RpYXRpb258ZW58MHwwfHx8MTc3MTc3ODYyNXww&ixlib=rb-4.1.0&q=80&w=1080",
        "Four professionals in a modern office strategy meeting",
        "Vitaly Gariev", "silverkblack"
      ),
    ],
  },

  "navigating-distressed-asset-sales-in-equipment-remarketing": {
    hero: img(
      "https://images.unsplash.com/photo-1763665814546-27c2c003317e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMjA3fDB8MXxzZWFyY2h8Mnx8aW5kdXN0cmlhbCUyMG1hY2hpbmVyeSUyMHdhcmVob3VzZSUyMGhlYXZ5JTIwZXF1aXBtZW50fGVufDB8MHx8fDE3NzE3Nzg2MjZ8MA&ixlib=rb-4.1.0&q=80&w=1080",
      "Red forklift with clamp attachment at industrial warehouse",
      "Sergej Karpow", "skstrannik"
    ),
    body: [
      img(
        "https://images.unsplash.com/photo-1759950345011-ee5a96640e00?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMjA3fDB8MXxzZWFyY2h8Mnx8Y29uc3RydWN0aW9uJTIwZXF1aXBtZW50JTIwZXhjYXZhdG9yJTIwc2l0ZXxlbnwwfDB8fHwxNzcxNzc4NjI3fDA&ixlib=rb-4.1.0&q=80&w=1080",
        "Mini excavator with coiled pipes on construction site",
        "Sergej Karpow", "skstrannik"
      ),
      img(
        "https://images.unsplash.com/photo-1767281075989-7571356d477e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMjA3fDB8MXxzZWFyY2h8Mnx8bWFudWZhY3R1cmluZyUyMGZhY3RvcnklMjBmbG9vciUyMG1hY2hpbmVzJTIwcHJvZHVjdGlvbnxlbnwwfDB8fHwxNzcxNzc4NjI4fDA&ixlib=rb-4.1.0&q=80&w=1080",
        "Wood processing machinery with stacked lumber on factory floor",
        "Bernd Dittrich", "hdbernd"
      ),
      img(
        "https://images.unsplash.com/photo-1759300635757-19ab99f4cfed?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMjA3fDB8MXxzZWFyY2h8Mnx8Zm9ya2xpZnQlMjB3YXJlaG91c2UlMjBsb2dpc3RpY3MlMjBwYWxsZXRzJTIwc2hpcHBpbmd8ZW58MHwwfHx8MTc3MTc3ODYyOXww&ixlib=rb-4.1.0&q=80&w=1080",
        "Stacked pallets in warehouse logistics shipping area",
        "Johnny Ho", "johnnyho_ho"
      ),
    ],
  },
};

function replaceInlineImages(body: string, oldImages: BlogImage[], newImages: BlogImage[]): string {
  let result = body;
  for (let i = 0; i < oldImages.length && i < newImages.length; i++) {
    const escapedUrl = oldImages[i].url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
      `!\\[[^\\]]*\\]\\(${escapedUrl}\\)\\n\\*Photo: [^*]*\\*`, "g"
    );
    result = result.replace(pattern,
      `![${newImages[i].alt}](${newImages[i].url})\n*Photo: ${newImages[i].credit}*`
    );
  }
  return result;
}

for (const [slug, { hero, body }] of Object.entries(FIXES)) {
  const filePath = path.join(BLOG_DIR, `${slug}.json`);
  const post = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  console.log(`--- ${slug} ---`);
  console.log(`  Hero: "${hero.alt}"`);
  body.forEach((img, i) => console.log(`  Body[${i}]: "${img.alt}"`));

  const newBodyText = replaceInlineImages(post.body, post.images, body);

  post.heroImage = hero;
  post.images = body;
  post.body = newBodyText;
  post.updatedAt = new Date().toISOString();

  fs.writeFileSync(filePath, JSON.stringify(post, null, 2) + "\n");
  console.log(`  WRITTEN\n`);
}

console.log("Done — all 3 posts fixed.");
