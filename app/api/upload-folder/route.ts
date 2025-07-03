import { isAuthorized } from "@/app/lib/authorizationHelper";
import { isHidden } from "@/app/lib/fileUtils";
import type { PutBlobResult, PutCommandOptions } from "@vercel/blob";
import { put } from "@vercel/blob";
import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

type FileCallback = (filePath: string) => void;

interface UploadRequestBody {
  folderPath: string;
}

interface UploadedFile {
  file: string;
  url: string;
}

interface FailedFile {
  file: string;
  error: string;
}

const walkDir = (dir: string, callback: FileCallback): void => {
  fs.readdirSync(dir).forEach((file: string) => {
    const fullPath = path.join(dir, file);

    if (isHidden(fullPath)) {
      console.log(`Skipped hidden: ${fullPath}`);
      return;
    }

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath, callback);
    } else {
      callback(fullPath);
    }
  });
};

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing token" },
      { status: 401 }
    );
  }
  try {
    const body: UploadRequestBody = await request.json();
    console.log("Received folderPath:", body.folderPath);
    const { folderPath } = body;

    if (!folderPath || !fs.existsSync(folderPath)) {
      return NextResponse.json(
        { error: "Invalid folder path" },
        { status: 400 }
      );
    }

    const files: string[] = [];
    walkDir(folderPath, (filePath: string) => {
      files.push(filePath);
    });

    const uploadedFiles: UploadedFile[] = [];
    const failedFiles: FailedFile[] = [];

    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath);
        const key = path.relative(folderPath, filePath).replace(/\\/g, "/");

        const options: PutCommandOptions = {
          access: "public",
          allowOverwrite: true,
        };

        const { url }: PutBlobResult = await put(key, content, options);

        uploadedFiles.push({ file: key, url });
        console.log(`Uploaded: ${key} → ${url}`);
        //TODO
        // {
        //   "name": "photo.jpeg",
        //   "key": "level-5/photo.jpeg",
        //   "url": "https://...blob.vercel-storage.com/level-5/photo.jpeg"
        // }
        // should store this in the db
      } catch (uploadError) {
        const errorMsg =
          uploadError instanceof Error
            ? uploadError.message
            : String(uploadError);
        console.error(`Failed to upload ${filePath}:`, errorMsg);

        failedFiles.push({ file: filePath, error: errorMsg });
      }
    }

    return NextResponse.json({
      message: "Upload process completed",
      totalFiles: files.length,
      uploadedFilesCount: uploadedFiles.length,
      failedFilesCount: failedFiles.length,
      uploadedFiles,
      failedFiles,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Upload Error:", errorMsg);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
