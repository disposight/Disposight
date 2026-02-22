import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-revalidate-secret");

  if (!secret || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { path, slug } = body as { path?: string; slug?: string };

    if (slug) {
      revalidatePath(`/blog/${slug}`);
      revalidatePath("/blog");
      revalidatePath("/sitemap.xml");
      return NextResponse.json({ revalidated: true, slug });
    }

    if (path) {
      revalidatePath(path);
      return NextResponse.json({ revalidated: true, path });
    }

    // Revalidate all blog pages
    revalidatePath("/blog", "layout");
    revalidatePath("/sitemap.xml");
    return NextResponse.json({ revalidated: true, scope: "all" });
  } catch {
    return NextResponse.json({ error: "Failed to revalidate" }, { status: 500 });
  }
}
