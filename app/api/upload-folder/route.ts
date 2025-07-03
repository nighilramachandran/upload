import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import fs from "fs";
import path from "path";
import type { PutBlobResult, PutCommandOptions } from "@vercel/blob";

type FileCallback = (filePath: string) => void;

const walkDir = (dir: string, callback: FileCallback): void => {
  fs.readdirSync(dir).forEach((file: string) => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath, callback);
    } else {
      callback(fullPath);
    }
  });
};

interface UploadRequestBody {
  folderPath: string;
}

interface UploadedFile {
  file: string;
  url: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: UploadRequestBody = await request.json();
    console.log("request body", body);
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

    for (const filePath of files) {
      const content = fs.readFileSync(filePath);
      const key = path.relative(folderPath, filePath).replace(/\\/g, "/");

      const options: PutCommandOptions = {
        access: "public",
        // BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN as string,
      };
      const { url }: PutBlobResult = await put(key, content, options);

      uploadedFiles.push({
        file: key,
        url,
      });
    }

    return NextResponse.json({
      message: "Upload completed",
      totalFiles: uploadedFiles.length,
      files: uploadedFiles,
    });
  } catch (error) {
    console.error("Upload Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
