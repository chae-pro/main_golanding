import { NextResponse } from "next/server";

import { requireCreatorAuth } from "@/server/creator-auth";
import { getCurrentStorageProvider, saveUploadedImage } from "@/server/storage-service";

export async function POST(request: Request) {
  try {
    await requireCreatorAuth();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Image file is required." }, { status: 400 });
    }

    const uploaded = await saveUploadedImage(file);

    return NextResponse.json({
      src: uploaded.src,
      key: uploaded.key,
      provider: getCurrentStorageProvider(),
      name: file.name,
      size: file.size,
      mimeType: file.type,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    const status =
      message === "UNAUTHORIZED"
        ? 401
        : message.includes("required.") ||
            message.includes("Unsupported") ||
            message.includes("Only image") ||
            message.includes("10MB")
          ? 400
          : 500;
    return NextResponse.json({ message }, { status });
  }
}
