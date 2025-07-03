import { isAuthorized } from "@/app/lib/authorizationHelper";
import { del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing token" },
      { status: 401 }
    );
  }

  try {
    const { key } = await request.json();

    if (!key || typeof key !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'key' in request body" },
        { status: 400 }
      );
    }

    const blobURL = `${process.env.BLOB_READ_PUBLIC_BASE_URL}/${key}`;
    const head = await fetch(blobURL, { method: "HEAD" });

    if (head.status === 404) {
      return NextResponse.json(
        { error: `File '${key}' not found` },
        { status: 404 }
      );
    }

    await del(key);

    return NextResponse.json({
      message: `File '${key}' deleted successfully`,
      deletedKey: key,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Request Error:", msg);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
