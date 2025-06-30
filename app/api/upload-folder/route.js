import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import fs from "fs";
import path from "path";

const walkDir = (dir, callback) => {
  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath, callback);
    } else {
      callback(fullPath);
    }
  });
};

export async function POST(req) {
  try {
    const body = await req.json();
    console.log("body", body);
    const { folderPath } = body;

    if (!folderPath || !fs.existsSync(folderPath)) {
      return NextResponse.json(
        { error: "Invalid folder path" },
        { status: 400 }
      );
    }

    const files = [];
    walkDir(folderPath, (filePath) => {
      files.push(filePath);
    });

    const uploadedFiles = [];

    for (const filePath of files) {
      const content = fs.readFileSync(filePath);
      const key = path.relative(folderPath, filePath).replace(/\\/g, "/");

      const { url } = await put(key, content, {
        access: "public",
        BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
      });

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
